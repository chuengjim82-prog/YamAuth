import { useEffect, useState } from 'react'
import { Button, Input, Result, Space, Table } from 'antd'
import { fetchAudit } from '@/api/access'
import type { AuditEvent } from '@/types/access'
import { useApp } from '@/store/AppContext'
import styles from './Account.module.css'

export default function AuditPage() {
  const { access } = useApp()
  if (access.me?.identity === 'Member') return <Result status="403" title="没有审计查询权限" />
  return <AuditList />
}
function AuditList() {
  const { isCurrentSession } = useApp()
  const [query, setQuery] = useState({ page: 1, size: 20, keyword: '' })
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<{
    items: AuditEvent[]
    total: number
    query: typeof query
    reload: number
  }>()
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let current = true
    void fetchAudit(query)
      .then((data) => {
        if (current && isCurrentSession()) {
          setResult({ ...data, query, reload })
          setFailed(false)
        }
      })
      .catch(() => {
        if (current) setFailed(true)
      })
    return () => {
      current = false
    }
  }, [query, reload, isCurrentSession])
  return (
    <section className={styles.page}>
      <h2>审计记录</h2>
      <Space>
        <Input.Search
          placeholder="操作或对象类型"
          onSearch={(keyword) => {
            setFailed(false)
            setQuery({ ...query, keyword, page: 1 })
          }}
        />
        <Button
          onClick={() => {
            setFailed(false)
            setReload((value) => value + 1)
          }}
        >
          刷新
        </Button>
      </Space>
      {failed ? (
        <Result status="error" title="审计加载失败，请重试" />
      ) : (
        <Table<AuditEvent>
          rowKey="id"
          loading={result?.query !== query || result?.reload !== reload}
          dataSource={result?.items ?? []}
          scroll={{ x: 1200 }}
          columns={[
            { title: '时间', dataIndex: 'createdAt' },
            { title: '操作者', dataIndex: 'userId' },
            { title: '租户', dataIndex: 'tenantId' },
            { title: '操作', dataIndex: 'action' },
            {
              title: '对象',
              render: (_value: unknown, row) => `${row.targetType} #${row.targetId ?? ''}`
            },
            { title: '结果', dataIndex: 'result' },
            { title: '摘要', dataIndex: 'summary' },
            { title: '追踪编号', dataIndex: 'traceId' }
          ]}
          pagination={{
            current: query.page,
            pageSize: query.size,
            total: result?.total ?? 0,
            onChange: (page, size) => setQuery({ ...query, page, size })
          }}
        />
      )}
    </section>
  )
}
