import { Suspense, useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Breadcrumb, Button, Layout, Menu, Spin, Tooltip, Result } from 'antd'
import ProfilePage from '@/pages/Account/ProfilePage'
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import PageErrorBoundary from '@/components/PageErrorBoundary'
import { useApp } from '@/store/AppContext'
import { menuIcon } from './menuIcons'
import HeaderBar from './HeaderBar'
import styles from './BasicLayout.module.css'
import type { MenuNode } from '@/types/auth'
import { redirectUnauthenticated } from '@/auth/loginRedirect'

const { Sider, Content } = Layout

type MenuItemResult = NonNullable<MenuProps['items']>[number]

function toMenuItem(node: MenuNode): MenuItemResult {
  const icon = menuIcon(node.menuIcon)
  if (node.children?.length) {
    return {
      key: node.menuUrl || `dir-${node.id}`,
      icon,
      label: node.menuName,
      children: node.children.map(toMenuItem)
    }
  }
  return {
    key: node.menuUrl || `item-${node.id}`,
    icon,
    label: node.menuName
  }
}

function findChain(nodes: MenuNode[], pathname: string, trail: MenuNode[] = []): MenuNode[] {
  for (const node of nodes) {
    const next = [...trail, node]
    if (node.menuUrl === pathname) return next
    if (node.children?.length) {
      const hit = findChain(node.children, pathname, next)
      if (hit.length) return hit
    }
  }
  return []
}

export default function BasicLayout() {
  const { session, access } = useApp()
  // 会话变更重建整个业务区域，丢弃旧账号的表单、分页及关联选项。
  return <SessionLayout key={`${session.revision}:${access.epoch}`} />
}

function SessionLayout() {
  const { isLoggedIn, menus, session, access, refreshAccess } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [openKeys, setOpenKeys] = useState<string[]>([])
  const [expandedChain, setExpandedChain] = useState<MenuNode[]>([])

  useEffect(() => {
    if (!isLoggedIn) {
      redirectUnauthenticated(location.pathname + location.search + location.hash)
    }
  }, [isLoggedIn, location.pathname, location.search, location.hash])

  const chain = useMemo(() => findChain(menus, location.pathname), [menus, location.pathname])

  // 导航变化时展开新的父级；同一路由内仍允许用户手动收起目录。
  if (expandedChain !== chain) {
    setExpandedChain(chain)
    const parentKeys = chain.slice(0, -1).map((node) => node.menuUrl || `dir-${node.id}`)
    setOpenKeys((current) => [...new Set([...current, ...parentKeys])])
  }

  if (!isLoggedIn) {
    return null
  }

  if (session.record?.status === 'authenticated' && access.sessionId !== session.record.sessionId)
    return <Spin fullscreen description="正在切换账号" />

  if (access.status === 'password')
    return (
      <>
        <HeaderBar />
        <ProfilePage forcePassword />
      </>
    )
  if (access.status === 'failed')
    return (
      <>
        <HeaderBar />
        <Result
          status="error"
          title="权限加载失败"
          subTitle={access.error}
          extra={<Button onClick={refreshAccess}>重新加载</Button>}
        />
      </>
    )
  if (access.status !== 'ready') return <Spin fullscreen description="正在加载访问权限" />

  return (
    <Layout className={styles.layout}>
      <HeaderBar />
      <Layout className={styles.body}>
        <Sider
          className={styles.sider}
          width={256}
          collapsedWidth={56}
          collapsed={collapsed}
          trigger={null}
        >
          <Menu
            className={styles.menu}
            mode="inline"
            selectedKeys={[location.pathname]}
            openKeys={collapsed ? [] : openKeys}
            onOpenChange={setOpenKeys}
            onClick={({ key }) => {
              if (key.startsWith('/')) navigate(key)
            }}
            items={menus.map(toMenuItem)}
          />
          <div className={`${styles.collapseBar} ${collapsed ? styles.collapseBarCollapsed : ''}`}>
            <Tooltip title={collapsed ? '展开菜单' : '收起菜单'} placement="right">
              <Button
                type="text"
                className={styles.collapseButton ?? ''}
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed((value) => !value)}
                aria-label={collapsed ? '展开菜单' : '收起菜单'}
              />
            </Tooltip>
          </div>
        </Sider>
        <Content className={styles.content}>
          {chain.length > 1 && (
            <Breadcrumb
              className={styles.breadcrumb ?? ''}
              items={chain.map((node) => ({ title: node.menuName }))}
            />
          )}
          <PageErrorBoundary resetKey={`${session.revision}:${location.key}`}>
            <Suspense
              fallback={<Spin size="large" style={{ display: 'block', margin: '100px auto' }} />}
            >
              <Outlet />
            </Suspense>
          </PageErrorBoundary>
        </Content>
      </Layout>
    </Layout>
  )
}
