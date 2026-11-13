import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import path from 'node:path'
import { createServer } from 'vite'
import axios from 'axios'
import { message } from 'antd'
import { memoryIndexedDB } from './helpers/indexedDB.mjs'

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
const originalGlobals = ['localStorage', 'sessionStorage', 'window', 'indexedDB'].map((key) => [
  key,
  Object.getOwnPropertyDescriptor(globalThis, key)
])
const idb = memoryIndexedDB()
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
Object.assign(globalThis, {
  localStorage,
  sessionStorage,
  indexedDB: idb.factory,
  window: { location }
})

// 拦截真实 Axios 实例的传输层，保留项目中的请求、响应拦截器。
const originalAdapter = axios.defaults.adapter
const pending = []
axios.defaults.adapter = (config) =>
  new Promise((resolve, reject) => pending.push({ config, resolve, reject }))
const api = await server.ssrLoadModule('/src/api/request.ts')
axios.defaults.adapter = originalAdapter
const redirects = await server.ssrLoadModule('/src/auth/loginRedirect.ts')

const auth = await server.ssrLoadModule('/src/api/auth.ts')
await sessions.initializeSession()
const crud = await server.ssrLoadModule('/src/api/crud.ts')
const entityApi = crud.createCrudApi('/v1/test')

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

async function beginSession() {
  recovery.loginRecovery.clear()
  await sessions.saveSession(
    { userName: 'alice', nickName: '测试' },
    'old-test-token',
    sessions.captureRequestSession()
  )
  location.hash = '#/auth/users?keyword=a%20b&page=3#row-7'
  notices.length = 0
}

async function issueRequest(run = () => api.apiGet('/test')) {
  const result = run().then(
    (value) => ({ failed: false, value }),
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
    await beginSession()
    const first = await issueRequest()
    const second = await issueRequest()
    unauthorized(first.request, transport)
    assert.deepEqual(await first.result, { failed: true })
    unauthorized(second.request, transport)
    await second.result
    assert.equal(location.hash, '#/login')
    assert.equal(sessions.captureRequestSession().record, null)
    assert.equal(JSON.parse(localStorage.getItem(sessions.SESSION_KEY)).status, 'signed-out')
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
    await beginSession()
    const old = await issueRequest()
    // 特意保留相同 token，保证保护依赖会话序号，而非仅比较字符串。
    await sessions.saveSession(
      { userName: 'bob', nickName: '新账号' },
      'old-test-token',
      sessions.captureRequestSession()
    )
    unauthorized(old.request, transport)
    assert.deepEqual(await old.result, { failed: true })
    assert.equal(sessions.captureRequestSession().record.token, 'old-test-token')
    assert.equal(location.hash, '#/auth/users?keyword=a%20b&page=3#row-7')
    assert.equal(notices.length, 0)
    assert.equal(recovery.loginRecovery.read().state.kind, 'empty')
  })
}

test('未登录请求的 401 按请求失败提示，不清理会话也不覆盖恢复记录', async () => {
  await beginSession()
  await sessions.clearSession(sessions.captureRequestSession())
  recovery.loginRecovery.save({ reason: 'direct', target: '/unit/employees' })
  const login = await issueRequest()
  unauthorized(login.request, 'http')
  await login.result
  assert.equal(notices[0].content, '测试未授权')
  assert.equal(recovery.loginRecovery.read().state.record.target, '/unit/employees')
})

