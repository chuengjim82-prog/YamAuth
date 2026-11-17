import { test, expect } from './helpers/browser.mjs'
import {
  installWorkspace,
  loginWorkspace,
  openResource,
  resourcePages,
  noPageOverflow,
  assertDialogFits,
  selectTheme,
  success
} from './helpers/workspace.mjs'

const backends = new WeakMap()
test.beforeEach(async ({ page, context }) => {
  backends.set(page, await installWorkspace(context))
  await loginWorkspace(page)
})

async function cancel(dialog) {
  await dialog.getByRole('button', { name: /取\s*消/ }).click()
  await expect(dialog).toBeHidden()
}

async function colorContrast(input) {
  return input.evaluate((element) => {
    const view = element.ownerDocument.defaultView
    const style = view.getComputedStyle(element)
    const wrapper = element.closest('.ant-input-affix-wrapper') ?? element
    const bg = view.getComputedStyle(wrapper).backgroundColor
    const luminance = (color) =>
      color
        .match(/\d+(?:\.\d+)?/g)
        .slice(0, 3)
        .map(Number)
        .map((channel) => {
          const c = channel / 255
          return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
        })
        .reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0)
    const ratio = (color) =>
      (Math.max(luminance(color), luminance(bg)) + 0.05) /
      (Math.min(luminance(color), luminance(bg)) + 0.05)
    return {
      text: ratio(style.color),
      placeholder: ratio(view.getComputedStyle(element, '::placeholder').color)
    }
  })
}

async function assertPickerPanelFits(panel) {
  await expect(panel).toBeVisible()
  // 浮层外框可见不代表内部没有被裁切，需检查内容宽度、所有日期格和翻页按钮。
  await expect
    .poll(() =>
      panel.evaluate((element) => {
        const container = element.closest('.ant-picker-panel-container')
        const bounds = container.getBoundingClientRect()
        const view = element.ownerDocument.defaultView
        const clipped = [...element.querySelectorAll('.ant-picker-cell, .ant-picker-header button')]
          .filter((control) => {
            const rect = control.getBoundingClientRect()
            if (
              !rect.width ||
              !rect.height ||
              view.getComputedStyle(control).visibility === 'hidden'
            )
              return false
            return (
              rect.left < Math.max(bounds.left, 0) - 1 ||
              rect.right > Math.min(bounds.right, view.innerWidth) + 1 ||
              rect.top < Math.max(bounds.top, 0) - 1 ||
              rect.bottom > Math.min(bounds.bottom, view.innerHeight) + 1
            )
          })
          .map((control) => control.getAttribute('aria-label') || control.textContent)
        return { overflow: container.scrollWidth > container.clientWidth + 1, clipped }
      })
    )
    .toEqual({ overflow: false, clipped: [] })
}

test('品牌、主题、首页及导航在深浅模式和窄屏下保持一致', async ({ page }, testInfo) => {
  await expect(page.getByText('登录成功', { exact: true })).toBeHidden()
  for (const [label, mode] of [
    ['浅色主题', 'light'],
    ['深色主题', 'dark']
  ]) {
    await selectTheme(page, label)
    await expect(page).toHaveTitle('首页 · 管理工作台')
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /login-emblem\.svg/)
    await expect(page.getByText('从导航菜单进入用户、权限、公司和部门等维护页面。')).toBeVisible()
    await noPageOverflow(page)
    await page.screenshot({ path: testInfo.outputPath(`home-${mode}.png`), fullPage: true })
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', mode)
  }
  if (page.viewportSize().width < 768) {
    const trigger = page.getByRole('button', { name: '打开导航菜单' })
    await trigger.click()
    const drawer = page.getByRole('dialog', { name: '管理工作台' })
    await expect(drawer).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(trigger).toBeFocused()
    await trigger.click()
    await drawer.getByRole('menuitem', { name: '系统维护' }).click()
    await page.screenshot({ path: testInfo.outputPath('navigation-dark.png'), fullPage: true })
    await drawer.getByRole('menuitem', { name: '用户', exact: true }).click()
    await expect(drawer).toBeHidden()
    await expect(page).toHaveURL(/#\/auth\/users$/)
  } else {
    await page.getByRole('button', { name: '收起菜单' }).click()
    await page.getByRole('button', { name: '展开菜单' }).click()
    await page.getByRole('menuitem', { name: '系统维护' }).click()
    await page.getByRole('menuitem', { name: '用户', exact: true }).click()
  }
  await expect(page).toHaveTitle('用户 · 管理工作台')
  await page.goto('/#/missing-page')
  await expect(page.getByText('未找到页面', { exact: true })).toBeVisible()
  await expect(page).toHaveTitle('未找到页面 · 管理工作台')
  await noPageOverflow(page)
})

