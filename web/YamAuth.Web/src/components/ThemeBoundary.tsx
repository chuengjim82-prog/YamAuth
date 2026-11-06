import type { PropsWithChildren } from 'react'
import { ConfigProvider, theme } from 'antd'
import type { ThemeConfig } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useTheme } from '@/store/theme'

const lightTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: { colorPrimary: '#062cff' },
}

const darkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#6b8cff',
    colorBgBase: '#101114',
    colorBgLayout: '#101114',
    colorBgContainer: '#181a1f',
    colorBgElevated: '#22252c',
    colorBorder: '#424650',
    colorBorderSecondary: '#30343d',
    colorTextPlaceholder: '#8a92a2',
  },
}

export default function ThemeBoundary({ children }: PropsWithChildren) {
  const { resolvedTheme } = useTheme()

  // 主树和静态弹层各自订阅同一状态；始终提供 theme，保持组件树及表单状态稳定。
  return (
    <ConfigProvider locale={zhCN} theme={resolvedTheme === 'dark' ? darkTheme : lightTheme}>
      {children}
    </ConfigProvider>
  )
}
