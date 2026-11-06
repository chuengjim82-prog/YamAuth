import { useEffect, useLayoutEffect, useMemo, useRef, useState, type Key } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Popconfirm,
  Result,
  Space,
  Spin,
  Switch,
  Table,
  Tooltip,
  TreeSelect,
  message
} from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import DataListLayout from '@/components/DataListLayout'
import PageHeader from '@/components/PageHeader'
import IconPicker from '@/components/IconPicker'
import TenantSelect from '@/components/TenantSelect'
import DepartmentSelect from '@/components/DepartmentSelect'
import IconGlyph from '@/components/icons/IconGlyph'
import { createCrudApi } from '@/api/crud'
import { findResource, type FieldDef, type ResourceDef } from '@/resources'
import type { Row } from '@/types'
import { useApp } from '@/store/AppContext'
import { ancestors, buildTree, ISSUE_GROUP, parentOptions, treeView, type TreeModel } from './tree'
import { useTableViewport } from './useTableViewport'
import { useDepartmentLabels } from './useDepartmentLabels'
import { useTenantLabels } from './useTenantLabels'
import { fieldText } from './fieldText'
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
      values[field.name] = raw ? dayjs(fieldText(raw)) : null
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
    if (
      field.kind === 'password' &&
      editing &&
      (value === '' || value === undefined || value === null)
    ) {
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
  return (
    <ResourceCrudPage key={resource.path} resource={resource} size={size} onSizeChange={setSize} />
  )
}

