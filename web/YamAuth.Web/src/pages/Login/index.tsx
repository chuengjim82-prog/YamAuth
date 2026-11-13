import { useRef, useState } from 'react'
import { Alert, Button, Form, Input, message } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import type { InputRef } from 'antd'
import { login } from '@/api/auth'
import type { LoginRequest } from '@/types/auth'
import { useApp } from '@/store/AppContext'
import ThemeSwitch from '@/components/ThemeSwitch'
import styles from './Login.module.css'
import type { LoginDestination } from '@/auth/recovery'
import { prepareLoginDestination } from './redirect'
import LoginRedirect from './LoginRedirect'
import { isCurrentRequestSession, SessionStorageError, type RequestSession } from '@/auth/session'

export default function Login() {
  const { user, login: saveLogin, session, isCurrentSession } = useApp()
  const [loading, setLoading] = useState(false)
  const [destination, setDestination] = useState<{
    session: RequestSession
    value: LoginDestination
  } | null>(null)
  const passwordInputRef = useRef<InputRef>(null)
  const submittingRef = useRef(false)

  if (user) {
    return (
      <LoginRedirect
        key={session.revision}
        userName={user.userName}
        destination={destination?.session === session ? destination.value : null}
      />
    )
  }

  const onFinish = async (values: LoginRequest) => {
    if (submittingRef.current || !isCurrentSession()) return
    submittingRef.current = true
    setLoading(true)
    try {
      const result = await login(values.userName, values.password)
      if (!isCurrentSession()) return
      // 先固定目标，再更新会话；已登录分支负责唯一一次消费和跳转。
      const next = await prepareLoginDestination(result.userName, isCurrentSession)
      if (!isCurrentSession()) return
      const savedSession = await saveLogin(
        { userName: result.userName, nickName: result.nickName },
        result.token
      )
      if (!isCurrentRequestSession(savedSession)) return
      setDestination({ session: savedSession, value: next })
      message.success('登录成功')
    } catch (error: unknown) {
      if (error instanceof SessionStorageError) message.error(error.message)
      // 登录及目标解析分别负责错误提示；失败时保留恢复记录。
    } finally {
      submittingRef.current = false
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.brand}>
        <div className={styles.brandTitle}>YamAuth</div>
        <div className={styles.brandSlogan}>权限与组织管理</div>
      </div>
      <div className={styles.panel}>
        <div className={styles.themeControl}>
          <ThemeSwitch />
        </div>
        <div className={styles.formWrap}>
          <h1 className={styles.formTitle}>用户登录</h1>
          {session.storageError && (
            <Alert type="error" showIcon title={session.storageError.message} />
          )}
          <Form<LoginRequest>
            layout="vertical"
            onFinish={(values) => {
              // onFinish 内部处理请求失败并释放提交锁，Form 的回调不接收 Promise。
              void onFinish(values)
            }}
            size="large"
            initialValues={{ userName: 'admin', password: 'Admin@123' }}
          >
            <Form.Item name="userName" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input
                prefix={<UserOutlined />}
                placeholder="用户名"
                onPressEnter={(event) => {
                  event.preventDefault()
                  passwordInputRef.current?.focus()
                }}
              />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password ref={passwordInputRef} prefix={<LockOutlined />} placeholder="密码" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} disabled={loading} block>
                登 录
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  )
}
