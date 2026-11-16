import { useEffect, useRef, useState } from 'react'
import { Alert, Button, ConfigProvider, Form, Input, message } from 'antd'
import { ArrowRightOutlined, LockOutlined, UserOutlined } from '@ant-design/icons'
import type { InputRef } from 'antd'
import { login } from '@/api/auth'
import type { LoginRequest } from '@/types/auth'
import { useApp } from '@/store/AppContext'
import ThemeSwitch from '@/components/ThemeSwitch'
import loginEmblem from '@/assets/login-emblem.svg'
import courtyard from '@/assets/login-courtyard.jpg'
import styles from './Login.module.css'
import type { LoginDestination } from '@/auth/recovery'
import { prepareLoginDestination } from './redirect'
import LoginRedirect from './LoginRedirect'
import { isCurrentRequestSession, SessionStorageError, type RequestSession } from '@/auth/session'
import { useTheme } from '@/store/theme'
import { loginAppearances, loginInputConfig } from './theme'

export default function Login() {
  const { user, login: saveLogin, session, isCurrentSession } = useApp()
  const { resolvedTheme } = useTheme()
  const appearance = loginAppearances[resolvedTheme]
  const [loading, setLoading] = useState(false)
  const [destination, setDestination] = useState<{
    session: RequestSession
    value: LoginDestination
  } | null>(null)
  const passwordInputRef = useRef<InputRef>(null)
  const submittingRef = useRef(false)

  useEffect(() => {
    // 登录页独立呈现，离开时恢复后台原有的标题和图标。
    const previousTitle = document.title
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    const previousIcon = icon?.getAttribute('href')
    document.title = '用户登录 · 管理工作台'
    icon?.setAttribute('href', loginEmblem)
    return () => {
      document.title = previousTitle
      if (previousIcon !== undefined && previousIcon !== null)
        icon?.setAttribute('href', previousIcon)
    }
  }, [])

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
    <ConfigProvider theme={appearance.theme} input={loginInputConfig}>
      <main className={styles.container} style={appearance.style}>
        <aside className={styles.visual} aria-label="管理工作台">
          <img className={styles.visualImage} src={courtyard} alt="" fetchPriority="high" />
          <div className={styles.visualShade} />
          <div className={styles.wordmark}>
            <img src={loginEmblem} alt="" />
            <span>管理工作台</span>
          </div>
          <div className={styles.visualCopy}>
            <span className={styles.visualLine} aria-hidden="true" />
            <p className={styles.visualTitle}>
              让工作，
              <br />
              从容有序。
            </p>
            <div className={styles.visualCaption}>
              <span>权限与组织管理</span>
              <span className={styles.visualSpark} aria-hidden="true">
                ✳
              </span>
            </div>
          </div>
        </aside>
        <div className={styles.panel}>
          <header className={styles.header}>
            <ThemeSwitch />
          </header>
          <section className={styles.formWrap} aria-labelledby="login-form-title">
            <div className={styles.formHeading}>
              <div className={styles.welcomeMark} aria-hidden="true">
                <img src={loginEmblem} alt="" />
              </div>
              <h1 id="login-form-title" className={styles.formTitle}>
                欢迎回来
              </h1>
              <p className={styles.formDescription}>登录你的账号，继续今天的工作。</p>
            </div>
            {session.storageError && (
              <Alert
                className={styles.storageAlert ?? ''}
                type="error"
                showIcon
                title={session.storageError.message}
              />
            )}
            <Form<LoginRequest>
              name="login"
              className={styles.form ?? ''}
              layout="vertical"
              requiredMark={false}
              onFinish={(values) => {
                // onFinish 内部处理请求失败并释放提交锁，Form 的回调不接收 Promise。
                void onFinish(values)
              }}
            >
              <Form.Item
                label={<span className={styles.label}>用户名</span>}
                name="userName"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input
                  size="large"
                  className={styles.input ?? ''}
                  prefix={<UserOutlined aria-hidden />}
                  placeholder="请输入用户名"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  onPressEnter={(event) => {
                    event.preventDefault()
                    passwordInputRef.current?.focus()
                  }}
                />
              </Form.Item>
              <Form.Item
                label={<span className={styles.label}>密码</span>}
                name="password"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password
                  size="large"
                  ref={passwordInputRef}
                  className={styles.input ?? ''}
                  prefix={<LockOutlined aria-hidden />}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                />
              </Form.Item>
              <Form.Item className={styles.submitItem ?? ''}>
                <Button
                  size="large"
                  className={styles.submitButton ?? ''}
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  disabled={loading}
                  aria-busy={loading}
                  block
                >
                  <span>{loading ? '登录中' : '登录'}</span>
                  {!loading && (
                    <ArrowRightOutlined className={styles.submitArrow ?? ''} aria-hidden />
                  )}
                </Button>
              </Form.Item>
            </Form>
          </section>
        </div>
      </main>
    </ConfigProvider>
  )
}
