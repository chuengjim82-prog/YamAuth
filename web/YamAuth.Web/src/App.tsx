import { Suspense } from 'react'
import { HashRouter, useLocation, useRoutes } from 'react-router-dom'
import { ConfigProvider, Spin } from 'antd'
import { AppProvider, useApp } from '@/store/AppContext'
import PageErrorBoundary from '@/components/PageErrorBoundary'
import ThemeBoundary from '@/components/ThemeBoundary'
import { routes } from '@/router'

// 静态消息及确认框独立挂载，由主题边界同步更新已打开的弹层。
ConfigProvider.config({
  holderRender: (children) => <ThemeBoundary>{children}</ThemeBoundary>
})

function AppRoutes() {
  const content = useRoutes(routes)
  const location = useLocation()
  const { session } = useApp()
  return (
    <PageErrorBoundary resetKey={`${session.revision}:${location.key}`}>
      <Suspense
        fallback={
          <div role="status" style={{ padding: 48, textAlign: 'center' }}>
            <Spin /> 正在加载页面
          </div>
        }
      >
        {content}
      </Suspense>
    </PageErrorBoundary>
  )
}

export default function App() {
  return (
    <AppProvider>
      <ThemeBoundary>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </ThemeBoundary>
    </AppProvider>
  )
}