test('折叠导航支持多级浮层和键盘操作，并保留目录展开状态', async ({ page }, testInfo) => {
  test.skip(page.viewportSize().width < 768, '桌面折叠导航用例')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const menus = backends.get(page).menus
  const accountMenus = menus[0].children.splice(0, 2)
  menus[0].children.unshift({
    id: 1001,
    parentId: 1000,
    menuName: '账号管理',
    menuUrl: '',
    menuIcon: 'TeamOutlined',
    children: accountMenus.map((item) => ({ ...item, parentId: 1001 }))
  })
  menus.push({
    id: 2000,
    parentId: 0,
    menuName: '其他目录',
    menuUrl: '',
    menuIcon: 'FolderOutlined',
    children: [
      {
        id: 2001,
        parentId: 2000,
        menuName: '工作台首页',
        menuUrl: '/home',
        menuIcon: 'HomeOutlined',
        children: []
      }
    ]
  })
  await openResource(page, '/auth/users', '用户')
  await page.reload()
  const directory = page.getByRole('menuitem', { name: '系统维护', exact: true })
  const accounts = page.getByRole('menuitem', { name: '账号管理', exact: true })
  const other = page.getByRole('menuitem', { name: '其他目录', exact: true })
  const popups = page.locator('.ant-menu-submenu-popup:visible')
  const popupAccounts = popups.getByRole('menuitem', { name: '账号管理', exact: true })
  const collapse = async () => {
    await page.getByRole('button', { name: '收起菜单' }).click()
    // 等内联目录退出动画结束，再操作浮层，避免键盘定位到即将卸载的节点。
    await expect(page.locator('aside .ant-menu-inline')).toHaveCount(0)
  }
  await expect(accounts).toHaveAttribute('aria-expanded', 'true')
  await other.click()
  await accounts.click()
  await expect(accounts).toHaveAttribute('aria-expanded', 'false')
  await collapse()
  await directory.hover()
  await expect(directory).toHaveAttribute('aria-expanded', 'true')
  await popupAccounts.hover()
  await expect(page.getByRole('menuitem', { name: '用户', exact: true })).toBeVisible()
  await page.getByRole('link', { name: '管理工作台', exact: true }).hover()
  await expect(popups).toHaveCount(0)
  await page.getByRole('button', { name: '展开菜单' }).click()
  await expect(directory).toHaveAttribute('aria-expanded', 'true')
  await expect(accounts).toHaveAttribute('aria-expanded', 'false')
  await expect(other).toHaveAttribute('aria-expanded', 'true')

  await collapse()
  await directory.hover()
  await popupAccounts.hover()
  await page.getByRole('menuitem', { name: '租户', exact: true }).click()
  await expect(page).toHaveURL(/#\/auth\/tenants$/)
  await expect(popups).toHaveCount(0)
  await page.getByRole('button', { name: '展开菜单' }).click()
  await expect(accounts).toHaveAttribute('aria-expanded', 'true')
  await expect(other).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('menuitem', { name: '租户', exact: true })).toHaveClass(
    /ant-menu-item-selected/
  )

  await collapse()
  await directory.focus()
  await directory.press('ArrowRight')
  await expect(popupAccounts).toBeFocused()
  await popupAccounts.press('ArrowRight')
  const users = popups.getByRole('menuitem', { name: '用户', exact: true })
  await expect(users).toBeFocused()
  await users.press('Escape')
  await expect(popupAccounts).toBeFocused()
  await expect(users).toBeHidden()
  await popupAccounts.press('ArrowRight')
  await expect(users).toBeFocused()
  await users.press('Enter')
  await expect(page).toHaveURL(/#\/auth\/users$/)
  await expect(popups).toHaveCount(0)

  await directory.hover()
  await expect(directory).toHaveAttribute('aria-expanded', 'true')
  await page.setViewportSize({ width: 767, height: 720 })
  await expect(popups).toHaveCount(0)
  await page.getByRole('button', { name: '打开导航菜单' }).click()
  const drawer = page.getByRole('dialog', { name: '管理工作台' })
  await expect(drawer.getByRole('menuitem', { name: '用户', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await page.setViewportSize({ width: 768, height: 720 })
  await expect(page.getByRole('button', { name: '展开菜单' })).toBeVisible()
  await expect(popups).toHaveCount(0)
  await directory.hover()
  await popupAccounts.hover()
  await expect(users).toBeVisible()
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(users).toBeVisible()
  await expect(users).toHaveCSS('color', 'rgb(182, 205, 177)')
  await expect(users).toHaveCSS('background-color', 'rgb(48, 71, 53)')
  await page.screenshot({ path: testInfo.outputPath('collapsed-navigation.png'), fullPage: true })
  await noPageOverflow(page)
})

test('列表筛选、分页、滚动与主题切换保留编辑输入', async ({ page, context }, testInfo) => {
  await openResource(page, '/auth/users', '用户')
  const keyword = page.getByRole('textbox', { name: '关键字' })
  await keyword.fill('user31')
  await page.getByRole('button', { name: '查询', exact: true }).click()
  await expect(page.getByRole('cell', { name: 'user31', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '重置', exact: true }).click()
  await expect(page.getByRole('cell', { name: 'user01', exact: true })).toBeVisible()
  await page.locator('.ant-pagination-next').click()
  await expect(page.getByRole('cell', { name: 'user21', exact: true })).toBeVisible()
  await page.locator('.ant-pagination-prev').click()
  const scrollbar = page.getByRole('region', { name: '表格横向滚动' })
  await scrollbar.evaluate((element) => {
    element.scrollLeft = 420
  })
  await expect
    .poll(() =>
      page
        .locator('.ant-table-body, .ant-table-content')
        .first()
        .evaluate((element) => element.scrollLeft)
    )
    .toBeGreaterThan(100)
  await scrollbar.evaluate((element) => {
    element.scrollLeft = 0
  })
  for (const [label, mode] of [
    ['浅色主题', 'light'],
    ['深色主题', 'dark']
  ]) {
    await selectTheme(page, label)
    const contrast = await colorContrast(keyword)
    expect(contrast.text).toBeGreaterThanOrEqual(4.5)
    expect(contrast.placeholder).toBeGreaterThanOrEqual(4.5)
    await noPageOverflow(page)
    await page.screenshot({ path: testInfo.outputPath(`users-${mode}.png`), fullPage: true })
  }
  await selectTheme(page, '跟随系统')
  await page.getByRole('button', { name: '新增', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '新增用户' })
  await dialog.getByLabel('用户名', { exact: true }).fill('未提交的输入')
  for (const scheme of ['dark', 'light']) {
    await page.emulateMedia({ colorScheme: scheme })
    await expect(page.locator('html')).toHaveAttribute('data-theme', scheme)
    await expect(dialog.getByLabel('用户名', { exact: true })).toHaveValue('未提交的输入')
    await assertDialogFits(page, dialog)
    await page.screenshot({ path: testInfo.outputPath(`user-form-${scheme}.png`), fullPage: true })
  }
  const other = await context.newPage()
  await other.goto('/#/home')
  await selectTheme(other, '深色主题')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(dialog.getByLabel('用户名', { exact: true })).toHaveValue('未提交的输入')
  await other.close()
  await cancel(dialog)
})

test('新增校验、保存保护、编辑和删除保留原有行为', async ({ page }) => {
  await openResource(page, '/auth/users', '用户')
  await page.getByRole('button', { name: '新增', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '新增用户' })
  await dialog.getByRole('button', { name: /确\s*定/ }).click()
  await expect(dialog.getByText('请输入用户名', { exact: true })).toBeVisible()
  await expect(dialog.getByLabel('用户名', { exact: true })).toBeFocused()
  await dialog.getByLabel('用户名', { exact: true }).fill('created-user')
  await dialog.getByLabel('昵称', { exact: true }).fill('新建测试')
  await dialog.getByLabel('密码', { exact: true }).fill('Mock-created-password!')
  await dialog.getByLabel('邮箱', { exact: true }).fill('new@example.test')
  const pending = []
  await page.route('**/api/v1/auth/users', async (route) => {
    if (route.request().method() === 'POST') pending.push(route)
    else await route.fallback()
  })
  await dialog.getByRole('button', { name: /确\s*定/ }).click()
  await expect.poll(() => pending.length).toBe(1)
  await expect(dialog.getByRole('button', { name: /取\s*消/ })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  const createdValues = {
    userName: 'created-user',
    nickName: '新建测试',
    password: 'Mock-created-password!',
    email: 'new@example.test'
  }
  expect(pending[0].request().postDataJSON()).toMatchObject(createdValues)
  // 释放到同一个模拟后端保存，避免只返回成功却没有新增数据的假阳性。
  await pending[0].fallback()
  await expect(dialog).toBeHidden()
  expect(backends.get(page).data.get('/auth/users')).toEqual(
    expect.arrayContaining([expect.objectContaining(createdValues)])
  )
  await page.getByRole('textbox', { name: '关键字' }).fill('created-user')
  await page.getByRole('button', { name: '查询', exact: true }).click()
  const createdRow = page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: 'created-user', exact: true }) })
  await expect(createdRow).toHaveCount(1)
  await expect(createdRow.getByRole('cell', { name: '新建测试', exact: true })).toBeVisible()
  await expect(createdRow.getByRole('cell', { name: 'new@example.test', exact: true })).toHaveCount(
    1
  )
  await createdRow.getByRole('button', { name: '编辑', exact: true }).click()
  const createdEdit = page.getByRole('dialog', { name: '编辑用户' })
  for (const [label, value] of [
    ['用户名', createdValues.userName],
    ['昵称', createdValues.nickName],
    ['邮箱', createdValues.email]
  ]) {
    await expect(createdEdit.getByLabel(label, { exact: true })).toHaveValue(value)
  }
  await cancel(createdEdit)
  await page.getByRole('button', { name: '重置', exact: true }).click()
  const row = page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: 'user01', exact: true }) })
  await row.getByRole('button', { name: '编辑', exact: true }).click()
  const edit = page.getByRole('dialog', { name: '编辑用户' })
  await edit.getByLabel('昵称', { exact: true }).fill('已更新昵称')
  await edit.getByRole('button', { name: /确\s*定/ }).click()
  await expect(edit).toBeHidden()
  await expect.poll(() => backends.get(page).data.get('/auth/users')[0].nickName).toBe('已更新昵称')
  await row.getByRole('button', { name: '删除', exact: true }).click()
  const confirmation = page.locator('.ant-popconfirm')
  await expect(confirmation.getByText('确认删除？')).toBeVisible()
  await confirmation.getByRole('button', { name: /确\s*定/ }).click()
  await expect(row).toHaveCount(0)
})

