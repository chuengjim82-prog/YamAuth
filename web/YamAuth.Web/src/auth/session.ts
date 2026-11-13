import { loginRecovery } from './recovery'
import { withSessionLock, type SessionLock } from './sessionLock'

export const TOKEN_KEY = 'yamauth-token'
export const ACCOUNT_KEY = 'yamauth-account'
export const SESSION_KEY = 'yamauth-session:v1'

export interface UserInfo {
  userName: string
  nickName: string
}

type SessionRecord =
  | { version: 1; status: 'authenticated'; sessionId: string; token: string; user: UserInfo }
  | { version: 1; status: 'signed-out'; sessionId: string }

export class SessionStorageError extends Error {
  constructor(options?: ErrorOptions) {
    super('无法保存或读取登录信息，请检查浏览器存储设置后重新登录', options)
  }
}

/** 旧页面的回调只应结束，不能显示错误或借用新账号继续执行。 */
export class StaleSessionError extends Error {
  constructor() {
    super('会话已变化')
  }
}

export interface RequestSession {
  readonly ready: boolean
  readonly record: SessionRecord | null
  readonly revision: number
  readonly storageError: SessionStorageError | null
}

type SessionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function newSessionId() {
  return Array.from(crypto.getRandomValues(new Uint32Array(4)), (part) =>
    part.toString(16).padStart(8, '0')
  ).join('')
}

function isUser(value: unknown): value is UserInfo {
  return (
    !!value &&
    typeof value === 'object' &&
    'userName' in value &&
    typeof value.userName === 'string' &&
    value.userName.trim().length > 0 &&
    'nickName' in value &&
    typeof value.nickName === 'string'
  )
}

function parseRecord(raw: string | null): SessionRecord | null {
  if (raw === null) return null
  const value: unknown = JSON.parse(raw)
  if (
    value &&
    typeof value === 'object' &&
    'version' in value &&
    value.version === 1 &&
    'sessionId' in value &&
    typeof value.sessionId === 'string' &&
    value.sessionId &&
    'status' in value
  ) {
    if (value.status === 'signed-out')
      return { version: 1, status: 'signed-out', sessionId: value.sessionId }
    if (
      value.status === 'authenticated' &&
      'token' in value &&
      typeof value.token === 'string' &&
      value.token.trim() &&
      'user' in value &&
      isUser(value.user)
    ) {
      return {
        version: 1,
        status: 'authenticated',
        sessionId: value.sessionId,
        token: value.token,
        user: { userName: value.user.userName, nickName: value.user.nickName }
      }
    }
  }
  throw new Error('登录记录格式无效')
}

