import { useEffect, useState } from 'react'
import { appsInfoApi, userApi } from '@/api/entities'
import { appLabel, userLabel } from '@/components/appsUser'
import { fieldText } from './fieldText'

type Relation = 'appsId' | 'userId'
const entityNames = { appsId: '应用', userId: '用户' }

export function useAppsUserLabels<E>(
  rows: E[],
  getAppsId: ((row: E) => number | null) | undefined,
  getUserId: ((row: E) => number | null) | undefined
) {
  const [result, setResult] = useState<{ rows: E[]; labels: Map<string, string> }>()

  useEffect(() => {
    if (!getAppsId && !getUserId) return
    let cancelled = false
    const labels = new Map<string, string>()
    const jobs: { field: Relation; id: number }[] = []
    for (const field of ['appsId', 'userId'] as const) {
      const getId = field === 'appsId' ? getAppsId : getUserId
      if (!getId) continue
      const ids = new Set(rows.map(getId).filter((id): id is number => typeof id === 'number'))
      for (const id of ids) jobs.push({ field, id })
    }

    // 当前页按关联类型和 ID 去重，共用并发上限；刷新后重新解析名称。
    async function load() {
      while (!cancelled && jobs.length) {
        const job = jobs.shift()
        if (!job) break
        const { field, id } = job
        let label: string
        try {
          if (field === 'appsId') {
            const app = await appsInfoApi.detail(id)
            label = app ? appLabel(app) : `应用（${id}，不存在或已删除）`
          } else {
            const user = await userApi.detail(id)
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
  }, [rows, getAppsId, getUserId])

  return (field: Relation, value: number | null | undefined) => {
    if (value == null) return ''
    const label =
      result?.rows === rows ? result.labels.get(`${field}:${fieldText(value)}`) : undefined
    return label ?? `${entityNames[field]}（${fieldText(value)}，正在加载）`
  }
}
