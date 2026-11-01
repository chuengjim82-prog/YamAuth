import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button, DatePicker, Form, Input, InputNumber, Modal, Pagination, Popconfirm, Result, Switch, Table, message } from 'antd'
import type { TableColumnsType } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import DataListLayout from '@/components/DataListLayout'
import { createCrudApi } from '@/api/crud'
import { findResource, type FieldDef } from '@/resources'
import type { Row } from '@/types'

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
  const [form] = Form.useForm()
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const api = useMemo(() => (resource ? createCrudApi(resource.api) : null), [resource])

  async function load(nextPage = page, nextSize = size, nextKeyword = keyword) {
    if (!api) return
    setLoading(true)
    try {
      const result = await api.page(nextPage, nextSize, nextKeyword)
      setTotal(result.total)
      setItems(result.items ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setKeyword('')
    setPage(1)
    setOpen(false)
    setEditingId(null)
    if (!api) return
    let cancelled = false
    setLoading(true)
    api.page(1, size, '')
      .then((result) => {
        if (cancelled) return
        setTotal(result.total)
        setItems(result.items ?? [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [api])

  if (!resource || !api) {
    return <Result status="404" title="未找到页面" subTitle={location.pathname} />
  }

  const current = resource
  const crud = api

  const columns: TableColumnsType<Row> = [
    ...current.fields
      .filter((field) => field.table !== false)
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
      width: 140,
      fixed: 'right',
      render: (_value, row) => (
        <>
          <Button type="link" onClick={() => openEdit(row)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={() => remove(Number(row.id))}>
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </>
      ),
    },
  ]

  function openCreate() {
    setEditingId(null)
    form.setFieldsValue(toFormValues(current.fields))
    setOpen(true)
  }

  function openEdit(row: Row) {
    setEditingId(Number(row.id))
    form.setFieldsValue(toFormValues(current.fields, row))
    setOpen(true)
  }

  async function onSubmit(values: Record<string, unknown>) {
    setSaving(true)
    try {
      const payload = toPayload(current.fields, values, editingId !== null)
      if (editingId) await crud.update(editingId, payload)
      else await crud.create(payload)
      message.success('保存成功')
      setOpen(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: number) {
    await crud.remove(id)
    message.success('删除成功')
    await load()
  }

  return (
    <>
      <DataListLayout
        loading={loading}
        filters={
          <Form
            layout="inline"
            style={{ marginBottom: 16 }}
            onFinish={(values: { keyword?: string }) => {
              const next = values.keyword ?? ''
              setKeyword(next)
              setPage(1)
              void load(1, size, next)
            }}
          >
            <Form.Item name="keyword" label="关键字">
              <Input allowClear placeholder="请输入关键字" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">查询</Button>
            </Form.Item>
          </Form>
        }
        toolbar={<Button type="primary" onClick={openCreate}>新增</Button>}
        table={
          <Table<Row>
            rowKey="id"
            size="small"
            loading={loading}
            columns={columns}
            dataSource={items}
            pagination={false}
            scroll={{ x: 'max-content' }}
          />
        }
        pagination={
          <Pagination
            current={page}
            pageSize={size}
            total={total}
            showSizeChanger
            showTotal={(count) => `共 ${count} 条`}
            onChange={(nextPage, nextSize) => {
              setPage(nextPage)
              setSize(nextSize)
              void load(nextPage, nextSize, keyword)
            }}
          />
        }
      />

      <Modal
        open={open}
        title={editingId ? `编辑${current.title}` : `新增${current.title}`}
        confirmLoading={saving}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          {current.fields.filter((field) => field.form !== false).map((field) => {
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
    </>
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
