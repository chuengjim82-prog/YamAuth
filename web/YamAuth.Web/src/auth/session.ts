export const TOKEN_KEY = 'yamauth-token'
export const ACCOUNT_KEY = 'yamauth-account'
export const SESSION_CLEARED = 'yamauth-session-cleared'

export interface RequestSession {
  token: string | null
  version: number
}

let sessionVersion = 0

export function advanceRequestSession() {
  sessionVersion += 1
}

export function captureRequestSession(): RequestSession {
  return { token: localStorage.getItem(TOKEN_KEY), version: sessionVersion }
}

export function isCurrentRequestSession(session: RequestSession) {
  return session.version === sessionVersion && session.token === localStorage.getItem(TOKEN_KEY)
}

export function readAccountUserName(): string | null {
  try {
    const account: unknown = JSON.parse(localStorage.getItem(ACCOUNT_KEY) ?? 'null')
    if (account && typeof account === 'object' && 'userName' in account) {
      return typeof account.userName === 'string' ? account.userName : null
    }
  } catch {
    // 原账号无法确认时，登录后进入首页，不继承未知账号的目标。
  }
  return null
}
