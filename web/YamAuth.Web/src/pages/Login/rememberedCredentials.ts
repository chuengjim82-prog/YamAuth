import type { LoginRequest } from '@/types/auth'
import { withSessionLock } from '@/auth/sessionLock'

const REMEMBERED_CREDENTIALS_KEY = 'yamauth-remembered-credentials:v1'
const INVALID_RECORD_MESSAGE = '已记住的账号密码格式异常，请重新输入'

interface RememberedCredentials {
  raw: string | null
  credentials: LoginRequest | null
  error: string | null
}

/** 密码记录独立于登录会话，退出和会话过期不会删除它。 */
export function readRememberedCredentials(): RememberedCredentials {
  let raw: string | null
  try {
    raw = localStorage.getItem(REMEMBERED_CREDENTIALS_KEY)
  } catch {
    return {
      raw: null,
      credentials: null,
      error: '读取记住的密码失败，请检查浏览器存储设置或清除本站数据'
    }
  }
  if (raw === null) return { raw, credentials: null, error: null }
  try {
    const value: unknown = JSON.parse(raw)
    // 撤销标记不包含账号密码；每次清除使用不同标记，避免旧请求将空记录误认成未变化。
    if (
      value &&
      typeof value === 'object' &&
      'version' in value &&
      value.version === 1 &&
      'cleared' in value &&
      typeof value.cleared === 'string' &&
      value.cleared
    )
      return { raw, credentials: null, error: null }
    if (
      !value ||
      typeof value !== 'object' ||
      !('version' in value) ||
      value.version !== 1 ||
      !('userName' in value) ||
      typeof value.userName !== 'string' ||
      !value.userName.trim() ||
      !('password' in value) ||
      typeof value.password !== 'string' ||
      !value.password
    ) {
      return { raw, credentials: null, error: INVALID_RECORD_MESSAGE }
    }
    return { raw, credentials: { userName: value.userName, password: value.password }, error: null }
  } catch {
    return { raw, credentials: null, error: INVALID_RECORD_MESSAGE }
  }
}

export function saveRememberedCredentials(
  credentials: LoginRequest,
  expectedRaw: string | null,
  isCurrent: () => boolean
) {
  return withSessionLock(() => {
    // 跨标签页撤销不改变登录会话；必须同时核对记忆记录，不能只依赖 storage 事件。
    if (!isCurrent() || localStorage.getItem(REMEMBERED_CREDENTIALS_KEY) !== expectedRaw) return
    // 按用户选择保存可回填的原始密码；编码或前端加密不能使此记录成为安全凭据库。
    localStorage.setItem(
      REMEMBERED_CREDENTIALS_KEY,
      JSON.stringify({ version: 1, userName: credentials.userName, password: credentials.password })
    )
  })
}

export function clearRememberedCredentials() {
  return withSessionLock(() => {
    const cleared = Array.from(crypto.getRandomValues(new Uint32Array(4)), (part) =>
      part.toString(16).padStart(8, '0')
    ).join('')
    // 用单次原子写入删除全部凭据并记录撤销；与保存共用锁，防止检查和写入之间被穿插。
    localStorage.setItem(REMEMBERED_CREDENTIALS_KEY, JSON.stringify({ version: 1, cleared }))
  })
}

export function subscribeRememberedCredentials(listener: (value: RememberedCredentials) => void) {
  const synchronize = () => listener(readRememberedCredentials())
  const onStorage = (event: StorageEvent) => {
    if (event.key !== REMEMBERED_CREDENTIALS_KEY && event.key !== null) return
    try {
      if (event.storageArea !== localStorage) return
    } catch {
      // 读取函数会返回存储错误，由页面统一提示。
    }
    synchronize()
  }
  window.addEventListener('storage', onStorage)
  // 补上首次读取与订阅之间发生的变化；回调只同步勾选状态，不覆盖用户输入。
  synchronize()
  return () => window.removeEventListener('storage', onStorage)
}
