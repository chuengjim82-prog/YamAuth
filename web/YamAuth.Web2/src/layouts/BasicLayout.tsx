import { Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Breadcrumb, Button, Layout, Menu, Spin, Tooltip } from 'antd'
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { fetchMenuTree } from '@/api/auth'
import { useApp } from '@/store/AppContext'
import { menuIcon } from './menuIcons'
import HeaderBar from './HeaderBar'
import styles from './BasicLayout.module.css'
import type { MenuNode } from '@/types'

const { Sider, Content } = Layout

interface MenuItemResult {
  key: string
  icon?: ReactNode
  label: string
  children?: MenuItemResult[]
}

function toMenuItem(node: MenuNode): MenuItemResult {
  const icon = menuIcon(node.menuIcon)
  if (node.children?.length) {
    return {
      key: node.menuUrl || `dir-${node.id}`,
      icon,
      label: node.menuName,
      children: node.children.map(toMenuItem),
    }
  }
  return {
    key: node.menuUrl || `item-${node.id}`,
    icon,
    label: node.menuName,
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
  const { isLoggedIn, menus, setMenus } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [openKeys, setOpenKeys] = useState<string[]>([])

  useEffect(() => {
    if (!isLoggedIn) return
    let cancelled = false
    fetchMenuTree()
      .then((tree) => {
        if (!cancelled) setMenus(tree ?? [])
      })
      .catch(() => {
        if (!cancelled) setMenus([])
      })
    return () => {
      cancelled = true
    }
  }, [isLoggedIn, setMenus])

  const chain = useMemo(() => findChain(menus, location.pathname), [menus, location.pathname])

  useEffect(() => {
    if (chain.length > 1) {
      setOpenKeys((prev) => {
        const parentKeys = chain.slice(0, -1).map((node) => node.menuUrl || `dir-${node.id}`)
        return Array.from(new Set([...prev, ...parentKeys]))
      })
    }
  }, [chain])

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  return (
    <Layout className={styles.layout}>
      <HeaderBar />
      <Layout>
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
            items={menus.map(toMenuItem) as MenuProps['items']}
          />
          <div className={`${styles.collapseBar} ${collapsed ? styles.collapseBarCollapsed : ''}`}>
            <Tooltip title={collapsed ? '展开菜单' : '收起菜单'} placement="right">
              <Button
                type="text"
                className={styles.collapseButton}
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed((value) => !value)}
                aria-label={collapsed ? '展开菜单' : '收起菜单'}
              />
            </Tooltip>
          </div>
        </Sider>
        <Content className={styles.content}>
          {chain.length > 1 && (
            <Breadcrumb className={styles.breadcrumb} items={chain.map((node) => ({ title: node.menuName }))} />
          )}
          <Suspense fallback={<Spin size="large" style={{ display: 'block', margin: '100px auto' }} />}>
            <Outlet />
          </Suspense>
        </Content>
      </Layout>
    </Layout>
  )
}
