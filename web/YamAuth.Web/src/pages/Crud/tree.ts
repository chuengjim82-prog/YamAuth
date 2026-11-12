import type { TreeDef } from '@/resources'
import type { PagedResult, Row } from '@/types'
import { fieldText } from './fieldText'

export const ISSUE_GROUP = '__tree_issues__'
export interface TreeRow extends Row {
  id: number | string
  children?: TreeRow[]
  treeIssue?: string
  treeGroup?: boolean
}

/** 全量接口必须交付完整且编号唯一的数据，避免旧后端忽略 all 时展示残缺树。 */
export function validateTreeResult(result: PagedResult<Row>) {
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

export function treeLabel(row: Row, config: TreeDef) {
  return (
    (config.labelFields ?? [config.nameField])
      .map((field) => fieldText(row[field] ?? ''))
      .filter((part) => part.trim())
      .join(' ') || '未命名'
  )
}

export function buildTree(items: Row[], config: TreeDef) {
  const sorted = [...items].sort(
    (a, b) => Number(a.sortIndex ?? 0) - Number(b.sortIndex ?? 0) || Number(a.id) - Number(b.id)
  )
  const byId = new Map(sorted.map((row) => [Number(row.id), row]))
  const children = new Map<number, number[]>()
  for (const row of sorted) {
    const parent = Number(row.parentId)
    if (!children.has(parent)) children.set(parent, [])
    children.get(parent)!.push(Number(row.id))
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
        issue = issues.get(id)!
        break
      }
      if (seen.has(id)) {
        issue = '自身或上级存在循环关系'
        break
      }
      seen.add(id)
      path.push(id)
      const node = byId.get(id)!
      const parentId = Number(node.parentId)
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
        if (config.appScoped && (node.appsId ?? null) !== (parent.appsId ?? null)) {
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

export type TreeModel = ReturnType<typeof buildTree>

export function descendants(model: TreeModel, id: number) {
  const found = new Set<number>()
  const pending = [...(model.children.get(id) ?? [])]
  while (pending.length) {
    const child = pending.pop()!
    if (found.has(child)) continue
    found.add(child)
    pending.push(...(model.children.get(child) ?? []))
  }
  return found
}

export function ancestors(model: TreeModel, id: number) {
  const found: number[] = []
  const seen = new Set<number>([id])
  let parent = Number(model.byId.get(id)?.parentId ?? 0)
  while (parent !== 0 && model.byId.has(parent) && !seen.has(parent)) {
    found.push(parent)
    seen.add(parent)
    parent = Number(model.byId.get(parent)?.parentId ?? 0)
  }
  return found
}

export function treeView(model: TreeModel, keyword: string) {
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
        const id = pending.pop()!
        if (seen.has(id)) continue
        seen.add(id)
        visible.add(id)
        const next =
          direction === 'up'
            ? [Number(model.byId.get(id)?.parentId ?? 0)]
            : (model.children.get(id) ?? [])
        for (const child of next) if (model.byId.has(child)) pending.push(child)
      }
    }
  }
  const nodes = new Map<number, TreeRow>()
  const roots: TreeRow[] = []
  const abnormal: TreeRow[] = []
  for (const row of model.sorted) {
    const id = Number(row.id)
    if (visible.has(id)) nodes.set(id, { ...row, id, treeIssue: model.issues.get(id) })
  }
  for (const [id, node] of nodes) {
    if (model.issues.get(id)) {
      abnormal.push(node)
      continue
    }
    const parent = nodes.get(Number(node.parentId))
    if (parent) (parent.children ??= []).push(node)
    else roots.push(node)
  }
  if (abnormal.length)
    roots.push({
      id: ISSUE_GROUP,
      treeGroup: true,
      [model.config.nameField]: '层级异常',
      children: abnormal
    })
  const expandable = [...nodes.values()].filter((row) => row.children?.length).map((row) => row.id)
  if (abnormal.length) expandable.push(ISSUE_GROUP)
  return { roots, matches, visible, expandable }
}

export function parentOptions(model: TreeModel, editingId: number | null, appsId: unknown) {
  const excluded =
    editingId === null ? new Set<number>() : descendants(model, editingId).add(editingId)
  return model.sorted
    .filter(
      (row) =>
        !excluded.has(Number(row.id)) &&
        !model.issues.get(Number(row.id)) &&
        (!model.config.appScoped || (row.appsId ?? null) === (appsId ?? null))
    )
    .map((row) => {
      const title = `${treeLabel(row, model.config)}（${fieldText(row.id)}）`
      return {
        id: Number(row.id),
        pId: Number(row.parentId),
        value: Number(row.id),
        title,
        searchText: model.config.parentSearchFields
          ? model.config.parentSearchFields.map((field) => fieldText(row[field] ?? '')).join(' ')
          : title
      }
    })
}
