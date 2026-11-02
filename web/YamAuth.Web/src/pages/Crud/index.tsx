import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button, DatePicker, Empty, Form, Input, InputNumber, Modal, Pagination, Popconfirm, Result, Space, Spin, Switch, Table, Tooltip, message } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import DataListLayout from '@/components/DataListLayout'
import PageHeader from '@/components/PageHeader'
import { createCrudApi } from '@/api/crud'
import { findResource, type FieldDef, type ResourceDef } from '@/resources'
import type { Row } from '@/types'
import { useTableViewport } from './useTableViewport'
import emptyImage from './assets/list-empty.png'
import styles from './Crud.module.css'

function emptyValue(field: FieldDef) {
  if (field.kind === 'bool') return false
  if (field.kind === 'number') return field.nullable ? null : 0
  if (field.kind === 'date') return null
  return ''
}

function toFormValues(fields: FieldDef[], row?: Row) {
  const values: Record<string, unknown> = {}
  for (const field of fields) {
    if (!field.form) continue
    const raw = row?.[field.name]
    if (field.kind === 'date') {
      values[field.name] = raw ? dayjs(String(raw)) : null
    } else if (field.kind === 'password' && field.name === 'password') {
      values[field.name] = ''
    } else if (raw === undefined || raw === null) {
      values[field.name] = emptyValue(field)
    } else {
      values[field.name] = raw
    }
  }
  return values
}

function toPayload(fields: FieldDef[], values: Record<string, unknown>, editing: boolean) {
  const payload: Row = {}
  for (const field of fields) {
    if (!field.form) continue
    let value = values[field.name]
    if (field.kind === 'date') {
      value = value ? (value as Dayjs).format('YYYY-MM-DD HH:mm:ss') : null
    }
    if (field.kind === 'password' && editing && (value === '' || value === undefined || value === null)) {
      continue
    }
    payload[field.name] = value ?? null
  }
  return payload
}

export default function CrudPage() {
  const location = useLocation()
  const resource = findResource(location.pathname)
  const [size, setSize] = useState(20)

  if (!resource) {
    return <Result status="404" title="未找到页面" subTitle={location.pathname} />
  }

  // 资源切换时重建列表和表单，避免关键字、弹窗或旧请求结果串到下一页。
  return <ResourceCrudPage key={resource.path} resource={resource} size={size} onSizeChange={setSize} />
}

