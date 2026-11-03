import type { TreeDef } from '@/resources'
import type { Row } from '@/types'

export const ISSUE_GROUP = '__tree_issues__'
export interface TreeRow extends Row {
  id: number | string
  children?: TreeRow[]
  treeIssue?: string
  treeGroup?: boolean
}

export function buildTree(items: Row[], config: TreeDef) {
  const sorted = [...items].sort((a, b) => Number(a.sortIndex) - Number(b.sortIndex) || Number(a.id) - Number(b.id))
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
      if (issues.has(id)) { issue = issues.get(id)!; break }
      if (seen.has(id)) { issue = '自身或上级存在循环关系'; break }
      seen.add(id)
      path.push(id)
      const node = byId.get(id)!
      const parentId = Number(node.parentId)
      if (!Number.isSafeInteger(parentId) || parentId < 0) { issue = '自身或上级的父级编号无效'; break }
      if (parentId === id) { issue = '自身或上级指向自己'; break }
      if (parentId !== 0) {
        const parent = byId.get(parentId)
        if (!parent) { issue = '自身或上级的父节点不存在或已删除'; break }
        if (config.appScoped && (node.appsId ?? null) !== (parent.appsId ?? null)) {
          issue = '自身或上级存在跨应用父子关系'; break
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
    if (!needle || model.config.searchFields.some((field) => String(row[field] ?? '').toLowerCase().includes(needle))) {
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
        const next = direction === 'up' ? [Number(model.byId.get(id)?.parentId ?? 0)] : model.children.get(id) ?? []
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
    if (model.issues.get(id)) { abnormal.push(node); continue }
    const parent = nodes.get(Number(node.parentId))
    if (parent) (parent.children ??= []).push(node)
    else roots.push(node)
  }
  if (abnormal.length) roots.push({ id: ISSUE_GROUP, treeGroup: true, [model.config.nameField]: '层级异常', children: abnormal })
  const expandable = [...nodes.values()].filter((row) => row.children?.length).map((row) => row.id)
  if (abnormal.length) expandable.push(ISSUE_GROUP)
  return { roots, matches, visible, expandable }
}

export function parentOptions(model: TreeModel, editingId: number | null, appsId: unknown) {
  const excluded = editingId === null ? new Set<number>() : descendants(model, editingId).add(editingId)
  return model.sorted.filter((row) => !excluded.has(Number(row.id)) && !model.issues.get(Number(row.id))
    && (!model.config.appScoped || (row.appsId ?? null) === (appsId ?? null)))
    .map((row) => ({ id: Number(row.id), pId: Number(row.parentId), value: Number(row.id), title: `${row[model.config.nameField] || '未命名'}（${row.id}）` }))
}
