import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import path from 'node:path'
import { createServer } from 'vite'
import { memoryIndexedDB } from './helpers/indexedDB.mjs'

const server = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, ws: false },
  resolve: { alias: { '@': path.resolve('src') } }
})
after(() => server.close())
const {
  createSessionStore,
  SESSION_KEY,
  TOKEN_KEY,
  ACCOUNT_KEY,
  SessionStorageError,
  StaleSessionError
} = await server.ssrLoadModule('/src/auth/session.ts')
const { createSessionLock } = await server.ssrLoadModule('/src/auth/sessionLock.ts')
const alice = { userName: 'alice', nickName: '甲' }
const bob = { userName: 'bob', nickName: '乙' }
function storage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  }
}
function legacy(disk) {
  disk.setItem(TOKEN_KEY, 'legacy-token')
  disk.setItem(ACCOUNT_KEY, JSON.stringify(alice))
}
function fixture() {
  const disk = storage()
  const idb = memoryIndexedDB()
  return {
    disk,
    idb,
    create(getStorage = () => disk, onChange) {
      return createSessionStore(
        getStorage,
        onChange,
        createSessionLock(() => idb.factory)
      )
    }
  }
}
async function ready(store) {
  await store.initialize()
  return store
}

test('有效旧登录异步迁移；读取快照没有写入副作用，重载只读取新记录', async () => {
  const { disk, create } = fixture()
  legacy(disk)
  const store = create()
  assert.equal(store.getSnapshot().ready, false)
  assert.equal(disk.getItem(SESSION_KEY), null)
  await store.initialize()
  assert.equal(store.getSnapshot().record.token, 'legacy-token')
  assert.equal(disk.getItem(TOKEN_KEY), null)
  assert.equal(disk.getItem(ACCOUNT_KEY), null)
  assert.deepEqual((await ready(create())).getSnapshot().record, store.getSnapshot().record)
})

test('退出标记与非法新记录均不得回退到残留旧凭据', async () => {
  for (const raw of [
    '{broken',
    '{}',
    'null',
    JSON.stringify({ version: 1, status: 'signed-out', sessionId: 'out' })
  ]) {
    const { disk, create } = fixture()
    legacy(disk)
    disk.setItem(SESSION_KEY, raw)
    const store = await ready(create())
    assert.notEqual(store.getSnapshot().record?.status, 'authenticated')
    assert.equal(disk.getItem(SESSION_KEY), raw)
  }
})

test('迁移或登录持久化失败不发布用户；恢复存储后可以重试', async () => {
  const { disk, create } = fixture()
  legacy(disk)
  let blocked = true
  const store = await ready(
    create(() => ({
      ...disk,
      setItem(key, value) {
        if (blocked) throw new DOMException('quota', 'QuotaExceededError')
        disk.setItem(key, value)
      }
    }))
  )
  assert.equal(store.getSnapshot().record, null)
  assert.ok(store.getSnapshot().storageError instanceof SessionStorageError)
  assert.equal(disk.getItem(TOKEN_KEY), null)
  await assert.rejects(store.login(alice, 'new-token', store.getSnapshot()), SessionStorageError)
  assert.equal(store.getSnapshot().record, null)
  blocked = false
  await store.login(alice, 'new-token', store.getSnapshot())
  assert.equal(store.getSnapshot().record.user.userName, 'alice')
  assert.equal(store.getSnapshot().storageError, null)
})

test('双实例同步、相同 token 新会话、过期回调及延迟事件不能污染最新登录', async () => {
  const { create } = fixture()
  const transitions = []
  const first = await ready(
    create(undefined, (previous, next) => transitions.push([previous, next]))
  )
  await first.login(alice, 'same-token', first.getSnapshot())
  const old = first.getSnapshot()
  const second = await ready(create())
  await second.login(bob, 'same-token', second.getSnapshot())
  assert.equal(first.isCurrent(old), false)
  assert.equal(first.getSnapshot().record.user.userName, 'bob')
  await assert.rejects(first.login(alice, 'late-token', old), StaleSessionError)
  await assert.rejects(first.clear(old), StaleSessionError)
  const current = first.getSnapshot()
  first.synchronize()
  assert.equal(first.getSnapshot(), current)
  await second.clear(second.getSnapshot())
  first.synchronize()
  assert.notEqual(first.getSnapshot().record?.status, 'authenticated')
  assert.equal(transitions.length, 2)
})

