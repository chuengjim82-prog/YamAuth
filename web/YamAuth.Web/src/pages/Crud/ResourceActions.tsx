import { useEffect, useState } from 'react'
import {
  Button,
  Checkbox,
  Dropdown,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  message
} from 'antd'
import {
  resetUserPassword,
  setUserStatus,
  assignEmployee,
  transferOwnership,
  appointAdministrator
} from '@/api/access'
import {
  fetchCatalog,
  fetchRoleGrants,
  fetchUserRoles,
  saveRoleGrants,
  saveUserRoles
} from '@/api/access'
import { useApp } from '@/store/AppContext'
import RelationCandidateSelect from '@/components/RelationCandidateSelect'
import type { Entity } from '@/resources/types'
import type { PermissionOption, RoleGrant, ScopeType } from '@/types/access'
import styles from '@/pages/Account/Account.module.css'

interface ActionRow extends Entity {
  appsId?: number | null
  isActived?: boolean
  userId?: number | null
  departmentId?: number | null
  ownerUserId?: number | null
  ownerDepartmentId?: number | null
  roleKind?: string
}
type Action = 'reset' | 'status' | 'grants' | 'roles' | 'assignment' | 'ownership' | 'appoint'
interface Values {
  password: string
  isActived: boolean
  userId: number | null
  departmentId: number | null
  ownerUserId: number | null
  ownerDepartmentId: number | null
  isAdministrator: boolean
}
const titles: Record<Action, string> = {
  reset: '重置密码',
  status: '启用或停用',
  grants: '配置操作权限',
  roles: '分配业务角色',
  assignment: '维护组织关系',
  ownership: '转移归属',
  appoint: '任命租户管理员'
}

