import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Result, Spin, message } from 'antd'
import { loginRecovery, type LoginDestination } from '@/auth/recovery'
import { notifyRecoveryStorage } from '@/auth/loginRedirect'
import { prepareLoginDestination } from './redirect'
import { useApp } from '@/store/AppContext'

export default function LoginRedirect({
  userName,
  destination
}: {
  userName: string
  destination: LoginDestination | null
}) {
  const navigate = useNavigate()
  const { isCurrentSession } = useApp()
  const resolution = useRef<Promise<LoginDestination> | null>(null)
  const consumed = useRef(false)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    // StrictMode 重放 effect 时复用同一次决策，不再读取已经消费的记录。
    resolution.current ??= destination
      ? Promise.resolve(destination)
      : prepareLoginDestination(userName, isCurrentSession)
    void resolution.current
      .then((result) => {
        if (cancelled || !isCurrentSession()) return
        if (!consumed.current) {
          consumed.current = true
          notifyRecoveryStorage(loginRecovery.clear())
          if (result.unavailable) {
            message.warning({
              key: 'login-recovery-unavailable',
              content: '原页面不可用，已返回首页'
            })
          }
        }
        void navigate(result.target, { replace: true })
      })
      .catch(() => {
        if (!cancelled && isCurrentSession()) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [destination, userName, navigate, attempt, isCurrentSession])

  if (failed) {
    return (
      <Result
        status="error"
        title="页面信息加载失败"
        extra={
          <Button
            onClick={() => {
              resolution.current = null
              setFailed(false)
              setAttempt((value) => value + 1)
            }}
          >
            重试
          </Button>
        }
      />
    )
  }
  return (
    <div role="status" style={{ padding: 48, textAlign: 'center' }}>
      <Spin /> 正在返回页面
    </div>
  )
}
