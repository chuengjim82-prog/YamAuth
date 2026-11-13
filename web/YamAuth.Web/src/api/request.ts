import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { message } from 'antd'
import type { ApiResponse } from '@/types/api'

export const TOKEN_KEY = 'yamauth-token'
export const ACCOUNT_KEY = 'yamauth-account'
export const SESSION_CLEARED = 'yamauth-session-cleared'

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
let lastUnauthorizedToken: string | null = null

function clearSessionAndRedirectToLogin() {
  const token = localStorage.getItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ACCOUNT_KEY)
  window.dispatchEvent(new Event(SESSION_CLEARED))

  if (token && lastUnauthorizedToken !== token) {
    lastUnauthorizedToken = token
    message.error({ content: '登录已过期，请重新登录', key: ERROR_MESSAGE_KEY })
  }

  if (!window.location.hash.startsWith('#/login')) {
    window.location.hash = '#/login'
  }
}

request.interceptors.request.use((config: InternalAxiosRequestConfig<unknown, unknown>) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
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
      if (data.code === 401 && localStorage.getItem(TOKEN_KEY)) {
        clearSessionAndRedirectToLogin()
      } else {
        message.error({ content: errorMessage || '请求失败', key: ERROR_MESSAGE_KEY })
      }
      return Promise.reject(new Error(errorMessage || '请求失败'))
    }
    return response
  },
  (error: unknown) => {
    const response = axios.isAxiosError<unknown, unknown, unknown>(error)
      ? error.response
      : undefined
    const body = response?.data
    const errorMessage =
      body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
        ? body.message
        : ''
    if (response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      clearSessionAndRedirectToLogin()
    } else {
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
