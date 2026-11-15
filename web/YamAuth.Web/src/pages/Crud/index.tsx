import { useApp } from '@/store/AppContext'
import { permissionKey } from '@/auth/access'
import { Fragment, useState } from 'react'
import { useLocation, Navigate } from 'react-router-dom'
import { Result } from 'antd'
import { findResource } from '@/resources'

export default function CrudPage() {
  const { can } = useApp()
  const location = useLocation()
  const resource = findResource(location.pathname)
  const [size, setSize] = useState(20)
  if (
    [
      '/auth/crud-role-cruds',
      '/auth/crud-role-users',
      '/auth/data-roles',
      '/auth/data-role-users'
    ].includes(location.pathname)
  )
    return <Navigate to="/auth/crud-roles" replace />
  if (!resource) return <Result status="404" title="未找到页面" subTitle={location.pathname} />
  if (!can(permissionKey(resource.path, 'read')))
    return <Result status="403" title="没有访问该页面的权限" />
  // 资源切换时重建列表和表单，防止旧请求和编辑状态串页；分页大小仍跨资源保留。
  return <Fragment key={resource.path}>{resource.render({ size, onSizeChange: setSize })}</Fragment>
}
