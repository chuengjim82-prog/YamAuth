import { test as base, expect } from '@playwright/test'

const rememberedKey = 'yamauth-remembered-credentials:v1'
const rememberedAccount = {
  version: 1,
  userName: 'saved@example.test',
  password: 'Mock-saved-password-only!'
}

// 每个用例使用独立上下文。未显式模拟的 API 和外部请求一律阻断并报告。
const test = base.extend({
  page: async ({ page, context, baseURL }, use) => {
    const unexpectedRequests = []
    const pageErrors = []
    const observedPages = new Set()
    const onPageError = (error) => pageErrors.push(error.message)
    const observePage = (opened) => {
      if (observedPages.has(opened)) return
      observedPages.add(opened)
      opened.on('pageerror', onPageError)
    }
    context.on('page', observePage)
    context.pages().forEach(observePage)
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
    context.off('page', observePage)
    observedPages.forEach((opened) => opened.off('pageerror', onPageError))
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
  await expect(page.getByRole('checkbox', { name: '记住密码', exact: true })).not.toBeChecked()
}

async function readRemembered(page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    const value = JSON.parse(raw)
    return typeof value.cleared === 'string' ? null : value
  }, rememberedKey)
}

async function seedRemembered(page, value = rememberedAccount) {
  await page.goto('/#/login')
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: rememberedKey,
    value
  })
  await page.reload()
}

async function mockSuccessfulLogin(page, userName = 'login-review') {
  await page.route('**/api/v1/auth/login', (route) =>
    route.fulfill({
      json: {
        code: 200,
        message: 'ok',
        data: { userName, nickName: '界面验收', token: `mock-token-${userName}` }
      }
    })
  )
  await page.route('**/api/v1/auth/menus', (route) =>
    route.fulfill({ json: { code: 200, message: 'ok', data: [] } })
  )
}

async function logout(page) {
  await page.getByRole('button', { name: '账号菜单' }).click()
  await page.getByRole('menuitem', { name: /退出登录/ }).click()
  await page
    .getByRole('dialog', { name: '确认退出' })
    .getByRole('button', { name: '确 定' })
    .click()
  await expect(page).toHaveURL(/#\/login$/)
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

test('主题切换保留输入，跟随系统生效，窄屏和文字对比度正常', async ({ page }, testInfo) => {
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
    await expect(page.getByText('请勿在公共设备上使用')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath(`login-${theme}.png`), fullPage: true })
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
  await mockSuccessfulLogin(page)
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
  await logout(page)
  await expect(page).toHaveTitle('用户登录 · 管理工作台')
  await expect(favicon).toHaveAttribute('href', loginIcon)
  await expect(page.getByLabel('密码', { exact: true })).toHaveValue('')
  expect(await readRemembered(page)).toBeNull()
})

test('勾选后成功登录才保存，退出和刷新回填但不自动登录', async ({ page }) => {
  await mockSuccessfulLogin(page)
  await openLogin(page)
  await fillLogin(page)
  await page.getByRole('checkbox', { name: '记住密码', exact: true }).check()
  expect(await readRemembered(page)).toBeNull()
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page).toHaveURL(/#\/home$/)
  await expect
    .poll(() => readRemembered(page))
    .toEqual({
      version: 1,
      userName: 'login-review',
      password: 'Mock-password-only!'
    })
  await logout(page)
  await page.reload()
  await expect(page.getByLabel('用户名', { exact: true })).toHaveValue('login-review')
  await expect(page.getByLabel('密码', { exact: true })).toHaveValue('Mock-password-only!')
  await expect(page.getByRole('checkbox', { name: '记住密码', exact: true })).toBeChecked()
  await expect(page.getByRole('button', { name: '登录', exact: true })).toBeEnabled()
  await expect(page).toHaveURL(/#\/login$/)
})

test('失败保留旧记录，修正账号密码成功后才覆盖并保留输入的邮箱', async ({ page }) => {
  await seedRemembered(page)
  await mockSuccessfulLogin(page, 'new-user')
  await page.route('**/api/v1/auth/login', (route) =>
    route.fulfill({ json: { code: 400, message: '模拟：密码已修改', data: null } })
  )
  await page.getByLabel('用户名', { exact: true }).fill('new-user@example.test')
  await page.getByLabel('密码', { exact: true }).fill('Mock-new-password-only!')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page.getByText('模拟：密码已修改')).toBeVisible()
  expect(await readRemembered(page)).toEqual(rememberedAccount)
  await mockSuccessfulLogin(page, 'new-user')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page).toHaveURL(/#\/home$/)
  await expect
    .poll(() => readRemembered(page))
    .toEqual({
      version: 1,
      userName: 'new-user@example.test',
      password: 'Mock-new-password-only!'
    })
  await logout(page)
  await expect(page.getByLabel('用户名', { exact: true })).toHaveValue('new-user@example.test')
  await expect(page.getByLabel('密码', { exact: true })).toHaveValue('Mock-new-password-only!')
})

test('取消勾选立即清除记录但保留输入，刷新后不再回填', async ({ page }) => {
  await seedRemembered(page)
  await page.getByRole('checkbox', { name: '记住密码', exact: true }).uncheck()
  await expect.poll(() => readRemembered(page)).toBeNull()
  // 撤销标记只含版本信息，不能残留账号或密码。
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), rememberedKey)
  ).toEqual({
    version: 1,
    cleared: expect.any(String)
  })
  await expect(page.getByLabel('用户名', { exact: true })).toHaveValue(rememberedAccount.userName)
  await expect(page.getByLabel('密码', { exact: true })).toHaveValue(rememberedAccount.password)
  await page.reload()
  await expect(page.getByLabel('用户名', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('密码', { exact: true })).toHaveValue('')
  await expect(page.getByRole('checkbox', { name: '记住密码', exact: true })).not.toBeChecked()
})