test('守卫记录直接访问；过期记录优先；主动退出后的旧 effect 不得重建记录', async () => {
  await beginSession()
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

function respond(request, data) {
  request.resolve({ config: request.config, status: 200, statusText: 'OK', headers: {}, data })
}

test('HTTP 200 的 HTML、缺失封装及错误字段均失败；兼容 0/200 与 null，traceId 可缺省', async () => {
  await beginSession()
  for (const body of [
    '<html>fallback</html>',
    {},
    [],
    null,
    { code: '0', data: null },
    { code: 0 },
    { code: 0, data: null, message: 7 }
  ]) {
    notices.length = 0
    const current = await issueRequest(() => entityApi.update(1, { name: 'changed' }))
    respond(current.request, body)
    assert.equal((await current.result).failed, true)
    assert.equal(notices.length, 1)
    assert.match(notices[0].content, /数据格式/)
  }
  for (const code of [0, 200]) {
    const current = await issueRequest(() => entityApi.update(1, {}))
    respond(current.request, { code, data: null })
    assert.equal((await current.result).failed, false)
  }
})

test('CRUD 结果检查分页、实体 ID 和空写结果，保留详情 null 及合法分页子集', async () => {
  await beginSession()
  for (const [run, values] of [
    [
      () => entityApi.page({ page: 3 }),
      [
        { total: 2 },
        { total: -1, items: [] },
        { total: 1.5, items: [] },
        { total: 1, items: [{}] },
        { total: 1, items: [{ id: 0 }] }
      ]
    ],
    [() => entityApi.detail(1), [{}, [], { id: Number.MAX_SAFE_INTEGER + 1 }]],
    [() => entityApi.create({}), [null, 0, -1, '1', 1.5, Number.MAX_SAFE_INTEGER + 1]],
    [() => entityApi.update(1, {}), [true, {}, []]],
    [() => entityApi.remove(1), [true, {}, []]]
  ]) {
    for (const value of values) {
      const current = await issueRequest(run)
      respond(current.request, { code: 0, data: value })
      assert.equal((await current.result).failed, true)
    }
  }
  for (const [run, data] of [
    [() => entityApi.page({ page: 2 }), { total: 21, items: [{ id: 21, extra: 'kept' }] }],
    [() => entityApi.detail(999), null],
    [() => entityApi.detail(1), { id: 1, extra: 'kept' }],
    [() => entityApi.create({}), 42],
    [() => entityApi.remove(1), null]
  ]) {
    const current = await issueRequest(run)
    respond(current.request, { code: 0, data })
    assert.equal((await current.result).failed, false)
  }
})

test('同 token 新登录使旧成功响应、网络错误和登录响应静默失效', async () => {
  await beginSession()
  const previous = sessions.captureRequestSession()
  const oldData = await issueRequest()
  const oldFailure = await issueRequest()
  const oldLogin = await issueRequest(() => api.apiPost('/v1/auth/login', {}))
  await sessions.saveSession(
    { userName: 'alice', nickName: '再次登录' },
    'old-test-token',
    previous
  )
  assert.equal(sessions.isCurrentRequestSession(previous), false)
  respond(oldData.request, { code: 0, data: { id: 1 } })
  oldFailure.request.reject(
    new axios.AxiosError('failed', 'ERR_NETWORK', oldFailure.request.config)
  )
  respond(oldLogin.request, { code: 0, data: { token: 'late', userName: 'bob', nickName: '迟到' } })
  for (const request of [oldData, oldFailure, oldLogin])
    assert.equal((await request.result).failed, true)
  assert.equal(notices.length, 0)
  assert.equal(sessions.captureRequestSession().record.user.userName, 'alice')
})

test('请求同步捕获发起账号；磁盘会话先变化时拒绝旧页面提交，静默同步到首页', async () => {
  await beginSession()
  const old = sessions.captureRequestSession()
  localStorage.setItem(
    sessions.SESSION_KEY,
    JSON.stringify({
      version: 1,
      status: 'authenticated',
      sessionId: 'other-tab',
      token: 'new-token',
      user: { userName: 'bob', nickName: '新账号' }
    })
  )
  await assert.rejects(api.apiPost('/v1/test', { oldDraft: true }), sessions.StaleSessionError)
  assert.equal(pending.length, 0)
  assert.equal(sessions.isCurrentRequestSession(old), false)
  assert.equal(location.hash, '#/home')
  assert.equal(notices.length, 0)
  const next = await issueRequest()
  assert.equal(next.request.config.headers.Authorization, 'Bearer new-token')
  respond(next.request, { code: 0, data: null })
  assert.equal((await next.result).failed, false)
})

for (const transport of ['http', 'business']) {
  test(`${transport} 401 等待写锁时出现新登录，不退出新账号或改动恢复目标`, async () => {
    await beginSession()
    const old = await issueRequest()
    const release = idb.hold()
    const save = sessions.saveSession(
      { userName: 'bob', nickName: '新账号' },
      'new-token',
      sessions.captureRequestSession()
    )
    await new Promise((resolve) => setImmediate(resolve))
    unauthorized(old.request, transport)
    await new Promise((resolve) => setImmediate(resolve))
    assert.equal(location.hash, '#/auth/users?keyword=a%20b&page=3#row-7')
    release()
    await save
    assert.equal((await old.result).failed, true)
    assert.equal(sessions.captureRequestSession().record.user.userName, 'bob')
    assert.equal(location.hash, '#/auth/users?keyword=a%20b&page=3#row-7')
    assert.equal(recovery.loginRecovery.read().state.kind, 'empty')
    assert.equal(notices.length, 0)
  })
}

test('导航菜单必须为结构完整的树，异常数据报错且不作为可用菜单返回', async () => {
  await beginSession()
  const node = {
    id: 1,
    parentId: 0,
    menuName: '首页',
    menuUrl: '/home',
    menuIcon: '',
    children: []
  }
  for (const value of [
    null,
    {},
    'bad',
    [null],
    [{}],
    [{ ...node, id: 0 }],
    [{ ...node, parentId: 0.5 }],
    [{ ...node, menuName: null }],
    [{ ...node, menuUrl: 1 }],
    [{ ...node, menuIcon: null }],
    [{ ...node, children: null }],
    [{ ...node, children: [{}] }]
  ]) {
    notices.length = 0
    const request = await issueRequest(() => auth.fetchMenuTree())
    respond(request.request, { code: 0, data: value })
    assert.equal((await request.result).failed, true)
    assert.equal(notices.length, 1)
    assert.match(notices[0].content, /数据格式/)
  }
  for (const value of [
    [],
    [node],
    [{ ...node, children: [{ ...node, id: 2, parentId: 1, extra: true }] }]
  ]) {
    const request = await issueRequest(() => auth.fetchMenuTree())
    respond(request.request, { code: 0, data: value })
    assert.deepEqual(await request.result, { failed: false, value })
  }
})
