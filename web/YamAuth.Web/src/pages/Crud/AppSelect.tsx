import { useEffect, useMemo, useState, type Ref } from 'react'
import { Button, Spin, TreeSelect, type GetRef, type TreeSelectProps } from 'antd'
import { apiGet } from '@/api/request'
import type { PagedResult } from '@/types'
import { buildTree, validateTreeResult } from './tree'
import { fieldText } from './fieldText'
import { appLabel, type AppOption } from '@/components/appsUser'

type Props = Pick<
  TreeSelectProps<number | null>,
  'id' | 'onBlur' | 'onFocus' | 'aria-describedby' | 'aria-invalid' | 'aria-required'
> & {
  ref?: Ref<GetRef<typeof TreeSelect>>
  value?: number | null
  onChange?: (value: number | null) => void
  active: boolean
  disabled: boolean
}

export default function AppSelect({ value, onChange, active, disabled, ...props }: Props) {
  const [retry, setRetry] = useState(0)
  const request = useMemo(() => ({ active, retry }), [active, retry])
  const [result, setResult] = useState<{
    request: object
    items: AppOption[]
    failed: boolean
  }>()
  const current = result?.request === request ? result : undefined
  const loading = active && !current

  useEffect(() => {
    if (!request.active) return
    let cancelled = false
    apiGet<PagedResult<AppOption>>('/v1/auth/apps-infos', { all: true })
      .then((data) => {
        validateTreeResult(data)
        if (!cancelled) setResult({ request, items: data.items, failed: false })
      })
      .catch(() => {
        if (!cancelled) setResult({ request, items: [], failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [request])

  const options = useMemo(() => {
    const model = buildTree(current?.items ?? [], {
      nameField: 'appsName',
      searchFields: ['appsName', 'id']
    })
    return model.sorted.map((row) => {
      const id = Number(row.id)
      const issue = model.issues.get(id)
      // 保留空名称，由统一标签函数兜底，避免将 null 显示为名称。
      const appsName = row.appsName == null ? null : fieldText(row.appsName)
      const title = appLabel({ id, parentId: null, appsName })
      return {
        id,
        // 异常父链不能构成树，作为根节点展示原因，仍允许关联该应用。
        pId: issue ? 0 : Number(row.parentId),
        value: id,
        title: issue ? `${title}［${issue}］` : title,
        searchText: `${appsName ?? ''} ${id}`
      }
    })
  }, [current])
  const missing = value != null && !options.some((option) => option.value === value)
  const stateText = loading ? '正在加载' : current?.failed ? '加载失败' : '不存在或已删除'
  // 缺失或加载失败时保留原 ID，禁用的回显项不能成为新的候选。
  const treeData = missing
    ? [
        ...options,
        { id: value, pId: 0, value, title: `应用 #${value}（${stateText}）`, disabled: true }
      ]
    : options

  return (
    <>
      <TreeSelect<number | null>
        {...props}
        style={{ width: '100%' }}
        value={value ?? undefined}
        onChange={(nextValue) => {
          if (active && !disabled) onChange?.(nextValue ?? null)
        }}
        disabled={!active || disabled}
        allowClear
        loading={loading}
        showSearch={{ treeNodeFilterProp: 'searchText' }}
        treeDefaultExpandAll
        treeDataSimpleMode={{ id: 'id', pId: 'pId', rootPId: 0 }}
        treeData={treeData}
        placeholder="请选择应用，可搜索名称或编号"
        notFoundContent={
          loading ? <Spin size="small" /> : current?.failed ? '应用加载失败' : '未找到匹配的应用'
        }
        onInputKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault()
        }}
      />
      {current?.failed ? (
        <div role="alert">
          应用加载失败，已保留原值。
          <Button
            type="link"
            size="small"
            disabled={!active || disabled}
            onClick={() => setRetry((count) => count + 1)}
          >
            重试
          </Button>
        </div>
      ) : missing && !loading ? (
        <div role="status">应用不存在或已删除，已保留原值；可清空或重新选择。</div>
      ) : null}
    </>
  )
}
