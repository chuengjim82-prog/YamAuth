import { HashRouter, useRoutes } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { AppProvider } from '@/store/AppContext'
import { routes } from '@/router'

function AppRoutes() {
  return useRoutes(routes)
}

export default function App() {
  return (
    <AppProvider>
      <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#062cff' } }}>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </ConfigProvider>
    </AppProvider>
  )
}
