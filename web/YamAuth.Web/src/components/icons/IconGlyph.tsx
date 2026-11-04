import { useEffect, useState } from 'react'
import { Button, Tooltip } from 'antd'
import LoadingOutlined from '@ant-design/icons/es/icons/LoadingOutlined'
import QuestionCircleOutlined from '@ant-design/icons/es/icons/QuestionCircleOutlined'
import WarningOutlined from '@ant-design/icons/es/icons/WarningOutlined'
import { cachedIcon, loadIcon, resolveIconName, type IconComponent } from './catalog'

export default function IconGlyph({ name, className }: { name?: string, className?: string }) {
  const canonical = resolveIconName(name)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ name: string, component?: IconComponent, failed?: boolean }>()

  useEffect(() => {
    if (!canonical || cachedIcon(canonical)) return
    let cancelled = false
    setResult({ name: canonical })
    loadIcon(canonical).then(
      (component) => { if (!cancelled) setResult({ name: canonical, component }) },
      () => { if (!cancelled) setResult({ name: canonical, failed: true }) },
    )
    return () => { cancelled = true }
  }, [canonical, attempt])

  if (!name) return null
  const Component = canonical ? cachedIcon(canonical) ?? (result?.name === canonical ? result.component : undefined) : undefined
  const failed = Boolean(canonical && !Component && result?.name === canonical && result.failed)
  const label = !canonical ? `未识别图标：${name}` : failed ? `图标加载失败：${name}` : Component ? name : `正在加载图标：${name}`
  return (
    <Tooltip title={failed ? <span>
      图标加载失败
      <Button size="small" type="link" onClick={(event) => {
        event.stopPropagation()
        setResult(undefined)
        setAttempt((current) => current + 1)
      }}>重试</Button>
    </span> : label} trigger={['hover', 'focus']}>
      <span className={className} role="img" aria-label={label} tabIndex={failed ? 0 : undefined}
        data-icon-name={canonical ?? name} data-icon-state={!canonical ? 'unknown' : failed ? 'failed' : Component ? 'ready' : 'loading'}>
        {!canonical ? <QuestionCircleOutlined aria-hidden /> : failed ? <WarningOutlined aria-hidden /> : Component ? <Component aria-hidden /> : <LoadingOutlined spin aria-hidden />}
      </span>
    </Tooltip>
  )
}
