import { useEffect, useState } from 'react'
import { apiGet } from '@/api/request'
import { tenantLabel, type Tenant } from '@/components/tenant'
import type { Row } from '@/types'

export function useTenantLabels(rows: Row[], enabled: boolean) {
  const [result, setResult] = useState<{ rows: Row[]; labels: Map<number, string> }>()

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const labels = new Map<number, string>()
    const ids = [...new Set(rows.map((row) => row.tenantId).filter((id): id is number => typeof id === 'number'))]
    setResult({ rows, labels })

    // 只查询当前页的不同租户，限制并发；刷新列表时重新获取，避免名称缓存过期。
    async function load() {
      while (!cancelled && ids.length) {
        const id = ids.shift()!
        let label: string
        try {
          const tenant = await apiGet<Tenant | null>(`/v1/auth/tenants/${id}`)
          label = tenant ? tenantLabel(tenant) : `租户 #${id}（不存在或已删除）`
        } catch {
          // 请求封装统一提示错误，名称查询失败不能影响列表数据或原有租户绑定。
          label = `租户 #${id}（名称加载失败）`
        }
        if (cancelled) return
        labels.set(id, label)
        setResult({ rows, labels: new Map(labels) })
      }
    }
    const workers = Math.min(4, ids.length)
    for (let index = 0; index < workers; index++) void load()
    return () => { cancelled = true }
  }, [rows, enabled])

  return (value: unknown) => {
    if (value == null || value === '') return ''
    const label = result?.rows === rows ? result.labels.get(Number(value)) : undefined
    return label ?? `租户 #${value}（正在加载）`
  }
}
