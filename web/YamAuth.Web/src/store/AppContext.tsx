import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react'
import { ACCOUNT_KEY, SESSION_CLEARED, TOKEN_KEY, advanceRequestSession } from '@/auth/session'
import { loginRecovery } from '@/auth/recovery'
import { notifyRecoveryStorage, replaceWithLogin } from '@/auth/loginRedirect'
import type { MenuNode } from '@/types/auth'

interface UserInfo {
  userName: string
  nickName: string
}

interface AppContextType {
  user: UserInfo | null
  isLoggedIn: boolean
  menus: MenuNode[]
  setMenus: (menus: MenuNode[]) => void
  menuRefreshVersion: number
  refreshMenus: () => void
  login: (user: UserInfo, token: string) => void
  logout: () => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(() => {
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      const account = localStorage.getItem(ACCOUNT_KEY)
      if (!token || !account) return null
      const parsed: unknown = JSON.parse(account)
      if (
        parsed &&
        typeof parsed === 'object' &&
        'userName' in parsed &&
        typeof parsed.userName === 'string' &&
        'nickName' in parsed &&
        typeof parsed.nickName === 'string'
      ) {
        return { userName: parsed.userName, nickName: parsed.nickName }
      }
      return null
    } catch {
      // 浏览器禁用存储时仍展示登录页，使主题可以在当前页面正常切换。
      return null
    }
  })
  const [menus, setMenus] = useState<MenuNode[]>([])
  const [menuRefreshVersion, setMenuRefreshVersion] = useState(0)
  const [sessionVersion, setSessionVersion] = useState(0)
  const sessionRef = useRef(0)

  const advanceSession = useCallback(() => {
    setSessionVersion(++sessionRef.current)
  }, [])

  const refreshMenus = useCallback(() => {
    // 保存回调可能迟于退出或重新登录；旧会话只能刷新自己的导航。
    if (user && sessionRef.current === sessionVersion)
      setMenuRefreshVersion((current) => current + 1)
  }, [user, sessionVersion])

  const login = useCallback(
    (userInfo: UserInfo, token: string) => {
      advanceSession()
      advanceRequestSession()
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify(userInfo))
      setUser(userInfo)
    },
    [advanceSession]
  )

  const logout = useCallback(() => {
    notifyRecoveryStorage(loginRecovery.clear())
    // 先替换地址，避免未登录守卫把主动退出的页面重新记为恢复目标。
    replaceWithLogin()
    advanceSession()
    advanceRequestSession()
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(ACCOUNT_KEY)
    setUser(null)
    setMenus([])
  }, [advanceSession])

  useEffect(() => {
    const onCleared = () => {
      advanceSession()
      setUser(null)
      setMenus([])
    }
    window.addEventListener(SESSION_CLEARED, onCleared)
    return () => window.removeEventListener(SESSION_CLEARED, onCleared)
  }, [advanceSession])

  return (
    <AppContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        menus,
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
