import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Dropdown, Modal } from 'antd'
import { LogoutOutlined, UserOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useApp } from '@/store/AppContext'
import ThemeSwitch from '@/components/ThemeSwitch'
import styles from './HeaderBar.module.css'

export default function HeaderBar() {
  const { user, logout } = useApp()
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
            <span className={styles.userName}>{user?.nickName || user?.userName || '用户'}</span>
          </button>
        </Dropdown>
      </div>
    </div>
  )
}
