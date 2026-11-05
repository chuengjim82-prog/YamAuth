import { useEffect, useLayoutEffect, useRef, useState, type Ref } from 'react'
import { Button, Select, Spin, type GetRef, type SelectProps } from 'antd'
import { apiGet } from '@/api/request'
import type { PagedResult } from '@/types'
import styles from './TenantSelect.module.css'

interface Tenant {
  id: number
  tenantName?: string | null
  tenantCode?: string | null
  isActived: boolean
}

type TenantSelectProps = Pick<SelectProps<number | null>, 'id' | 'onBlur' | 'onFocus' | 'aria-describedby' | 'aria-invalid' | 'aria-required'> & {
  value?: number | null
  onChange?: (value: number | null) => void
  active?: boolean
  disabled?: boolean
  ref?: Ref<GetRef<typeof Select>>
}

type Selection = { id: number; tenant?: Tenant; status: 'loading' | 'ready' | 'missing' | 'error' }

const PAGE_SIZE = 20
const API_PATH = '/v1/auth/tenants'

function tenantLabel(tenant: Tenant) {
  const name = tenant.tenantName?.trim()
  const code = tenant.tenantCode?.trim()
  const label = name && code ? `${name}（${code}）` : name || code || `租户 #${tenant.id}`
  return tenant.isActived ? label : `${label} · 已停用`
}

