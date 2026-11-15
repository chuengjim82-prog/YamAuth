import { useEffect, useState } from 'react'
import { Button, Form, Input, Modal, Popconfirm, Result, Space, Table, message } from 'antd'
import {
  fetchAdministrators,
  createAdministrator,
  updateAdministrator,
  deleteAdministrator,
  appointAdministrator,
  resetUserPassword,
  setUserStatus
} from '@/api/access'
import type { PagedResult } from '@/types/api'
import type { UserDto, UserCreateDto, UserUpdateDto } from '@/types/auth'
import { useApp } from '@/store/AppContext'
import styles from './Account.module.css'

type EditValues = UserCreateDto
export default function AdministratorsPage() {
  const { access } = useApp()
  if (access.me?.identity !== 'PlatformAdministrator')
    return <Result status="403" title="仅平台管理员可以维护管理员" />
  return <AdministratorList />
}
function AdministratorList() {
  const { access, isCurrentSession, refreshAccess } = useApp()
  const [query, setQuery] = useState({ page: 1, size: 20, keyword: '' })
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<{
    data: PagedResult<UserDto>
    query: typeof query
    reload: number
  }>()
  const [failed, setFailed] = useState(false)
  const [editing, setEditing] = useState<UserDto | 'new' | null>(null)
  const [resetting, setResetting] = useState<UserDto | null>(null)
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<EditValues>()
  useEffect(() => {
    let current = true
    void fetchAdministrators(query)
      .then((data) => {
        if (current && isCurrentSession()) {
          setResult({ data, query, reload })
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
  async function mutate(action: () => Promise<unknown>, refresh = false) {
    if (saving || !isCurrentSession()) return
    setSaving(true)
    try {
      await action()
      if (!isCurrentSession()) return
      message.success('操作成功')
      setEditing(null)
      setResetting(null)
      setPassword('')
      setReload((value) => value + 1)
      if (refresh) refreshAccess()
    } catch {
      /* 请求错误由拦截器提示。 */
    } finally {
      setSaving(false)
    }
  }
  async function save() {
    if (editing == null) return
    let values: EditValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    if (editing === 'new') await mutate(() => createAdministrator(values))
    else {
      const dto: UserUpdateDto = {
        userName: values.userName,
        nickName: values.nickName,
        avatar: values.avatar,
        phone: values.phone,
        remark: values.remark
      }
      await mutate(() => updateAdministrator(editing.id, dto))
    }
  }
  function edit(row: UserDto | 'new') {
    form.resetFields()
    form.setFieldsValue(
      row === 'new'
        ? {
            userName: '',
            nickName: '',
            avatar: '',
            phone: '',
            email: '',
            password: '',
            remark: null
          }
        : row
    )
    setEditing(row)
  }
  const tenant = access.me?.tenantId != null
  return (
    <section className={styles.page}>
      <h2>{tenant ? '当前租户管理员' : '平台管理员'}</h2>
      <Space>
        <Input.Search
          placeholder="搜索账号或昵称"
          onSearch={(keyword) => {
            setFailed(false)
            setQuery({ ...query, page: 1, keyword })
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
        {!tenant && (
          <Button type="primary" onClick={() => edit('new')}>
            新增平台管理员
          </Button>
        )}
      </Space>
      {tenant && <p>可在用户页面的“更多”操作中任命租户管理员。</p>}
      {failed ? (
        <Result status="error" title="管理员加载失败，请重试" />
      ) : (
        <Table<UserDto>
          rowKey="id"
          loading={result?.query !== query || result?.reload !== reload}
          dataSource={result?.data.items ?? []}
          columns={[
            { title: '编号', dataIndex: 'id' },
            { title: '账号', dataIndex: 'userName' },
            { title: '昵称', dataIndex: 'nickName' },
            { title: '状态', render: (_value: unknown, row) => (row.isActived ? '启用' : '停用') },
            {
              title: '操作',
              render: (_value: unknown, row) => (
                <Space wrap>
                  <Button size="small" disabled={saving} onClick={() => edit(row)}>
                    编辑
                  </Button>
                  {row.id !== access.me?.id && (
                    <Button
                      size="small"
                      disabled={saving}
                      onClick={() => {
                        setPassword('')
                        setResetting(row)
                      }}
                    >
                      重置密码
                    </Button>
                  )}
                  <Popconfirm
                    title={`确认${row.isActived ? '停用' : '启用'}此管理员？`}
                    onConfirm={() =>
                      void mutate(
                        () => setUserStatus(row.id, { isActived: !row.isActived }, true),
                        true
                      )
                    }
                  >
                    <Button size="small" disabled={saving}>
                      {row.isActived ? '停用' : '启用'}
                    </Button>
                  </Popconfirm>
                  {tenant && (
                    <Popconfirm
                      title="确认撤销此账号的租户管理员身份？"
                      onConfirm={() => void mutate(() => appointAdministrator(row.id, false), true)}
                    >
                      <Button size="small" disabled={saving}>
                        撤销管理员
                      </Button>
                    </Popconfirm>
                  )}
                  <Popconfirm
                    title="确认删除此管理员账号？"
                    onConfirm={() => void mutate(() => deleteAdministrator(row.id), true)}
                  >
                    <Button danger size="small" disabled={saving}>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              )
            }
          ]}
          pagination={{
            current: query.page,
            pageSize: query.size,
            total: result?.data.total ?? 0,
            onChange: (page, size) => setQuery({ ...query, page, size })
          }}
        />
      )}
      <Modal
        open={editing != null}
        title={editing === 'new' ? '新增平台管理员' : '编辑管理员资料'}
        onCancel={() => {
          if (!saving) setEditing(null)
        }}
        onOk={() => void save()}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical" disabled={saving}>
          <Form.Item name="userName" label="账号" rules={[{ required: true, max: 64 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="nickName" label="昵称" rules={[{ required: true, max: 64 }]}>
            <Input />
          </Form.Item>
          {editing === 'new' && (
            <>
              <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email' }]}>
                <Input />
              </Form.Item>
              <Form.Item
                name="password"
                label="临时密码"
                rules={[{ required: true, min: 6, max: 128 }]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>
            </>
          )}
          <Form.Item name="avatar" label="头像地址">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="手机号">
            <Input />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        open={resetting != null}
        title="重置管理员密码"
        onCancel={() => {
          if (!saving) setResetting(null)
        }}
        onOk={() => void mutate(() => resetUserPassword(resetting?.id ?? 0, { password }, true))}
        confirmLoading={saving}
        okButtonProps={{ disabled: password.length < 6 || password.length > 128 }}
      >
        <p>重置后全部会话失效，下次登录必须修改密码。</p>
        <Input.Password
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
        />
      </Modal>
    </section>
  )
}
