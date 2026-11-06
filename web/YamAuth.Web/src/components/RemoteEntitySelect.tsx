import { useEffect, useLayoutEffect, useMemo, useRef, useState, type Ref } from 'react'
import { Button, Select, Spin, type GetRef, type SelectProps } from 'antd'
import { apiGet } from '@/api/request'
import type { PagedResult } from '@/types'
import styles from './RemoteEntitySelect.module.css'

export type EntitySelectProps = Pick<
  SelectProps<number | null>,
  'id' | 'onBlur' | 'onFocus' | 'aria-describedby' | 'aria-invalid' | 'aria-required'
> & {
  value?: number | null
  onChange?: (value: number | null) => void
  active?: boolean
  disabled?: boolean
  ref?: Ref<GetRef<typeof Select>>
}

type RemoteEntitySelectProps<T> = EntitySelectProps & {
  apiPath: string
  entityName: string
  placeholder: string
  getLabel: (item: T) => string
}

type Query = { keyword: string; page: number; retry: number }
type PageRequest = { active: boolean; apiPath: string; query: Query }
type PageResult<T> = {
  request: PageRequest
  items: T[]
  total: number
  loadedPage: number
  failed: boolean
}
type Selection<T> = { request: object; item?: T; status: 'ready' | 'missing' | 'error' }
type EntityCache<T> = { apiPath: string; items: Map<number, T> }

function rememberItems<T extends { id: number }>(
  cache: EntityCache<T>,
  apiPath: string,
  rows: T[]
): EntityCache<T> {
  const items = new Map(cache.apiPath === apiPath ? cache.items : undefined)
  for (const item of rows) items.set(item.id, item)
  return { apiPath, items }
}

function previousPage<T>(result: PageResult<T> | undefined, request: PageRequest) {
  return request.query.page > 1 &&
    result?.request.apiPath === request.apiPath &&
    result.request.query.keyword === request.query.keyword
    ? result
    : undefined
}

const PAGE_SIZE = 20

