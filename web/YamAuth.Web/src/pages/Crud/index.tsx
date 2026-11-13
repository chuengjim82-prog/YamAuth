import { Fragment, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Result } from 'antd'
import { findResource } from '@/resources'

export default function CrudPage() {
  const location = useLocation()
  const resource = findResource(location.pathname)
  const [size, setSize] = useState(20)
  if (!resource) return <Result status="404" title="未找到页面" subTitle={location.pathname} />
  // 资源切换时重建列表和表单，防止旧请求和编辑状态串页；分页大小仍跨资源保留。
  return <Fragment key={resource.path}>{resource.render({ size, onSizeChange: setSize })}</Fragment>
}
