import { useState } from 'react'
import { Alert, Button, Form, Input, Tabs, message } from 'antd'
import { changeEmail, changePassword, updateProfile } from '@/api/access'
import { useApp } from '@/store/AppContext'
import { isCurrentRequestSession } from '@/auth/session'
import type { Me } from '@/types/access'
import styles from './Account.module.css'

export default function ProfilePage({ forcePassword = false }: { forcePassword?: boolean }) {
  const { session, access, refreshAccess, clearLocalSession, isCurrentSession } = useApp()
  const [saving, setSaving] = useState(false)
  const me = access.me
  if (!me) return null
  async function run(action: () => Promise<unknown>, password = false) {
    const current = () => (password ? isCurrentRequestSession(session) : isCurrentSession())
    if (saving || !current()) return
    setSaving(true)
    try {
      await action()
      if (!current()) return
      message.success(password ? '密码已修改，请重新登录' : '保存成功')
      if (password) await clearLocalSession()
      else refreshAccess()
    } catch {
      /* 请求层提示错误，表单保留输入。 */
    } finally {
      setSaving(false)
    }
  }
  const passwordForm = (
    <Form<{ oldPassword: string; newPassword: string; confirm: string }>
      layout="vertical"
      onFinish={(values) =>
        void run(
          () =>
            changePassword({ oldPassword: values.oldPassword, newPassword: values.newPassword }),
          true
        )
      }
    >
      <Form.Item name="oldPassword" label="当前密码" rules={[{ required: true }]}>
        <Input.Password autoComplete="current-password" />
      </Form.Item>
      <Form.Item name="newPassword" label="新密码" rules={[{ required: true, min: 6, max: 128 }]}>
        <Input.Password autoComplete="new-password" />
      </Form.Item>
      <Form.Item
        name="confirm"
        label="确认新密码"
        dependencies={['newPassword']}
        rules={[
          { required: true },
          ({ getFieldValue }) => ({
            validator: (_rule, value: unknown) =>
              value === getFieldValue('newPassword')
                ? Promise.resolve()
                : Promise.reject(new Error('两次密码不一致'))
          })
        ]}
      >
        <Input.Password autoComplete="new-password" />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={saving}>
        修改密码并重新登录
      </Button>
    </Form>
  )
  return (
    <section className={styles.page}>
      <h2>{forcePassword ? '请先修改初始密码' : '个人资料'}</h2>
      {forcePassword ? (
        <>
          <Alert type="info" title="账号使用初始密码或管理员重置的密码，修改后才能访问业务功能。" />
          {passwordForm}
        </>
      ) : (
        <Tabs
          items={[
            {
              key: 'profile',
              label: '基本资料',
              children: (
                <Form<Pick<Me, 'nickName' | 'avatar' | 'phone'>>
                  layout="vertical"
                  initialValues={me}
                  onFinish={(values) => void run(() => updateProfile(values))}
                >
                  <Form.Item label="账号">
                    <Input value={me.userName} disabled />
                  </Form.Item>
                  <Form.Item name="nickName" label="昵称" rules={[{ required: true, max: 64 }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="avatar" label="头像地址" rules={[{ max: 500 }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="phone" label="手机号" rules={[{ max: 64 }]}>
                    <Input />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={saving}>
                    保存资料
                  </Button>
                </Form>
              )
            },
            {
              key: 'email',
              label: '修改邮箱',
              children: (
                <Form<{ email: string; password: string }>
                  layout="vertical"
                  initialValues={{ email: me.email }}
                  onFinish={(values) => void run(() => changeEmail(values))}
                >
                  <Form.Item
                    name="email"
                    label="邮箱"
                    rules={[{ required: true, type: 'email', max: 128 }]}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item name="password" label="当前密码" rules={[{ required: true }]}>
                    <Input.Password autoComplete="current-password" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={saving}>
                    验证并修改邮箱
                  </Button>
                </Form>
              )
            },
            { key: 'password', label: '修改密码', children: passwordForm }
          ]}
        />
      )}
    </section>
  )
}
