import assert from 'node:assert/strict'
import { test, after } from 'node:test'
import { createServer } from 'vite'
import path from 'node:path'
const server = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, ws: false },
  resolve: { alias: { '@': path.resolve('src') } }
})
after(() => server.close())
const { createAccessStore, canAccess, StaleAccessError } =
  await server.ssrLoadModule('/src/auth/access.ts')
function storage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  }
}
function ready(store, permissions = []) {
  const epoch = store.getSnapshot().epoch
  store.begin(epoch)
  assert.equal(store.begin(epoch), true)
  store.resolve(epoch, {
    me: { id: 1, identity: 'Member', tenantId: 1, mustChangePassword: false },
    appsId: 100,
    authorizationVersion: 7,
    catalogVersion: 1,
    permissions,
    menus: []
  })
  return epoch
}
test('授权未加载、加载失败或强制改密时不开放操作', () => {
  const store = createAccessStore(storage)
  store.syncSession('session-one')
  assert.equal(canAccess(store.getSnapshot().data, 'bzss.projects.read'), false)
  const epoch = ready(store, [{ code: 'bzss.projects.read' }])
  assert.equal(canAccess(store.getSnapshot().data, 'bzss.projects.read'), true)
  assert.equal(canAccess(store.getSnapshot().data, 'bzss.projects.update'), false)
  store.password(epoch, { mustChangePassword: true })
  assert.equal(store.getSnapshot().data, null)
  store.fail(epoch, '失败')
  assert.equal(canAccess(store.getSnapshot().data, 'bzss.projects.read'), false)
})
test('切换租户立即清空旧权限，迟到响应不能恢复旧租户', () => {
  const memory = storage()
  const store = createAccessStore(() => memory)
  store.syncSession('session-one')
  const old = ready(store)
  store.changeContext('context-B')
  assert.equal(store.getSnapshot().data, null)
  assert.throws(() => store.assert(old), StaleAccessError)
  store.resolve(old, { me: { tenantId: 1 }, permissions: [], menus: [] })
  assert.equal(store.getSnapshot().data, null)
})
test('两个标签页的租户上下文独立；新登录会话不继承旧上下文', () => {
  const memoryA = storage(),
    memoryB = storage()
  const a = createAccessStore(() => memoryA),
    b = createAccessStore(() => memoryB)
  a.syncSession('session-one')
  b.syncSession('session-one')
  a.changeContext('A')
  b.changeContext('B')
  assert.equal(a.getSnapshot().contextId, 'A')
  assert.equal(b.getSnapshot().contextId, 'B')
  const restored = createAccessStore(() => memoryA)
  restored.syncSession('session-one')
  assert.equal(restored.getSnapshot().contextId, 'A')
  a.syncSession('session-two')
  assert.equal(a.getSnapshot().contextId, null)
})
test('403 引起授权刷新但不清除登录会话，刷新中的重复通知合并', () => {
  const store = createAccessStore(storage)
  store.syncSession('session-one')
  const epoch = ready(store)
  store.refresh()
  assert.equal(store.getSnapshot().sessionId, 'session-one')
  assert.equal(store.getSnapshot().epoch, epoch + 1)
  store.refresh()
  assert.equal(store.getSnapshot().epoch, epoch + 1)
  assert.equal(store.getSnapshot().data, null)
})

test('回到标签页检查未变化的版本时保留视图，变化或失败时使旧操作失效', () => {
  const store = createAccessStore(storage)
  store.syncSession('session-one')
  const epoch = ready(store)
  const data = store.getSnapshot().data
  store.recheck()
  store.recheck()
  assert.equal(store.getSnapshot().epoch, epoch)
  assert.equal(store.getSnapshot().checkRevision, 1)
  assert.equal(store.getSnapshot().status, 'ready')
  assert.equal(store.getSnapshot().data, data)
  assert.equal(store.begin(epoch), true)
  store.resolve(epoch, { ...data })
  assert.equal(store.getSnapshot().epoch, epoch)
  assert.equal(store.getSnapshot().checking, false)
  assert.equal(store.begin(epoch), false)
  store.recheck()
  store.resolve(epoch, { ...data, authorizationVersion: 8 })
  assert.equal(store.getSnapshot().epoch, epoch + 1)
  assert.throws(() => store.assert(epoch), StaleAccessError)
  store.recheck()
  store.fail(epoch + 1, '网络中断')
  assert.equal(store.getSnapshot().status, 'failed')
  assert.equal(store.getSnapshot().data, null)
  assert.throws(() => store.assert(epoch + 1), StaleAccessError)
})

test('改密要求未变化时保留输入，背景检查的迟到响应不能覆盖租户切换', () => {
  const store = createAccessStore(storage)
  store.syncSession('session-one')
  const epoch = store.getSnapshot().epoch
  const me = { mustChangePassword: true }
  store.password(epoch, me)
  store.recheck()
  store.password(epoch, me)
  assert.equal(store.getSnapshot().epoch, epoch)
  store.recheck()
  store.changeContext('next')
  store.password(epoch, me)
  assert.equal(store.getSnapshot().status, 'idle')
  assert.equal(store.getSnapshot().me, null)
})
