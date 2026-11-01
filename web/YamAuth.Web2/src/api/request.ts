import axios from 'axios'
import { message } from 'antd'
import type { ApiResponse } from '@/types'

export const TOKEN_KEY = 'yamauth-token'
export const ACCOUNT_KEY = 'yamauth-account'
export const SESSION_CLEARED = 'yamauth-session-cleared'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 30000,
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

request.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => {
    const data = response.data as ApiResponse
    if (data && typeof data === 'object' && 'code' in data && data.code !== 0 && data.code !== 200) {
      if (data.code === 401 && localStorage.getItem(TOKEN_KEY)) {
        clearSessionAndRedirectToLogin()
      } else {
        message.error({ content: data.message || '请求失败', key: ERROR_MESSAGE_KEY })
      }
      return Promise.reject(new Error(data.message || '请求失败'))
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      clearSessionAndRedirectToLogin()
    } else {
      message.error({
        content: error.response?.data?.message || '网络错误',
        key: ERROR_MESSAGE_KEY,
      })
    }
    return Promise.reject(error)
  },
)

export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await request.get<ApiResponse<T>>(url, { params })
  return res.data.data
}

export async function apiPost<T>(url: string, data?: unknown): Promise<T> {
  const res = await request.post<ApiResponse<T>>(url, data)
  return res.data.data
}

export async function apiPut<T>(url: string, data?: unknown): Promise<T> {
  const res = await request.put<ApiResponse<T>>(url, data)
  return res.data.data
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await request.delete<ApiResponse<T>>(url)
  return res.data.data
}

export default request
