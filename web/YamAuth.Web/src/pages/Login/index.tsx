import { useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button, Form, Input, message } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import type { InputRef } from 'antd'
import { login } from '@/api/auth'
import { useApp } from '@/store/AppContext'
import styles from './Login.module.css'

export default function Login() {
  const navigate = useNavigate()
  const { isLoggedIn, login: saveLogin } = useApp()
  const [loading, setLoading] = useState(false)
  const passwordInputRef = useRef<InputRef>(null)
  const submittingRef = useRef(false)

  if (isLoggedIn) {
    return <Navigate to="/home" replace />
  }

  const onFinish = async (values: { userName: string; password: string }) => {
    if (submittingRef.current) return
    submittingRef.current = true
    setLoading(true)
    try {
      const result = await login(values.userName, values.password)
      saveLogin({ userName: result.userName, nickName: result.nickName }, result.token)
      message.success('登录成功')
      navigate('/home', { replace: true })
    } catch {
      // 错误提示由请求拦截器处理
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
        <div className={styles.formWrap}>
          <h1 className={styles.formTitle}>用户登录</h1>
          <Form layout="vertical" onFinish={onFinish} size="large" initialValues={{ userName: 'admin', password: 'Admin@123' }}>
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
