import type { ReactNode, Ref } from 'react'
import styles from './DataListLayout.module.css'

interface DataListLayoutProps {
  filters?: ReactNode
  toolbar?: ReactNode
  table: ReactNode
  tableViewportRef?: Ref<HTMLDivElement>
  pagination?: ReactNode
  loading?: boolean
}

export default function DataListLayout({
  filters,
  toolbar,
  table,
  tableViewportRef,
  pagination,
  loading = false,
}: DataListLayoutProps) {
  return (
    <div className={styles.container}>
      {filters !== undefined && <div className={styles.controlsPanel}>{filters}</div>}
      <div className={styles.tablePanel} data-loading={loading}>
        {toolbar !== undefined && (
          <div className={styles.toolbar}>
            <div className={styles.toolbarActions}>{toolbar}</div>
          </div>
        )}
        <div ref={tableViewportRef} className={styles.tableViewport}>
          {table}
        </div>
        <div className={styles.paginationBar}>{pagination}</div>
      </div>
    </div>
  )
}