function ResourceCrudPage({
  resource,
  size,
  onSizeChange
}: {
  resource: ResourceDef
  size: number
  onSizeChange: (size: number) => void
}) {
  const { refreshMenus } = useApp()
  const [searchKeyword, setSearchKeyword] = useState('')
  const [query, setQuery] = useState({ page: 1, keyword: '' })
  const [reloadVersion, setReloadVersion] = useState(0)
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([])
  const [searchExpansion, setSearchExpansion] = useState<{
    view?: ReturnType<typeof treeView>
    keys: Key[]
  }>({ keys: [] })
  const [locatedId, setLocatedId] = useState<number | null>(null)
  const initializedTree = useRef(false)
  const pendingLocate = useRef<number | null>(null)
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState<Row[]>([])
  const departmentLabel = useDepartmentLabels(items, resource.path === '/unit/employees')
  const tenantLabel = useTenantLabels(
    items,
    resource.fields.some((field) => field.formControl === 'tenant' && field.table !== false)
  )
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formSession, setFormSession] = useState(0)
  const [formValues, setFormValues] = useState<Record<string, unknown>>({})
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    request: object
    id: number
  } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const deletingRef = useRef(false)
  const queryButtonRef = useRef<HTMLButtonElement>(null)
  const mountedRef = useRef(false)
  const submittingRef = useRef(false)
  const actionStateRef = useRef({ blocked: true, open: false, formSession: 0 })
  const api = useMemo(() => createCrudApi(resource.api), [resource.api])
  const treeModel = useMemo(
    () => (resource.tree ? buildTree(items, resource.tree) : undefined),
    [items, resource.tree]
  )
  const view = useMemo(
    () => (treeModel ? treeView(treeModel, query.keyword) : undefined),
    [treeModel, query.keyword]
  )
  const searchExpandedKeys =
    searchExpansion.view === view ? searchExpansion.keys : (view?.expandable ?? [])
  const setSearchExpandedKeys = (keys: Key[]) => setSearchExpansion({ view, keys })
  const searching = Boolean(resource.tree && query.keyword.trim())
  const tableFields = resource.fields.filter((field) => field.table !== false)
  if (resource.tree)
    tableFields.sort(
      (a, b) =>
        Number(b.name === resource.tree!.nameField) - Number(a.name === resource.tree!.nameField)
    )
  const columnWidth = (field: FieldDef) =>
    field.name === resource.tree?.nameField ? 300 : field.name === 'id' ? 90 : 160
  const actionWidth = resource.tree ? 150 : 112
  const tableWidth = tableFields.reduce((width, field) => width + columnWidth(field), actionWidth)
  const requestPage = resource.tree ? 1 : query.page
  const requestSize = resource.tree ? 0 : size
  const requestKeyword = resource.tree ? '' : query.keyword
  const request = useMemo(
    () => ({
      api,
      page: requestPage,
      size: requestSize,
      keyword: requestKeyword,
      tree: resource.tree,
      version: reloadVersion
    }),
    [api, requestPage, requestSize, requestKeyword, resource.tree, reloadVersion]
  )
  const [loadResult, setLoadResult] = useState<{ request: typeof request; failed: boolean }>()
  // 结果只属于发起它的查询；新查询立即进入加载态，无须在 Effect 中同步重置。
  const loading = loadResult?.request !== request
  const loadFailed = loadResult?.request === request && loadResult.failed
  const interactionBlocked = loading || loadFailed
  const deleteId = deleteConfirmation?.request === request ? deleteConfirmation.id : null
  const setDeleteId = (id: number | null) =>
    setDeleteConfirmation(id === null ? null : { request, id })
  const { viewportRef, scrollbarRef, scrollWidth, isOverflowing } = useTableViewport(
    tableWidth,
    items
  )
  const keywordId = `${resource.path}-keyword`
  const editFormId = `${resource.path}-edit-form`

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useLayoutEffect(() => {
    // 弹出层退出动画和异步校验可能保留旧回调，操作前必须读取最新状态。
    actionStateRef.current = { blocked: interactionBlocked, open, formSession }
  }, [interactionBlocked, open, formSession])

  useEffect(() => {
    let cancelled = false
    if (viewportRef.current) viewportRef.current.scrollTop = 0
    const pending = request.tree
      ? request.api.all()
      : request.api.page(request.page, request.size, request.keyword)
    pending
      .then((result) => {
        if (cancelled) return
        setTotal(result.total)
        const rows = result.items ?? []
        setItems(rows)
        if (request.tree) {
          const model = buildTree(rows, request.tree)
          const nextView = treeView(model, '')
          const focusId = pendingLocate.current
          pendingLocate.current = null
          const path: Key[] = focusId === null ? [] : ancestors(model, focusId)
          if (focusId !== null && model.issues.get(focusId)) path.push(ISSUE_GROUP)
          const initial = !initializedTree.current
          initializedTree.current = true
          setExpandedKeys((current) => [
            ...new Set([
              ...(initial
                ? nextView.roots.filter((row) => row.children?.length).map((row) => row.id)
                : current.filter((key) => key === ISSUE_GROUP || model.byId.has(Number(key)))),
              ...path
            ])
          ])
          if (focusId !== null) setLocatedId(focusId)
        }
        setLoadResult({ request, failed: false })
      })
      .catch(() => {
        // 请求拦截器负责错误提示，列表明确显示失败状态，不能误报为暂无数据。
        if (!cancelled) setLoadResult({ request, failed: true })
      })
    return () => {
      // 后发查询、重置或翻页会清理前次请求，旧结果不能覆盖当前筛选。
      cancelled = true
    }
  }, [request, viewportRef])

  useEffect(() => {
    if (locatedId === null || loading || !view?.visible.has(locatedId)) return
    const frame = requestAnimationFrame(() => {
      const row = viewportRef.current?.querySelector<HTMLElement>(`[data-row-key="${locatedId}"]`)
      row?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    })
    return () => cancelAnimationFrame(frame)
  }, [locatedId, loading, view, viewportRef])

  function highlight(value: string) {
    const needle = resource.tree ? query.keyword.trim().toLowerCase() : ''
    if (!needle) return value
    const parts = []
    let offset = 0
    const text = value.toLowerCase()
    for (let index = text.indexOf(needle); index !== -1; index = text.indexOf(needle, offset)) {
      parts.push(
        value.slice(offset, index),
        <mark key={index}>{value.slice(index, index + needle.length)}</mark>
      )
      offset = index + needle.length
    }
    parts.push(value.slice(offset))
    return parts
  }

  const columns: TableColumnsType<Row> = [
    ...tableFields.map((field) => ({
      title: field.label,
      dataIndex: field.name,
      key: field.name,
      width: columnWidth(field),
      ellipsis: true,
      render: (value: unknown, row: Row) => {
        if (row.treeGroup) return field.name === resource.tree?.nameField ? '层级异常' : null
        if (field.name === resource.tree?.nameField)
          return (
            <span className={styles.treeName}>
              <span className={styles.treeNameText} title={fieldText(value || '未命名')}>
                {highlight(fieldText(value || '未命名'))}
              </span>
              {Boolean(row.treeIssue) && (
                <Tooltip title={String(row.treeIssue)}>
                  <span className={styles.treeIssue}>{String(row.treeIssue)}</span>
                </Tooltip>
              )}
            </span>
          )
        if (field.kind === 'bool') return value ? '是' : '否'
        if (field.kind === 'icon')
          return <IconGlyph name={value == null ? undefined : fieldText(value)} />
        if (field.kind === 'date' && value)
          return dayjs(fieldText(value)).format('YYYY-MM-DD HH:mm')
        if (field.formControl === 'department') return departmentLabel(value)
        if (field.formControl === 'tenant') return tenantLabel(value)
        if (value === null || value === undefined || value === '') return ''
        return highlight(fieldText(value))
      }
    })),
    {
      title: '操作',
      key: 'actions',
      width: actionWidth,
      fixed: 'right',
      align: 'center',
      className: styles.actionColumn,
      render: (_value, row) =>
        row.treeGroup ? null : (
          <Space size={4}>
            {resource.tree && (
              <Tooltip title={row.treeIssue ? '请先修复层级异常' : '新增子级'}>
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  aria-label="新增子级"
                  disabled={interactionBlocked || Boolean(row.treeIssue)}
                  onClick={() => openCreate(row)}
                />
              </Tooltip>
            )}
            <Tooltip title="编辑">
              <Button
                type="text"
                size="small"
                className={styles.editButton}
                icon={<EditOutlined />}
                aria-label="编辑"
                disabled={interactionBlocked}
                onClick={() => openEdit(row)}
              />
            </Tooltip>
            <Popconfirm
              title="确认删除？"
              open={!interactionBlocked && deleteId === Number(row.id)}
              onOpenChange={(nextOpen) => {
                if (!deletingRef.current)
                  setDeleteId(
                    nextOpen &&
                      !actionStateRef.current.blocked &&
                      !treeModel?.children.get(Number(row.id))?.length
                      ? Number(row.id)
                      : null
                  )
              }}
              okButtonProps={{ loading: deleting }}
              cancelButtonProps={{ disabled: deleting }}
              onConfirm={() => {
                void remove(Number(row.id))
              }}
            >
              <Tooltip
                title={
                  treeModel?.children.get(Number(row.id))?.length
                    ? '存在子节点，请先移动或删除子节点'
                    : '删除'
                }
              >
                <Button
                  type="text"
                  size="small"
                  className={styles.deleteButton}
                  icon={<DeleteOutlined />}
                  aria-label="删除"
                  disabled={
                    interactionBlocked || Boolean(treeModel?.children.get(Number(row.id))?.length)
                  }
                  danger
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        )
    }
  ]

  function openCreate(parent?: Row) {
    if (actionStateRef.current.blocked) return
    setEditingId(null)
    const values = toFormValues(resource.fields)
    if (resource.tree) {
      values.parentId = parent ? Number(parent.id) : 0
      if (resource.tree.appScoped && parent) values.appsId = parent.appsId ?? null
    }
    setFormValues(values)
    setFormSession((current) => current + 1)
    setOpen(true)
  }

  function openEdit(row: Row) {
    if (actionStateRef.current.blocked) return
    setEditingId(Number(row.id))
    setFormValues(toFormValues(resource.fields, row))
    setFormSession((current) => current + 1)
    setOpen(true)
  }

  async function onSubmit(values: Record<string, unknown>) {
    const actionState = actionStateRef.current
    if (
      submittingRef.current ||
      actionState.blocked ||
      !actionState.open ||
      actionState.formSession !== formSession
    )
      return
    submittingRef.current = true
    setSaving(true)
    try {
      const payload = toPayload(resource.fields, values, editingId !== null)
      let savedId = editingId
      if (editingId !== null) await api.update(editingId, payload)
      else savedId = await api.create(payload)
      // 全局刷新与本页生命周期分开；刷新请求失败不改变已成功的保存结果。
      if (resource.path === '/auth/crud-menus') refreshMenus()
      if (!mountedRef.current) return
      if (resource.tree) pendingLocate.current = savedId
      message.success('保存成功')
      setOpen(false)
      setReloadVersion((current) => current + 1)
    } catch {
      // 保留弹窗和输入内容，错误提示由请求拦截器处理。
    } finally {
      submittingRef.current = false
      if (mountedRef.current) setSaving(false)
    }
  }

  async function remove(id: number) {
    if (actionStateRef.current.blocked || deletingRef.current) return
    deletingRef.current = true
    setDeleting(true)
    try {
      await api.remove(id)
      if (!mountedRef.current) return
      message.success('删除成功')
      setReloadVersion((current) => current + 1)
    } catch {
      // 请求拦截器已提示失败，确认框可关闭后重新发起删除。
    } finally {
      deletingRef.current = false
      if (mountedRef.current) {
        setDeleting(false)
        setDeleteId(null)
      }
    }
  }

  return (
    <section className={styles.page} aria-label={`${resource.title}管理`}>
      <PageHeader title={resource.title} />
      <DataListLayout
        loading={loading}
        interactionBlocked={interactionBlocked}
        focusReturnRef={queryButtonRef}
        filters={
          <form
            className={styles.searchBar}
            onSubmit={(event) => {
              event.preventDefault()
              setQuery({ page: 1, keyword: searchKeyword })
              if (!resource.tree) setReloadVersion((current) => current + 1)
            }}
          >
            <div className={styles.combinedSearch}>
              <label className={styles.keywordLabel} htmlFor={keywordId}>
                关键字
              </label>
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
              <Button
                onClick={() => {
                  setSearchKeyword('')
                  setQuery({ page: 1, keyword: '' })
                  if (!resource.tree) setReloadVersion((current) => current + 1)
                }}
              >
                重置
              </Button>
              <Button ref={queryButtonRef} type="primary" htmlType="submit">
                查询
              </Button>
            </div>
          </form>
        }
        toolbar={
          <Space wrap>
            {resource.tree && (
              <>
                {locatedId !== null && searching && !view?.visible.has(locatedId) && (
                  <span role="status">
                    已保存记录不在当前搜索结果中
                    <Button
                      type="link"
                      onClick={() => {
                        setSearchKeyword('')
                        setQuery({ page: 1, keyword: '' })
                      }}
                    >
                      清空搜索查看
                    </Button>
                  </span>
                )}
                <Button
                  disabled={interactionBlocked}
                  onClick={() =>
                    (searching ? setSearchExpandedKeys : setExpandedKeys)(view?.expandable ?? [])
                  }
                >
                  全部展开
                </Button>
                <Button
                  disabled={interactionBlocked}
                  onClick={() => (searching ? setSearchExpandedKeys : setExpandedKeys)([])}
                >
                  全部收起
                </Button>
              </>
            )}
            <Button
              className={styles.createButton}
              icon={<PlusOutlined />}
              disabled={interactionBlocked}
              onClick={() => openCreate()}
            >
              {resource.tree ? '新增顶级' : '新增'}
            </Button>
          </Space>
        }
        tableViewportRef={viewportRef}
        table={
          <Table<Row>
            className={styles.resultTable}
            tableLayout="fixed"
            rowKey="id"
            size="medium"
            columns={columns}
            dataSource={view?.roots ?? items}
            rowClassName={(row) => (row.id === locatedId ? styles.locatedRow : '')}
            expandable={
              resource.tree
                ? {
                    expandedRowKeys: searching ? searchExpandedKeys : expandedKeys,
                    onExpandedRowsChange: (keys) =>
                      (searching ? setSearchExpandedKeys : setExpandedKeys)([...keys]),
                    indentSize: 20
                  }
                : undefined
            }
            pagination={false}
            scroll={{ x: tableWidth }}
            sticky={{ offsetHeader: 0, getContainer: () => viewportRef.current ?? window }}
            locale={{
              emptyText: loadFailed ? null : (
                <Empty
                  image={<img className={styles.emptyImage} src={emptyImage} alt="" />}
                  description="暂无数据"
                />
              )
            }}
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
        pagination={
          resource.tree ? (
            <span role="status">
              {searching ? `匹配 ${view?.matches.size ?? 0} 项 / 共 ${total} 项` : `共 ${total} 项`}
            </span>
          ) : total > 0 ? (
            <Pagination
              size="small"
              current={query.page}
              pageSize={size}
              total={total}
              showSizeChanger
              showQuickJumper
              disabled={interactionBlocked}
              showTotal={(count, range) => `第 ${range[0]}–${range[1]} 条 / 总共 ${count} 条`}
              onChange={(nextPage, nextSize) => {
                if (actionStateRef.current.blocked) return
                onSizeChange(nextSize)
                setQuery((current) => ({ ...current, page: nextSize !== size ? 1 : nextPage }))
              }}
            />
          ) : null
        }
        loadingOverlay={
          loading ? (
            <div className={styles.loadingMask} role="status" aria-live="polite" tabIndex={-1}>
              <Spin size="large" />
              <span>正在加载中</span>
            </div>
          ) : loadFailed ? (
            <div className={styles.failureMask} role="alert">
              <span>数据加载失败，请重试</span>
              <Button onClick={() => setReloadVersion((current) => current + 1)}>重新加载</Button>
            </div>
          ) : null
        }
      />

      <Modal
        open={open}
        className={styles.editDialog}
        classNames={{ container: styles.dialogContainer, body: styles.dialogBody }}
        title={editingId ? `编辑${resource.title}` : `新增${resource.title}`}
        confirmLoading={saving}
        onCancel={() => {
          if (!submittingRef.current) setOpen(false)
        }}
        okButtonProps={{ disabled: interactionBlocked, htmlType: 'submit', form: editFormId }}
        cancelButtonProps={{ disabled: saving }}
        closable={!saving}
        mask={{ closable: !saving }}
        keyboard={!saving}
        destroyOnHidden
      >
        <ResourceEditForm
          key={formSession}
          formId={editFormId}
          resource={resource}
          editingId={editingId}
          initialValues={formValues}
          treeModel={treeModel}
          onSubmit={onSubmit}
          active={open}
          saving={saving}
        />
      </Modal>
    </section>
  )
}

