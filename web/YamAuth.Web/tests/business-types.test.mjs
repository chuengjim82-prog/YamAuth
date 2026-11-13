import assert from 'node:assert/strict'
import { test, after } from 'node:test'
import { createServer } from 'vite'
import path from 'node:path'

// 使用项目现有 Vite 加载真实 TS 模块，不引入额外测试框架或复制被测逻辑。
const server = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, ws: false },
  resolve: { alias: { '@': path.resolve('src') } }
})
after(() => server.close())
const authForms = await server.ssrLoadModule('/src/resources/forms/auth.ts')
const unitForms = await server.ssrLoadModule('/src/resources/forms/unit.ts')
const bzssForms = await server.ssrLoadModule('/src/resources/forms/bzss.ts')
const trees = await server.ssrLoadModule('/src/pages/Crud/tree.ts')

const treeConfig = {
  nameField: 'name',
  searchFields: ['name'],
  parentId: (row) => row.parentId,
  sortIndex: (row) => row.sortIndex,
  appId: (row) => row.appsId
}
const row = (id, parentId, name, appsId = 1, sortIndex = 0) => ({
  id,
  parentId,
  name,
  appsId,
  sortIndex
})

test('用户编辑空密码省略；输入新密码按原文提交', () => {
  const form = authForms.userToForm({ userName: 'tester', nickName: '测试', tenantId: null })
  assert.equal(form.password, '')
  assert.equal(Object.hasOwn(authForms.userToUpdate(form), 'password'), false)
  assert.equal(
    authForms.userToUpdate({ ...form, password: '  new-password  ' }).password,
    '  new-password  '
  )
  assert.equal(
    authForms.userToCreate({ ...form, password: 'new-password' }).password,
    'new-password'
  )
})

test('应用密钥编辑保留原值，转换不套用用户密码的省略规则', () => {
  const form = authForms.appsInfoToForm({ appSecret: 'original', parentId: 0 })
  assert.equal(authForms.appsInfoToUpdate(form).appSecret, 'original')
  assert.equal(authForms.appsInfoToUpdate({ ...form, appSecret: '' }).appSecret, '')
  assert.equal(form.parentId, 0)
  assert.equal(authForms.appsInfoToForm().parentId, null)
  assert.equal(authForms.crudInfoToForm().parentId, 0)
})

test('公司日期使用 Dayjs 编辑，提交格式与空值保持原约定', () => {
  const form = bzssForms.companyToForm({ regDate: '2026-11-13T09:08:07', countryId: null })
  assert.equal(form.regDate.format('YYYY-MM-DD HH:mm:ss'), '2026-11-13 09:08:07')
  assert.equal(bzssForms.companyToCreate(form).regDate, '2026-11-13 09:08:07')
  assert.equal(bzssForms.companyToUpdate({ ...form, regDate: null }).regDate, null)
  assert.equal(bzssForms.companyToCreate(form).countryId, null)
  assert.throws(
    () => bzssForms.companyToCreate(bzssForms.companyToForm({ regDate: 'invalid' })),
    /日期无效/
  )
})

test('非空数字的清空中间态不能伪装成合法请求；可空关联保留 null', () => {
  assert.throws(
    () => authForms.crudItemToCreate({ ...authForms.crudItemToForm(), parentId: undefined }),
    /请填写上级/
  )
  assert.equal(unitForms.employeeToCreate(unitForms.employeeToForm()).departmentId, null)
  assert.equal(
    authForms.crudItemToUpdate({ ...authForms.crudItemToForm(), method: 'CUSTOM' }).method,
    'CUSTOM'
  )
})

test('树保持稳定排序、搜索祖先与后代，并排除自身与后代父级候选', () => {
  const model = trees.buildTree(
    [row(3, 1, '叶子'), row(1, 0, '根'), row(2, 1, '分支', 1, -1), row(4, 2, '孙节点')],
    treeConfig
  )
  assert.deepEqual(
    model.sorted.map((item) => item.id),
    [2, 1, 3, 4]
  )
  assert.deepEqual(trees.ancestors(model, 4), [2, 1])
  const view = trees.treeView(model, '分支')
  assert.deepEqual([...view.matches], [2])
  assert.deepEqual([...view.visible].sort(), [1, 2, 4])
  assert.equal(view.roots[0].kind, 'record')
  assert.equal(view.roots[0].record.name, '根')
  assert.deepEqual(
    trees.parentOptions(model, 2, 1).map((option) => option.value),
    [1, 3]
  )
})

test('孤儿、自环、无根环和跨应用父链归入异常分组，不假扮实体', () => {
  const model = trees.buildTree(
    [
      row(1, 99, '孤儿'),
      row(2, 2, '自环'),
      row(3, 4, '循环甲'),
      row(4, 3, '循环乙'),
      row(5, 0, '正常'),
      row(6, 5, '跨应用', 2)
    ],
    treeConfig
  )
  assert.equal(model.issues.get(5), '')
  for (const id of [1, 2, 3, 4, 6]) assert.ok(model.issues.get(id))
  const group = trees.treeView(model, '').roots.find((node) => node.kind === 'group')
  assert.equal(group.id, trees.ISSUE_GROUP)
  assert.equal(Object.hasOwn(group, 'record'), false)
  assert.equal(group.children.length, 5)
  assert.deepEqual(
    trees.parentOptions(model, null, 1).map((option) => option.value),
    [5]
  )
})

test('全量查询保留完整性与重复编号检查', () => {
  assert.throws(() => trees.validateTreeResult({ total: 2, items: [{ id: 1 }] }), /不完整/)
  assert.throws(() => trees.validateTreeResult({ total: 2, items: [{ id: 1 }, { id: 1 }] }), /编号/)
  assert.throws(() => trees.validateTreeResult({ total: 1, items: [{ id: -1 }] }), /编号/)
  trees.validateTreeResult({ total: 0, items: [] })
})