export default function ResourceActions({
  path,
  row,
  disabled,
  onChanged
}: {
  path: string
  row: ActionRow
  disabled: boolean
  onChanged: () => void
}) {
  const { access } = useApp()
  const [action, setAction] = useState<Action | null>(null)
  const manager = access.me?.identity !== 'Member' && access.me?.tenantId != null
  const actions: Action[] = []
  if (path === '/auth/users') {
    if (row.id !== access.me?.id && row.allowedActions?.includes('reset_password'))
      actions.push('reset')
    if (row.allowedActions?.includes('disable')) actions.push('status')
    if (manager && row.allowedActions?.includes('update')) actions.push('roles')
    if (access.me?.identity === 'PlatformAdministrator' && access.me.tenantId != null)
      actions.push('appoint')
  }
  if (path === '/auth/crud-roles' && manager && row.roleKind === 'Business') actions.push('grants')
  if (path === '/unit/employees' && row.allowedActions?.includes('assignment'))
    actions.push('assignment')
  if (row.allowedActions?.includes('transfer')) actions.push('ownership')
  if (actions.length === 0) return null
  return (
    <>
      <Dropdown
        menu={{
          items: actions.map((key) => ({ key, label: titles[key], onClick: () => setAction(key) }))
        }}
        disabled={disabled}
        trigger={['click']}
      >
        <Button type="text" size="small">
          更多
        </Button>
      </Dropdown>
      {action && (
        <ActionDialog
          key={action}
          action={action}
          path={path}
          row={row}
          onClose={() => setAction(null)}
          onChanged={onChanged}
        />
      )}
    </>
  )
}
function ActionDialog({
  action,
  path,
  row,
  onClose,
  onChanged
}: {
  action: Action
  path: string
  row: ActionRow
  onClose: () => void
  onChanged: () => void
}) {
  const { access, isCurrentSession, refreshAccess } = useApp()
  const [form] = Form.useForm<Values>()
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(action !== 'grants' && action !== 'roles')
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const [appId, setAppId] = useState<number | null>(row.appsId ?? access.data?.appsId ?? null)
  const [catalog, setCatalog] = useState<PermissionOption[]>([])
  const [grants, setGrants] = useState<RoleGrant[]>([])
  const [roleIds, setRoleIds] = useState<number[]>([])
  useEffect(() => {
    let current = true
    if (action === 'grants' && appId != null) {
      void Promise.all([fetchCatalog(appId), fetchRoleGrants(row.id)])
        .then(([options, values]) => {
          if (current && isCurrentSession()) {
            setCatalog(options)
            setGrants(values)
            setLoaded(true)
          }
        })
        .catch(() => {
          if (current) setFailed(true)
        })
    } else if (action === 'roles' && appId != null) {
      void fetchUserRoles(row.id, appId)
        .then((values) => {
          if (current && isCurrentSession()) {
            setRoleIds(values)
            setLoaded(true)
          }
        })
        .catch(() => {
          if (current) setFailed(true)
        })
    }
    return () => {
      current = false
    }
  }, [action, appId, row.id, isCurrentSession, retry])
  async function save() {
    if (saving || !loaded || !isCurrentSession()) return
    setSaving(true)
    try {
      if (action === 'grants') {
        if (
          grants.some(
            (grant) =>
              !grant.permission ||
              (grant.scopeType === 'CustomDepartments' && grant.departmentIds.length === 0)
          )
        ) {
          message.error('请完整选择操作权限和数据范围')
          return
        }
        await saveRoleGrants(row.id, grants)
      } else if (action === 'roles') {
        if (appId == null) return
        await saveUserRoles(row.id, appId, roleIds)
      } else {
        const values = await form.validateFields()
        if (action === 'reset') await resetUserPassword(row.id, { password: values.password })
        if (action === 'status') await setUserStatus(row.id, { isActived: values.isActived })
        if (action === 'assignment')
          await assignEmployee(row.id, {
            userId: values.userId ?? null,
            departmentId: values.departmentId ?? null
          })
        if (action === 'ownership')
          await transferOwnership(
            path === '/bzss/companies' ? 'companies' : 'projects',
            row.id,
            {
              ownerUserId: values.ownerUserId ?? null,
              ownerDepartmentId: values.ownerDepartmentId ?? null
            },
            row.rowVersion
          )
        if (action === 'appoint') await appointAdministrator(row.id, true)
      }
      if (!isCurrentSession()) return
      message.success('保存成功')
      onChanged()
      onClose()
      if (
        action === 'grants' ||
        action === 'roles' ||
        action === 'assignment' ||
        action === 'appoint'
      )
        refreshAccess()
    } catch {
      /* 表单和请求错误保留弹窗。 */
    } finally {
      setSaving(false)
    }
  }
  const scopeNames: Record<ScopeType, string> = {
    Self: '本人',
    Department: '本部门',
    CustomDepartments: '指定部门',
    TenantAll: '全租户'
  }
  const purpose =
    path.slice(1).replaceAll('/', '.') + (action === 'ownership' ? '.transfer' : '.assignment')
  return (
    <Modal
      open
      title={titles[action]}
      width={action === 'grants' ? 820 : 540}
      onCancel={() => {
        if (!saving) onClose()
      }}
      onOk={() => void save()}
      confirmLoading={saving}
      okButtonProps={{ disabled: !loaded || failed }}
      cancelButtonProps={{ disabled: saving }}
    >
      {failed ? (
        <Button
          onClick={() => {
            setFailed(false)
            setRetry((value) => value + 1)
          }}
        >
          加载失败，点击重试
        </Button>
      ) : !loaded ? (
        <Spin />
      ) : null}
      {action === 'grants' && loaded && (
        <>
          {grants.map((grant, index) => (
            <div key={index} className={styles.grant}>
              <Space wrap>
                <Select
                  style={{ width: 260 }}
                  value={grant.permission || null}
                  placeholder="选择操作权限"
                  showSearch={{ optionFilterProp: 'label' }}
                  disabled={saving}
                  options={catalog
                    .filter(
                      (option) =>
                        option.code === grant.permission ||
                        !grants.some((item) => item.permission === option.code)
                    )
                    .map((option) => ({ value: option.code, label: option.name }))}
                  onChange={(permission: string) =>
                    setGrants((items) =>
                      items.map((item, i) =>
                        i === index
                          ? {
                              permission,
                              scopeType:
                                catalog.find((option) => option.code === permission)
                                  ?.supportedScopes[0] ?? 'Self',
                              departmentIds: []
                            }
                          : item
                      )
                    )
                  }
                />
                <Select
                  style={{ width: 140 }}
                  value={grant.scopeType}
                  disabled={saving}
                  options={(
                    catalog.find((option) => option.code === grant.permission)?.supportedScopes ??
                    []
                  ).map((scope) => ({ value: scope, label: scopeNames[scope] }))}
                  onChange={(scopeType: ScopeType) =>
                    setGrants((items) =>
                      items.map((item, i) =>
                        i === index ? { ...item, scopeType, departmentIds: [] } : item
                      )
                    )
                  }
                />
                <Button
                  danger
                  disabled={saving}
                  onClick={() => setGrants((items) => items.filter((_item, i) => i !== index))}
                >
                  移除
                </Button>
              </Space>
              {grant.scopeType === 'CustomDepartments' && (
                <IdSet
                  kind="department"
                  purpose="roles.configure"
                  ids={grant.departmentIds}
                  disabled={saving}
                  onChange={(departmentIds) =>
                    setGrants((items) =>
                      items.map((item, i) => (i === index ? { ...item, departmentIds } : item))
                    )
                  }
                />
              )}
            </div>
          ))}
          <Button
            disabled={saving || grants.length >= catalog.length}
            onClick={() =>
              setGrants((items) => [
                ...items,
                { permission: '', scopeType: 'Self', departmentIds: [] }
              ])
            }
          >
            添加操作权限
          </Button>
          <p>同一操作的多个角色范围取并集。保存空列表将撤销该角色全部操作授权。</p>
        </>
      )}
      {action === 'roles' && (
        <>
          <RelationCandidateSelect
            kind="app"
            purpose="users.roles"
            value={appId}
            disabled={saving}
            onChange={(id) => {
              setLoaded(false)
              setFailed(false)
              setRoleIds([])
              setAppId(id)
            }}
          />
          {loaded && appId != null && (
            <IdSet
              kind="crudRole"
              purpose="users.roles"
              appsId={appId}
              ids={roleIds}
              disabled={saving}
              onChange={setRoleIds}
            />
          )}
          <p>保存后替换该应用的业务角色；空列表撤销全部业务角色。</p>
        </>
      )}
      {action !== 'roles' && action !== 'grants' && (
        <Form
          form={form}
          layout="vertical"
          initialValues={{ ...row, isActived: !row.isActived }}
          disabled={saving}
        >
          {action === 'reset' && (
            <>
              <p>保存后该账号全部会话失效，下次登录必须修改密码。</p>
              <Form.Item
                name="password"
                label="临时密码"
                rules={[{ required: true, min: 6, max: 128 }]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>
            </>
          )}
          {action === 'status' && (
            <Form.Item name="isActived" valuePropName="checked">
              <Checkbox>启用账号</Checkbox>
            </Form.Item>
          )}
          {action === 'assignment' && (
            <>
              <Form.Item name="userId" label="关联用户">
                <RelationCandidateSelect kind="user" purpose={purpose} targetId={row.id} />
              </Form.Item>
              <Form.Item name="departmentId" label="所属部门">
                <RelationCandidateSelect kind="department" purpose={purpose} targetId={row.id} />
              </Form.Item>
            </>
          )}
          {action === 'ownership' && (
            <>
              <p>新归属必须处于本次转移权限的数据范围内。</p>
              <Form.Item name="ownerUserId" label="归属用户">
                <RelationCandidateSelect kind="user" purpose={purpose} targetId={row.id} />
              </Form.Item>
              <Form.Item name="ownerDepartmentId" label="归属部门">
                <RelationCandidateSelect kind="department" purpose={purpose} targetId={row.id} />
              </Form.Item>
            </>
          )}
          {action === 'appoint' && (
            <p>将此账号任命为当前租户的管理员，可管理本租户业务和普通账号授权。</p>
          )}
        </Form>
      )}
    </Modal>
  )
}
function IdSet({
  ids,
  onChange,
  kind,
  purpose,
  appsId,
  disabled
}: {
  ids: number[]
  onChange: (ids: number[]) => void
  kind: 'department' | 'crudRole'
  purpose: string
  appsId?: number
  disabled: boolean
}) {
  return (
    <Space wrap style={{ marginTop: 12 }}>
      <RelationCandidateSelect
        kind={kind}
        purpose={purpose}
        {...(appsId === undefined ? {} : { appsId })}
        value={null}
        disabled={disabled}
        onChange={(id) => {
          if (id != null && !ids.includes(id)) onChange([...ids, id])
        }}
      />
      {ids.map((id) => (
        <Tag
          key={id}
          closable={!disabled}
          onClose={() => onChange(ids.filter((item) => item !== id))}
        >
          {kind === 'department' ? '部门' : '角色'} #{id}
        </Tag>
      ))}
    </Space>
  )
}
