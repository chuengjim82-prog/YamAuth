import type { TableColumn } from '@/components/DataTable.vue'
import { computed, ref } from 'vue'

export interface ColumnSetting {
  key: string
  prop: string
  label: string
  visible: boolean
  order: number
  lock?: boolean
}

const STORAGE_PREFIX = 'columnSettings:'

export function useColumnCustomizer(storageKey: string, allColumns: TableColumn[]) {
  const getColumnKey = (col: TableColumn) => col.columnKey ?? col.prop

  const defaults = (): ColumnSetting[] =>
    allColumns.map((col, i) => ({
      key: getColumnKey(col),
      prop: col.prop,
      label: col.label,
      visible: true,
      order: i,
      lock: col.lock,
    }))

  function load(): ColumnSetting[] {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as ColumnSetting[]
        // 与默认值合并，处理新增/删除的列
        return defaults().map((def) => {
          const existing = parsed.find((p) => (p.key ?? p.prop) === def.key)
          return existing ? { ...def, visible: def.lock ? true : existing.visible, order: existing.order } : def
        })
      }
    } catch {
      /* ignore */
    }
    return defaults()
  }

  const settings = ref<ColumnSetting[]>(load())

  /** 当前可见且按用户排序后的列 */
  const visibleColumns = computed<TableColumn[]>(() => {
    return settings.value
      .filter((s) => s.visible)
      .sort((a, b) => a.order - b.order)
      .map((s) => allColumns.find((c) => getColumnKey(c) === s.key)!)
      .filter(Boolean)
  })

  function persist() {
    localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(settings.value))
  }

  function reset() {
    settings.value = defaults()
    persist()
  }

  //   function moveUp(index: number) {
  //     if (index <= 0) return
  //     const arr = settings.value
  //     ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
  //     arr[index - 1].order = index - 1
  //     arr[index].order = index
  //     // force reactivity
  //     settings.value = [...arr]
  //   }

  //   function moveDown(index: number) {
  //     if (index >= settings.value.length - 1) return
  //     const arr = settings.value
  //     ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
  //     arr[index].order = index
  //     arr[index + 1].order = index + 1
  //     settings.value = [...arr]
  //   }

  function moveTo(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return
    const arr = [...settings.value]
    const [moved] = arr.splice(fromIndex, 1)
    arr.splice(toIndex, 0, moved)
    arr.forEach((item, i) => (item.order = i))
    settings.value = arr
  }

  function toggleVisibility(key: string) {
    const s = settings.value.find((s) => s.key === key)
    if (s && !s.lock) {
      s.visible = !s.visible
      settings.value = [...settings.value]
    }
  }

  return {
    settings,
    visibleColumns,
    persist,
    reset,
    // moveUp,
    // moveDown,
    moveTo,
    toggleVisibility,
  }
}
