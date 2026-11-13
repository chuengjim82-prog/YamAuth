import {
  createContext,
  useCallback,
  useContext,
  useState,
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
import type { MenuNode } from '@/types/auth'

interface AppContextType {
  user: UserInfo | null
  isLoggedIn: boolean
  session: RequestSession
  isCurrentSession: () => boolean
  menus: MenuNode[]
  setMenus: (menus: MenuNode[]) => void
  menuRefreshVersion: number
  refreshMenus: () => void
  login: (user: UserInfo, token: string) => Promise<RequestSession>
  logout: () => Promise<void>
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(subscribeSession, captureRequestSession)
  const user = session.record?.status === 'authenticated' ? session.record.user : null
  const [navigation, setNavigation] = useState<{ session: RequestSession; menus: MenuNode[] }>()
  const [menuRefreshVersion, setMenuRefreshVersion] = useState(0)
  const isCurrentSession = useCallback(() => isCurrentRequestSession(session), [session])
  const setMenus = useCallback(
    (menus: MenuNode[]) => {
      if (isCurrentSession()) setNavigation({ session, menus })
    },
    [session, isCurrentSession]
  )
  const refreshMenus = useCallback(() => {
    if (user && isCurrentSession()) setMenuRefreshVersion((current) => current + 1)
  }, [user, isCurrentSession])
  const login = useCallback(
    (userInfo: UserInfo, token: string) => {
      return saveSession(userInfo, token, session)
    },
    [session]
  )
  const logout = useCallback(async () => {
    if (!isCurrentSession()) return
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
  }, [session, isCurrentSession])

  if (!session.ready) return <Spin fullscreen tip="正在读取登录信息" />

  return (
    <AppContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        session,
        isCurrentSession,
        menus: navigation?.session === session ? navigation.menus : [],
        setMenus,
        menuRefreshVersion,
        refreshMenus,
        login,
        logout
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
