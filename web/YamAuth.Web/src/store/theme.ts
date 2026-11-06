import { useSyncExternalStore } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

interface ThemeSnapshot {
  readonly mode: ThemeMode
  readonly resolvedTheme: ResolvedTheme
}

// 首屏脚本也读取此键；修改存储约定时须同步 index.html。
const THEME_KEY = 'yamauth-theme'
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark'
}

function parseThemeMode(value: string | null): ThemeMode {
  if (isThemeMode(value)) return value
  if (value !== null) console.warn('已忽略无效的主题偏好，使用跟随系统。')
  return 'system'
}

function readThemeMode(): ThemeMode {
  try {
    return parseThemeMode(localStorage.getItem(THEME_KEY))
  } catch {
    console.warn('无法读取浏览器主题偏好，本次使用跟随系统。')
    return 'system'
  }
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? (systemTheme.matches ? 'dark' : 'light') : mode
}

const initialMode = readThemeMode()
let snapshot: ThemeSnapshot = { mode: initialMode, resolvedTheme: resolveTheme(initialMode) }

function applyDocumentTheme() {
  document.documentElement.dataset.theme = snapshot.resolvedTheme
  document.documentElement.style.colorScheme = snapshot.resolvedTheme
}

function updateTheme(mode: ThemeMode) {
  const resolvedTheme = resolveTheme(mode)
  if (snapshot.mode === mode && snapshot.resolvedTheme === resolvedTheme) return
  // 缓存快照引用，避免 useSyncExternalStore 在未发生变化时重复渲染。
  snapshot = { mode, resolvedTheme }
  applyDocumentTheme()
  listeners.forEach((listener) => listener())
}

function handleSystemChange() {
  updateTheme(snapshot.mode)
}

function handleStorage(event: StorageEvent) {
  if (event.key !== THEME_KEY && event.key !== null) return
  try {
    if (event.storageArea !== localStorage) return
    // 事件可能排队到本页再次选择之后；读取当前值，避免旧事件覆盖最新偏好。
    // 只读不写回，避免标签页之间重复通知。
    updateTheme(parseThemeMode(localStorage.getItem(THEME_KEY)))
  } catch {
    // 同步读取失败时保留当前显示，不能用默认值覆盖本页的选择。
    console.warn('无法同步浏览器主题偏好，保留当前主题。')
    return
  }
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    systemTheme.addEventListener('change', handleSystemChange)
    window.addEventListener('storage', handleStorage)
    updateTheme(snapshot.mode)
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      systemTheme.removeEventListener('change', handleSystemChange)
      window.removeEventListener('storage', handleStorage)
    }
  }
}

applyDocumentTheme()

export function useTheme() {
  return useSyncExternalStore(subscribe, () => snapshot)
}

/** 立即切换主题；返回 false 表示本地保存失败，调用方应提示用户。 */
export function setThemeMode(mode: ThemeMode): boolean {
  updateTheme(mode)
  try {
    localStorage.setItem(THEME_KEY, mode)
    return true
  } catch {
    return false
  }
}
