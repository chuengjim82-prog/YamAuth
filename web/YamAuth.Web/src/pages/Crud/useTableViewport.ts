import { useLayoutEffect, useRef, useState } from 'react'

/** 同步表格与独立滚动条，并在容器尺寸变化后校准滚动范围和空态高度。 */
export function useTableViewport<T>(tableWidth: number, items: T[]) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const scrollbarRef = useRef<HTMLDivElement>(null)
  const [scrollWidth, setScrollWidth] = useState(tableWidth)
  const [isOverflowing, setIsOverflowing] = useState(false)

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const scrollbar = scrollbarRef.current
    const body = viewport?.querySelector<HTMLElement>('.ant-table-body, .ant-table-content')
    if (!viewport || !scrollbar || !body) return

    const header = viewport.querySelector<HTMLElement>('.ant-table-header, .ant-table-thead')
    const table = body.querySelector('table')

    const syncFromTable = () => {
      if (Math.abs(scrollbar.scrollLeft - body.scrollLeft) > 1) {
        scrollbar.scrollLeft = body.scrollLeft
      }
    }

    const syncFromScrollbar = () => {
      if (Math.abs(body.scrollLeft - scrollbar.scrollLeft) > 1) {
        body.scrollLeft = scrollbar.scrollLeft
      }
    }

    const measure = () => {
      const overflow = Math.max(0, body.scrollWidth - body.clientWidth)
      // 纵向滚动条会占用表格宽度，两处最大 scrollLeft 必须保持相同。
      setScrollWidth(scrollbar.clientWidth + overflow)
      setIsOverflowing(overflow > 1)
      viewport.style.setProperty(
        '--table-empty-height',
        `${Math.max(0, viewport.clientHeight - (header?.offsetHeight ?? 0) - 1)}px`
      )
      syncFromTable()
    }

    body.addEventListener('scroll', syncFromTable, { passive: true })
    scrollbar.addEventListener('scroll', syncFromScrollbar, { passive: true })
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    observer.observe(body)
    observer.observe(scrollbar)
    if (header) observer.observe(header)
    if (table) observer.observe(table)
    measure()

    return () => {
      observer.disconnect()
      body.removeEventListener('scroll', syncFromTable)
      scrollbar.removeEventListener('scroll', syncFromScrollbar)
    }
  }, [tableWidth, items])

  return { viewportRef, scrollbarRef, scrollWidth, isOverflowing }
}
