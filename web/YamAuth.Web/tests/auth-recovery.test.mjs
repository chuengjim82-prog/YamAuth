import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import path from 'node:path'
import { createServer } from 'vite'
import axios from 'axios'
import { message } from 'antd'

const server = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, ws: false },
  resolve: { alias: { '@': path.resolve('src') } }
})
const recovery = await server.ssrLoadModule('/src/auth/recovery.ts')
const sessions = await server.ssrLoadModule('/src/auth/session.ts')

function memoryStorage() {
  const data = new Map()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key)
  }
}

const localStorage = memoryStorage()
const sessionStorage = memoryStorage()
const originalGlobals = ['localStorage', 'sessionStorage', 'window'].map((key) => [
  key,
  Object.getOwnPropertyDescriptor(globalThis, key)
])
const notices = []
const originalError = message.error
const originalWarning = message.warning
message.error = (value) => notices.push(value)
message.warning = (value) => notices.push(value)
const location = {
  hash: '#/auth/users?keyword=a%20b&page=3#row-7',
  replace(value) {
    this.hash = value
  }
}
let cleared = 0
Object.assign(globalThis, {
  localStorage,
  sessionStorage,
  window: { location, dispatchEvent: () => cleared++ }
})

// 拦截真实 Axios 实例的传输层，保留项目中的请求、响应拦截器。
const originalAdapter = axios.defaults.adapter
const pending = []
axios.defaults.adapter = (config) =>
  new Promise((resolve, reject) => pending.push({ config, resolve, reject }))
const api = await server.ssrLoadModule('/src/api/request.ts')
axios.defaults.adapter = originalAdapter
const redirects = await server.ssrLoadModule('/src/auth/loginRedirect.ts')

after(async () => {
  message.error = originalError
  message.warning = originalWarning
  axios.defaults.adapter = originalAdapter
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
  await server.close()
})

const exists = (pathname) => ['/auth/users', '/unit/employees'].includes(pathname)
const destination = (record, userName = 'alice') =>
  recovery.resolveLoginDestination({ kind: 'record', record }, userName, exists)
const home = { target: '/home', unavailable: false }

test('恢复完整站内地址；根路径映射首页且保留参数及锚点', () => {
  const target = '/auth/users?keyword=a%20b&page=3#row-7'
  assert.deepEqual(destination({ reason: 'direct', target }), { target, unavailable: false })
  assert.deepEqual(destination({ reason: 'direct', target: '/?mode=1#top' }), {
    target: '/home?mode=1#top',
    unavailable: false
  })
  assert.deepEqual(recovery.resolveLoginDestination({ kind: 'empty' }, 'alice', exists), home)
})

test('首页地址按路由规则匹配大小写及尾斜线，规范化后保留完整参数和锚点', () => {
  for (const [target, expected] of [
    ['/home/', '/home'],
    ['/HOME?tab=1#anchor', '/home?tab=1#anchor'],
    [
      '/HoMe///?next=%2Fauth%2Fusers&keyword=a%20b#row-7',
      '/home?next=%2Fauth%2Fusers&keyword=a%20b#row-7'
    ]
  ]) {
    assert.deepEqual(
      recovery.resolveLoginDestination(
        { kind: 'record', record: { reason: 'direct', target } },
        'alice',
        () => {
          assert.fail('首页不应依赖 CRUD 资源注册表')
        }
      ),
      { target: expected, unavailable: false }
    )
  }
})

test('过期记录仅允许规范用户名相同的账号恢复，未知原账号和换账号回首页', () => {
  const record = { reason: 'expired', target: '/auth/users', userName: 'alice' }
  assert.deepEqual(destination(record), { target: '/auth/users', unavailable: false })
  assert.deepEqual(destination(record, 'bob'), home)
  assert.deepEqual(destination({ ...record, userName: null }), home)
  assert.deepEqual(destination({ ...record, userName: '' }), home)
})

test('外部、登录页、未知及解释存在歧义的地址均不可回跳', () => {
  for (const target of [
    '',
    'https://example.com',
    '//example.com',
    '/\\example.com',
    '/auth/users\n',
    'javascript:alert(1)',
    '/login',
    '/LOGIN/?next=/auth/users',
    '/missing',
    '/homepage',
    '/home/users',
    '/home-extra',
    '/%2f%2fexample.com',
    '/auth/../login'
  ]) {
    assert.deepEqual(destination({ reason: 'direct', target }), { ...home, unavailable: true })
  }
})

