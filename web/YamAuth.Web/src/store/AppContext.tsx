import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode
} from 'react'
import { message, Spin } from 'antd'
import {
  captureRequestSession,
  clearSession,
  isCurrentRequestSession,
  saveSession,
  StaleSessionError,
  subscribeSession,
  type RequestSession,
  type UserInfo
} from '@/auth/session'
import { loginRecovery } from '@/auth/recovery'
import { notifyRecoveryStorage, replaceWithLogin } from '@/auth/loginRedirect'
import { accessStore, canAccess, type AccessState } from '@/auth/access'
import { fetchAccess, fetchMe, revokeSession } from '@/api/access'
import type { MenuNode } from '@/types/auth'

interface AppContextType {
  user: UserInfo | null
  isLoggedIn: boolean
  session: RequestSession
  access: AccessState
  can: (permission: string) => boolean
  isCurrentSession: () => boolean
  menus: MenuNode[]
  refreshMenus: () => void
  refreshAccess: () => void
  login: (user: UserInfo, token: string) => Promise<RequestSession>
  logout: () => Promise<void>
  clearLocalSession: () => Promise<void>
}
const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(subscribeSession, captureRequestSession)
  const access = useSyncExternalStore(accessStore.subscribe, accessStore.getSnapshot)
  const user = session.record?.status === 'authenticated' ? session.record.user : null
  const sessionId = session.record?.status === 'authenticated' ? session.record.sessionId : null
  useEffect(() => {
    accessStore.syncSession(sessionId)
  }, [sessionId])
  useEffect(() => {
    if (!sessionId || access.sessionId !== sessionId) return
    const epoch = access.epoch
    let cancelled = false
    if (!accessStore.begin(epoch)) return
    void fetchMe()
      .then(async (me) => {
        if (cancelled || !isCurrentRequestSession(session)) return
        if (me.mustChangePassword) {
          accessStore.password(epoch, me)
          return
        }
        const data = await fetchAccess()
        if (!cancelled && isCurrentRequestSession(session)) accessStore.resolve(epoch, data)
      })
      .catch((error: unknown) => {
        if (!cancelled && isCurrentRequestSession(session))
          accessStore.fail(epoch, error instanceof Error ? error.message : '权限加载失败')
      })
    return () => {
      cancelled = true
    }
  }, [session, sessionId, access.sessionId, access.epoch, access.checkRevision])
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') accessStore.recheck()
    }
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [])
  const isCurrentSession = useCallback(
    () => isCurrentRequestSession(session) && accessStore.getSnapshot().epoch === access.epoch,
    [session, access.epoch]
  )
  const login = useCallback(
    (userInfo: UserInfo, token: string) => saveSession(userInfo, token, session),
    [session]
  )
  const clearLocalSession = useCallback(async () => {
    if (!isCurrentRequestSession(session)) return
    try {
      const result = await clearSession(session, () => {
        notifyRecoveryStorage(loginRecovery.clear())
        replaceWithLogin()
      })
      if (result.error && isCurrentRequestSession(result.session))
        message.error(result.error.message)
    } catch (error: unknown) {
      if (!(error instanceof StaleSessionError)) throw error
    }
  }, [session])
  const logout = useCallback(async () => {
    if (!isCurrentRequestSession(session)) return
    await revokeSession()
    await clearLocalSession()
  }, [session, clearLocalSession])
  if (!session.ready) return <Spin fullscreen description="正在读取登录信息" />
  return (
    <AppContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        session,
        access,
        can: (permission) => access.sessionId === sessionId && canAccess(access.data, permission),
        isCurrentSession,
        menus: access.data?.menus ?? [],
        refreshMenus: accessStore.refresh,
        refreshAccess: accessStore.refresh,
        login,
        logout,
        clearLocalSession
      }}
    >
      {children}
    </AppContext.Provider>
  )
}
export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be inside AppProvider')
  return context
}