test('树列表、搜索、父级保护和双层图标弹窗可操作', async ({ page }, testInfo) => {
  await openResource(page, '/auth/crud-menus', '菜单')
  await page.getByRole('button', { name: '全部展开' }).click()
  const parent = page.getByRole('row').filter({ has: page.getByText('权限管理', { exact: true }) })
  await expect(parent.getByRole('button', { name: '删除', exact: true })).toBeDisabled()
  await page.getByRole('textbox', { name: '关键字' }).fill('用户维护')
  await page.getByRole('button', { name: '查询', exact: true }).click()
  await expect(page.locator('mark').filter({ hasText: '用户维护' })).toBeVisible()
  await page.getByRole('button', { name: '重置' }).click()
  await page.getByRole('button', { name: '全部展开' }).click()
  await expect(page.getByText('层级异常', { exact: true })).toBeVisible()
  await parent.getByRole('button', { name: '编辑', exact: true }).click()
  const outer = page.getByRole('dialog', { name: '编辑菜单' })
  await outer.getByLabel('图标', { exact: true }).click()
  const inner = page.getByRole('dialog', { name: '选择图标' })
  await assertDialogFits(page, inner)
  const search = inner.getByRole('textbox', { name: '搜索图标' })
  await search.fill('锁')
  await search.press('Enter')
  await expect(inner).toBeVisible()
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.screenshot({ path: testInfo.outputPath('icon-picker-dark.png'), fullPage: true })
  await search.press('Escape')
  await expect(inner).toBeHidden()
  await expect(outer).toBeVisible()
  await outer.getByLabel('图标', { exact: true }).click()
  await inner.getByRole('textbox', { name: '搜索图标' }).fill('LockOutlined')
  await inner
    .getByRole('button', { name: /LockOutlined/ })
    .first()
    .click()
  await expect(inner).toBeHidden()
  await outer.getByLabel('菜单名称', { exact: true }).fill('更新后的菜单')
  await outer.getByRole('button', { name: /确\s*定/ }).click()
  await expect(outer).toBeHidden()
  await expect(page.getByText('更新后的菜单', { exact: true })).toBeVisible()
})

