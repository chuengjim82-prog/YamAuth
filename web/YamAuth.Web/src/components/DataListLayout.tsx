import { useEffect, useLayoutEffect, useRef, type ReactNode, type Ref, type RefObject } from 'react'
import styles from './DataListLayout.module.css'

interface DataListLayoutProps {
  filters?: ReactNode
  toolbar?: ReactNode
  table: ReactNode
  tableViewportRef?: Ref<HTMLDivElement>
  /** 可选的独立横向滚动条，固定在表格与分页之间。 */
  horizontalScrollbar?: ReactNode
  pagination?: ReactNode
  loading?: boolean
  /** 禁用列表内容的鼠标和键盘操作，遮罩及筛选区仍可交互。 */
  interactionBlocked?: boolean
  /** 遮罩接管焦点后，恢复交互时返回的控件。 */
  focusReturnRef?: RefObject<HTMLElement | null>
  /** 可选的加载或失败遮罩，由调用方提供状态与重试交互。 */
  loadingOverlay?: ReactNode
}

export default function DataListLayout({
  filters,
  toolbar,
  table,
  tableViewportRef,
  horizontalScrollbar,
  pagination,
  loading = false,
  interactionBlocked = false,
  focusReturnRef,
  loadingOverlay
}: DataListLayoutProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const ownsFocusRef = useRef(false)

  useEffect(() => {
    const trackOverlayFocus = (event: FocusEvent) => {
      ownsFocusRef.current = !!overlayRef.current?.contains(event.target as Node)
    }
    document.addEventListener('focusin', trackOverlayFocus)
    return () => document.removeEventListener('focusin', trackOverlayFocus)
  }, [])

  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content) return
    const active = document.activeElement
    const shouldMoveFocus =
      content.contains(active) ||
      overlayRef.current?.contains(active) ||
      (ownsFocusRef.current && active === document.body)

    // 先记录焦点归属，再启用 inert；浏览器可能在禁用时直接清除原焦点。
    content.inert = interactionBlocked
    if (interactionBlocked && shouldMoveFocus) {
      ownsFocusRef.current = true
      overlayRef.current
        ?.querySelector<HTMLElement>('button:not(:disabled), [tabindex="-1"]')
        ?.focus({ preventScroll: true })
    } else if (!interactionBlocked && ownsFocusRef.current) {
      ownsFocusRef.current = false
      if (active === document.body) focusReturnRef?.current?.focus({ preventScroll: true })
    }
  }, [interactionBlocked, loading, focusReturnRef])

  return (
    <div className={styles.container}>
      {filters !== undefined && <div className={styles.controlsPanel}>{filters}</div>}
      <div className={styles.tablePanel} data-loading={loading} aria-busy={loading}>
        <div ref={contentRef} className={styles.tableContents}>
          {toolbar !== undefined && (
            <div className={styles.toolbar}>
              <div className={styles.toolbarActions}>{toolbar}</div>
            </div>
          )}
          <div ref={tableViewportRef} className={styles.tableViewport}>
            {table}
          </div>
          {horizontalScrollbar}
          <div className={styles.paginationBar}>{pagination}</div>
        </div>
        <div ref={overlayRef}>{loadingOverlay}</div>
      </div>
    </div>
  )
}
