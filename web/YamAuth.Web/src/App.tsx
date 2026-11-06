import { Suspense } from 'react'
import { HashRouter, useRoutes } from 'react-router-dom'
import { ConfigProvider, Spin } from 'antd'
import { AppProvider } from '@/store/AppContext'
import ThemeBoundary from '@/components/ThemeBoundary'
import { routes } from '@/router'

// 静态消息及确认框独立挂载，由主题边界同步更新已打开的弹层。
ConfigProvider.config({
  holderRender: (children) => <ThemeBoundary>{children}</ThemeBoundary>,
})

function AppRoutes() {
  return useRoutes(routes)
}

export default function App() {
  return (
    <AppProvider>
      <ThemeBoundary>
        <HashRouter>
          <Suspense fallback={<div role="status" style={{ padding: 48, textAlign: 'center' }}><Spin /> 正在加载页面</div>}>
            <AppRoutes />
          </Suspense>
        </HashRouter>
      </ThemeBoundary>
    </AppProvider>
  )
}