function ResourceCrudPage({ resource, size, onSizeChange }: {
  resource: ResourceDef
  size: number
  onSizeChange: (size: number) => void
}) {
  const [form] = Form.useForm()
  const [searchKeyword, setSearchKeyword] = useState('')
  const [query, setQuery] = useState({ page: 1, keyword: '' })
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const mountedRef = useRef(false)
  const submittingRef = useRef(false)
  const api = useMemo(() => createCrudApi(resource.api), [resource.api])
  const tableFields = resource.fields.filter((field) => field.table !== false)
  const tableWidth = tableFields.reduce((width, field) => width + (field.name === 'id' ? 90 : 160), 112)
  const { viewportRef, scrollbarRef, scrollWidth, isOverflowing } = useTableViewport(tableWidth, items)
  const keywordId = `${resource.path}-keyword`

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadFailed(false)
    if (viewportRef.current) viewportRef.current.scrollTop = 0
    api.page(query.page, size, query.keyword)
      .then((result) => {
        if (cancelled) return
        setTotal(result.total)
        setItems(result.items ?? [])
      })
      .catch(() => {
        // 请求拦截器负责错误提示，列表明确显示失败状态，不能误报为暂无数据。
        if (!cancelled) setLoadFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      // 后发查询、重置或翻页会清理前次请求，旧结果不能覆盖当前筛选。
      cancelled = true
    }
  }, [api, query, size, viewportRef])

  const columns: TableColumnsType<Row> = [
    ...tableFields
      .map((field) => ({
        title: field.label,
        dataIndex: field.name,
        key: field.name,
        width: field.name === 'id' ? 90 : 160,
        ellipsis: true,
        render: (value: unknown) => {
          if (field.kind === 'bool') return value ? '是' : '否'
          if (field.kind === 'date' && value) return dayjs(String(value)).format('YYYY-MM-DD HH:mm')
          if (value === null || value === undefined || value === '') return ''
          return String(value)
        },
      })),
    {
      title: '操作',
      key: 'actions',
      width: 112,
      fixed: 'right',
      align: 'center',
      className: styles.actionColumn,
      render: (_value, row) => (
        <Space size={4}>
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              className={styles.editButton}
              icon={<EditOutlined />}
              aria-label="编辑"
              onClick={() => openEdit(row)}
            />
          </Tooltip>
          <Popconfirm title="确认删除？" onConfirm={() => remove(Number(row.id))}>
            <Tooltip title="删除">
              <Button
                type="text"
                size="small"
                className={styles.deleteButton}
                icon={<DeleteOutlined />}
                aria-label="删除"
                danger
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  function openCreate() {
    setEditingId(null)
    form.resetFields()
    form.setFieldsValue(toFormValues(resource.fields))
    setOpen(true)
  }

  function openEdit(row: Row) {
    setEditingId(Number(row.id))
    form.resetFields()
    form.setFieldsValue(toFormValues(resource.fields, row))
    setOpen(true)
  }

  async function onSubmit(values: Record<string, unknown>) {
    if (submittingRef.current) return
    submittingRef.current = true
    setSaving(true)
    try {
      const payload = toPayload(resource.fields, values, editingId !== null)
      if (editingId) await api.update(editingId, payload)
      else await api.create(payload)
      if (!mountedRef.current) return
      message.success('保存成功')
      setOpen(false)
      setQuery((current) => ({ ...current }))
    } catch {
      // 保留弹窗和输入内容，错误提示由请求拦截器处理。
    } finally {
      submittingRef.current = false
      if (mountedRef.current) setSaving(false)
    }
  }

  async function remove(id: number) {
    await api.remove(id)
    if (!mountedRef.current) return
    message.success('删除成功')
    setQuery((current) => ({ ...current }))
  }

  return (
    <section className={styles.page} aria-label={`${resource.title}管理`}>
      <PageHeader title={resource.title} />
      <DataListLayout
        loading={loading}
        filters={
          <form
            className={styles.searchBar}
            onSubmit={(event) => {
              event.preventDefault()
              setQuery({ page: 1, keyword: searchKeyword })
            }}
          >
            <div className={styles.combinedSearch}>
              <label className={styles.keywordLabel} htmlFor={keywordId}>关键字</label>
              <Input
                id={keywordId}
                className={styles.keywordInput}
                allowClear
                placeholder="请输入关键字"
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
              />
            </div>
            <div className={styles.searchActions}>
              <Button onClick={() => {
                setSearchKeyword('')
                setQuery({ page: 1, keyword: '' })
              }}>重置</Button>
              <Button type="primary" htmlType="submit">查询</Button>
            </div>
          </form>
        }
        toolbar={<Button className={styles.createButton} icon={<PlusOutlined />} onClick={openCreate}>新增</Button>}
        tableViewportRef={viewportRef}
        table={
          <Table<Row>
            className={styles.resultTable}
            tableLayout="fixed"
            rowKey="id"
            size="medium"
            columns={columns}
            dataSource={items}
            pagination={false}
            scroll={{ x: tableWidth }}
            sticky={{ offsetHeader: 0, getContainer: () => viewportRef.current ?? window }}
            locale={{ emptyText: loadFailed ? null : (
              <Empty
                image={<img className={styles.emptyImage} src={emptyImage} alt="" />}
                description="暂无数据"
              />
            ) }}
          />
        }
        horizontalScrollbar={
          <div
            ref={scrollbarRef}
            className={styles.horizontalScroll}
            data-overflow={isOverflowing}
            role="region"
            aria-label="表格横向滚动"
            tabIndex={isOverflowing ? 0 : -1}
          >
            <div className={styles.horizontalScrollContent} style={{ width: scrollWidth }} />
          </div>
        }
        pagination={total > 0 ? (
          <Pagination
            size="small"
            current={query.page}
            pageSize={size}
            total={total}
            showSizeChanger
            showQuickJumper
            showTotal={(count, range) => `第 ${range[0]}–${range[1]} 条 / 总共 ${count} 条`}
            onChange={(nextPage, nextSize) => {
              onSizeChange(nextSize)
              setQuery((current) => ({ ...current, page: nextSize !== size ? 1 : nextPage }))
            }}
          />
        ) : null}
        loadingOverlay={loading ? (
          <div className={styles.loadingMask} role="status" aria-live="polite">
            <Spin size="large" />
            <span>正在加载中</span>
          </div>
        ) : loadFailed ? (
          <div className={styles.failureMask} role="alert">
            <span>数据加载失败，请重试</span>
            <Button onClick={() => setQuery((current) => ({ ...current }))}>重新加载</Button>
          </div>
        ) : null}
      />

      <Modal
        open={open}
        className={styles.editDialog}
        classNames={{ container: styles.dialogContainer, body: styles.dialogBody }}
        title={editingId ? `编辑${resource.title}` : `新增${resource.title}`}
        confirmLoading={saving}
        onCancel={() => { if (!submittingRef.current) setOpen(false) }}
        onOk={() => form.submit()}
        cancelButtonProps={{ disabled: saving }}
        closable={!saving}
        mask={{ closable: !saving }}
        keyboard={!saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={onSubmit} scrollToFirstError={{ focus: true }}>
          {resource.fields.filter((field) => field.form !== false).map((field) => {
            const required = field.required && !(field.kind === 'password' && field.name === 'password' && editingId)
            return (
              <Form.Item
                key={field.name}
                name={field.name}
                label={field.label}
                valuePropName={field.kind === 'bool' ? 'checked' : 'value'}
                rules={required ? [{ required: true, message: `请输入${field.label}` }] : undefined}
              >
                {renderControl(field, Boolean(editingId))}
              </Form.Item>
            )
          })}
        </Form>
      </Modal>
    </section>
  )
}

function renderControl(field: FieldDef, editing: boolean) {
  if (field.kind === 'bool') return <Switch />
  if (field.kind === 'number') return <InputNumber style={{ width: '100%' }} controls={false} />
  if (field.kind === 'date') return <DatePicker showTime style={{ width: '100%' }} />
  if (field.kind === 'password') {
    return <Input.Password placeholder={editing ? '留空则不修改' : undefined} />
  }
  if (field.kind === 'textarea') return <Input.TextArea rows={3} />
  return <Input />
}
