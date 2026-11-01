import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { ACCOUNT_KEY, SESSION_CLEARED, TOKEN_KEY } from '@/api/request'
import type { MenuNode, UserInfo } from '@/types'

interface AppContextType {
  user: UserInfo | null
  isLoggedIn: boolean
  menus: MenuNode[]
  setMenus: (menus: MenuNode[]) => void
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

  const login = useCallback((userInfo: UserInfo, token: string) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(userInfo))
    setUser(userInfo)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(ACCOUNT_KEY)
    setUser(null)
    setMenus([])
  }, [])

  useEffect(() => {
    const onCleared = () => {
      setUser(null)
      setMenus([])
    }
    window.addEventListener(SESSION_CLEARED, onCleared)
    return () => window.removeEventListener(SESSION_CLEARED, onCleared)
  }, [])

  return (
    <AppContext.Provider value={{ user, isLoggedIn: !!user, menus, setMenus, login, logout }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
