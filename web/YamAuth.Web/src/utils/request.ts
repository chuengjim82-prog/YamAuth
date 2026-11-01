import { i18n } from '@/i18n'
import { routeState } from '@/router/dynamic'
import { useLocaleStore } from '@/stores/locale'
import { useUserStore } from '@/stores/user'
import { formatApiError } from '@/utils/apiError'
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const baseURL = import.meta.env.VITE_API_BASE as string

const instance = axios.create({ baseURL, timeout: 30000 })

function forceRelogin(messageKey: 'error.sessionInvalid' | 'error.loginExpired') {
  const user = useUserStore()
  user.clearLocal()
  routeState.loaded = false
  ElMessage.warning(i18n.global.t(messageKey))
  if (!location.pathname.startsWith('/login')) {
    location.href = '/login'
  }
}

instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const user = useUserStore()
  const localeStore = useLocaleStore()
  config.headers['Accept-Language'] = localeStore.locale
  if (user.token) {
    config.headers.Authorization = `Bearer ${user.token}`
  }
  return config
})

instance.interceptors.response.use(
  (resp) => {
    // Blob / ArrayBuffer 响应直接返回完整 response，保留 headers 供下载用
    if (resp.config.responseType === 'blob' || resp.config.responseType === 'arraybuffer') {
      return resp
    }
    const body = resp.data
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 0) return body.data
      ElMessage.error(formatApiError(body))
      return Promise.reject(body)
    }
    return resp.data
  },
  async (err) => {
    const status = err.response?.status
    const body = err.response?.data
    const code = body?.code

    if (status === 401 || code === 401) {
      forceRelogin('error.loginExpired')
      return Promise.reject(err)
    }

    if (status === 403) {
      ElMessage.error(body?.message ? formatApiError(body) : i18n.global.t('message.noPermission'))
    } else {
      ElMessage.error(body?.message ? formatApiError(body) : i18n.global.t('message.requestFailed'))
    }
    return Promise.reject(err)
  }
)

export function request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
  return instance(config) as unknown as Promise<T>
}

export { instance as http }
