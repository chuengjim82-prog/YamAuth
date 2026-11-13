import { useEffect, useRef } from 'react'
import { Button, Dropdown, message, type GetRef } from 'antd'
import { CheckOutlined, DesktopOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons'
import { isThemeMode, setThemeMode, useTheme } from '@/store/theme'
import styles from './ThemeSwitch.module.css'

const options = [
  { key: 'system', label: '跟随系统', icon: <DesktopOutlined aria-hidden /> },
  { key: 'light', label: '浅色主题', icon: <SunOutlined aria-hidden /> },
  { key: 'dark', label: '深色主题', icon: <MoonOutlined aria-hidden /> }
] as const

export default function ThemeSwitch({ onBrand = false }: { onBrand?: boolean }) {
  const buttonRef = useRef<GetRef<typeof Button>>(null)
  const focusFrameRef = useRef<number | null>(null)
  const { mode } = useTheme()
  const current = options.find((option) => option.key === mode) ?? options[0]

  useEffect(
    () => () => {
      if (focusFrameRef.current !== null) cancelAnimationFrame(focusFrameRef.current)
    },
    []
  )

  function restoreButtonFocus() {
    // 等本次按键及菜单关闭处理结束再还原焦点，避免 Enter 的默认点击重新打开菜单。
    if (focusFrameRef.current !== null) cancelAnimationFrame(focusFrameRef.current)
    focusFrameRef.current = requestAnimationFrame(() => {
      focusFrameRef.current = null
      buttonRef.current?.focus({ preventScroll: true })
    })
  }

  return (
    <Dropdown
      autoFocus
      trigger={['click']}
      placement="bottomRight"
      menu={{
        selectable: true,
        selectedKeys: [mode],
        onKeyDown: (event) => {
          if (event.key === 'Escape') restoreButtonFocus()
        },
        items: options.map((option) => ({
          ...option,
          label: (
            <span className={styles.option}>
              {option.label}
              {option.key === mode && <CheckOutlined aria-hidden />}
            </span>
          )
        })),
        onClick: ({ key, domEvent }) => {
          if (isThemeMode(key) && !setThemeMode(key)) {
            message.warning('主题已切换，但浏览器未能保存，下次打开可能恢复默认。')
          }
          if (domEvent.type === 'keydown') restoreButtonFocus()
        }
      }}
    >
      <Button
        ref={buttonRef}
        type="text"
        icon={current.icon}
        className={onBrand ? (styles.onBrand ?? '') : ''}
        aria-haspopup="menu"
        aria-label={`切换主题，当前${current.label}`}
      >
        {current.label}
      </Button>
    </Dropdown>
  )
}