function ResourceEditForm({
  formId,
  resource,
  editingId,
  initialValues,
  treeModel,
  onSubmit,
  active,
  saving
}: {
  formId: string
  resource: ResourceDef
  editingId: number | null
  initialValues: Record<string, unknown>
  treeModel?: TreeModel
  onSubmit: (values: Record<string, unknown>) => Promise<void>
  active: boolean
  saving: boolean
}) {
  const [form] = Form.useForm<Record<string, unknown>>()
  const watchedApp: unknown = Form.useWatch('appsId', { form, preserve: true })
  const appsId = watchedApp === undefined ? initialValues.appsId : watchedApp
  const candidates = useMemo(
    () => (treeModel ? parentOptions(treeModel, editingId, appsId) : []),
    [treeModel, editingId, appsId]
  )
  const hasChildren = editingId !== null && Boolean(treeModel?.children.get(editingId)?.length)
  const options = [{ id: 0, pId: -1, value: 0, title: `顶级${resource.title}` }, ...candidates]

  useEffect(() => {
    // clearOnDestroy 也会在 StrictMode 试卸载时清空存储；连接后恢复本次初始值。
    form.resetFields()
  }, [form])

  return (
    <Form<Record<string, unknown>>
      id={formId}
      form={form}
      initialValues={initialValues}
      clearOnDestroy
      layout="vertical"
      onFinish={(values) => {
        // 提交函数内部处理失败并释放锁，表单回调只负责触发。
        void onSubmit(values)
      }}
      onValuesChange={(changed: Record<string, unknown>) => {
        if (resource.tree?.appScoped && Object.hasOwn(changed, 'appsId')) {
          const parentId: unknown = form.getFieldValue('parentId')
          if (
            parentId !== 0 &&
            !parentOptions(treeModel!, editingId, changed.appsId).some(
              (option) => option.value === parentId
            )
          ) {
            form.setFieldsValue({ parentId: undefined })
          }
        }
      }}
      scrollToFirstError={{ focus: true }}
    >
      {resource.fields
        .filter((field) => field.form !== false)
        .map((field) => {
          const isParent = Boolean(treeModel && field.name === 'parentId')
          const lockedApp = Boolean(
            resource.tree?.appScoped && field.name === 'appsId' && hasChildren
          )
          const required =
            isParent ||
            (field.required &&
              !(field.kind === 'password' && field.name === 'password' && editingId))
          return (
            <Form.Item
              key={field.name}
              name={field.name}
              label={field.label}
              valuePropName={field.kind === 'bool' ? 'checked' : 'value'}
              extra={lockedApp ? '存在子功能，请先调整子功能后再修改所属应用' : undefined}
              rules={
                isParent
                  ? [
                      { required: true, message: '请选择上级或顶级' },
                      {
                        validator: (_rule, value) =>
                          value === 0 || candidates.some((option) => option.value === value)
                            ? Promise.resolve()
                            : Promise.reject(new Error('上级不合法，请重新选择'))
                      }
                    ]
                  : required
                    ? [
                        {
                          required: true,
                          message: `请${field.kind === 'icon' ? '选择' : '输入'}${field.label}`
                        }
                      ]
                    : undefined
              }
            >
              {isParent ? (
                <TreeSelect
                  style={{ width: '100%' }}
                  showSearch
                  allowClear
                  treeDefaultExpandAll
                  treeDataSimpleMode={{ id: 'id', pId: 'pId', rootPId: -1 }}
                  treeData={options}
                  placeholder="请选择上级或顶级"
                  treeNodeFilterProp="title"
                />
              ) : lockedApp ? (
                <InputNumber style={{ width: '100%' }} disabled />
              ) : (
                renderControl(field, Boolean(editingId), active, saving)
              )}
            </Form.Item>
          )
        })}
    </Form>
  )
}

function renderControl(field: FieldDef, editing: boolean, active: boolean, saving: boolean) {
  if (field.formControl === 'tenant') return <TenantSelect active={active} disabled={saving} />
  if (field.formControl === 'department')
    return <DepartmentSelect active={active} disabled={saving} />
  if (field.kind === 'icon') return <IconPicker active={active} disabled={saving} />
  if (field.kind === 'bool') return <Switch />
  if (field.kind === 'number') return <InputNumber style={{ width: '100%' }} controls={false} />
  if (field.kind === 'date') return <DatePicker showTime style={{ width: '100%' }} />
  if (field.kind === 'password') {
    return <Input.Password placeholder={editing ? '留空则不修改' : undefined} />
  }
  if (field.kind === 'textarea') return <Input.TextArea rows={3} />
  return <Input />
}
