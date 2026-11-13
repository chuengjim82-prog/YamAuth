import { useEffect, useState } from 'react'
import { crudInfoApi } from '@/api/entities'
import { fieldText } from './fieldText'
import { validateTreeResult } from './tree'

export function useCrudInfoLabels<E>(rows: E[], getId: ((row: E) => number | null) | undefined) {
  const [result, setResult] = useState<{
    rows: E[]
    labels: Map<number, string>
    failed: boolean
  }>()

  useEffect(() => {
    if (!getId || !rows.some((row) => getId(row) != null)) return
    let cancelled = false
    // 菜单是全量树，一次获取功能映射，避免逐项请求；刷新列表后重新解析名称。
    crudInfoApi
      .all()
      .then((data) => {
        if (cancelled) return
        // 不完整的全量响应不能把尚未返回的功能误报为已删除。
        validateTreeResult(data)
        const labels = new Map(
          data.items.map((info) => [
            Number(info.id),
            `${info.crudName || '未命名功能'}（${info.id}）`
          ])
        )
        setResult({ rows, labels, failed: false })
      })
      .catch(() => {
        // 请求封装提示错误，名称查询失败不能清空菜单或改变原有关联。
        if (!cancelled) setResult({ rows, labels: new Map(), failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [rows, getId])

  return (value: number | null | undefined) => {
    if (value == null) return ''
    const current = result?.rows === rows ? result : undefined
    const stateText = !current ? '正在加载' : current.failed ? '名称加载失败' : '不存在或已删除'
    return current?.labels.get(value) ?? `功能（${fieldText(value)}，${stateText}）`
  }
}
