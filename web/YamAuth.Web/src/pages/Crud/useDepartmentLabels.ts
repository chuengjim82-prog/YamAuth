import { useEffect, useState } from 'react'
import { departmentApi } from '@/api/entities'
import { departmentLabel } from '@/components/department'
import { fieldText } from './fieldText'

export function useDepartmentLabels<E>(rows: E[], getId: ((row: E) => number | null) | undefined) {
  const [result, setResult] = useState<{ rows: E[]; labels: Map<number, string> }>()

  useEffect(() => {
    if (!getId) return
    let cancelled = false
    const labels = new Map<number, string>()
    const ids = [...new Set(rows.map(getId).filter((id): id is number => typeof id === 'number'))]

    // 只解析当前页的不同部门，限制并发；刷新时重新获取，避免缓存过期名称。
    async function load() {
      while (!cancelled && ids.length) {
        const id = ids.shift()
        if (id === undefined) break
        let label: string
        try {
          const department = await departmentApi.detail(id)
          label = department ? departmentLabel(department) : `部门 #${id}（不存在或已删除）`
        } catch {
          // 统一请求封装提示错误，单个名称失败不能影响其他行或清空员工列表。
          label = `部门 #${id}（名称加载失败）`
        }
        if (cancelled) return
        labels.set(id, label)
        setResult({ rows, labels: new Map(labels) })
      }
    }
    const workers = Math.min(4, ids.length)
    for (let index = 0; index < workers; index++) void load()
    return () => {
      cancelled = true
    }
  }, [rows, getId])

  return (value: number | null | undefined) => {
    if (value == null) return ''
    const label = result?.rows === rows ? result.labels.get(Number(value)) : undefined
    return label ?? `部门 #${fieldText(value)}（正在加载）`
  }
}
