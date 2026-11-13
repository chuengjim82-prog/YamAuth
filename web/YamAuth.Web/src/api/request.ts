import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { message } from 'antd'
import type { ApiResponse } from '@/types/api'
import {
  ACCOUNT_KEY,
  SESSION_CLEARED,
  TOKEN_KEY,
  advanceRequestSession,
  captureRequestSession,
  isCurrentRequestSession,
  readAccountUserName,
  type RequestSession
} from '@/auth/session'
import { loginRecovery } from '@/auth/recovery'
import {
  currentHashTarget,
  isLoginTarget,
  notifyRecoveryStorage,
  replaceWithLogin
} from '@/auth/loginRedirect'

export { TOKEN_KEY, ACCOUNT_KEY, SESSION_CLEARED } from '@/auth/session'

function resolveApiBaseURL() {
  const raw = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')
  if (!raw || raw === '/api' || raw.endsWith('/api')) return raw || '/api'
  return `${raw}/api`
}

const request = axios.create({
  baseURL: resolveApiBaseURL(),
  timeout: 30000
})

const ERROR_MESSAGE_KEY = 'api-request-error'
const requestSessions = new WeakMap<object, RequestSession>()

function handleUnauthorized(config: object | undefined) {
  const session = config && requestSessions.get(config)
  if (!session) return false
  // 即使服务端再次签发相同 token，旧会话响应也不能清除新登录态。
  if (!isCurrentRequestSession(session)) return true
  if (!session.token) return false

  const target = currentHashTarget()
  if (!isLoginTarget(target)) {
    notifyRecoveryStorage(
      loginRecovery.save({ reason: 'expired', target, userName: readAccountUserName() })
    )
  }
  replaceWithLogin()
  advanceRequestSession()
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ACCOUNT_KEY)
  window.dispatchEvent(new Event(SESSION_CLEARED))
  message.error({ content: '登录已过期，请重新登录', key: ERROR_MESSAGE_KEY })
  return true
}

request.interceptors.request.use((config: InternalAxiosRequestConfig<unknown, unknown>) => {
  const session = captureRequestSession()
  requestSessions.set(config, session)
  if (session.token) {
    config.headers.Authorization = `Bearer ${session.token}`
  }
  return config
})

request.interceptors.response.use(
  (response: AxiosResponse<unknown, unknown, object, unknown>) => {
    const data = response.data
    if (
      data &&
      typeof data === 'object' &&
      'code' in data &&
      data.code !== 0 &&
      data.code !== 200
    ) {
      const errorMessage = 'message' in data && typeof data.message === 'string' ? data.message : ''
      if (!(data.code === 401 && handleUnauthorized(response.config))) {
        message.error({ content: errorMessage || '请求失败', key: ERROR_MESSAGE_KEY })
      }
      return Promise.reject(new Error(errorMessage || '请求失败'))
    }
    return response
  },
  (error: unknown) => {
    const axiosError = axios.isAxiosError<unknown, unknown, unknown>(error) ? error : undefined
    const response = axiosError?.response
    const body = response?.data
    const errorMessage =
      body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
        ? body.message
        : ''
    if (!(response?.status === 401 && handleUnauthorized(axiosError?.config))) {
      message.error({
        content: errorMessage || '网络错误',
        key: ERROR_MESSAGE_KEY
      })
    }
    return Promise.reject(error instanceof Error ? error : new Error('网络错误', { cause: error }))
  }
)

// 响应、请求体和查询分别传入泛型，阻断 Axios 默认 any 进入自有接口。
type Response<T, D, Q> = AxiosResponse<ApiResponse<T>, D, object, Q>

export async function apiGet<T, Q = undefined>(url: string, params?: Q): Promise<T> {
  const res = await request.get<ApiResponse<T>, Response<T, never, Q>, never, Q>(
    url,
    params === undefined ? {} : { params }
  )
  return res.data.data
}

export async function apiPost<T, D>(url: string, data: D): Promise<T> {
  const res = await request.post<ApiResponse<T>, Response<T, D, never>, D, never>(url, data)
  return res.data.data
}

export async function apiPut<T, D>(url: string, data: D): Promise<T> {
  const res = await request.put<ApiResponse<T>, Response<T, D, never>, D, never>(url, data)
  return res.data.data
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await request.delete<ApiResponse<T>, Response<T, never, never>, never, never>(url)
  return res.data.data
}