test('恢复记录跨页面刷新保留，读取与失败重试不消费，明确清除后不再恢复', () => {
  const storage = memoryStorage()
  const store = recovery.createRecoveryStore(() => storage)
  const record = { reason: 'expired', target: '/auth/users?page=3', userName: 'alice' }
  store.save(record)
  const reloaded = recovery.createRecoveryStore(() => storage)
  assert.deepEqual(reloaded.read().state, { kind: 'record', record })
  assert.deepEqual(reloaded.read().state, { kind: 'record', record })
  reloaded.clear()
  assert.equal(storage.getItem(recovery.LOGIN_RECOVERY_KEY), null)
  assert.deepEqual(recovery.createRecoveryStore(() => storage).read().state, { kind: 'empty' })
})

test('损坏记录清除但保留损坏状态，直到完成一次目标决策', () => {
  for (const raw of ['{broken', 'null', '{}', '{"reason":"expired","target":"/auth/users"}']) {
    const storage = memoryStorage()
    storage.setItem(recovery.LOGIN_RECOVERY_KEY, raw)
    const store = recovery.createRecoveryStore(() => storage)
    assert.deepEqual(store.read().state, { kind: 'invalid' })
    assert.equal(storage.getItem(recovery.LOGIN_RECOVERY_KEY), null)
    assert.deepEqual(recovery.resolveLoginDestination(store.read().state, 'alice', exists), {
      ...home,
      unavailable: true
    })
    store.clear()
    assert.equal(store.read().state.kind, 'empty')
  }
})

test('存储读取或写入失败时报告受限状态，并在本页保存及清除内存记录', () => {
  const record = { reason: 'direct', target: '/auth/users' }
  for (const getStorage of [
    () => {
      throw new Error('storage blocked')
    },
    () => ({
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded')
      },
      removeItem: () => {
        throw new Error('storage blocked')
      }
    })
  ]) {
    const store = recovery.createRecoveryStore(getStorage)
    store.read()
    assert.equal(store.save(record).storageUnavailable, true)
    assert.deepEqual(store.read(), { state: { kind: 'record', record }, storageUnavailable: true })
    store.clear()
    assert.deepEqual(store.read(), { state: { kind: 'empty' }, storageUnavailable: true })
  }
})

test('写入新记录失败但删除可用时立即移除旧目标，刷新后不恢复旧记录', () => {
  const storage = memoryStorage()
  storage.setItem(
    recovery.LOGIN_RECOVERY_KEY,
    JSON.stringify({ reason: 'expired', target: '/auth/users?old=1', userName: 'alice' })
  )
  const store = recovery.createRecoveryStore(() => ({
    ...storage,
    setItem() {
      throw new DOMException('存储容量不足', 'QuotaExceededError')
    }
  }))
  const record = { reason: 'direct', target: '/auth/tenants?new=1' }
  assert.equal(store.save(record).storageUnavailable, true)
  assert.deepEqual(store.read().state, { kind: 'record', record })
  assert.equal(storage.getItem(recovery.LOGIN_RECOVERY_KEY), null)
  assert.equal(recovery.createRecoveryStore(() => storage).read().state.kind, 'empty')
})

test('写入及删除曾失败后，清理仍重试删除；恢复存储权限后旧目标不再复活', () => {
  const storage = memoryStorage()
  storage.setItem(
    recovery.LOGIN_RECOVERY_KEY,
    JSON.stringify({ reason: 'direct', target: '/auth/users?old=1' })
  )
  let deletionBlocked = true
  const store = recovery.createRecoveryStore(() => ({
    ...storage,
    setItem() {
      throw new DOMException('存储容量不足', 'QuotaExceededError')
    },
    removeItem(key) {
      if (deletionBlocked) throw new DOMException('暂时无法删除', 'SecurityError')
      storage.removeItem(key)
    }
  }))
  store.save({ reason: 'direct', target: '/auth/tenants?new=1' })
  assert.notEqual(storage.getItem(recovery.LOGIN_RECOVERY_KEY), null)
  deletionBlocked = false
  assert.equal(store.clear().storageUnavailable, true)
  assert.equal(store.read().state.kind, 'empty')
  assert.equal(storage.getItem(recovery.LOGIN_RECOVERY_KEY), null)
  assert.equal(recovery.createRecoveryStore(() => storage).read().state.kind, 'empty')
})

test('token 未变化时也通过会话序号识别旧响应；跨标签页 token 变化同样失效', () => {
  localStorage.setItem(sessions.TOKEN_KEY, 'same-test-token')
  const before = sessions.captureRequestSession()
  assert.equal(sessions.isCurrentRequestSession(before), true)
  sessions.advanceRequestSession()
  assert.equal(sessions.isCurrentRequestSession(before), false)
  const current = sessions.captureRequestSession()
  localStorage.setItem(sessions.TOKEN_KEY, 'other-tab-token')
  assert.equal(sessions.isCurrentRequestSession(current), false)
})

