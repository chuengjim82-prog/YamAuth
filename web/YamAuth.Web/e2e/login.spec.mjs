import { test as base, expect } from '@playwright/test'

// 每个用例使用独立上下文。未显式模拟的 API 和外部请求一律阻断并报告。
const test = base.extend({
  page: async ({ page, context, baseURL }, use) => {
    const unexpectedRequests = []
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url())
      if (url.origin !== baseURL || url.pathname.startsWith('/api/')) {
        unexpectedRequests.push(`${route.request().method()} ${url.origin}${url.pathname}`)
        await route.abort()
      } else {
        await route.continue()
      }
    })
    await use(page)
    expect(unexpectedRequests, '不应连接真实后端或漏掉请求模拟').toEqual([])
    expect(pageErrors, '页面不应发生未捕获异常').toEqual([])
  }
})

async function openLogin(page) {
  await page.goto('/#/login')
  await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible()
  await expect(page).toHaveTitle('用户登录 · 管理工作台')
  await expect(page.getByLabel('用户名', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('密码', { exact: true })).toHaveValue('')
}

async function selectTheme(page, label) {
  await page.getByRole('button', { name: /切换主题/ }).click()
  await page.getByRole('menuitem', { name: label, exact: true }).click()
}

async function fillLogin(page) {
  await page.getByLabel('用户名', { exact: true }).fill('login-review')
  await page.getByLabel('密码', { exact: true }).fill('Mock-password-only!')
}

// 读取渲染后的颜色，检查实际对比度，避免测试只重复主题配置。
async function readFieldAppearance(input) {
  return input.evaluate((element) => {
    const root = element.parentElement
    const view = element.ownerDocument.defaultView
    const field = view.getComputedStyle(root)
    const placeholder = view.getComputedStyle(element, '::placeholder')
    const luminance = (color) =>
      color
        .match(/\d+(?:\.\d+)?/g)
        .slice(0, 3)
        .map(Number)
        .map((channel) => {
          const value = channel / 255
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
        })
        .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
    const foreground = luminance(placeholder.color)
    const background = luminance(field.backgroundColor)
    return {
      border: field.borderColor,
      contrast:
        (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
    }
  })
}

test('主题切换保留输入，跟随系统生效，窄屏和文字对比度正常', async ({ page }) => {
  await openLogin(page)
  const userName = page.getByLabel('用户名', { exact: true })
  const password = page.getByLabel('密码', { exact: true })
  await fillLogin(page)

  for (const [label, theme] of [
    ['深色主题', 'dark'],
    ['浅色主题', 'light']
  ]) {
    await selectTheme(page, label)
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    await expect(userName).toHaveValue('login-review')
    await expect(password).toHaveValue('Mock-password-only!')
    expect((await readFieldAppearance(userName)).contrast).toBeGreaterThanOrEqual(4.5)
    await userName.focus()
    await expect
      .poll(async () => (await readFieldAppearance(userName)).contrast)
      .toBeGreaterThanOrEqual(4.5)
    await expect
      .poll(() =>
        page
          .locator('html')
          .evaluate(
            (element) => element.scrollWidth <= element.ownerDocument.defaultView.innerWidth
          )
      )
      .toBe(true)
  }
  await selectTheme(page, '跟随系统')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(password).toHaveValue('Mock-password-only!')
})

test('浅色和深色的必填校验保留错误边框，键盘与密码显隐正常', async ({ page }) => {
  await openLogin(page)
  const userName = page.getByLabel('用户名', { exact: true })
  const password = page.getByLabel('密码', { exact: true })
  for (const label of ['浅色主题', '深色主题']) {
    await selectTheme(page, label)
    await fillLogin(page)
    await expect(userName).not.toHaveAttribute('aria-invalid', 'true')
    const normal = (await readFieldAppearance(userName)).border
    await userName.fill('')
    await password.fill('')
    await page.getByRole('button', { name: '登录', exact: true }).click()
    await expect(page.getByText('请输入用户名', { exact: true })).toBeVisible()
    await expect(page.getByText('请输入密码', { exact: true })).toBeVisible()
    await expect(userName).toHaveAttribute('aria-invalid', 'true')
    await expect.poll(async () => (await readFieldAppearance(userName)).border).not.toBe(normal)
    const errorBorder = (await readFieldAppearance(userName)).border
    await userName.focus()
    await expect.poll(async () => (await readFieldAppearance(userName)).border).toBe(errorBorder)
  }
  await userName.fill('login-review')
  await userName.press('Enter')
  await expect(password).toBeFocused()
  await password.fill('Mock-password-only!')
  await page.getByRole('button', { name: '显示', exact: true }).click()
  await expect(password).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: '隐藏', exact: true }).click()
  await expect(password).toHaveAttribute('type', 'password')
})

