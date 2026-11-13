import { message } from 'antd'
import { loginRecovery, resolveLoginDestination } from '@/auth/recovery'
import { notifyRecoveryStorage } from '@/auth/loginRedirect'

export async function prepareLoginDestination(userName: string, isCurrentSession: () => boolean) {
  const recovery = loginRecovery.read()
  notifyRecoveryStorage(recovery)
  const destination = resolveLoginDestination(recovery.state, userName, () => true)
  if (destination.unavailable || /^\/home(?:[?#]|$)/.test(destination.target)) return destination

  try {
    // 仅恢复业务页面时加载资源注册信息，普通登录不提前加载整个 CRUD 页面。
    const { findResource } = await import('@/resources')
    return resolveLoginDestination(recovery.state, userName, (path) => !!findResource(path))
  } catch (error) {
    // 模块加载失败不代表原页面不存在；保留恢复记录供重试。
    if (isCurrentSession()) message.error('页面信息加载失败，请重试')
    throw error
  }
}
