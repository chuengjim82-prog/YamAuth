import { Suspense, useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Breadcrumb, Button, Drawer, Layout, Menu, Spin, Tooltip } from 'antd'
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { fetchMenuTree } from '@/api/auth'
import PageErrorBoundary from '@/components/PageErrorBoundary'
import { useApp } from '@/store/AppContext'
import { menuIcon } from './menuIcons'
import HeaderBar from './HeaderBar'
import styles from './BasicLayout.module.css'
import type { MenuNode } from '@/types/auth'
import { redirectUnauthenticated } from '@/auth/loginRedirect'
import useMediaQuery from '@/components/useMediaQuery'
import { appName } from '@/branding'

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
  const { session } = useApp()
  // 会话变更重建整个业务区域，丢弃旧账号的表单、分页及关联选项。
  return <SessionLayout key={session.revision} />
}

function SessionLayout() {
  const {
    isLoggedIn,
    menus,
    setMenus,
    menuRefreshVersion,
    refreshMenus,
    isCurrentSession,
    session
  } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [openKeys, setOpenKeys] = useState<string[]>([])
  // 折叠后的浮层单独管理，关闭浮层时仍保留侧栏目录的展开状态。
  const [popupOpenKeys, setPopupOpenKeys] = useState<string[]>([])
  const [expandedChain, setExpandedChain] = useState<MenuNode[]>([])
  const isMobile = useMediaQuery('(max-width: 767px)')
  const collapsedNavigation = !isMobile && collapsed
  const [mobileNavigation, setMobileNavigation] = useState({ viewport: isMobile, open: false })

  // 断点变化只切换导航呈现，Outlet 始终留在原位置，未提交表单不会被卸载。
  if (mobileNavigation.viewport !== isMobile) {
    setMobileNavigation({ viewport: isMobile, open: false })
    setPopupOpenKeys([])
  }
  const closeNavigation = () => setMobileNavigation({ viewport: isMobile, open: false })

  useEffect(() => {
    if (!isLoggedIn) {
      redirectUnauthenticated(location.pathname + location.search + location.hash)
    }
  }, [isLoggedIn, location.pathname, location.search, location.hash])

  useEffect(() => {
    if (!isLoggedIn) return
    let cancelled = false
    fetchMenuTree()
      .then((tree) => {
        if (!cancelled && isCurrentSession()) setMenus(tree)
      })
      .catch(() => {
        // 刷新失败保留当前导航；错误提示沿用请求拦截器，不能误报菜单保存失败。
      })
    return () => {
      cancelled = true
    }
    // refreshMenus 随会话变化，更换会话时也必须使旧请求失效。
  }, [isLoggedIn, setMenus, menuRefreshVersion, refreshMenus, isCurrentSession])

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

  // 两种导航呈现分别挂载，避免旧内联节点在浮层中继续执行退出动画并抢走键盘焦点。
  const navigation = (
    <Menu
      key={collapsedNavigation ? 'collapsed' : 'inline'}
      className={styles.menu}
      mode="inline"
      inlineIndent={12}
      inlineCollapsed={collapsedNavigation}
      selectedKeys={[location.pathname]}
      openKeys={collapsedNavigation ? popupOpenKeys : openKeys}
      onOpenChange={collapsedNavigation ? setPopupOpenKeys : setOpenKeys}
      onClick={({ key, domEvent }) => {
        if (key.startsWith('/')) {
          // 叶子项 Enter 已完成选择，阻止冒泡后又被菜单当作展开操作。
          if (domEvent.type === 'keydown') domEvent.stopPropagation()
          setPopupOpenKeys([])
          void navigate(key)
          closeNavigation()
        }
      }}
      items={menus.map(toMenuItem)}
    />
  )

  return (
    <Layout className={styles.layout}>
      <HeaderBar
        mobile={isMobile}
        navigationOpen={isMobile && mobileNavigation.open}
        onOpenNavigation={() => setMobileNavigation({ viewport: isMobile, open: true })}
      />
      <Layout className={styles.body}>
        {!isMobile && (
          <Sider
            className={styles.sider}
            width={220}
            collapsedWidth={56}
            collapsed={collapsed}
            trigger={null}
          >
            {navigation}
            <div
              className={`${styles.collapseBar} ${collapsed ? styles.collapseBarCollapsed : ''}`}
            >
              <Tooltip title={collapsed ? '展开菜单' : '收起菜单'} placement="right">
                <Button
                  type="text"
                  className={styles.collapseButton ?? ''}
                  icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                  onClick={() => {
                    setPopupOpenKeys([])
                    setCollapsed((value) => !value)
                  }}
                  aria-label={collapsed ? '展开菜单' : '收起菜单'}
                />
              </Tooltip>
            </div>
          </Sider>
        )}
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
      <Drawer
        title={appName}
        placement="left"
        size="min(288px, calc(100vw - 32px))"
        open={isMobile && mobileNavigation.open}
        onClose={closeNavigation}
        classNames={{ body: styles.drawerBody ?? '' }}
        focusable={{ trap: true, focusTriggerAfterClose: true }}
      >
        {isMobile && navigation}
      </Drawer>
    </Layout>
  )
}
