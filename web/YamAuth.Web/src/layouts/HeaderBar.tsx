import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Dropdown, Modal } from 'antd'
import { LogoutOutlined, MenuOutlined, UserOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useApp } from '@/store/AppContext'
import ThemeSwitch from '@/components/ThemeSwitch'
import styles from './HeaderBar.module.css'
import { appEmblem, appName } from '@/branding'

export default function HeaderBar({
  mobile,
  navigationOpen,
  onOpenNavigation
}: {
  mobile: boolean
  navigationOpen: boolean
  onOpenNavigation: () => void
}) {
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
    <header className={styles.header}>
      <div className={styles.identity}>
        {mobile && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={onOpenNavigation}
            className={styles.menuButton ?? ''}
            aria-label="打开导航菜单"
            aria-haspopup="dialog"
            aria-expanded={navigationOpen}
          />
        )}
        <Link className={styles.brand} to="/home">
          <img src={appEmblem} alt="" />
          <span>{appName}</span>
        </Link>
      </div>
      <div className={styles.actions}>
        <ThemeSwitch compactOnNarrow />
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
            title={user?.nickName || user?.userName || '用户'}
          >
            <UserOutlined aria-hidden />
            <span className={styles.userName}>{user?.nickName || user?.userName || '用户'}</span>
          </button>
        </Dropdown>
      </div>
    </header>
  )
}
