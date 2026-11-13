export const LOGIN_RECOVERY_KEY = 'yamauth-login-recovery:v1'

export type LoginRecovery =
  | { reason: 'direct'; target: string }
  | { reason: 'expired'; target: string; userName: string | null }

export type RecoveryState =
  { kind: 'empty' } | { kind: 'invalid' } | { kind: 'record'; record: LoginRecovery }

export interface LoginDestination {
  target: string
  unavailable: boolean
}

type RecoveryStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function parseRecovery(raw: string | null): RecoveryState {
  if (raw === null) return { kind: 'empty' }
  try {
    const value: unknown = JSON.parse(raw)
    if (
      value &&
      typeof value === 'object' &&
      'target' in value &&
      typeof value.target === 'string' &&
      'reason' in value
    ) {
      if (value.reason === 'direct') {
        return { kind: 'record', record: { reason: 'direct', target: value.target } }
      }
      if (
        value.reason === 'expired' &&
        'userName' in value &&
        (value.userName === null || typeof value.userName === 'string')
      ) {
        return {
          kind: 'record',
          record: { reason: 'expired', target: value.target, userName: value.userName }
        }
      }
    }
  } catch {
    // 损坏记录与未记录必须区分，供登录成功后明确提示。
  }
  return { kind: 'invalid' }
}

export function createRecoveryStore(getStorage: () => RecoveryStorage) {
  let state: RecoveryState | undefined
  let storageUnavailable = false

  function removeStoredRecord() {
    try {
      getStorage().removeItem(LOGIN_RECOVERY_KEY)
    } catch {
      storageUnavailable = true
    }
  }

  function persist(record: LoginRecovery | null) {
    // 配额不足只会阻止写入；即使已退回内存模式，清理仍需尝试删除旧记录。
    if (!record || storageUnavailable) {
      removeStoredRecord()
      return
    }
    try {
      getStorage().setItem(LOGIN_RECOVERY_KEY, JSON.stringify(record))
    } catch {
      // 新目标仅在本页内存中保留，并尽力移除旧目标，避免刷新后恢复过时地址。
      storageUnavailable = true
      removeStoredRecord()
    }
  }

  return {
    read() {
      if (!state) {
        try {
          state = parseRecovery(getStorage().getItem(LOGIN_RECOVERY_KEY))
          if (state.kind === 'invalid') persist(null)
        } catch {
          storageUnavailable = true
          state = { kind: 'empty' }
        }
      }
      return { state, storageUnavailable }
    },
    save(record: LoginRecovery) {
      state = { kind: 'record', record }
      persist(record)
      return { storageUnavailable }
    },
    clear() {
      state = { kind: 'empty' }
      persist(null)
      return { storageUnavailable }
    }
  }
}

export const loginRecovery = createRecoveryStore(() => sessionStorage)

export function resolveLoginDestination(
  state: RecoveryState,
  userName: string,
  pageExists: (pathname: string) => boolean
): LoginDestination {
  const home = { target: '/home', unavailable: false }
  if (state.kind === 'empty') return home
  if (state.kind === 'invalid') return { ...home, unavailable: true }

  const record = state.record
  if (record.reason === 'expired' && (!record.userName || record.userName !== userName)) {
    return home
  }

  const target = record.target
  // 浏览器及路由对反斜线、控制字符的解释可能不同，只接受明确的站内绝对路径。
  if (
    !target.startsWith('/') ||
    target.startsWith('//') ||
    target.includes('\\') ||
    [...target].some((char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127)
  ) {
    return { ...home, unavailable: true }
  }
  const pathname = target.split(/[?#]/, 1)[0]
  if (!pathname || /^\/login\/?$/i.test(pathname)) return { ...home, unavailable: true }
  // 与首页路由默认的大小写不敏感、允许尾斜线规则一致，仅规范化路径。
  if (pathname === '/' || /^\/home\/*$/i.test(pathname)) {
    return { target: `/home${target.slice(pathname.length)}`, unavailable: false }
  }
  if (!pageExists(pathname)) return { ...home, unavailable: true }
  return { target, unavailable: false }
}