test('远程选择器分页、失败重试、失效值及日期面板正确显示', async ({ page }, testInfo) => {
  await openResource(page, '/bzss/companies', '公司')
  await page.getByRole('button', { name: '新增', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '新增公司' })
  const tenant = dialog.getByLabel('租户', { exact: true })
  await tenant.click()
  let dropdown = page.locator('.ant-select-dropdown:visible')
  await dropdown.getByRole('button', { name: '加载更多租户' }).click()
  await expect(dropdown.getByText('已加载全部 25 个租户')).toBeVisible()
  await tenant.fill('演示租户 25')
  await dropdown.getByTitle('演示租户 25（T25）', { exact: true }).click()
  await expect(dialog).toContainText('演示租户 25（T25）')
  await dialog.getByLabel('注册日期', { exact: true }).click()
  const picker = page.locator('.ant-picker-dropdown:visible')
  await expect(picker).toBeVisible()
  const pickerBox = await picker.boundingBox()
  expect(pickerBox.x).toBeGreaterThanOrEqual(0)
  expect(pickerBox.x + pickerBox.width).toBeLessThanOrEqual(page.viewportSize().width + 1)
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(picker.locator('.ant-picker-panel-container')).not.toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)'
  )
  await expect(picker).toBeInViewport({ ratio: 1 })
  await picker.locator('.ant-picker-cell-today').click()
  const selectedDateContrast = await colorContrast(
    picker.locator('.ant-picker-cell-selected .ant-picker-cell-inner')
  )
  expect(selectedDateContrast.text).toBeGreaterThanOrEqual(4.5)
  await expect(picker.getByRole('button', { name: '确定', exact: true })).toBeInViewport({
    ratio: 1
  })
  await expect(page.getByText('登录成功', { exact: true })).toBeHidden()
  await page.screenshot({ path: testInfo.outputPath('date-picker-dark.png'), fullPage: true })
  await picker.getByRole('button', { name: '确定', exact: true }).click()
  await expect(picker).toBeHidden()
  await expect(dialog.getByLabel('注册日期', { exact: true })).not.toHaveValue('')
  await cancel(dialog)
  backends.get(page).data.get('/auth/users')[0].tenantId = 999
  await openResource(page, '/auth/users', '用户')
  await page.getByRole('button', { name: '编辑', exact: true }).first().click()
  const user = page.getByRole('dialog', { name: '编辑用户' })
  await expect(user.getByText('租户不存在或已删除，已保留原值；可清空或重新选择。')).toBeVisible()
  let failed = false
  await page.route('**/api/v1/auth/tenants?*', async (route) => {
    if (!failed) {
      failed = true
      await route.fulfill({ json: { code: 500, message: '模拟租户列表失败', data: null } })
    } else await route.fallback()
  })
  await user.getByLabel('租户', { exact: true }).click()
  await user.getByLabel('租户', { exact: true }).fill('演示租户')
  dropdown = page.locator('.ant-select-dropdown:visible')
  await dropdown.getByRole('button', { name: '重试', exact: true }).click()
  await expect(dropdown.getByRole('button', { name: '加载更多租户' })).toBeVisible()
  await user.getByLabel('租户', { exact: true }).press('Escape')
  await cancel(user)
  await openResource(page, '/unit/employees', '员工')
  await page.getByRole('button', { name: '编辑', exact: true }).first().click()
  const employee = page.getByRole('dialog', { name: '编辑员工' })
  await employee.getByLabel('部门', { exact: true }).click()
  await page
    .locator('.ant-select-dropdown:visible')
    .getByTitle('演示部门（#1）', { exact: true })
    .click()
  await employee.getByLabel('用户', { exact: true }).fill('user02')
  await page
    .locator('.ant-select-dropdown:visible')
    .getByTitle('user02（2）', { exact: true })
    .click()
  await employee.getByRole('button', { name: /确\s*定/ }).click()
  await expect(employee).toBeHidden()
  await expect.poll(() => backends.get(page).data.get('/unit/employees')[0].userId).toBe(2)
  await openResource(page, '/auth/crud-role-cruds', '角色功能')
  await page.getByRole('button', { name: '编辑', exact: true }).first().click()
  const relation = page.getByRole('dialog', { name: '编辑角色功能' })
  await relation.getByLabel('功能角色', { exact: true }).click()
  await page
    .locator('.ant-select-dropdown:visible')
    .getByText('演示角色（编号：1）', { exact: true })
    .click()
  await relation.getByLabel('功能', { exact: true }).click()
  await page
    .locator('.ant-select-dropdown:visible')
    .getByText('演示功能（编号：1）', { exact: true })
    .click()
  await assertDialogFits(page, relation)
  await cancel(relation)
})

