import { expect } from './browser.mjs'

export const resourcePages = [
  ['/auth/users', '用户'],
  ['/auth/tenants', '租户'],
  ['/auth/apps-infos', '应用'],
  ['/auth/apps-users', '应用用户'],
  ['/auth/crud-infos', '功能'],
  ['/auth/crud-items', '功能接口'],
  ['/auth/crud-menus', '菜单'],
  ['/auth/crud-roles', '功能角色'],
  ['/auth/crud-role-cruds', '角色功能'],
  ['/auth/crud-role-users', '角色用户'],
  ['/auth/data-roles', '数据角色'],
  ['/auth/data-role-users', '数据角色用户'],
  ['/bzss/companies', '公司'],
  ['/bzss/projects', '项目'],
  ['/unit/departments', '部门'],
  ['/unit/employees', '员工']
]

const treePaths = new Set([
  'apps-infos',
  'crud-infos',
  'crud-items',
  'crud-menus',
  'crud-roles',
  'data-roles'
])
const audit = {
  tenantId: null,
  parentId: 0,
  sortIndex: 0,
  remark: '',
  isDeleted: false,
  creatorId: 1,
  creatorNic: '演示管理员',
  createTime: '2026-01-01T08:00:00',
  updaterId: null,
  updaterNic: null,
  updateTime: null,
  deleterId: null,
  deleterNic: null,
  deleteTime: null
}

function records() {
  const result = new Map(resourcePages.map(([path]) => [path, [{ ...audit, id: 1 }]]))
  result.set(
    '/auth/users',
    Array.from({ length: 31 }, (_, index) => ({
      ...audit,
      id: index + 1,
      userName: `user${String(index + 1).padStart(2, '0')}`,
      nickName: `演示用户 ${index + 1}`,
      avatar: '',
      phone: '010-12345678',
      email: `user${index + 1}@example.test`,
      isAdmin: index === 0,
      isActived: true
    }))
  )
  result.set(
    '/auth/tenants',
    Array.from({ length: 25 }, (_, index) => ({
      ...audit,
      id: index + 1,
      tenantCode: `T${index + 1}`,
      tenantName: `演示租户 ${index + 1}`,
      isActived: true
    }))
  )
  result.set('/auth/apps-infos', [
    { ...audit, id: 1, appsCode: 'demo', appsName: '演示应用', appKey: 'demo', appSecret: '' }
  ])
  result.set('/auth/crud-infos', [
    { ...audit, id: 1, appsId: 1, crudCode: 'demo', crudName: '演示功能' }
  ])
  result.set('/auth/crud-items', [
    { ...audit, id: 1, crudId: 1, apiPath: '/demo', httpMethod: 'GET' }
  ])
  result.set('/auth/crud-menus', [
    {
      ...audit,
      id: 1,
      crudId: null,
      menuCode: 'admin',
      menuName: '权限管理',
      menuType: 'dir',
      iconName: 'SettingOutlined',
      routePath: '',
      redirect: '',
      openType: false,
      isHided: false,
      allowAny: false
    },
    {
      ...audit,
      id: 2,
      parentId: 1,
      crudId: null,
      menuCode: 'users',
      menuName: '用户维护',
      menuType: 'menu',
      iconName: 'UserOutlined',
      routePath: '/auth/users',
      redirect: '',
      openType: false,
      isHided: false,
      allowAny: false
    },
    {
      ...audit,
      id: 3,
      parentId: 999,
      crudId: null,
      menuCode: 'orphan',
      menuName: '待整理菜单',
      menuType: 'menu',
      iconName: 'FolderOutlined',
      routePath: '',
      redirect: '',
      openType: false,
      isHided: false,
      allowAny: false
    }
  ])
  result.set('/auth/crud-roles', [
    { ...audit, id: 1, appsId: 1, roleName: '演示角色', roleCode: 'demo' }
  ])
  result.set('/auth/data-roles', [
    { ...audit, id: 1, appsId: 1, roleName: '演示数据角色', roleCode: 'demo' }
  ])
  result.set('/auth/apps-users', [{ ...audit, id: 1, appsId: 1, userId: 1, isAdmin: false }])
  result.set('/auth/crud-role-cruds', [{ ...audit, id: 1, crudRoleId: 1, crudInfoId: 1 }])
  result.set('/auth/crud-role-users', [{ ...audit, id: 1, crudRoleId: 1, userId: 1 }])
  result.set('/auth/data-role-users', [{ ...audit, id: 1, dataRoleId: 1, userId: 1 }])
  result.set('/bzss/companies', [
    {
      ...audit,
      id: 1,
      nameCn: '演示公司',
      nameEn: 'Demo',
      registratioNo: 'D001',
      legalName: '演示人员',
      countryId: null,
      regDate: '2026-01-01T08:00:00',
      classify: null,
      currency: 'CNY'
    }
  ])
  result.set('/bzss/projects', [{ ...audit, id: 1, projCode: 'P01', projName: '演示项目' }])
  result.set('/unit/departments', [
    { ...audit, id: 1, deptName: '演示部门', deptCode: 'D01', companyId: null, managerId: null }
  ])
  result.set('/unit/employees', [
    {
      ...audit,
      id: 1,
      nameCn: '演示员工',
      nameEn: '',
      departmentId: 1,
      userId: 1,
      employeeCode: 'E01',
      email: 'employee@example.test'
    }
  ])
  return result
}