function beginSession() {
  recovery.loginRecovery.clear()
  sessions.advanceRequestSession()
  localStorage.setItem(sessions.TOKEN_KEY, 'old-test-token')
  localStorage.setItem(
    sessions.ACCOUNT_KEY,
    JSON.stringify({ userName: 'alice', nickName: '测试' })
  )
  location.hash = '#/auth/users?keyword=a%20b&page=3#row-7'
  cleared = 0
  notices.length = 0
}

async function issueRequest() {
  const result = api.apiGet('/test').then(
    () => ({ failed: false }),
    () => ({ failed: true })
  )
  await new Promise((resolve) => setImmediate(resolve))
  const request = pending.shift()
  assert.ok(request, '请求必须经过真实 Axios 拦截器到达测试传输层')
  return { result, request }
}

function unauthorized(request, transport) {
  const response = {
    config: request.config,
    status: transport === 'http' ? 401 : 200,
    statusText: '',
    headers: {},
    data: { code: 401, message: '测试未授权', data: null }
  }
  if (transport === 'http') {
    request.reject(
      new axios.AxiosError('unauthorized', 'ERR_BAD_REQUEST', request.config, null, response)
    )
  } else request.resolve(response)
}

for (const transport of ['http', 'business']) {
  test(`${transport} 401 记录原账号及完整地址，重复响应不覆盖恢复记录`, async () => {
    beginSession()
    const first = await issueRequest()
    const second = await issueRequest()
    unauthorized(first.request, transport)
    assert.deepEqual(await first.result, { failed: true })
    unauthorized(second.request, transport)
    await second.result
    assert.equal(location.hash, '#/login')
    assert.equal(localStorage.getItem(sessions.TOKEN_KEY), null)
    assert.equal(cleared, 1)
    assert.equal(notices.length, 1)
    assert.deepEqual(recovery.loginRecovery.read().state, {
      kind: 'record',
      record: {
        reason: 'expired',
        target: '/auth/users?keyword=a%20b&page=3#row-7',
        userName: 'alice'
      }
    })
  })

  test(`${transport} 旧 401 迟于重新登录时不能清理新会话或产生过期提示`, async () => {
    beginSession()
    const old = await issueRequest()
    // 特意保留相同 token，保证保护依赖会话序号，而非仅比较字符串。
    sessions.advanceRequestSession()
    localStorage.setItem(
      sessions.ACCOUNT_KEY,
      JSON.stringify({ userName: 'bob', nickName: '新账号' })
    )
    unauthorized(old.request, transport)
    assert.deepEqual(await old.result, { failed: true })
    assert.equal(localStorage.getItem(sessions.TOKEN_KEY), 'old-test-token')
    assert.equal(location.hash, '#/auth/users?keyword=a%20b&page=3#row-7')
    assert.equal(cleared, 0)
    assert.equal(notices.length, 0)
    assert.equal(recovery.loginRecovery.read().state.kind, 'empty')
  })
}

test('未登录请求的 401 按请求失败提示，不清理会话也不覆盖恢复记录', async () => {
  beginSession()
  localStorage.removeItem(sessions.TOKEN_KEY)
  recovery.loginRecovery.save({ reason: 'direct', target: '/unit/employees' })
  const login = await issueRequest()
  unauthorized(login.request, 'http')
  await login.result
  assert.equal(cleared, 0)
  assert.equal(notices[0].content, '测试未授权')
  assert.equal(recovery.loginRecovery.read().state.record.target, '/unit/employees')
})

test('守卫记录直接访问；过期记录优先；主动退出后的旧 effect 不得重建记录', () => {
  beginSession()
  redirects.redirectUnauthenticated('/auth/users?keyword=a%20b&page=3#row-7')
  assert.equal(recovery.loginRecovery.read().state.record.reason, 'direct')
  const expired = { reason: 'expired', target: '/auth/users', userName: 'alice' }
  recovery.loginRecovery.save(expired)
  location.hash = '#/auth/users'
  redirects.redirectUnauthenticated('/auth/users')
  assert.deepEqual(recovery.loginRecovery.read().state.record, expired)
  recovery.loginRecovery.clear()
  redirects.replaceWithLogin()
  redirects.redirectUnauthenticated('/auth/users')
  assert.equal(recovery.loginRecovery.read().state.kind, 'empty')
})

test('HashRouter 省略路径前导斜线及空 hash 时仍可进入登录恢复流程', () => {
  for (const [hash, target] of [
    ['#auth/users?keyword=test#row-1', '/auth/users?keyword=test#row-1'],
    ['', '/'],
    ['#?mode=1', '/?mode=1']
  ]) {
    recovery.loginRecovery.clear()
    location.hash = hash
    redirects.redirectUnauthenticated(target)
    assert.equal(location.hash, '#/login')
    assert.equal(recovery.loginRecovery.read().state.record.target, target)
  }
})