test('日期的月、年、年代面板在深浅主题下完整可见并可选择', async ({ page }, testInfo) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await openResource(page, '/bzss/companies', '公司')
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme })
    await page.getByRole('button', { name: '编辑', exact: true }).first().click()
    const dialog = page.getByRole('dialog', { name: '编辑公司' })
    const input = dialog.getByLabel('注册日期', { exact: true })
    await input.click()
    const picker = page.locator('.ant-picker-dropdown:visible')
    await assertPickerPanelFits(picker.locator('.ant-picker-date-panel'))
    await picker.getByRole('button', { name: '选择月份', exact: true }).click()
    const month = picker.locator('.ant-picker-month-panel')
    await assertPickerPanelFits(month)
    await month.getByRole('button', { name: '下一年', exact: true }).click()
    await expect(month.getByRole('button', { name: '选择年份' })).toHaveText('2027年')
    await month.getByRole('button', { name: '上一年', exact: true }).click()
    await expect(month.getByRole('button', { name: '选择年份' })).toHaveText('2026年')
    await page.screenshot({
      path: testInfo.outputPath(`month-picker-${scheme}.png`),
      fullPage: true
    })
    await month.getByRole('button', { name: '选择年份' }).click()
    const year = picker.locator('.ant-picker-year-panel')
    await assertPickerPanelFits(year)
    await year.locator('.ant-picker-header-super-next-btn').click()
    await expect(year.getByRole('button', { name: '选择年代' })).toHaveText('2030年-2039年')
    await year.locator('.ant-picker-header-super-prev-btn').click()
    await year.getByRole('button', { name: '选择年代' }).click()
    const decade = picker.locator('.ant-picker-decade-panel')
    await assertPickerPanelFits(decade)
    await decade.locator('.ant-picker-header-super-next-btn').click()
    await expect(decade.locator('.ant-picker-header-view')).toHaveText('2100年-2199年')
    await decade.locator('.ant-picker-header-super-prev-btn').click()
    await expect(decade.locator('.ant-picker-header-view')).toHaveText('2000年-2099年')
    await page.screenshot({
      path: testInfo.outputPath(`decade-picker-${scheme}.png`),
      fullPage: true
    })
    // 每层都选第三列，确保曾经被裁切的区域能完成实际日期输入。
    await decade.getByRole('cell', { name: '2040-2049', exact: true }).click()
    await assertPickerPanelFits(year)
    await year.getByRole('cell', { name: '2044', exact: true }).click()
    await assertPickerPanelFits(month)
    await month.locator('td[title="2044-12"]').click()
    await assertPickerPanelFits(picker.locator('.ant-picker-date-panel'))
    await picker.locator('td[title="2044-12-31"]').click()
    const timeColumns = picker.locator('.ant-picker-time-panel-column')
    for (const [column, value] of ['08', '15', '30'].entries()) {
      await timeColumns.nth(column).getByText(value, { exact: true }).click()
    }
    await expect(picker.getByRole('button', { name: '确定', exact: true })).toBeInViewport({
      ratio: 1
    })
    await picker.getByRole('button', { name: '确定', exact: true }).click()
    await expect(picker).toBeHidden()
    await expect(input).toHaveValue('2044-12-31 08:15:30')
    await cancel(dialog)
  }
})

