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

const menuTypes = await server.ssrLoadModule('/src/types/auth.ts')
const menuLabels = await server.ssrLoadModule('/src/pages/Crud/menuType.ts')
const { crudMenuResource } = await server.ssrLoadModule('/src/resources/definitions.ts')

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

test('菜单默认值区分顶级、子项和编辑，不按层级修复历史值', () => {
  const { CrudMenuType } = menuTypes
  const root = authForms.crudMenuToForm()
  assert.equal(root.menuType, CrudMenuType.Directory)
  const child = crudMenuResource.tree.form.child(root, { id: 12 })
  assert.equal(child.parentId, 12)
  assert.equal(child.menuType, CrudMenuType.Menu)
  assert.equal(crudMenuResource.tree.form.defaultFromParent.value(0), CrudMenuType.Directory)
  assert.equal(crudMenuResource.tree.form.defaultFromParent.value(12), CrudMenuType.Menu)
  for (const parentId of [0, 12]) {
    for (const menuType of Object.values(CrudMenuType)) {
      const form = authForms.crudMenuToForm({ parentId, menuType })
      assert.equal(form.menuType, menuType)
      assert.equal(authForms.crudMenuToCreate(form).menuType, menuType)
      assert.equal(authForms.crudMenuToUpdate(form).menuType, menuType)
    }
  }
  for (const menuType of [
    undefined,
    null,
    '',
    ' ',
    'directory',
    'page',
    'DIR',
    'Menu',
    ' dir',
    'other'
  ]) {
    assert.equal(menuTypes.isCrudMenuType(menuType), false)
    assert.equal(menuLabels.crudMenuTypeLabel(menuType), '未识别类型')
    const form = authForms.crudMenuToForm({ parentId: 0, menuType })
    assert.equal(form.menuType, undefined)
    assert.throws(() => authForms.crudMenuToUpdate(form), /请选择菜单类型/)
    assert.throws(() => authForms.crudMenuToCreate({ ...form, menuType }), /请选择菜单类型/)
  }
  assert.deepEqual(menuLabels.crudMenuTypeOptions, [
    { value: 'dir', label: '目录' },
    { value: 'menu', label: '菜单' }
  ])
})

test('菜单类型不参与列表关键词搜索，名称搜索保留祖先后代', () => {
  const model = trees.buildTree(
    [
      { id: 1, parentId: 0, sortIndex: 0, menuName: '系统', menuType: 'dir' },
      { id: 2, parentId: 1, sortIndex: 0, menuName: '账户', menuType: 'menu' },
      { id: 3, parentId: 0, sortIndex: 0, menuName: '历史', menuType: 'page' }
    ],
    crudMenuResource.tree
  )
  for (const keyword of ['dir', 'menu', 'page', '目录', '菜单']) {
    assert.equal(trees.treeView(model, keyword).matches.size, 0)
  }
  const view = trees.treeView(model, '账户')
  assert.deepEqual([...view.matches], [2])
  assert.deepEqual([...view.visible].sort(), [1, 2])
})

