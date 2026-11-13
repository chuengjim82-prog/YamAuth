import { useEffect, useState } from 'react'
import { apiGet } from '@/api/request'
import { appLabel, userLabel, type AppOption, type UserOption } from '@/components/appsUser'
import type { Row } from '@/types'
import { fieldText } from './fieldText'

type Relation = 'appsId' | 'userId'
const entityNames = { appsId: '应用', userId: '用户' }

export function useAppsUserLabels(rows: Row[], enabled: boolean) {
  const [result, setResult] = useState<{ rows: Row[]; labels: Map<string, string> }>()

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const labels = new Map<string, string>()
    const jobs: { field: Relation; id: number }[] = []
    for (const field of ['appsId', 'userId'] as const) {
      const ids = new Set(
        rows.map((row) => row[field]).filter((id): id is number => typeof id === 'number')
      )
      for (const id of ids) jobs.push({ field, id })
    }

    // 当前页按关联类型和 ID 去重，共用并发上限；刷新后重新解析名称。
    async function load() {
      while (!cancelled && jobs.length) {
        const { field, id } = jobs.shift()!
        let label: string
        try {
          if (field === 'appsId') {
            const app = await apiGet<AppOption | null>(`/v1/auth/apps-infos/${id}`)
            label = app ? appLabel(app) : `应用（${id}，不存在或已删除）`
          } else {
            const user = await apiGet<UserOption | null>(`/v1/auth/users/${id}`)
            label = user ? userLabel(user) : `用户（${id}，不存在或已删除）`
          }
        } catch {
          // 请求封装负责错误提示，名称失败不影响列表和原关联值。
          label = `${entityNames[field]}（${id}，名称加载失败）`
        }
        if (cancelled) return
        labels.set(`${field}:${id}`, label)
        setResult({ rows, labels: new Map(labels) })
      }
    }
    const workers = Math.min(4, jobs.length)
    for (let index = 0; index < workers; index++) void load()
    return () => {
      cancelled = true
    }
  }, [rows, enabled])

  return (field: Relation, value: unknown) => {
    if (value == null || value === '') return ''
    const label =
      result?.rows === rows ? result.labels.get(`${field}:${fieldText(value)}`) : undefined
    return label ?? `${entityNames[field]}（${fieldText(value)}，正在加载）`
  }
}
