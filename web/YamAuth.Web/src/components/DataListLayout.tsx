import type { ReactNode, Ref } from 'react'
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
  loadingOverlay,
}: DataListLayoutProps) {
  return (
    <div className={styles.container}>
      {filters !== undefined && <div className={styles.controlsPanel}>{filters}</div>}
      <div className={styles.tablePanel} data-loading={loading} aria-busy={loading}>
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
        {loadingOverlay}
      </div>
    </div>
  )
}