test('角色关联新增必须选择，编辑保留历史编号且清空不能提交', () => {
  const empty = authForms.crudRoleCrudToForm()
  assert.deepEqual(empty, { crudRoleId: null, crudInfoId: null })
  assert.throws(() => authForms.crudRoleCrudToCreate(empty), /功能角色/)
  assert.throws(() => authForms.crudRoleCrudToCreate({ crudRoleId: 12, crudInfoId: null }), /功能/)
  const historical = authForms.crudRoleCrudToForm({ crudRoleId: 0, crudInfoId: 999 })
  assert.deepEqual(authForms.crudRoleCrudToUpdate(historical), { crudRoleId: 0, crudInfoId: 999 })
  assert.throws(
    () => authForms.crudRoleCrudToUpdate({ ...historical, crudRoleId: null }),
    /功能角色/
  )
  for (const prefix of ['crudRoleUser', 'dataRoleUser']) {
    const toForm = authForms[`${prefix}ToForm`]
    const toCreate = authForms[`${prefix}ToCreate`]
    const toUpdate = authForms[`${prefix}ToUpdate`]
    assert.deepEqual(toForm(), { roleId: null, userId: null })
    assert.throws(() => toCreate(toForm()), /角色/)
    assert.throws(() => toCreate({ roleId: 12, userId: null }), /用户/)
    for (const binding of [
      { roleId: 0, userId: 999 },
      { roleId: 999, userId: 0 }
    ]) {
      assert.deepEqual(toUpdate(toForm(binding)), binding)
      assert.throws(() => toUpdate({ ...toForm(binding), roleId: null }), /角色/)
      assert.throws(() => toUpdate({ ...toForm(binding), userId: null }), /用户/)
    }
    assert.deepEqual(toCreate({ roleId: 12, userId: 34 }), { roleId: 12, userId: 34 })
  }
})

test('角色功能选择器保留真实父子关系、失效父链及空名称，并拒绝不完整数据', async () => {
  const { loadCrudRelationOptions } = await server.ssrLoadModule('/src/pages/Crud/crudRelation.ts')
  const { crudRoleApi, dataRoleApi, crudInfoApi } =
    await server.ssrLoadModule('/src/api/entities.ts')
  for (const [kind, api, nameField] of [
    ['crudRole', crudRoleApi, 'roleName'],
    ['dataRole', dataRoleApi, 'roleName'],
    ['crudInfoId', crudInfoApi, 'crudName']
  ]) {
    const original = api.all
    try {
      api.all = async () => ({
        total: 3,
        items: [
          { ...row(1, 0, ''), [nameField]: '根' },
          { ...row(2, 1, ''), [nameField]: '子节点' },
          { ...row(3, 99, ''), [nameField]: null }
        ]
      })
      const options = await loadCrudRelationOptions(kind)
      assert.equal(options.find((item) => item.value === 2).pId, 1)
      assert.equal(options.find((item) => item.value === 2).title, '子节点（编号：2）')
      assert.equal(options.find((item) => item.value === 2).searchText, '子节点 2')
      assert.equal(options.find((item) => item.value === 3).pId, 0)
      assert.match(options.find((item) => item.value === 3).title, /未命名/)
      api.all = async () => ({ total: 2, items: [{ id: 1 }] })
      await assert.rejects(loadCrudRelationOptions(kind), /不完整/)
    } finally {
      api.all = original
    }
  }
})

test('角色选择器保留跨应用父子层级，功能选择器仍检查同应用约束', async () => {
  const { loadCrudRelationOptions } = await server.ssrLoadModule('/src/pages/Crud/crudRelation.ts')
  const { crudRoleApi, dataRoleApi, crudInfoApi } =
    await server.ssrLoadModule('/src/api/entities.ts')
  for (const [kind, api, nameField] of [
    ['crudRole', crudRoleApi, 'roleName'],
    ['dataRole', dataRoleApi, 'roleName'],
    ['crudInfoId', crudInfoApi, 'crudName']
  ]) {
    const original = api.all
    try {
      // 父节点未关联应用或关联不同应用，都不应破坏合法的角色层级。
      for (const parentAppsId of [null, 1]) {
        api.all = async () => ({
          total: 3,
          items: [
            { ...row(1, 0, '', parentAppsId), [nameField]: '根' },
            { ...row(2, 1, '', 10), [nameField]: '子节点' },
            { ...row(3, 2, '', 10), [nameField]: '孙节点' }
          ]
        })
        const options = await loadCrudRelationOptions(kind)
        assert.deepEqual(
          options.map(({ value, pId }) => [value, pId]),
          kind !== 'crudInfoId'
            ? [
                [1, 0],
                [2, 1],
                [3, 2]
              ]
            : [
                [1, 0],
                [2, 0],
                [3, 0]
              ]
        )
      }
    } finally {
      api.all = original
    }
  }
})
