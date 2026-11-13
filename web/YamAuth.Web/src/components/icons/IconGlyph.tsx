import { useEffect, useState } from 'react'
import { Button, Tooltip } from 'antd'
import LoadingOutlined from '@ant-design/icons/es/icons/LoadingOutlined'
import QuestionCircleOutlined from '@ant-design/icons/es/icons/QuestionCircleOutlined'
import WarningOutlined from '@ant-design/icons/es/icons/WarningOutlined'
import { cachedIcon, loadIcon, resolveIconName, type IconComponent } from './catalog'

export default function IconGlyph({
  name,
  className
}: {
  name?: string | undefined
  className?: string | undefined
}) {
  const canonical = resolveIconName(name)
  if (!name) return null
  return (
    <ResolvedIconGlyph
      key={canonical ?? name}
      name={name}
      canonical={canonical}
      className={className}
    />
  )
}

function ResolvedIconGlyph({
  name,
  canonical,
  className
}: {
  name: string
  canonical?: string | undefined
  className?: string | undefined
}) {
  const [attempt, setAttempt] = useState(0)
  // 图标身份变化由 key 重建状态，已加载的组件仅在初始化或异步完成时读取。
  const [result, setResult] = useState<{ component?: IconComponent | undefined; failed?: boolean }>(
    () => ({
      component: canonical ? cachedIcon(canonical) : undefined
    })
  )
  const Component = result.component

  useEffect(() => {
    if (!canonical || Component) return
    let cancelled = false
    loadIcon(canonical).then(
      (component) => {
        if (!cancelled) setResult({ component })
      },
      () => {
        if (!cancelled) setResult({ failed: true })
      }
    )
    return () => {
      cancelled = true
    }
  }, [canonical, attempt, Component])

  const failed = Boolean(canonical && !Component && result.failed)
  const label = !canonical
    ? `未识别图标：${name}`
    : failed
      ? `图标加载失败：${name}`
      : Component
        ? name
        : `正在加载图标：${name}`
  return (
    <Tooltip
      title={
        failed ? (
          <span>
            图标加载失败
            <Button
              size="small"
              type="link"
              onClick={(event) => {
                event.stopPropagation()
                setResult({})
                setAttempt((current) => current + 1)
              }}
            >
              重试
            </Button>
          </span>
        ) : (
          label
        )
      }
      trigger={['hover', 'focus']}
    >
      <span
        className={className}
        role="img"
        aria-label={label}
        tabIndex={failed ? 0 : undefined}
        data-icon-name={canonical ?? name}
        data-icon-state={
          !canonical ? 'unknown' : failed ? 'failed' : Component ? 'ready' : 'loading'
        }
      >
        {!canonical ? (
          <QuestionCircleOutlined aria-hidden />
        ) : failed ? (
          <WarningOutlined aria-hidden />
        ) : Component ? (
          <Component aria-hidden />
        ) : (
          <LoadingOutlined spin aria-hidden />
        )}
      </span>
    </Tooltip>
  )
}
