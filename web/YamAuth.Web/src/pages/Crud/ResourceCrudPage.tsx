import IntegerInput from './IntegerInput'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type Key } from 'react'
import {
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Select,
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
import dayjs from 'dayjs'
import DataListLayout from '@/components/DataListLayout'
import PageHeader from '@/components/PageHeader'
import IconPicker from '@/components/IconPicker'
import TenantSelect from '@/components/TenantSelect'
import DepartmentSelect from '@/components/DepartmentSelect'
import UserSelect from '@/components/UserSelect'
import AppSelect from './AppSelect'
import { useAppsUserLabels } from './useAppsUserLabels'
import IconGlyph from '@/components/icons/IconGlyph'
import type { Entity, FieldDef, ResourceDef, ResourcePageProps } from '@/resources/types'
import { FormValueError, integerError } from '@/resources/formValues'
import { useApp } from '@/store/AppContext'
import {
  ancestors,
  buildTree,
  ISSUE_GROUP,
  parentOptions,
  treeLabel,
  treeView,
  validateTreeResult,
  type TreeRow,
  type TreeModel
} from './tree'
import { useTableViewport } from './useTableViewport'
import { useDepartmentLabels } from './useDepartmentLabels'
import { useTenantLabels } from './useTenantLabels'
import { useCrudInfoLabels } from './useCrudInfoLabels'
import { fieldText } from './fieldText'
import emptyImage from './assets/list-empty.png'
import styles from './Crud.module.css'
import CrudInfoSelect from './CrudInfoSelect'
import CrudRelationSelect from './CrudRelationSelect'
import { useCrudRelationOptions } from './useCrudRelationOptions'
import { crudMenuTypeLabel, crudMenuTypeOptions } from './menuType'

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

export default function ResourceCrudPage<E extends Entity, F extends object, C, U>({
  resource,
  size,
  onSizeChange
}: {
  resource: ResourceDef<E, F, C, U>
} & ResourcePageProps) {
  const { refreshMenus, isCurrentSession } = useApp()
  const [searchKeyword, setSearchKeyword] = useState('')
  const [query, setQuery] = useState({ page: 1, keyword: '' })
  const [reloadVersion, setReloadVersion] = useState(0)
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([])
  const [searchExpansion, setSearchExpansion] = useState<{
    view?: ReturnType<typeof treeView<E>> | undefined
    keys: Key[]
  }>({ keys: [] })
  const [locatedId, setLocatedId] = useState<number | null>(null)
  const initializedTree = useRef(false)
  const pendingLocate = useRef<number | null>(null)
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState<E[]>([])
  const appsUserLabel = useAppsUserLabels(
    items,
    resource.relations?.appsId,
    resource.relations?.userId
  )
  const departmentLabel = useDepartmentLabels(items, resource.relations?.departmentId)
  const tenantLabel = useTenantLabels(items, resource.relations?.tenantId)
  const crudInfoLabel = useCrudInfoLabels(items, resource.relations?.crudId)
  const roleOptions = useCrudRelationOptions(
    'crudRole',
    Boolean(resource.relations?.crudRoleId),
    items
  )
  const dataRoleOptions = useCrudRelationOptions(
    'dataRole',
    Boolean(resource.relations?.dataRoleId),
    items
  )
  const infoOptions = useCrudRelationOptions(
    'crudInfoId',
    Boolean(resource.relations?.crudInfoId),
    items
  )
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formSession, setFormSession] = useState(0)
  const [formValues, setFormValues] = useState<F>(() => resource.toForm())
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
  const api = resource.api
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
  const tree = resource.tree
  if (tree)
    tableFields.sort(
      (a, b) => Number(b.name === tree.nameField) - Number(a.name === tree.nameField)
    )
  const columnWidth = (field: FieldDef<E, F>) =>
    field.name === resource.tree?.nameField ? 300 : field.name === 'id' ? 90 : 160
  const actionWidth = resource.tree ? 150 : 112
  const tableWidth = tableFields.reduce((width, field) => width + columnWidth(field), actionWidth)
  const requestPage = resource.tree ? 1 : query.page
  const requestSize = resource.tree ? 0 : size
  const requestKeyword = resource.tree ? '' : query.keyword
  const request = useMemo(
    () => ({
      load: resource.load,
      page: requestPage,
      size: requestSize,
      keyword: requestKeyword,
      tree: resource.tree,
      version: reloadVersion
    }),
    [resource.load, requestPage, requestSize, requestKeyword, resource.tree, reloadVersion]
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
    const pending = request.load(request.page, request.size, request.keyword)
    pending
      .then((result) => {
        if (cancelled || !isCurrentSession()) return
        if (request.tree) validateTreeResult(result)
        const lastPage = Math.max(1, Math.ceil(result.total / request.size))
        if (!request.tree && request.page > lastPage) {
          setQuery((current) => ({ ...current, page: lastPage }))
          return
        }
        setTotal(result.total)
        const rows = result.items
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
        // 网络错误由拦截器提示；全量结果校验失败同样显示失败状态，不能误报为暂无数据。
        if (!cancelled && isCurrentSession()) setLoadResult({ request, failed: true })
      })
    return () => {
      // 后发查询、重置或翻页会清理前次请求，旧结果不能覆盖当前筛选。
      cancelled = true
    }
  }, [request, viewportRef, isCurrentSession])

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

  const columns: TableColumnsType<TreeRow<E>> = [
    ...tableFields.map((field) => ({
      title: field.label,
      key: field.name,
      width: columnWidth(field),
      ellipsis: true,
      render: (_value: unknown, node: TreeRow<E>) => {
        if (node.kind === 'group')
          return field.name === resource.tree?.nameField ? '层级异常' : null
        const row = node.record
        const value = field.read(row)
        if (field.name === resource.tree?.nameField)
          return (
            <span className={styles.treeName ?? ''}>
              <span className={styles.treeNameText ?? ''} title={treeLabel(row, resource.tree)}>
                {highlight(treeLabel(row, resource.tree))}
              </span>
              {Boolean(node.treeIssue) && (
                <Tooltip title={String(node.treeIssue)}>
                  <span className={styles.treeIssue ?? ''}>{String(node.treeIssue)}</span>
                </Tooltip>
              )}
            </span>
          )
        if (treeModel && field.name === 'parentId') {
          if (value === null || value === undefined || value === '' || Number(value) === 0)
            return ''
          // 从完整树查找上级，搜索后的展示范围不影响名称解析；缺失上级不能伪装成顶级。
          const parent = treeModel.byId.get(Number(value))
          const label = `${parent ? treeLabel(parent, treeModel.config) : '上级不存在'}（${fieldText(value)}）`
          return <span title={label}>{highlight(label)}</span>
        }
        if (field.formControl === 'crudRole')
          return roleOptions.label(resource.relations?.crudRoleId?.(row))
        if (field.formControl === 'dataRole')
          return dataRoleOptions.label(resource.relations?.dataRoleId?.(row))
        if (field.formControl === 'crudInfoId')
          return infoOptions.label(resource.relations?.crudInfoId?.(row))
        if (field.formControl === 'menuType') return crudMenuTypeLabel(value)
        if (field.kind === 'bool') return value ? '是' : '否'
        if (field.kind === 'icon')
          return <IconGlyph name={value == null ? undefined : fieldText(value)} />
        if (field.kind === 'date' && value)
          return dayjs(fieldText(value)).format('YYYY-MM-DD HH:mm')
        if (field.formControl === 'app')
          return appsUserLabel('appsId', resource.relations?.appsId?.(row))
        if (field.formControl === 'user')
          return appsUserLabel('userId', resource.relations?.userId?.(row))
        if (field.formControl === 'department')
          return departmentLabel(resource.relations?.departmentId?.(row))
        if (field.formControl === 'tenant') return tenantLabel(resource.relations?.tenantId?.(row))
        if (field.formControl === 'crudInfo' && resource.relations?.crudId)
          return crudInfoLabel(resource.relations.crudId(row))
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
      className: styles.actionColumn ?? '',
      render: (_value: unknown, node: TreeRow<E>) =>
        node.kind === 'group' ? null : (
          <Space size={4}>
            {resource.tree && (
              <Tooltip title={node.treeIssue ? '请先修复层级异常' : '新增子级'}>
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  aria-label="新增子级"
                  disabled={interactionBlocked || Boolean(node.treeIssue)}
                  onClick={() => openCreate(node.record)}
                />
              </Tooltip>
            )}
            <Tooltip title="编辑">
              <Button
                type="text"
                size="small"
                className={styles.editButton ?? ''}
                icon={<EditOutlined />}
                aria-label="编辑"
                disabled={interactionBlocked}
                onClick={() => openEdit(node.record)}
              />
            </Tooltip>
            <Popconfirm
              title="确认删除？"
              open={!interactionBlocked && deleteId === Number(node.id)}
              onOpenChange={(nextOpen) => {
                if (!deletingRef.current)
                  setDeleteId(
                    nextOpen &&
                      !actionStateRef.current.blocked &&
                      !treeModel?.children.get(Number(node.id))?.length
                      ? Number(node.id)
                      : null
                  )
              }}
              okButtonProps={{ loading: deleting }}
              cancelButtonProps={{ disabled: deleting }}
              onConfirm={() => {
                void remove(Number(node.id))
              }}
            >
              <Tooltip
                title={
                  treeModel?.children.get(Number(node.id))?.length
                    ? '存在子节点，请先移动或删除子节点'
                    : '删除'
                }
              >
                <Button
                  type="text"
                  size="small"
                  className={styles.deleteButton ?? ''}
                  icon={<DeleteOutlined />}
                  aria-label="删除"
                  disabled={
                    interactionBlocked || Boolean(treeModel?.children.get(Number(node.id))?.length)
                  }
                  danger
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        )
    }
  ]

  function openCreate(parent?: E) {
    if (actionStateRef.current.blocked || !isCurrentSession()) return
    setEditingId(null)
    const initial = resource.toForm()
    const values = resource.tree && parent ? resource.tree.form.child(initial, parent) : initial
    setFormValues(values)
    setFormSession((current) => current + 1)
    setOpen(true)
  }

  function openEdit(row: E) {
    if (actionStateRef.current.blocked || !isCurrentSession()) return
    setEditingId(Number(row.id))
    setFormValues(resource.toForm(row))
    setFormSession((current) => current + 1)
    setOpen(true)
  }

  async function onSubmit(values: F) {
    const actionState = actionStateRef.current
    if (
      submittingRef.current ||
      !isCurrentSession() ||
      !mountedRef.current ||
      actionState.blocked ||
      !actionState.open ||
      actionState.formSession !== formSession
    )
      return
    submittingRef.current = true
    setSaving(true)
    try {
      let savedId = editingId
      if (editingId !== null) await api.update(editingId, resource.toUpdate(values))
      else savedId = await api.create(resource.toCreate(values))
      if (!isCurrentSession()) return
      // 全局刷新与本页生命周期分开；刷新请求失败不改变已成功的保存结果。
      if (resource.path === '/auth/crud-menus') refreshMenus()
      if (!mountedRef.current) return
      if (resource.tree) pendingLocate.current = savedId
      message.success('保存成功')
      setOpen(false)
      setReloadVersion((current) => current + 1)
    } catch (error: unknown) {
      if (error instanceof FormValueError) message.error(error.message)
      // 保留弹窗和输入内容，网络错误由请求拦截器提示。
    } finally {
      submittingRef.current = false
      if (mountedRef.current) setSaving(false)
    }
  }

  async function remove(id: number) {
    if (
      actionStateRef.current.blocked ||
      deletingRef.current ||
      !mountedRef.current ||
      !isCurrentSession()
    )
      return
    deletingRef.current = true
    setDeleting(true)
    try {
      await api.remove(id)
      if (!isCurrentSession()) return
      if (resource.path === '/auth/crud-menus') refreshMenus()
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
    <section className={styles.page ?? ''} aria-label={`${resource.title}管理`}>
      <PageHeader title={resource.title} />
      <DataListLayout
        loading={loading}
        interactionBlocked={interactionBlocked}
        focusReturnRef={queryButtonRef}
        filters={
          <form
            className={styles.searchBar ?? ''}
            onSubmit={(event) => {
              event.preventDefault()
              setQuery({ page: 1, keyword: searchKeyword })
              if (!resource.tree) setReloadVersion((current) => current + 1)
            }}
          >
            <div className={styles.combinedSearch ?? ''}>
              <label className={styles.keywordLabel ?? ''} htmlFor={keywordId}>
                关键字
              </label>
              <Input
                id={keywordId}
                className={styles.keywordInput ?? ''}
                allowClear
                placeholder="请输入关键字"
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
              />
            </div>
            <div className={styles.searchActions ?? ''}>
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
              className={styles.createButton ?? ''}
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
          <Table<TreeRow<E>>
            className={styles.resultTable ?? ''}
            tableLayout="fixed"
            rowKey="id"
            size="medium"
            columns={columns}
            dataSource={
              view?.roots ??
              items.map((record): TreeRow<E> => ({ kind: 'record', id: record.id, record }))
            }
            rowClassName={(row) => (row.id === locatedId ? (styles.locatedRow ?? '') : '')}
            {...(resource.tree
              ? {
                  expandable: {
                    expandedRowKeys: searching ? searchExpandedKeys : expandedKeys,
                    onExpandedRowsChange: (keys) =>
                      (searching ? setSearchExpandedKeys : setExpandedKeys)([...keys]),
                    indentSize: 20
                  }
                }
              : {})}
            pagination={false}
            scroll={{ x: tableWidth }}
            sticky={{ offsetHeader: 0, getContainer: () => viewportRef.current ?? window }}
            locale={{
              emptyText: loadFailed ? null : (
                <Empty
                  image={<img className={styles.emptyImage ?? ''} src={emptyImage} alt="" />}
                  description="暂无数据"
                />
              )
            }}
          />
        }
        horizontalScrollbar={
          <div
            ref={scrollbarRef}
            className={styles.horizontalScroll ?? ''}
            data-overflow={isOverflowing}
            role="region"
            aria-label="表格横向滚动"
            tabIndex={isOverflowing ? 0 : -1}
          >
            <div className={styles.horizontalScrollContent ?? ''} style={{ width: scrollWidth }} />
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
            <div
              className={styles.loadingMask ?? ''}
              role="status"
              aria-live="polite"
              tabIndex={-1}
            >
              <Spin size="large" />
              <span>正在加载中</span>
            </div>
          ) : loadFailed ? (
            <div className={styles.failureMask ?? ''} role="alert">
              <span>数据加载失败，请重试</span>
              <Button onClick={() => setReloadVersion((current) => current + 1)}>重新加载</Button>
            </div>
          ) : null
        }
      />

      <Modal
        open={open}
        className={styles.editDialog ?? ''}
        classNames={{ container: styles.dialogContainer ?? '', body: styles.dialogBody ?? '' }}
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

function ResourceEditForm<E extends Entity, F extends object, C, U>({
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
  resource: ResourceDef<E, F, C, U>
  editingId: number | null
  initialValues: F
  treeModel: TreeModel<E> | undefined
  onSubmit: (values: F) => Promise<void>
  active: boolean
  saving: boolean
}) {
  const [form] = Form.useForm<F>()
  const [manuallySelected, setManuallySelected] = useState<ReadonlySet<keyof F>>(new Set())
  const watchedApp = Form.useWatch((values: F) => resource.tree?.form.appId?.(values), {
    form,
    preserve: true
  })
  const appsId = watchedApp === undefined ? resource.tree?.form.appId?.(initialValues) : watchedApp
  const candidates = useMemo(
    () => (treeModel ? parentOptions(treeModel, editingId, appsId) : []),
    [treeModel, editingId, appsId]
  )
  const hasChildren = editingId !== null && Boolean(treeModel?.children.get(editingId)?.length)
  const rootTitle = `顶级${resource.title}`
  const options = [
    { id: 0, pId: -1, value: 0, title: rootTitle, searchText: rootTitle },
    ...candidates
  ]

  useEffect(() => {
    // clearOnDestroy 也会在 StrictMode 试卸载时清空存储；连接后恢复本次初始值。
    form.resetFields()
  }, [form])

  return (
    <Form<F>
      id={formId}
      form={form}
      initialValues={initialValues}
      clearOnDestroy
      layout="vertical"
      onFinish={(values) => {
        // 提交函数内部处理失败并释放锁，表单回调只负责触发。
        void onSubmit(values)
      }}
      onValuesChange={(changed: Partial<F>, values: F) => {
        const binding = resource.tree?.form
        const defaultBinding = binding?.defaultFromParent
        if (
          editingId === null &&
          binding &&
          defaultBinding &&
          Object.hasOwn(changed, binding.parentField) &&
          !manuallySelected.has(defaultBinding.field)
        ) {
          const parentId = binding.parentId(values)
          // 清空或非法上级交给原校验处理，不把它误当成顶级。
          if (parentId === 0 || candidates.some((option) => option.value === parentId)) {
            if (typeof parentId === 'number')
              form.setFieldValue(defaultBinding.field, defaultBinding.value(parentId))
          }
        }
        if (
          treeModel &&
          binding?.appField &&
          binding.appId &&
          Object.hasOwn(changed, binding.appField)
        ) {
          const parentId = binding.parentId(values)
          if (
            parentId !== 0 &&
            !parentOptions(treeModel, editingId, binding.appId(values)).some(
              (option) => option.value === parentId
            )
          ) {
            form.setFieldValue(binding.parentField, undefined)
          }
        }
      }}
      scrollToFirstError={{ focus: true }}
    >
      {resource.fields
        .filter((field) => field.form !== false)
        .map((field) => {
          if (field.formName === undefined) return null
          const isParent = Boolean(treeModel && field.name === 'parentId')
          const lockedApp = Boolean(resource.tree?.appId && field.name === 'appsId' && hasChildren)
          const required =
            isParent ||
            (field.kind === 'number' && !field.nullable) ||
            (field.required &&
              !(field.kind === 'password' && field.name === 'password' && editingId))
          return (
            <Form.Item<F>
              key={field.name}
              name={field.formName}
              label={field.label}
              valuePropName={field.kind === 'bool' ? 'checked' : 'value'}
              {...(isParent && field.nullable
                ? { getValueProps: (value: unknown) => ({ value: value === null ? 0 : value }) }
                : field.formControl === 'httpMethod'
                  ? {
                      getValueProps: (value: unknown) => ({
                        value: value === '' ? undefined : value
                      })
                    }
                  : {})}
              {...(isParent && field.nullable
                ? {
                    normalize: (value: unknown, previous: unknown) => {
                      // null 与 0 均显示为顶级；保留未改动的旧 0，移回顶级则使用 null。
                      return value === 0 && previous !== 0 ? null : value
                    }
                  }
                : {})}
              {...(isParent ? { required: true } : {})}
              extra={
                lockedApp
                  ? '存在子功能，请先调整子功能后再修改所属应用'
                  : editingId !== null &&
                      field.formControl === 'menuType' &&
                      field.initialValue(initialValues) === undefined
                    ? '原菜单类型无效，请重新选择'
                    : undefined
              }
              rules={[
                ...(isParent
                  ? [
                      { required: !field.nullable, message: '请选择上级或顶级' },
                      {
                        validator: (_rule: unknown, value: unknown): Promise<void> =>
                          value === 0 ||
                          (field.nullable && value === null) ||
                          candidates.some((option) => option.value === value)
                            ? Promise.resolve()
                            : Promise.reject(new Error('上级不合法，请重新选择'))
                      }
                    ]
                  : required
                    ? [
                        {
                          required: true,
                          message: `请${field.kind === 'icon' || field.formControl ? '选择' : '输入'}${field.label}`
                        }
                      ]
                    : []),
                ...(field.kind === 'number'
                  ? [
                      {
                        validator: (_rule: unknown, value: unknown): Promise<void> => {
                          const error = integerError(
                            value,
                            field.label,
                            field.numberKind,
                            isParent ? !field.nullable : Boolean(required)
                          )
                          return error ? Promise.reject(new Error(error)) : Promise.resolve()
                        }
                      }
                    ]
                  : [])
              ]}
            >
              {isParent ? (
                <TreeSelect
                  style={{ width: '100%' }}
                  showSearch={{ treeNodeFilterProp: 'searchText' }}
                  allowClear
                  treeDefaultExpandAll
                  treeDataSimpleMode={{ id: 'id', pId: 'pId', rootPId: -1 }}
                  treeData={options}
                  placeholder="请选择上级或顶级"
                />
              ) : lockedApp ? (
                <AppSelect active={active} disabled />
              ) : (
                renderControl(
                  field,
                  Boolean(editingId),
                  active,
                  saving,
                  field.initialValue(initialValues),
                  () => setManuallySelected((current) => new Set(current).add(field.name))
                )
              )}
            </Form.Item>
          )
        })}
    </Form>
  )
}

function renderControl<E, F>(
  field: FieldDef<E, F>,
  editing: boolean,
  active: boolean,
  saving: boolean,
  initialValue: unknown,
  onManualSelect: () => void
) {
  if (
    field.formControl === 'crudRole' ||
    field.formControl === 'dataRole' ||
    field.formControl === 'crudInfoId'
  )
    return <CrudRelationSelect kind={field.formControl} active={active} disabled={saving} />
  if (field.formControl === 'app') return <AppSelect active={active} disabled={saving} />
  if (field.formControl === 'user') return <UserSelect active={active} disabled={saving} />
  if (field.formControl === 'crudInfo') return <CrudInfoSelect active={active} disabled={saving} />
  if (field.formControl === 'menuType') {
    return (
      <Select
        options={crudMenuTypeOptions}
        showSearch={false}
        allowClear={false}
        placeholder="请选择菜单类型"
        disabled={!active || saving}
        // onSelect 也捕获用户再次选择当前默认项，不能仅依赖值变化事件。
        onSelect={onManualSelect}
      />
    )
  }
  if (field.formControl === 'httpMethod') {
    const options = HTTP_METHODS.map((method) => ({ value: method, label: method }))
    // 历史值只来自本次编辑的原记录，切换标准方法后仍可恢复，不转换大小写。
    if (
      editing &&
      typeof initialValue === 'string' &&
      initialValue &&
      !HTTP_METHODS.includes(initialValue)
    ) {
      options.push({ value: initialValue, label: `${initialValue}（历史值）` })
    }
    return <Select options={options} placeholder="请选择方法" disabled={!active || saving} />
  }
  if (field.formControl === 'tenant') return <TenantSelect active={active} disabled={saving} />
  if (field.formControl === 'department')
    return <DepartmentSelect active={active} disabled={saving} />
  if (field.kind === 'icon') return <IconPicker active={active} disabled={saving} />
  if (field.kind === 'bool') return <Switch />
  if (field.kind === 'number') return <IntegerInput style={{ width: '100%' }} controls={false} />
  if (field.kind === 'date') return <DatePicker showTime style={{ width: '100%' }} />
  if (field.kind === 'password') {
    return <Input.Password placeholder={editing ? '留空则不修改' : undefined} />
  }
  if (field.kind === 'textarea') return <Input.TextArea rows={3} />
  return <Input />
}