test('列表失败与加载遮罩保持筛选和重试可达', async ({ page }, testInfo) => {
  let pending
  await page.route('**/api/v1/auth/users?*', (route) => {
    pending = route
  })
  await page.goto('/#/auth/users')
  await expect(page.getByText('正在加载中')).toBeVisible()
  await expect(page.getByRole('button', { name: '新增', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: '查询', exact: true })).toBeEnabled()
  await expect.poll(() => !!pending).toBe(true)
  await pending.fulfill({ json: { code: 500, message: '模拟列表失败', data: null } })
  await expect(page.getByText('数据加载失败，请重试')).toBeVisible()
  await expect(page.getByText('暂无数据')).toBeHidden()
  await page.screenshot({ path: testInfo.outputPath('list-error.png'), fullPage: true })
  pending = undefined
  await page.getByRole('button', { name: '重新加载', exact: true }).click()
  await expect.poll(() => !!pending).toBe(true)
  await pending.fulfill({ json: success({ items: [], total: 0 }) })
  await expect(page.getByText('暂无数据')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('list-empty.png'), fullPage: true })
  await noPageOverflow(page)
})

test('跨越导航断点不会卸载编辑表单或丢失输入', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', '断点用例仅运行一次')
  await openResource(page, '/auth/users', '用户')
  await page.getByRole('button', { name: '新增', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '新增用户' })
  await dialog.getByLabel('用户名', { exact: true }).fill('断点保留')
  for (const width of [768, 767, 320, 1440]) {
    await page.setViewportSize({ width, height: 720 })
    await expect(dialog.getByLabel('用户名', { exact: true })).toHaveValue('断点保留')
    await assertDialogFits(page, dialog)
    await noPageOverflow(page)
  }
  await cancel(dialog)
  await page.setViewportSize({ width: 767, height: 720 })
  await page.getByRole('button', { name: '打开导航菜单' }).click()
  await expect(page.getByRole('dialog', { name: '管理工作台' })).toBeVisible()
  await page.setViewportSize({ width: 768, height: 720 })
  await expect(page.getByRole('dialog', { name: '管理工作台' })).toBeHidden()
  await page.setViewportSize({ width: 767, height: 720 })
  await expect(page.getByRole('dialog', { name: '管理工作台' })).toBeHidden()
})