export const success = (data) => ({ code: 200, message: 'ok', data })

export async function installWorkspace(context) {
  const data = records()
  const calls = []
  const menus = [
    {
      id: 1000,
      parentId: 0,
      menuName: '系统维护',
      menuUrl: '',
      menuIcon: 'SettingOutlined',
      children: resourcePages.map(([path, title], index) => ({
        id: index + 1,
        parentId: 1000,
        menuName: title,
        menuUrl: path,
        menuIcon: 'AppstoreOutlined',
        children: []
      }))
    }
  ]
  await context.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()
    calls.push({
      method,
      path,
      query: Object.fromEntries(url.searchParams),
      body: request.postDataJSON()
    })
    if (path === '/auth/login' && method === 'POST') {
      await route.fulfill({
        json: success({ userName: 'ui-review', nickName: '界面验收', token: 'mock-ui-token' })
      })
      return
    }
    if (path === '/auth/menus' && method === 'GET') {
      await route.fulfill({ json: success(menus) })
      return
    }
    const match = path.match(/^(.*)\/(\d+)$/)
    const base = match ? match[1] : path
    if (!data.has(base)) return route.fallback()
    const rows = data.get(base)
    const id = match ? Number(match[2]) : null
    if (method === 'GET') {
      if (id !== null)
        await route.fulfill({ json: success(rows.find((row) => row.id === id) ?? null) })
      else {
        const keyword = url.searchParams.get('keyword')?.toLowerCase()
        const filtered = keyword
          ? rows.filter((row) =>
              Object.values(row).some(
                (value) => typeof value === 'string' && value.toLowerCase().includes(keyword)
              )
            )
          : rows
        const all = treePaths.has(base.split('/').at(-1))
        const size = Number(url.searchParams.get('size') || 20)
        const page = Number(url.searchParams.get('page') || 1)
        await route.fulfill({
          json: success({
            items: all ? filtered : filtered.slice((page - 1) * size, page * size),
            total: filtered.length
          })
        })
      }
    } else if (method === 'POST' && id === null) {
      const created = Math.max(0, ...rows.map((row) => row.id)) + 1
      rows.push({ ...audit, ...request.postDataJSON(), id: created })
      await route.fulfill({ json: success(created) })
    } else if (method === 'PUT' && id !== null) {
      const index = rows.findIndex((row) => row.id === id)
      rows[index] = { ...rows[index], ...request.postDataJSON() }
      await route.fulfill({ json: success(null) })
    } else if (method === 'DELETE' && id !== null) {
      data.set(
        base,
        rows.filter((row) => row.id !== id)
      )
      await route.fulfill({ json: success(null) })
    } else await route.fallback()
  })
  return { data, calls, menus }
}

export async function loginWorkspace(page) {
  await page.goto('/#/login')
  await page.getByLabel('用户名', { exact: true }).fill('ui-review')
  await page.getByLabel('密码', { exact: true }).fill('Mock-ui-password!')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page).toHaveURL(/#\/home$/)
  // Hash 已变化时路由模块仍可能在加载；等工作区挂载后再开始下一次导航。
  await expect(page.getByRole('heading', { name: /^欢迎，/ })).toBeVisible()
}

export async function openResource(page, path, title) {
  await page.goto(`/#${path}`)
  const resource = page.getByRole('region', { name: `${title}管理`, exact: true })
  await expect(resource).toBeVisible()
  await expect(resource.getByRole('button', { name: /^(新增|新增顶级)$/ })).toBeEnabled()
}

export async function noPageOverflow(page) {
  // 主内容区独立滚动时，html 的宽度仍可能正常；表格自身的横向滚动不在此限制内。
  await expect
    .poll(() =>
      page.locator('html, body, #root, main, main .ant-breadcrumb').evaluateAll((elements) =>
        elements.flatMap((element) => {
          const bounds = element.getBoundingClientRect()
          const width = element.ownerDocument.defaultView.innerWidth
          return element.scrollWidth > element.clientWidth + 1 ||
            bounds.left < -1 ||
            bounds.right > width + 1
            ? [
                {
                  element: element.tagName,
                  className: element.className,
                  clientWidth: element.clientWidth,
                  scrollWidth: element.scrollWidth,
                  left: bounds.left,
                  right: bounds.right
                }
              ]
            : []
        })
      )
    )
    .toEqual([])
}

export async function assertDialogFits(page, dialog) {
  await expect(dialog).toBeVisible()
  const box = await dialog.boundingBox()
  const viewport = page.viewportSize()
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
  expect(box.y).toBeGreaterThanOrEqual(7)
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 7)
  const footer = dialog.locator('.ant-modal-footer')
  await expect(footer).toBeInViewport({ ratio: 1 })
  await expect(dialog.locator('.ant-modal-header')).toBeInViewport({ ratio: 1 })
}

export async function selectTheme(page, label) {
  await page.getByRole('button', { name: /切换主题/ }).click()
  await page.getByRole('menuitem', { name: label, exact: true }).click()
}