/** 单条记录是唯一事实来源；旧键只在首次加载且新键不存在时迁移。 */
export function createSessionStore(
  getStorage: () => SessionStorage,
  onExternalChange: (previous: RequestSession, next: RequestSession) => void = () => {},
  withLock: SessionLock = withSessionLock
) {
  let initialization: Promise<RequestSession> | undefined
  let storedRaw: string | null = null
  let snapshot: RequestSession = { ready: false, record: null, revision: 0, storageError: null }
  const listeners = new Set<() => void>()

  function publish(
    record: SessionRecord | null,
    error: SessionStorageError | null,
    external = false
  ) {
    const previous = snapshot
    snapshot = { ready: true, record, revision: previous.revision + 1, storageError: error }
    // 先处理地址，避免未登录守卫将同步退出误记为需要恢复的页面。
    if (external) onExternalChange(previous, snapshot)
    listeners.forEach((listener) => listener())
  }

  function removeLegacy() {
    for (const key of [TOKEN_KEY, ACCOUNT_KEY]) {
      try {
        getStorage().removeItem(key)
      } catch {
        // 新记录（包括退出标记）已生效，残留旧键不再参与读取。
      }
    }
  }

  function getSnapshot(): RequestSession {
    return snapshot
  }

  function initialize(): Promise<RequestSession> {
    initialization ??= (async () => {
      try {
        const storage = getStorage()
        storedRaw = storage.getItem(SESSION_KEY)
        if (storedRaw !== null) {
          publish(parseRecord(storedRaw), null)
        } else if (storage.getItem(TOKEN_KEY) === null && storage.getItem(ACCOUNT_KEY) === null) {
          publish(null, null)
        } else {
          await withLock(() => {
            // 等待期间可能已有其他标签页登录或退出，必须在锁内重新读取。
            storedRaw = storage.getItem(SESSION_KEY)
            if (storedRaw === null) {
              const token = storage.getItem(TOKEN_KEY)
              const account = storage.getItem(ACCOUNT_KEY)
              const user: unknown = account === null ? null : JSON.parse(account)
              if (token?.trim() && isUser(user)) {
                try {
                  const record: SessionRecord = {
                    version: 1,
                    status: 'authenticated',
                    sessionId: newSessionId(),
                    token,
                    user
                  }
                  const raw = JSON.stringify(record)
                  storage.setItem(SESSION_KEY, raw)
                  storedRaw = raw
                } finally {
                  // 清理与迁移处于同一锁内，失败也不能留给下次加载继续迁移。
                  removeLegacy()
                }
              }
            }
            publish(parseRecord(storedRaw), null)
          })
        }
      } catch (cause) {
        publish(null, new SessionStorageError({ cause }))
      }
      return snapshot
    })()
    return initialization
  }

  function synchronize() {
    if (!snapshot.ready) return
    try {
      const raw = getStorage().getItem(SESSION_KEY)
      if (raw === storedRaw) return
      storedRaw = raw
      publish(parseRecord(raw), null, true)
    } catch (cause) {
      if (!snapshot.storageError) publish(null, new SessionStorageError({ cause }), true)
    }
  }

  function isCurrent(expected: RequestSession) {
    synchronize()
    return snapshot === expected
  }

  function assertCurrent(expected: RequestSession) {
    if (!isCurrent(expected)) throw new StaleSessionError()
  }

  async function login(user: UserInfo, token: string, expected: RequestSession) {
    await initialize()
    try {
      return await withLock(() => {
        assertCurrent(expected)
        const record: SessionRecord = {
          version: 1,
          status: 'authenticated',
          sessionId: newSessionId(),
          token,
          user
        }
        const raw = JSON.stringify(record)
        getStorage().setItem(SESSION_KEY, raw)
        storedRaw = raw
        removeLegacy()
        publish(record, null)
        return snapshot
      })
    } catch (cause) {
      if (cause instanceof StaleSessionError) throw cause
      // 获取锁失败也不能改写其他标签页的新登录态。
      assertCurrent(expected)
      const error = new SessionStorageError({ cause })
      publish(null, error)
      throw error
    }
  }

  async function clear(expected: RequestSession, beforeClear: () => void = () => {}) {
    await initialize()
    try {
      return await withLock(() => {
        assertCurrent(expected)
        // 恢复目标和地址必须在确认本次退出仍有效后才修改。
        beforeClear()
        const raw = JSON.stringify({ version: 1, status: 'signed-out', sessionId: newSessionId() })
        let error: SessionStorageError | null = null
        try {
          getStorage().setItem(SESSION_KEY, raw)
          storedRaw = raw
        } catch (cause) {
          error = new SessionStorageError({ cause })
          try {
            // 锁同时覆盖失败清理，避免检查与删除之间被另一标签页写入。
            if (getStorage().getItem(SESSION_KEY) === storedRaw) {
              getStorage().removeItem(SESSION_KEY)
              storedRaw = null
            }
          } catch {
            /* 本页仍立即停止使用旧凭据，存储错误交给界面提示。 */
          }
        }
        removeLegacy()
        publish(null, error)
        return { session: snapshot, error }
      })
    } catch (cause) {
      if (cause instanceof StaleSessionError) throw cause
      assertCurrent(expected)
      // 无法取得锁时不进行任何存储写入，仅停止本页使用旧凭据。
      beforeClear()
      const error = new SessionStorageError({ cause })
      publish(null, error)
      return { session: snapshot, error }
    }
  }

  return {
    initialize,
    getSnapshot,
    synchronize,
    isCurrent,
    assertCurrent,
    login,
    clear,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
}

const sessionStore = createSessionStore(
  () => localStorage,
  (previous, next) => {
    // 跨标签页变化必须静默同步，不消费或继承旧账号的恢复目标。
    loginRecovery.clear()
    const before = previous.record
    const after = next.record
    if (after?.status !== 'authenticated') window.location.replace('#/login')
    else if (before?.status !== 'authenticated' || before.user.userName !== after.user.userName)
      window.location.replace('#/home')
  }
)

export const initializeSession = sessionStore.initialize
export const captureRequestSession = sessionStore.getSnapshot
export const isCurrentRequestSession = sessionStore.isCurrent
export const assertCurrentRequestSession = sessionStore.assertCurrent
export const saveSession = sessionStore.login
export const clearSession = sessionStore.clear

export function subscribeSession(listener: () => void) {
  const unsubscribe = sessionStore.subscribe(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key !== SESSION_KEY && event.key !== null) return
    try {
      if (event.storageArea !== localStorage) return
    } catch {
      /* 同步函数会报告读取失败。 */
    }
    sessionStore.synchronize()
  }
  window.addEventListener('storage', onStorage)
  // 补上 render 与订阅之间发生的存储变化。
  void sessionStore.initialize().then(() => sessionStore.synchronize())
  return () => {
    unsubscribe()
    window.removeEventListener('storage', onStorage)
  }
}
