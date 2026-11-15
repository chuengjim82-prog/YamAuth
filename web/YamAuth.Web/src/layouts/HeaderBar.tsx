import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Dropdown, Modal, Button, Space, message } from 'antd'
import { LogoutOutlined, UserOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useApp } from '@/store/AppContext'
import RelationCandidateSelect from '@/components/RelationCandidateSelect'
import { enterTenant, exitTenant } from '@/api/access'
import { accessStore } from '@/auth/access'
import ThemeSwitch from '@/components/ThemeSwitch'
import styles from './HeaderBar.module.css'

export default function HeaderBar() {
  const { user, logout, access, isCurrentSession } = useApp()
  const [contextOpen, setContextOpen] = useState(false)
  const [tenantId, setTenantId] = useState<number | null>(null)
  const [switching, setSwitching] = useState(false)
  async function switchTenant(exit = false) {
    if (switching || !isCurrentSession()) return
    setSwitching(true)
    try {
      if (exit) {
        if (access.contextId) await exitTenant(access.contextId)
        if (isCurrentSession()) accessStore.changeContext(null)
      } else if (tenantId != null) {
        const context = await enterTenant(tenantId)
        if (isCurrentSession()) accessStore.changeContext(context.id)
      }
      setContextOpen(false)
    } catch (error: unknown) {
      if (error instanceof Error && error.message.startsWith('无法保存租户'))
        message.error(error.message)
    } finally {
      setSwitching(false)
    }
  }
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const focusFrameRef = useRef<number | null>(null)
  const confirmationRef = useRef<ReturnType<typeof Modal.confirm> | null>(null)
  useEffect(
    () => () => {
      confirmationRef.current?.destroy()
      if (focusFrameRef.current !== null) cancelAnimationFrame(focusFrameRef.current)
    },
    []
  )

  function restoreButtonFocus() {
    if (!buttonRef.current) return
    if (focusFrameRef.current !== null) cancelAnimationFrame(focusFrameRef.current)
    focusFrameRef.current = requestAnimationFrame(() => {
      focusFrameRef.current = null
      buttonRef.current?.focus({ preventScroll: true })
    })
  }

  const handleLogout = () => {
    setOpen(false)
    confirmationRef.current = Modal.confirm({
      title: '确认退出',
      content: '确定要退出登录吗？',
      afterClose: restoreButtonFocus,
      onOk: logout
    })
  }

  const userMenuItems: MenuProps['items'] = [
    ...(access.status === 'ready'
      ? [{ key: 'account', label: <Link to="/account">个人资料</Link> }]
      : []),
    ...(access.me?.identity === 'PlatformAdministrator' && access.status === 'ready'
      ? [{ key: 'administrators', label: <Link to="/auth/administrators">管理员维护</Link> }]
      : []),
    ...(access.me?.identity !== 'Member' && access.status === 'ready'
      ? [{ key: 'audit', label: <Link to="/auth/audit">审计记录</Link> }]
      : []),
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    }
  ]

  return (
    <div className={styles.header}>
      <Link className={styles.brand} to="/home">
        YamAuth
      </Link>
      <div className={styles.actions}>
        <Space>
          {access.me && (
            <span>
              {access.me.identity === 'PlatformAdministrator'
                ? '平台管理员'
                : access.me.identity === 'TenantAdministrator'
                  ? '租户管理员'
                  : '普通用户'}{' '}
              · {access.me.tenantName ?? '平台'}
            </span>
          )}
          {access.me?.identity === 'PlatformAdministrator' && access.status === 'ready' && (
            <>
              <Button size="small" onClick={() => setContextOpen(true)}>
                进入租户
              </Button>
              {access.contextId && (
                <Button size="small" loading={switching} onClick={() => void switchTenant(true)}>
                  退出租户
                </Button>
              )}
            </>
          )}
        </Space>
        <Modal
          open={contextOpen}
          title="进入租户管理"
          onCancel={() => {
            if (!switching) setContextOpen(false)
          }}
          onOk={() => void switchTenant()}
          confirmLoading={switching}
          okButtonProps={{ disabled: tenantId == null }}
        >
          <p>管理上下文仅在当前标签页生效。</p>
          <RelationCandidateSelect
            kind="tenant"
            purpose="platform.contexts"
            active={contextOpen}
            value={tenantId}
            onChange={setTenantId}
            disabled={switching}
          />
        </Modal>
        <ThemeSwitch onBrand />
        <Dropdown
          autoFocus
          trigger={['click']}
          open={open}
          onOpenChange={setOpen}
          menu={{
            items: userMenuItems,
            onKeyDown: (event) => {
              if (event.key === 'Escape') {
                setOpen(false)
                restoreButtonFocus()
              }
            }
          }}
          placement="bottomRight"
        >
          <button
            ref={buttonRef}
            type="button"
            className={styles.userMenu}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="账号菜单"
          >
            <UserOutlined style={{ marginRight: 6 }} />
            <span className={styles.userName}>
              {access.me?.nickName || user?.nickName || user?.userName || '用户'}
            </span>
          </button>
        </Dropdown>
      </div>
    </div>
  )
}
