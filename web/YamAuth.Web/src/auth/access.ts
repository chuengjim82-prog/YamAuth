import type { Access, Me } from '@/types/access'

export const CONTEXT_KEY = 'yamauth-context:v1'
export class StaleAccessError extends Error {
  constructor() {
    super('访问上下文已变化')
  }
}
export interface AccessState {
  sessionId: string | null
  contextId: string | null
  epoch: number
  checkRevision: number
  checking: boolean
  status: 'idle' | 'loading' | 'ready' | 'password' | 'failed'
  data: Access | null
  me: Me | null
  error: string | null
}
type ContextStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function createAccessStore(getStorage: () => ContextStorage) {
  let state: AccessState = {
    sessionId: null,
    contextId: null,
    epoch: 0,
    checkRevision: 0,
    checking: false,
    status: 'idle',
    data: null,
    me: null,
    error: null
  }
  const listeners = new Set<() => void>()
  function publish(next: AccessState) {
    state = next
    listeners.forEach((listener) => listener())
  }
  function invalidate(contextId: string | null = state.contextId) {
    publish({
      ...state,
      contextId,
      epoch: state.epoch + 1,
      checking: false,
      status: 'idle',
      data: null,
      me: null,
      error: null
    })
  }
  return {
    getSnapshot: () => state,
    subscribe(this: void, listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    syncSession(sessionId: string | null) {
      if (sessionId === state.sessionId) return
      let contextId: string | null = null
      try {
        const raw = getStorage().getItem(CONTEXT_KEY)
        const stored: unknown = raw ? JSON.parse(raw) : null
        if (
          stored &&
          typeof stored === 'object' &&
          'sessionId' in stored &&
          stored.sessionId === sessionId &&
          'contextId' in stored &&
          typeof stored.contextId === 'string'
        )
          contextId = stored.contextId
        else getStorage().removeItem(CONTEXT_KEY)
      } catch {
        /* 上下文存储不可读时不恢复任何租户，后续显式切换仍会报告保存失败。 */
      }
      publish({
        sessionId,
        contextId,
        epoch: state.epoch + 1,
        checkRevision: state.checkRevision,
        checking: false,
        status: 'idle',
        data: null,
        me: null,
        error: null
      })
    },
    changeContext(contextId: string | null) {
      try {
        if (contextId)
          getStorage().setItem(
            CONTEXT_KEY,
            JSON.stringify({ sessionId: state.sessionId, contextId })
          )
        else getStorage().removeItem(CONTEXT_KEY)
      } catch {
        throw new Error('无法保存租户管理上下文，请检查浏览器存储设置')
      }
      invalidate(contextId)
    },
    refresh(this: void) {
      if (state.status !== 'idle' && state.status !== 'loading') invalidate()
    },
    recheck(this: void) {
      if (state.checking || !['ready', 'password'].includes(state.status)) return
      // 回到标签页先检查权威版本；未变更时保留当前页面和未保存输入。
      publish({ ...state, checkRevision: state.checkRevision + 1, checking: true })
    },
    begin(epoch: number) {
      // StrictMode 会重启同一轮 effect；loading 状态仍须允许替代已取消的加载。
      if (state.epoch !== epoch || (!['idle', 'loading'].includes(state.status) && !state.checking))
        return false
      if (!state.checking) publish({ ...state, status: 'loading' })
      return true
    },
    resolve(epoch: number, data: Access) {
      if (state.epoch !== epoch) return
      const changed =
        state.checking &&
        (state.status !== 'ready' ||
          !state.data ||
          state.data.authorizationVersion !== data.authorizationVersion ||
          state.data.catalogVersion !== data.catalogVersion ||
          state.data.appsId !== data.appsId ||
          state.me?.identity !== data.me.identity ||
          state.me?.tenantId !== data.me.tenantId ||
          state.me?.contextId !== data.me.contextId)
      publish({
        ...state,
        epoch: changed ? epoch + 1 : epoch,
        checking: false,
        status: 'ready',
        data,
        me: data.me,
        error: null
      })
    },
    password(epoch: number, me: Me) {
      if (state.epoch === epoch)
        publish({
          ...state,
          epoch: state.checking && state.status !== 'password' ? epoch + 1 : epoch,
          checking: false,
          status: 'password',
          me,
          data: null
        })
    },
    fail(epoch: number, error: string) {
      if (state.epoch === epoch)
        publish({
          ...state,
          epoch: state.checking ? epoch + 1 : epoch,
          checking: false,
          status: 'failed',
          error,
          data: null
        })
    },
    assert(epoch: number) {
      if (state.epoch !== epoch) throw new StaleAccessError()
    }
  }
}

export const accessStore = createAccessStore(() => sessionStorage)
export function permissionKey(path: string, action: string) {
  return `${path.replace(/^\//, '').replaceAll('/', '.')}.${action}`
}
export function canAccess(data: Access | null, permission: string) {
  return Boolean(
    data &&
    !data.me.mustChangePassword &&
    data.permissions.some((entry) => entry.code === permission)
  )
}