test('静态确认框同步主题，长名称不会挤压顶栏与导航', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', '本用例自行切换全部边界视口')
  await page.getByRole('button', { name: '账号菜单' }).click()
  await page.getByRole('menuitem', { name: '退出登录' }).click()
  const confirmation = page.getByRole('dialog', { name: '确认退出' })
  for (const [scheme, background] of [
    ['dark', 'rgb(30, 44, 37)'],
    ['light', 'rgb(255, 255, 255)']
  ]) {
    await page.emulateMedia({ colorScheme: scheme })
    await expect(confirmation.locator('.ant-modal-container')).toHaveCSS(
      'background-color',
      background
    )
    await expect(confirmation.getByRole('button', { name: '确定', exact: true })).toBeEnabled()
  }
  await confirmation.getByRole('button', { name: '取消', exact: true }).click()
  await expect(page.getByRole('button', { name: '账号菜单' })).toBeFocused()
  await page.getByRole('button', { name: '账号菜单' }).click()
  await page.getByRole('menuitem', { name: '退出登录' }).click()
  await confirmation.getByRole('button', { name: '确定', exact: true }).click()
  await expect(page).toHaveURL(/#\/login$/)
  const longName = 'LongUsername'.repeat(12)
  const longMenu = '用于验证长名称的组织与权限维护导航目录'
  backends.get(page).menus[0].menuName = longMenu
  await page.route('**/api/v1/auth/login', (route) =>
    route.fulfill({
      json: success({ userName: 'ui-review', nickName: longName, token: 'mock-ui-token' })
    })
  )
  await loginWorkspace(page)
  for (const width of [1440, 768, 767, 600, 480, 479, 320]) {
    await page.setViewportSize({ width, height: 720 })
    await expect(page.getByRole('button', { name: '打开导航菜单' })).toHaveCount(
      width < 768 ? 1 : 0
    )
    const brand = page.getByRole('link', { name: '管理工作台', exact: true })
    const theme = page.getByRole('button', { name: /切换主题/ })
    const account = page.getByRole('button', { name: '账号菜单' })
    for (const item of [brand, theme, account]) await expect(item).toBeInViewport({ ratio: 1 })
    const brandBox = await brand.boundingBox()
    const themeBox = await theme.boundingBox()
    const accountBox = await account.boundingBox()
    expect(brandBox.x + brandBox.width).toBeLessThanOrEqual(themeBox.x - 4)
    expect(themeBox.x + themeBox.width).toBeLessThanOrEqual(accountBox.x)
    await noPageOverflow(page)
    await expect(page.getByRole('heading', { name: `欢迎，${longName}` })).toBeVisible()
  }
  await page.getByRole('button', { name: '打开导航菜单' }).click()
  const drawer = page.getByRole('dialog', { name: '管理工作台' })
  await drawer.getByRole('menuitem', { name: longMenu, exact: true }).click()
  await expect(drawer).toBeInViewport({ ratio: 1 })
  await drawer.getByRole('menuitem', { name: '用户', exact: true }).click()
  await expect(drawer).toBeHidden()
  await noPageOverflow(page)
  for (const menuName of [longMenu, 'EnterpriseIdentityAndAccessManagementConfiguration']) {
    backends.get(page).menus[0].menuName = menuName
    await page.reload()
    const breadcrumb = page.locator('main .ant-breadcrumb')
    await expect(breadcrumb).toContainText(menuName)
    for (const width of [1440, 1280, 768, 767, 390, 320]) {
      await page.setViewportSize({ width, height: width === 320 ? 568 : 844 })
      await noPageOverflow(page)
      await expect(breadcrumb).toBeInViewport({ ratio: 1 })
      for (const name of ['查询', '重置', '新增']) {
        await expect(page.getByRole('button', { name, exact: true })).toBeInViewport({ ratio: 1 })
      }
    }
  }
  await page.screenshot({ path: testInfo.outputPath('long-breadcrumb.png'), fullPage: true })
})

