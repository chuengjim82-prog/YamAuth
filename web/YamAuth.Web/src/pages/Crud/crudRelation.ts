import { crudInfoApi, crudRoleApi } from '@/api/entities'
import { buildTree, validateTreeResult } from './tree'

export type CrudRelationKind = 'crudRole' | 'crudInfoId'
export const crudRelationNames = { crudRole: '功能角色', crudInfoId: '功能' }

interface RelationNode {
  id: number
  parentId: number
  name: string | null
  sortIndex: number | null
  appsId: number | null
}

export async function loadCrudRelationOptions(kind: CrudRelationKind) {
  let nodes: RelationNode[]
  if (kind === 'crudRole') {
    const data = await crudRoleApi.all()
    validateTreeResult(data)
    nodes = data.items.map((row) => ({ ...row, name: row.roleName }))
  } else {
    const data = await crudInfoApi.all()
    validateTreeResult(data)
    nodes = data.items.map((row) => ({ ...row, name: row.crudName }))
  }
  const model = buildTree(nodes, {
    nameField: 'name',
    searchFields: ['name', 'id'],
    parentId: (row) => row.parentId,
    sortIndex: (row) => row.sortIndex,
    // 角色允许跨应用父子关系；仅功能树沿用同应用约束。
    ...(kind === 'crudInfoId' ? { appId: (row: RelationNode) => row.appsId } : {})
  })
  return model.sorted.map((row) => ({
    id: row.id,
    // 异常父链提升到根节点，避免历史关联无法展示或选择。
    pId: model.issues.get(row.id) ? 0 : row.parentId,
    value: row.id,
    title: `${row.name || `未命名${crudRelationNames[kind]}`}（编号：${row.id}）`,
    searchText: `${row.name ?? ''} ${row.id}`
  }))
}