export default function TenantSelect({ value, onChange, active = true, disabled = false, ref, ...props }: TenantSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [query, setQuery] = useState({ keyword: '', page: 1, retry: 0 })
  const [items, setItems] = useState<Tenant[]>([])
  const [total, setTotal] = useState(0)
  const [loadedPage, setLoadedPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [detailRetry, setDetailRetry] = useState(0)
  const [popupWidth, setPopupWidth] = useState<number>()
  const containerRef = useRef<HTMLDivElement>(null)
  const cache = useRef(new Map<number, Tenant>())
  const enabled = useRef(false)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    // 使用布局宽度，避免弹窗缩放动画影响浮层测量；窗口变化时同步更新。
    const updateWidth = () => setPopupWidth(container.offsetWidth || undefined)
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    enabled.current = active && !disabled
    if (!enabled.current) setOpen(false)
    return () => { enabled.current = false }
  }, [active, disabled])

  useEffect(() => {
    if (!active) return
    let cancelled = false
    setLoading(true)
    setFailed(false)
    if (query.page === 1) {
      setItems([])
      setTotal(0)
      setLoadedPage(0)
    }
    // 搜索先清空旧候选并防抖；翻页沿用当前关键字，不能只在首批数据内筛选。
    const timer = window.setTimeout(() => {
      apiGet<PagedResult<Tenant>>(API_PATH, {
        page: query.page, size: PAGE_SIZE, keyword: query.keyword || undefined,
      }).then((result) => {
        if (cancelled) return
        const rows = result.items ?? []
        rows.forEach((tenant) => cache.current.set(tenant.id, tenant))
        setItems((current) => [...new Map([
          ...(query.page === 1 ? [] : current), ...rows,
        ].map((tenant) => [tenant.id, tenant])).values()])
        setTotal(result.total)
        setLoadedPage(query.page)
      }).catch(() => {
        // 请求封装统一提示错误，此处保留已加载项并提供当前页重试。
        if (!cancelled) setFailed(true)
      }).finally(() => {
        if (!cancelled) setLoading(false)
      })
    }, query.page === 1 && query.keyword ? 250 : 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [active, query.keyword, query.page, query.retry])

  useEffect(() => {
    if (!active || value == null) return
    const tenant = cache.current.get(value)
    if (tenant) {
      setSelection({ id: value, tenant, status: 'ready' })
      return
    }
    let cancelled = false
    setSelection({ id: value, status: 'loading' })
    // 编辑项可能不在当前分页中；查询不到或请求失败都不能隐式改写表单里的 ID。
    apiGet<Tenant | null>(`${API_PATH}/${value}`).then((result) => {
      if (cancelled) return
      if (result) cache.current.set(result.id, result)
      setSelection({ id: value, tenant: result ?? undefined, status: result ? 'ready' : 'missing' })
    }).catch(() => {
      if (!cancelled) setSelection({ id: value, status: 'error' })
    })
    return () => { cancelled = true }
  }, [active, value, detailRetry])

  function search(keyword: string) {
    if (!enabled.current) return
    setSearchValue(keyword)
    const nextKeyword = keyword.trim()
    if (nextKeyword !== query.keyword) {
      setLoading(true)
      setFailed(false)
      setItems([])
      setQuery({ keyword: nextKeyword, page: 1, retry: 0 })
    }
  }

  function loadMore() {
    if (!enabled.current || loading || failed || loadedPage * PAGE_SIZE >= total) return
    setLoading(true)
    setQuery((current) => ({ ...current, page: loadedPage + 1 }))
  }

  const detail = selection?.id === value ? selection : undefined
  const selectedTenant = items.find((tenant) => tenant.id === value) ?? detail?.tenant
  const selectionStatus = selectedTenant ? 'ready' : detail?.status ?? 'loading'
  const fallbackLabel = `租户 #${value}（${selectionStatus === 'missing' ? '租户不存在或已删除' : selectionStatus === 'error' ? '名称加载失败' : '正在加载'}）`
  const options = items.map((tenant) => ({ value: tenant.id, label: tenantLabel(tenant) }))

  return (
    <div ref={containerRef}>
      <Select<number | null>
        {...props}
        ref={ref}
        style={{ width: '100%' }}
        value={value ?? undefined}
        allowClear
        disabled={!active || disabled}
        open={active && !disabled && open}
        popupMatchSelectWidth={popupWidth}
        placeholder="请选择租户，可搜索名称或编码"
        showSearch={{ searchValue, onSearch: search, filterOption: false }}
        options={options}
        // 当前绑定单独回显，不能混入搜索结果或让失效绑定重新成为候选。
        labelRender={() => selectedTenant ? tenantLabel(selectedTenant) : fallbackLabel}
        loading={loading}
        notFoundContent={loading ? <Spin size="small" /> : failed ? '租户加载失败' : '未找到匹配的租户'}
        onOpenChange={(nextOpen) => {
          if (!enabled.current) return
          setOpen(nextOpen)
          if (!nextOpen) search('')
        }}
        onChange={(nextValue) => {
          if (enabled.current) onChange?.(nextValue ?? null)
        }}
        onInputKeyDown={(event) => {
          // 搜索框回车用于选择候选，不能冒泡提交整个表单。
          if (event.key === 'Enter') event.preventDefault()
        }}
        onPopupScroll={(event) => {
          const target = event.currentTarget
          if (target.scrollHeight - target.scrollTop - target.clientHeight < 32) loadMore()
        }}
        popupRender={(menu) => <>
          {menu}
          <div className={styles.footer} aria-live="polite" onMouseDown={(event) => event.preventDefault()}>
            {loading ? '正在加载租户…' : failed ? <>
              <span role="alert">租户加载失败</span>
              <Button type="link" size="small" disabled={!active || disabled} onClick={() => {
                if (enabled.current) setQuery((current) => ({ ...current, retry: current.retry + 1 }))
              }}>重试</Button>
            </> : loadedPage * PAGE_SIZE < total ? (
              <Button type="link" size="small" disabled={!active || disabled} onClick={loadMore}>加载更多租户</Button>
            ) : items.length ? `已加载全部 ${total} 个租户` : '无匹配结果'}
          </div>
        </>}
      />
      {value != null && selectionStatus === 'error' ? (
        <div className={styles.feedback} role="alert">
          当前租户名称加载失败，已保留原值。
          <Button type="link" size="small" disabled={!active || disabled} onClick={() => {
            if (enabled.current) setDetailRetry((current) => current + 1)
          }}>重试名称加载</Button>
        </div>
      ) : value != null && selectionStatus === 'missing' ? (
        <div className={styles.feedback} role="status">租户不存在或已删除，已保留原值；可清空或重新选择。</div>
      ) : null}
    </div>
  )
}
