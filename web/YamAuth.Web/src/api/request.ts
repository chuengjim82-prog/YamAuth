import { accessStore, StaleAccessError } from '@/auth/access'
import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { message } from 'antd'
import type { ApiResponse } from '@/types/api'
import {
  StaleSessionError,
  assertCurrentRequestSession,
  clearSession,
  captureRequestSession,
  isCurrentRequestSession,
  type RequestSession
} from '@/auth/session'
import { loginRecovery } from '@/auth/recovery'
import {
  currentHashTarget,
  isLoginTarget,
  notifyRecoveryStorage,
  replaceWithLogin
} from '@/auth/loginRedirect'

function resolveApiBaseURL() {
  const raw = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')
  if (!raw || raw === '/api' || raw.endsWith('/api')) return raw || '/api'
  return `${raw}/api`
}

const request = axios.create({
  baseURL: resolveApiBaseURL(),
  timeout: 30000,
  paramsSerializer: { indexes: null }
})

const ERROR_MESSAGE_KEY = 'api-request-error'
const requestSessions = new WeakMap<object, RequestSession>()
const requestAccessEpochs = new WeakMap<object, number>()

export class ApiProtocolError extends Error {}

export function invalidApiResponse(): never {
  const error = new ApiProtocolError('服务器返回的数据格式不正确，请重试或联系管理员')
  message.error({ content: error.message, key: ERROR_MESSAGE_KEY })
  throw error
}

async function handleUnauthorized(config: object | undefined) {
  const session = config && requestSessions.get(config)
  if (!session) return false
  // 即使服务端再次签发相同 token，旧会话响应也不能清除新登录态。
  if (!isCurrentRequestSession(session)) return true
  if (session.record?.status !== 'authenticated') return false

  const userName = session.record.user.userName
  try {
    const result = await clearSession(session, () => {
      const target = currentHashTarget()
      if (!isLoginTarget(target)) {
        notifyRecoveryStorage(loginRecovery.save({ reason: 'expired', target, userName }))
      }
      replaceWithLogin()
    })
    if (isCurrentRequestSession(result.session)) {
      message.error({
        content: result.error?.message ?? '登录已过期，请重新登录',
        key: ERROR_MESSAGE_KEY
      })
    }
  } catch (error: unknown) {
    if (!(error instanceof StaleSessionError)) throw error
  }
  return true
}

request.interceptors.request.use(
  (config: InternalAxiosRequestConfig<unknown, unknown>) => {
    const session = captureRequestSession()
    assertCurrentRequestSession(session)
    requestSessions.set(config, session)
    const access = accessStore.getSnapshot()
    // 退出和改密绑定登录会话，完成结果不受租户切换或授权刷新影响。
    if (!/\/auth\/(logout|change-password)$/.test(config.url ?? '')) {
      requestAccessEpochs.set(config, access.epoch)
      if (access.contextId) config.headers['X-YamAuth-Context'] = access.contextId
    }
    if (session.record?.status === 'authenticated') {
      config.headers.Authorization = `Bearer ${session.record.token}`
    }
    return config
  },
  (error: unknown) => {
    throw error
  },
  { synchronous: true }
)

function assertResponseSession(config: object | undefined) {
  const session = config && requestSessions.get(config)
  if (session) assertCurrentRequestSession(session)
  const epoch = config && requestAccessEpochs.get(config)
  if (epoch !== undefined) accessStore.assert(epoch)
}

request.interceptors.response.use(
  async (response: AxiosResponse<unknown, unknown, object, unknown>) => {
    assertResponseSession(response.config)
    const currentAccess = accessStore.getSnapshot()
    const authorizationVersion: unknown = response.headers['x-yamauth-authorization-version']
    const catalogVersion: unknown = response.headers['x-yamauth-catalog-version']
    if (
      currentAccess.status === 'ready' &&
      currentAccess.data &&
      requestAccessEpochs.has(response.config) &&
      !/\/auth\/(me|access)$/.test(response.config.url ?? '') &&
      ((typeof authorizationVersion === 'string' &&
        Number(authorizationVersion) !== currentAccess.data.authorizationVersion) ||
        (typeof catalogVersion === 'string' &&
          Number(catalogVersion) !== currentAccess.data.catalogVersion))
    ) {
      accessStore.refresh()
      throw new StaleAccessError()
    }
    const data = response.data
    if (
      !data ||
      typeof data !== 'object' ||
      Array.isArray(data) ||
      !('code' in data) ||
      !Number.isInteger(data.code) ||
      ('message' in data && typeof data.message !== 'string')
    )
      return invalidApiResponse()
    if (data.code === 403) accessStore.refresh()
    if (data.code !== 0 && data.code !== 200) {
      const errorMessage = 'message' in data && typeof data.message === 'string' ? data.message : ''
      if (!(data.code === 401 && (await handleUnauthorized(response.config)))) {
        message.error({ content: errorMessage || '请求失败', key: ERROR_MESSAGE_KEY })
      }
      return Promise.reject(new Error(errorMessage || '请求失败'))
    }
    if (!Object.hasOwn(data, 'data')) return invalidApiResponse()
    return response
  },
  async (error: unknown) => {
    if (error instanceof StaleSessionError || error instanceof StaleAccessError)
      return Promise.reject(error)
    const axiosError = axios.isAxiosError<unknown, unknown, unknown>(error) ? error : undefined
    assertResponseSession(axiosError?.config)
    const response = axiosError?.response
    const body = response?.data
    if (response?.status === 403) {
      if (
        body &&
        typeof body === 'object' &&
        'reason' in body &&
        body.reason === 'ContextInvalidated'
      ) {
        try {
          accessStore.changeContext(null)
        } catch (storageError: unknown) {
          message.error(storageError instanceof Error ? storageError.message : '无法清理租户上下文')
        }
      } else accessStore.refresh()
    }
    const errorMessage =
      body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
        ? body.message
        : ''
    if (!(response?.status === 401 && (await handleUnauthorized(axiosError?.config)))) {
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

export async function apiPut<T, D>(url: string, data: D, rowVersion?: string): Promise<T> {
  const res = await request.put<ApiResponse<T>, Response<T, D, never>, D, never>(
    url,
    data,
    rowVersion ? { headers: { 'If-Match': `"${rowVersion}"` } } : undefined
  )
  return res.data.data
}

export async function apiDelete<T>(url: string, rowVersion?: string): Promise<T> {
  const res = await request.delete<ApiResponse<T>, Response<T, never, never>, never, never>(
    url,
    rowVersion ? { headers: { 'If-Match': `"${rowVersion}"` } } : undefined
  )
  return res.data.data
}
