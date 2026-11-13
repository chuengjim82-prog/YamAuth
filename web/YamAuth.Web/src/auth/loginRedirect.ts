import { message } from 'antd'
import { loginRecovery } from './recovery'

let storageWarningShown = false

export function notifyRecoveryStorage(result: { storageUnavailable: boolean }) {
  if (result.storageUnavailable && !storageWarningShown) {
    storageWarningShown = true
    message.warning({
      key: 'login-recovery-storage',
      content: '浏览器无法保存登录恢复信息，刷新后可能无法返回原页面'
    })
  }
}

export function currentHashTarget() {
  const target = window.location.hash.slice(1)
  // HashRouter 也接受 #auth/users；与其补齐路径前缀的行为保持一致。
  return target.startsWith('/') ? target : `/${target}`
}

export function isLoginTarget(target: string) {
  return /^\/login\/?(?:[?#]|$)/i.test(target)
}

export function replaceWithLogin() {
  if (!isLoginTarget(currentHashTarget())) window.location.replace('#/login')
}

export function redirectUnauthenticated(target: string) {
  // 退出或 401 已修改真实地址时，旧布局的 effect 不得再次记录来源。
  if (isLoginTarget(currentHashTarget()) || currentHashTarget() !== target) return
  const current = loginRecovery.read()
  notifyRecoveryStorage(current)
  if (
    current.state.kind !== 'record' ||
    current.state.record.reason !== 'expired' ||
    current.state.record.target !== target
  ) {
    notifyRecoveryStorage(loginRecovery.save({ reason: 'direct', target }))
  }
  replaceWithLogin()
}
