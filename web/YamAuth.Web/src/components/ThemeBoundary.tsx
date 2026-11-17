import { useMemo, type PropsWithChildren } from 'react'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useTheme } from '@/store/theme'
import { appThemes } from '@/theme/config'
import useMediaQuery from './useMediaQuery'

export default function ThemeBoundary({ children }: PropsWithChildren) {
  const { resolvedTheme } = useTheme()
  const mobile = useMediaQuery('(max-width: 767px)')
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const appearance = appThemes[mobile ? 'mobile' : 'desktop'][resolvedTheme]
  // 使用组件库的动效开关，避免强行缩短 CSS 动画破坏浮层定位时序。
  const theme = useMemo(
    () => ({ ...appearance, token: { ...appearance.token, motion: !reducedMotion } }),
    [appearance, reducedMotion]
  )

  // 主树和静态弹层各自订阅同一状态；始终提供 theme，保持组件树及表单状态稳定。
  return (
    <ConfigProvider locale={zhCN} theme={theme} button={{ autoInsertSpace: false }}>
      {children}
    </ConfigProvider>
  )
}
