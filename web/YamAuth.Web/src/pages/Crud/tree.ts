import type { Entity, TreeConfig } from '@/resources/types'
import type { PagedResult } from '@/types/api'
import { fieldText } from './fieldText'

export const ISSUE_GROUP = '__tree_issues__'
export type TreeRow<E> =
  | {
      kind: 'record'
      id: number
      record: E
      treeIssue?: string | undefined
      children?: TreeRow<E>[]
    }
  | {
      kind: 'group'
      id: typeof ISSUE_GROUP
      children: TreeRow<E>[]
    }

/** 全量接口必须交付完整且编号唯一的数据，避免旧后端忽略 all 时展示残缺树。 */
export function validateTreeResult<E extends Entity>(result: PagedResult<E>) {
  if (
    !result ||
    !Number.isSafeInteger(result.total) ||
    result.total < 0 ||
    !Array.isArray(result.items) ||
    result.items.length !== result.total
  ) {
    throw new Error('树数据不完整或响应无效，请重新加载')
  }
  const ids = new Set<number>()
  for (const row of result.items) {
    const id = Number(row?.id)
    if (!Number.isSafeInteger(id) || id <= 0 || ids.has(id)) {
      throw new Error('记录编号无效或重复，请重新加载')
    }
    ids.add(id)
  }
}

export function treeLabel<E>(row: E, config: TreeConfig<E>) {
  return (
    (config.labelFields ?? [config.nameField])
      .map((field) => fieldText(row[field] ?? ''))
      .filter((part) => part.trim())
      .join(' ') || '未命名'
  )
}

export function buildTree<E extends Entity>(items: E[], config: TreeConfig<E>) {
  const sorted = [...items].sort(
    (a, b) =>
      Number(config.sortIndex?.(a) ?? 0) - Number(config.sortIndex?.(b) ?? 0) ||
      Number(a.id) - Number(b.id)
  )
  const byId = new Map(sorted.map((row) => [Number(row.id), row]))
  const children = new Map<number, number[]>()
  for (const row of sorted) {
    const parent = Number(config.parentId(row))
    const siblings = children.get(parent) ?? []
    siblings.push(row.id)
    children.set(parent, siblings)
  }
  const issues = new Map<number, string>()
  // 沿父链迭代并缓存结论，既能识别无根的环，也避免深树递归溢出。
  for (const row of sorted) {
    let id = Number(row.id)
    const path: number[] = []
    const seen = new Set<number>()
    let issue = ''
    while (id !== 0) {
      if (issues.has(id)) {
        issue = issues.get(id) ?? ''
        break
      }
      if (seen.has(id)) {
        issue = '自身或上级存在循环关系'
        break
      }
      seen.add(id)
      path.push(id)
      const node = byId.get(id)
      if (!node) {
        issue = '自身或上级的父节点不存在或已删除'
        break
      }
      const parentId = Number(config.parentId(node))
      if (!Number.isSafeInteger(parentId) || parentId < 0) {
        issue = '自身或上级的父级编号无效'
        break
      }
      if (parentId === id) {
        issue = '自身或上级指向自己'
        break
      }
      if (parentId !== 0) {
        const parent = byId.get(parentId)
        if (!parent) {
          issue = '自身或上级的父节点不存在或已删除'
          break
        }
        if (config.appId && config.appId(node) !== config.appId(parent)) {
          issue = '自身或上级存在跨应用父子关系'
          break
        }
      }
      id = parentId
    }
    for (const entry of path) issues.set(entry, issue)
  }
  return { sorted, byId, children, issues, config }
}

export type TreeModel<E extends Entity> = ReturnType<typeof buildTree<E>>

export function descendants<E extends Entity>(model: TreeModel<E>, id: number) {
  const found = new Set<number>()
  const pending = [...(model.children.get(id) ?? [])]
  while (pending.length) {
    const child = pending.pop()
    if (child === undefined) break
    if (found.has(child)) continue
    found.add(child)
    pending.push(...(model.children.get(child) ?? []))
  }
  return found
}

function parentIdOf<E extends Entity>(model: TreeModel<E>, id: number) {
  const row = model.byId.get(id)
  return row ? Number(model.config.parentId(row)) : 0
}

export function ancestors<E extends Entity>(model: TreeModel<E>, id: number) {
  const found: number[] = []
  const seen = new Set<number>([id])
  let parent = parentIdOf(model, id)
  while (parent !== 0 && model.byId.has(parent) && !seen.has(parent)) {
    found.push(parent)
    seen.add(parent)
    parent = parentIdOf(model, parent)
  }
  return found
}

export function treeView<E extends Entity>(model: TreeModel<E>, keyword: string) {
  const needle = keyword.trim().toLowerCase()
  const matches = new Set<number>()
  for (const row of model.sorted) {
    if (
      !needle ||
      model.config.searchFields.some((field) =>
        fieldText(row[field] ?? '')
          .toLowerCase()
          .includes(needle)
      )
    ) {
      matches.add(Number(row.id))
    }
  }
  const visible = new Set(matches)
  if (needle) {
    // 分别遍历一次上下两个方向，避免父级命中时重复扫描整条分支。
    for (const direction of ['up', 'down'] as const) {
      const seen = new Set<number>()
      const pending = [...matches]
      while (pending.length) {
        const id = pending.pop()
        if (id === undefined) break
        if (seen.has(id)) continue
        seen.add(id)
        visible.add(id)
        const next = direction === 'up' ? [parentIdOf(model, id)] : (model.children.get(id) ?? [])
        for (const child of next) if (model.byId.has(child)) pending.push(child)
      }
    }
  }
  const nodes = new Map<number, TreeRow<E>>()
  const roots: TreeRow<E>[] = []
  const abnormal: TreeRow<E>[] = []
  for (const row of model.sorted) {
    const id = Number(row.id)
    if (visible.has(id))
      nodes.set(id, { kind: 'record', record: row, id, treeIssue: model.issues.get(id) })
  }
  for (const [id, node] of nodes) {
    if (model.issues.get(id)) {
      abnormal.push(node)
      continue
    }
    if (node.kind !== 'record') continue
    const parent = nodes.get(Number(model.config.parentId(node.record)))
    if (parent) (parent.children ??= []).push(node)
    else roots.push(node)
  }
  if (abnormal.length)
    roots.push({
      id: ISSUE_GROUP,
      kind: 'group',
      children: abnormal
    })
  const expandable = [...nodes.values()].filter((row) => row.children?.length).map((row) => row.id)
  if (abnormal.length) expandable.push(ISSUE_GROUP)
  return { roots, matches, visible, expandable }
}

export function parentOptions<E extends Entity>(
  model: TreeModel<E>,
  editingId: number | null,
  appsId: number | null | undefined
) {
  const excluded =
    editingId === null ? new Set<number>() : descendants(model, editingId).add(editingId)
  return model.sorted
    .filter(
      (row) =>
        !excluded.has(Number(row.id)) &&
        !model.issues.get(Number(row.id)) &&
        (!model.config.appId || model.config.appId(row) === (appsId ?? null))
    )
    .map((row) => {
      const title = `${treeLabel(row, model.config)}（${fieldText(row.id)}）`
      return {
        id: Number(row.id),
        pId: Number(model.config.parentId(row)),
        value: Number(row.id),
        title,
        searchText: model.config.parentSearchFields
          ? model.config.parentSearchFields.map((field) => fieldText(row[field] ?? '')).join(' ')
          : title
      }
    })
}