test('请求等待期间取消勾选，成功响应不会重新保存密码', async ({ page }) => {
  const pendingRoutes = []
  await seedRemembered(page)
  await mockSuccessfulLogin(page)
  await page.route('**/api/v1/auth/login', (route) => pendingRoutes.push(route))
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect.poll(() => pendingRoutes.length).toBe(1)
  await page.getByRole('checkbox', { name: '记住密码', exact: true }).uncheck()
  await expect.poll(() => readRemembered(page)).toBeNull()
  await pendingRoutes[0].fulfill({
    json: {
      code: 200,
      message: 'ok',
      data: { userName: 'login-review', nickName: '界面验收', token: 'mock-token-only' }
    }
  })
  await expect(page).toHaveURL(/#\/home$/)
  await logout(page)
  expect(await readRemembered(page)).toBeNull()
  await expect(page.getByLabel('密码', { exact: true })).toHaveValue('')
})

test('密码存储失败明确提示且不阻止登录', async ({ page }) => {
  await mockSuccessfulLogin(page)
  await openLogin(page)
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('模拟：存储被禁止', 'QuotaExceededError')
      return original.call(this, name, value)
    }
  }, rememberedKey)
  await fillLogin(page)
  await page.getByRole('checkbox', { name: '记住密码', exact: true }).check()
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page).toHaveURL(/#\/home$/)
  await expect(page.getByText('记住密码失败，请检查浏览器存储设置')).toBeVisible()
  expect(await readRemembered(page)).toBeNull()
  await expect(page.getByRole('button', { name: '账号菜单' })).toContainText('界面验收')
})

test('删除失败明确提示，不误报已删除也不丢失当前输入', async ({ page }) => {
  await seedRemembered(page)
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('模拟：存储被禁止', 'SecurityError')
      return original.call(this, name, value)
    }
  }, rememberedKey)
  await page.getByRole('checkbox', { name: '记住密码', exact: true }).uncheck()
  await expect(page.getByText('清除记住的密码失败，请检查浏览器存储设置后重试')).toBeVisible()
  expect(await readRemembered(page)).toEqual(rememberedAccount)
  await expect(page.getByLabel('密码', { exact: true })).toHaveValue(rememberedAccount.password)
})