test('读取失败停用凭据；退出写入失败在锁内清理旧记录并报告错误', async () => {
  const { disk, create } = fixture()
  let readBlocked = false
  let writeBlocked = false
  const store = await ready(
    create(() => ({
      ...disk,
      getItem(key) {
        if (readBlocked) throw new Error('blocked')
        return disk.getItem(key)
      },
      setItem(key, value) {
        if (writeBlocked) throw new Error('quota')
        disk.setItem(key, value)
      }
    }))
  )
  await store.login(alice, 'token', store.getSnapshot())
  const before = store.getSnapshot()
  readBlocked = true
  assert.equal(store.isCurrent(before), false)
  assert.equal(store.getSnapshot().record, null)
  readBlocked = false
  await store.login(alice, 'token', store.getSnapshot())
  writeBlocked = true
  assert.ok((await store.clear(store.getSnapshot())).error instanceof SessionStorageError)
  assert.equal(store.getSnapshot().record, null)
  assert.equal(disk.getItem(SESSION_KEY), null)
})

for (const operation of ['login', 'clear']) {
  test(`等待锁期间另页先登录时，旧 ${operation} 不覆盖新会话或执行退出副作用`, async () => {
    const { disk, create, idb } = fixture()
    const first = await ready(create())
    await first.login(alice, 'alice-token', first.getSnapshot())
    const second = await ready(create())
    const old = first.getSnapshot()
    const release = idb.hold()
    const queued = idb.queued
    const nextLogin = second.login(bob, 'bob-token', second.getSnapshot())
    while (idb.queued === queued) await new Promise((resolve) => setImmediate(resolve))
    let redirected = false
    const previous =
      operation === 'login'
        ? first.login(alice, 'late-token', old)
        : first.clear(old, () => {
            redirected = true
          })
    const rejected = assert.rejects(previous, StaleSessionError)
    while (idb.queued < queued + 2) await new Promise((resolve) => setImmediate(resolve))
    release()
    await nextLogin
    await rejected
    assert.equal(JSON.parse(disk.getItem(SESSION_KEY)).user.userName, 'bob')
    assert.equal(redirected, false)
    assert.equal(first.getSnapshot().record.user.userName, 'bob')
  })
}

test('同账号同 token 的并发重新登录仍按新会话身份拒绝旧操作', async () => {
  const { create } = fixture()
  const first = await ready(create())
  await first.login(alice, 'same', first.getSnapshot())
  const second = await ready(create())
  const previous = first.getSnapshot()
  await second.login(alice, 'same', second.getSnapshot())
  await assert.rejects(first.clear(previous), StaleSessionError)
  assert.notEqual(first.getSnapshot().record.sessionId, previous.record.sessionId)
})

for (const operation of ['login', 'clear']) {
  test(`迁移等待期间另页已${operation === 'login' ? '登录' : '退出'}时不恢复旧凭据`, async () => {
    const { disk, create, idb } = fixture()
    const other = await ready(create())
    legacy(disk)
    const release = idb.hold()
    const mutation =
      operation === 'login'
        ? other.login(bob, 'new', other.getSnapshot())
        : other.clear(other.getSnapshot())
    // 让另一页先排入事务队列，但暂不实际写入。
    await new Promise((resolve) => setImmediate(resolve))
    const migrating = create()
    const initialization = migrating.initialize()
    release()
    await mutation
    await initialization
    assert.equal(
      migrating.getSnapshot().record?.status,
      operation === 'login' ? 'authenticated' : 'signed-out'
    )
    if (operation === 'login') assert.equal(migrating.getSnapshot().record.user.userName, 'bob')
  })
}

test('IndexedDB 不可用时拒绝无锁写入，重试可恢复；无法锁定退出时不改写存储', async () => {
  const disk = storage()
  const idb = memoryIndexedDB()
  let blocked = true
  const lock = createSessionLock(() => {
    if (blocked) throw new Error('blocked')
    return idb.factory
  })
  const store = await ready(createSessionStore(() => disk, undefined, lock))
  await assert.rejects(store.login(alice, 'token', store.getSnapshot()), SessionStorageError)
  assert.equal(disk.getItem(SESSION_KEY), null)
  blocked = false
  await store.login(alice, 'token', store.getSnapshot())
  const unableToLock = createSessionStore(
    () => disk,
    undefined,
    async () => {
      throw new Error('blocked')
    }
  )
  await unableToLock.initialize()
  const raw = disk.getItem(SESSION_KEY)
  const result = await unableToLock.clear(unableToLock.getSnapshot())
  assert.ok(result.error instanceof SessionStorageError)
  assert.equal(result.session.record, null)
  assert.equal(disk.getItem(SESSION_KEY), raw)
})

test('同步回调失败释放事务队列，后续操作仍能执行', async () => {
  const idb = memoryIndexedDB()
  const first = createSessionLock(() => idb.factory)
  const second = createSessionLock(() => idb.factory)
  await assert.rejects(
    first(() => {
      throw new Error('failed')
    }),
    /failed/
  )
  assert.equal(await second(() => 42), 42)
})
