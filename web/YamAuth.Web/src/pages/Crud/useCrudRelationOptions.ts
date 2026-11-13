import { useEffect, useMemo, useState } from 'react'
import { crudRelationNames, loadCrudRelationOptions, type CrudRelationKind } from './crudRelation'

export function useCrudRelationOptions(kind: CrudRelationKind, active: boolean, version?: object) {
  const [retry, setRetry] = useState(0)
  const request = useMemo(() => ({ kind, active, version, retry }), [kind, active, version, retry])
  const [result, setResult] = useState<{
    request: object
    options: Awaited<ReturnType<typeof loadCrudRelationOptions>>
    failed: boolean
  }>()
  const current = result?.request === request ? result : undefined
  const loading = active && !current
  useEffect(() => {
    if (!request.active) return
    let cancelled = false
    loadCrudRelationOptions(request.kind)
      .then((options) => {
        if (!cancelled) setResult({ request, options, failed: false })
      })
      .catch(() => {
        if (!cancelled) setResult({ request, options: [], failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [request])
  const options = current?.options ?? []
  const labels = useMemo(
    () => new Map(current?.options.map((item) => [item.id, item.title])),
    [current]
  )
  const name = crudRelationNames[kind]
  return {
    options,
    loading,
    failed: current?.failed ?? false,
    retry: () => setRetry((count) => count + 1),
    label: (id: number | null | undefined) => {
      if (id == null) return ''
      const state = loading ? '正在加载' : current?.failed ? '加载失败' : '不存在'
      return labels.get(id) ?? `${name}${state}（编号：${id}）`
    }
  }
}