test('非法存储内容不回填且明确提示，手动登录可修复记忆记录', async ({ page }) => {
  await seedRemembered(page, { version: 1, userName: 'invalid', password: { unexpected: true } })
  await expect(page.getByText('已记住的账号密码格式异常，请重新输入')).toBeVisible()
  await expect(page.getByLabel('用户名', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('密码', { exact: true })).toHaveValue('')
  await expect(page.getByRole('checkbox', { name: '记住密码', exact: true })).not.toBeChecked()
  await mockSuccessfulLogin(page)
  await fillLogin(page)
  await page.getByRole('checkbox', { name: '记住密码', exact: true }).check()
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page).toHaveURL(/#\/home$/)
  await expect
    .poll(() => readRemembered(page))
    .toEqual({
      version: 1,
      userName: 'login-review',
      password: 'Mock-password-only!'
    })
})

test('会话过期保留账号密码，手动重登恢复业务页面的查询参数和锚点', async ({ page }) => {
  const target = '/auth/users?keyword=a%20b&page=3#row-7'
  await page.route('**/api/v1/auth/users?*', (route) =>
    route.fulfill({ json: { code: 200, message: 'ok', data: { total: 0, items: [] } } })
  )
  await seedRemembered(page)
  await mockSuccessfulLogin(page)
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page).toHaveURL(/#\/home$/)
  await page.goto(`/#${target}`)
  await expect(page.getByRole('region', { name: '用户管理', exact: true })).toBeVisible()
  await page.route('**/api/v1/auth/menus', (route) =>
    route.fulfill({ status: 401, json: { code: 401, message: '模拟：会话已过期', data: null } })
  )
  await page.reload()
  await expect(page).toHaveURL(/#\/login$/)
  await expect(page.getByLabel('用户名', { exact: true })).toHaveValue(rememberedAccount.userName)
  await expect(page.getByLabel('密码', { exact: true })).toHaveValue(rememberedAccount.password)
  await expect(page.getByRole('checkbox', { name: '记住密码', exact: true })).toBeChecked()
  await mockSuccessfulLogin(page)
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect.poll(() => new URL(page.url()).hash).toBe(`#${target}`)
  await expect(page.getByRole('region', { name: '用户管理', exact: true })).toBeVisible()
})

for (const scenario of [
  { name: '已保存记录', saved: true, blockEvents: false },
  { name: '同步事件未送达', saved: true, blockEvents: true },
  { name: '尚未保存且同步事件未送达', saved: false, blockEvents: true }
]) {
  test(`跨标签页取消阻止旧请求保存密码：${scenario.name}`, async ({ page, context }) => {
    if (scenario.blockEvents) {
      await page.addInitScript((key) => {
        // 模拟暂停标签页尚未处理 storage 事件；存储版本检查仍必须阻止回写。
        globalThis.addEventListener(
          'storage',
          (event) => {
            if (event.key === key) event.stopImmediatePropagation()
          },
          true
        )
      }, rememberedKey)
    }
    if (scenario.saved) await seedRemembered(page)
    else {
      await openLogin(page)
      await fillLogin(page)
      await page.getByRole('checkbox', { name: '记住密码', exact: true }).check()
    }
    const pendingRoutes = []
    await mockSuccessfulLogin(page)
    await page.route('**/api/v1/auth/login', (route) => pendingRoutes.push(route))
    const other = await context.newPage()
    await mockSuccessfulLogin(other)
    await other.goto('/#/login')
    const otherRemember = other.getByRole('checkbox', { name: '记住密码', exact: true })
    if (scenario.saved) await expect(otherRemember).toBeChecked()
    else await otherRemember.check()

    await page.getByRole('button', { name: '登录', exact: true }).click()
    await expect.poll(() => pendingRoutes.length).toBe(1)
    await otherRemember.uncheck()
    await expect
      .poll(() =>
        other.evaluate((key) => {
          const raw = localStorage.getItem(key)
          return raw === null ? null : JSON.parse(raw)
        }, rememberedKey)
      )
      .toEqual({ version: 1, cleared: expect.any(String) })
    const remember = page.getByRole('checkbox', { name: '记住密码', exact: true })
    if (scenario.blockEvents) await expect(remember).toBeChecked()
    else await expect(remember).not.toBeChecked()
    await expect(page.getByLabel('密码', { exact: true })).toHaveValue(
      scenario.saved ? rememberedAccount.password : 'Mock-password-only!'
    )
    await pendingRoutes[0].fulfill({
      json: {
        code: 200,
        message: 'ok',
        data: { userName: 'login-review', nickName: '界面验收', token: 'mock-token-only' }
      }
    })
    await expect(page).toHaveURL(/#\/home$/)
    await logout(page)
    expect(await readRemembered(page)).toBeNull()
    await expect(page.getByLabel('密码', { exact: true })).toHaveValue('')
    // 撤销不应永久禁用功能；用户重新主动勾选后，下一次成功登录仍能保存。
    await fillLogin(page)
    await remember.check()
    await mockSuccessfulLogin(page)
    await page.getByRole('button', { name: '登录', exact: true }).click()
    await expect
      .poll(() => readRemembered(page))
      .toEqual({
        version: 1,
        userName: 'login-review',
        password: 'Mock-password-only!'
      })
    await other.close()
  })
}

for (const mode of ['读取被禁止', 'JSON 损坏']) {
  test(`${mode}时提示具体原因并允许手动登录`, async ({ page }) => {
    await page.addInitScript(
      ({ key, mode }) => {
        if (mode === 'JSON 损坏') {
          localStorage.setItem(key, '{broken')
        } else {
          const original = Storage.prototype.getItem
          Storage.prototype.getItem = function (name) {
            if (name === key) throw new DOMException('模拟：存储被禁止', 'SecurityError')
            return original.call(this, name)
          }
        }
      },
      { key: rememberedKey, mode }
    )
    await mockSuccessfulLogin(page)
    await openLogin(page)
    await expect(
      page.getByText(
        mode === 'JSON 损坏'
          ? '已记住的账号密码格式异常，请重新输入'
          : '读取记住的密码失败，请检查浏览器存储设置或清除本站数据'
      )
    ).toBeVisible()
    await fillLogin(page)
    await page.getByRole('button', { name: '登录', exact: true }).click()
    await expect(page).toHaveURL(/#\/home$/)
  })
}

test('其他标签页先完成登录，旧登录响应不能覆盖新账号的密码记录', async ({ page, context }) => {
  const pendingRoutes = []
  await mockSuccessfulLogin(page)
  await page.route('**/api/v1/auth/login', (route) => pendingRoutes.push(route))
  await openLogin(page)
  await fillLogin(page)
  await page.getByRole('checkbox', { name: '记住密码', exact: true }).check()
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect.poll(() => pendingRoutes.length).toBe(1)

  const other = await context.newPage()
  await mockSuccessfulLogin(other, 'new-user')
  await openLogin(other)
  await other.getByLabel('用户名', { exact: true }).fill('new-user')
  await other.getByLabel('密码', { exact: true }).fill('Mock-new-password-only!')
  await other.getByRole('checkbox', { name: '记住密码', exact: true }).check()
  await other.getByRole('button', { name: '登录', exact: true }).click()
  const expected = { version: 1, userName: 'new-user', password: 'Mock-new-password-only!' }
  await expect.poll(() => readRemembered(other)).toEqual(expected)
  await expect(page).toHaveURL(/#\/home$/)

  const response = page.waitForResponse('**/api/v1/auth/login')
  await pendingRoutes[0].fulfill({
    json: {
      code: 200,
      message: 'ok',
      data: { userName: 'login-review', nickName: '旧响应', token: 'mock-old-token' }
    }
  })
  await (await response).finished()
  await logout(page)
  expect(await readRemembered(page)).toEqual(expected)
  await expect(page.getByLabel('用户名', { exact: true })).toHaveValue('new-user')
  await expect(page.getByLabel('密码', { exact: true })).toHaveValue('Mock-new-password-only!')
  await other.close()
})
