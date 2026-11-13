import { useNavigate } from 'react-router-dom'
import { Dropdown, Modal } from 'antd'
import { LogoutOutlined, UserOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useApp } from '@/store/AppContext'
import ThemeSwitch from '@/components/ThemeSwitch'
import styles from './HeaderBar.module.css'

export default function HeaderBar() {
  const { user, logout } = useApp()
  const navigate = useNavigate()

  const handleLogout = () => {
    Modal.confirm({
      title: '确认退出',
      content: '确定要退出登录吗？',
      onOk: () => {
        logout()
      }
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
      <span className={styles.brand} onClick={() => navigate('/home')}>
        YamAuth
      </span>
      <div className={styles.actions}>
        <ThemeSwitch onBrand />
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <span className={styles.userMenu}>
            <UserOutlined style={{ marginRight: 6 }} />
            <span className={styles.userName}>{user?.nickName || user?.userName || '用户'}</span>
          </span>
        </Dropdown>
      </div>
    </div>
  )
}