// 租户与部门共用分页、搜索和失效绑定处理，各自提供接口及展示文案。
export default function RemoteEntitySelect<T extends { id: number }>({
  apiPath,
  entityName,
  placeholder,
  getLabel,
  value,
  onChange,
  active = true,
  disabled = false,
  ref,
  ...props
}: RemoteEntitySelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [query, setQuery] = useState<Query>({ keyword: '', page: 1, retry: 0 })
  const request = useMemo(() => ({ active, apiPath, query }), [active, apiPath, query])
  const [pageResult, setPageResult] = useState<PageResult<T>>()
  const [selection, setSelection] = useState<Selection<T> | null>(null)
  const [detailRetry, setDetailRetry] = useState(0)
  const [popupWidth, setPopupWidth] = useState<number>()
  const containerRef = useRef<HTMLDivElement>(null)
  const [cache, setCache] = useState<EntityCache<T>>(() => ({ apiPath, items: new Map() }))
  const enabled = useRef(false)
  const available = active && !disabled
  const [previousAvailable, setPreviousAvailable] = useState(available)
  const currentResult = pageResult?.request === request
  const visibleResult = currentResult ? pageResult : previousPage(pageResult, request)
  const items = visibleResult?.items ?? []
  const total = visibleResult?.total ?? 0
  const loadedPage = visibleResult?.loadedPage ?? 0
  const loading = !currentResult
  const failed = currentResult && pageResult.failed
  const cachedItem = cache.apiPath === apiPath && value != null ? cache.items.get(value) : undefined
  const detailRequest = useMemo(
    () => ({ active, apiPath, value, retry: detailRetry }),
    [active, apiPath, value, detailRetry]
  )

  // 禁用或外层关闭时清除浮层状态，重新启用不会恢复旧弹出层。
  if (previousAvailable !== available) {
    setPreviousAvailable(available)
    if (!available) setOpen(false)
  }

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
    return () => {
      enabled.current = false
    }
  }, [active, disabled])

  useEffect(() => {
    if (!request.active) return
    let cancelled = false
    const { apiPath, query } = request
    // 搜索先清空旧候选并防抖；翻页沿用当前关键字，不能只在首批数据内筛选。
    const timer = window.setTimeout(
      () => {
        apiGet<PagedResult<T>>(apiPath, {
          page: query.page,
          size: PAGE_SIZE,
          keyword: query.keyword || undefined
        })
          .then((result) => {
            if (cancelled) return
            const rows = result.items ?? []
            setCache((current) => rememberItems(current, apiPath, rows))
            setPageResult((current) => ({
              request,
              items: [
                ...new Map(
                  [...(previousPage(current, request)?.items ?? []), ...rows].map((item) => [
                    item.id,
                    item
                  ])
                ).values()
              ],
              total: result.total,
              loadedPage: query.page,
              failed: false
            }))
          })
          .catch(() => {
            // 请求封装统一提示错误，此处保留已加载项并提供当前页重试。
            if (!cancelled)
              setPageResult((current) => {
                const previous = previousPage(current, request)
                return {
                  request,
                  items: previous?.items ?? [],
                  total: previous?.total ?? 0,
                  loadedPage: previous?.loadedPage ?? 0,
                  failed: true
                }
              })
          })
      },
      query.page === 1 && query.keyword ? 250 : 0
    )
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [request])

  useEffect(() => {
    const { active, apiPath, value } = detailRequest
    if (!active || value == null || cachedItem) return
    let cancelled = false
    // 编辑项可能不在当前分页中；查询不到或请求失败都不能隐式改写表单里的 ID。
    apiGet<T | null>(`${apiPath}/${value}`)
      .then((result) => {
        if (cancelled) return
        if (result) setCache((current) => rememberItems(current, apiPath, [result]))
        setSelection({
          request: detailRequest,
          item: result ?? undefined,
          status: result ? 'ready' : 'missing'
        })
      })
      .catch(() => {
        if (!cancelled) setSelection({ request: detailRequest, status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [detailRequest, cachedItem])

  function search(keyword: string) {
    if (!enabled.current) return
    setSearchValue(keyword)
    const nextKeyword = keyword.trim()
    if (nextKeyword !== query.keyword) {
      setQuery({ keyword: nextKeyword, page: 1, retry: 0 })
    }
  }

  function loadMore() {
    if (!enabled.current || loading || failed || loadedPage * PAGE_SIZE >= total) return
    setQuery((current) => ({ ...current, page: loadedPage + 1 }))
  }

  const detail = selection?.request === detailRequest ? selection : undefined
  const selectedItem = items.find((item) => item.id === value) ?? cachedItem ?? detail?.item
  const selectionStatus = selectedItem ? 'ready' : (detail?.status ?? 'loading')
  const fallbackLabel = `${entityName} #${value}（${selectionStatus === 'missing' ? `${entityName}不存在或已删除` : selectionStatus === 'error' ? '名称加载失败' : '正在加载'}）`
  const options = items.map((item) => ({ value: item.id, label: getLabel(item) }))

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
        placeholder={placeholder}
        showSearch={{ searchValue, onSearch: search, filterOption: false }}
        options={options}
        // 当前绑定单独回显，不能混入搜索结果或让失效绑定重新成为候选。
        labelRender={() => (selectedItem ? getLabel(selectedItem) : fallbackLabel)}
        loading={loading}
        notFoundContent={
          loading ? (
            <Spin size="small" />
          ) : failed ? (
            `${entityName}加载失败`
          ) : (
            `未找到匹配的${entityName}`
          )
        }
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
        popupRender={(menu) => (
          <>
            {menu}
            <div
              className={styles.footer}
              aria-live="polite"
              onMouseDown={(event) => event.preventDefault()}
            >
              {loading ? (
                `正在加载${entityName}…`
              ) : failed ? (
                <>
                  <span role="alert">{entityName}加载失败</span>
                  <Button
                    type="link"
                    size="small"
                    disabled={!active || disabled}
                    onClick={() => {
                      if (enabled.current)
                        setQuery((current) => ({ ...current, retry: current.retry + 1 }))
                    }}
                  >
                    重试
                  </Button>
                </>
              ) : loadedPage * PAGE_SIZE < total ? (
                <Button type="link" size="small" disabled={!active || disabled} onClick={loadMore}>
                  加载更多{entityName}
                </Button>
              ) : items.length ? (
                `已加载全部 ${total} 个${entityName}`
              ) : (
                '无匹配结果'
              )}
            </div>
          </>
        )}
      />
      {value != null && selectionStatus === 'error' ? (
        <div className={styles.feedback} role="alert">
          当前{entityName}名称加载失败，已保留原值。
          <Button
            type="link"
            size="small"
            disabled={!active || disabled}
            onClick={() => {
              if (enabled.current) setDetailRetry((current) => current + 1)
            }}
          >
            重试名称加载
          </Button>
        </div>
      ) : value != null && selectionStatus === 'missing' ? (
        <div className={styles.feedback} role="status">
          {entityName}不存在或已删除，已保留原值；可清空或重新选择。
        </div>
      ) : null}
    </div>
  )
}
