import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { ACCOUNT_KEY, SESSION_CLEARED, TOKEN_KEY } from '@/api/request'
import type { MenuNode, UserInfo } from '@/types'

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
    const token = localStorage.getItem(TOKEN_KEY)
    const account = localStorage.getItem(ACCOUNT_KEY)
    if (!token || !account) return null
    try {
      return JSON.parse(account) as UserInfo
    } catch {
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
    if (user && sessionRef.current === sessionVersion) setMenuRefreshVersion((current) => current + 1)
  }, [user, sessionVersion])

  const login = useCallback((userInfo: UserInfo, token: string) => {
    advanceSession()
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(userInfo))
    setUser(userInfo)
  }, [advanceSession])

  const logout = useCallback(() => {
    advanceSession()
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
    <AppContext.Provider value={{ user, isLoggedIn: !!user, menus, setMenus, menuRefreshVersion, refreshMenus, login, logout }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