test('请求期间防止重复提交，失败后保留输入并允许重试', async ({ page }) => {
  const pendingRoutes = []
  await page.route('**/api/v1/auth/login', (route) => {
    expect(route.request().method()).toBe('POST')
    expect(route.request().postDataJSON()).toEqual({
      userName: 'login-review',
      password: 'Mock-password-only!'
    })
    pendingRoutes.push(route)
  })
  await openLogin(page)
  await fillLogin(page)
  const password = page.getByLabel('密码', { exact: true })
  await password.press('Enter')
  await expect.poll(() => pendingRoutes.length).toBe(1)
  const submit = page.getByRole('button', { name: /登录(?:中)?$/ })
  await expect(submit).toBeDisabled()
  await expect(submit).toHaveText('登录中')
  await expect(submit).toHaveAttribute('aria-busy', 'true')
  await password.press('Enter')
  await pendingRoutes[0].fulfill({
    json: { code: 400, message: '模拟：账号或密码不正确', data: null }
  })
  await expect(page.getByText('模拟：账号或密码不正确')).toBeVisible()
  expect(pendingRoutes).toHaveLength(1)
  await expect(password).toHaveValue('Mock-password-only!')
  await expect(submit).toBeEnabled()
  await expect(submit).toHaveAttribute('aria-busy', 'false')
  await expect(submit).toHaveText('登录')
  await password.press('Enter')
  await expect.poll(() => pendingRoutes.length).toBe(2)
  await pendingRoutes[1].fulfill({ json: { code: 400, message: '模拟：再次失败', data: null } })
  await expect(page.getByText('模拟：再次失败')).toBeVisible()
})

test('登录和退出时正确恢复标题、图标以及后台主题', async ({ page }) => {
  await page.route('**/api/v1/auth/login', (route) =>
    route.fulfill({
      json: {
        code: 200,
        message: 'ok',
        data: { userName: 'login-review', nickName: '界面验收', token: 'mock-token-only' }
      }
    })
  )
  await page.route('**/api/v1/auth/menus', (route) =>
    route.fulfill({ json: { code: 200, message: 'ok', data: [] } })
  )
  await openLogin(page)
  const favicon = page.locator('link[rel="icon"]')
  const loginIcon = await favicon.getAttribute('href')
  await selectTheme(page, '深色主题')
  await fillLogin(page)
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page).toHaveURL(/#\/home$/)
  await expect(page).toHaveTitle('YamAuth')
  await expect(page.getByRole('button', { name: '账号菜单' })).toContainText('界面验收')
  await expect(favicon).toHaveAttribute('href', '/src/assets/favicon.svg')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  // 局部主题只包围登录页，后台主题按钮继续使用原有品牌栏配色。
  await expect(page.getByRole('button', { name: /切换主题/ })).toHaveCSS(
    'color',
    'rgb(255, 255, 255)'
  )
  await page.getByRole('button', { name: '账号菜单' }).click()
  await page.getByRole('menuitem', { name: /退出登录/ }).click()
  await page
    .getByRole('dialog', { name: '确认退出' })
    .getByRole('button', { name: '确 定' })
    .click()
  await expect(page).toHaveURL(/#\/login$/)
  await expect(page).toHaveTitle('用户登录 · 管理工作台')
  await expect(favicon).toHaveAttribute('href', loginIcon)
  await expect(page.getByLabel('密码', { exact: true })).toHaveValue('')
})
