import { Suspense, useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Breadcrumb, Button, Layout, Menu, Spin, Tooltip } from 'antd'
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { fetchMenuTree } from '@/api/auth'
import { TOKEN_KEY } from '@/api/request'
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
  const { isLoggedIn, menus, setMenus, menuRefreshVersion, refreshMenus } = useApp()
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

  useEffect(() => {
    if (!isLoggedIn) return
    let cancelled = false
    const sessionToken = localStorage.getItem(TOKEN_KEY)
    fetchMenuTree()
      .then((tree) => {
        if (!cancelled && sessionToken === localStorage.getItem(TOKEN_KEY)) setMenus(tree ?? [])
      })
      .catch(() => {
        // 刷新失败保留当前导航；错误提示沿用请求拦截器，不能误报菜单保存失败。
      })
    return () => {
      cancelled = true
    }
    // refreshMenus 随会话变化，更换会话时也必须使旧请求失效。
  }, [isLoggedIn, setMenus, menuRefreshVersion, refreshMenus])

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
          <Suspense
            fallback={<Spin size="large" style={{ display: 'block', margin: '100px auto' }} />}
          >
            <Outlet />
          </Suspense>
        </Content>
      </Layout>
    </Layout>
  )
}