test('16 个资源页面及编辑表单在深浅主题下完整呈现', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', '全资源同构检查在桌面运行，其他用例覆盖手机控件')
  test.setTimeout(120000)
  for (const mode of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: mode })
    for (const [path, title] of resourcePages) {
      await openResource(page, path, title)
      await expect(page).toHaveTitle(`${title} · 管理工作台`)
      await noPageOverflow(page)
      await page.getByRole('button', { name: /^(新增|新增顶级)$/ }).click()
      const dialog = page.getByRole('dialog', { name: `新增${title}`, exact: true })
      await assertDialogFits(page, dialog)
      await cancel(dialog)
    }
  }
})

// 暂停入口模块，直接观察 React 和 CSS 加载前的文档，防止只验证最终颜色。
test('深色首屏在入口模块加载前后保持一致', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', '首屏脚本只需验证一次')
  await page.addInitScript(() => globalThis.localStorage.setItem('yamauth-theme', 'dark'))
  let entry
  await page.route('**/src/main.tsx', (route) => {
    entry = route
  })
  await page.goto('/?first-paint=1#/login', { waitUntil: 'commit' })
  await expect.poll(() => !!entry).toBe(true)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(21, 31, 27)')
  await entry.continue()
  await expect(page.getByRole('heading', { name: '首页', exact: true })).toBeVisible()
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(21, 31, 27)')
})

test('页面模块失败时显示可操作的错误态并能重新加载', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', '模块失败检查只需运行一次')
  await page.route('**/src/pages/Crud/index.tsx*', (route) => route.abort())
  await page.goto('/#/auth/users')
  await expect(page.getByRole('heading', { name: '页面加载失败' })).toBeVisible()
  // 原生按钮作为错误边界的恢复入口，不能依赖失败模块。
  await expect(page.getByRole('button', { name: '重新加载', exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('page-error.png'), fullPage: true })
  await page.unroute('**/src/pages/Crud/index.tsx*')
  await page.getByRole('button', { name: '重新加载', exact: true }).click()
  await expect(page.getByRole('heading', { name: '用户', exact: true })).toBeVisible()
})
