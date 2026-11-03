import { Suspense } from 'react'
import { HashRouter, useRoutes } from 'react-router-dom'
import { ConfigProvider, Spin } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { AppProvider } from '@/store/AppContext'
import { routes } from '@/router'

const providerProps = { locale: zhCN, theme: { token: { colorPrimary: '#062cff' } } }

// 静态消息及确认框独立挂载，需要显式共享应用的语言和主题配置。
ConfigProvider.config({
  holderRender: (children) => <ConfigProvider {...providerProps}>{children}</ConfigProvider>,
})

function AppRoutes() {
  return useRoutes(routes)
}

export default function App() {
  return (
    <AppProvider>
      <ConfigProvider {...providerProps}>
        <HashRouter>
          <Suspense fallback={<div role="status" style={{ padding: 48, textAlign: 'center' }}><Spin /> 正在加载页面</div>}>
            <AppRoutes />
          </Suspense>
        </HashRouter>
      </ConfigProvider>
    </AppProvider>
  )
}
