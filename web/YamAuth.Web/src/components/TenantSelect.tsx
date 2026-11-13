import { tenantApi } from '@/api/entities'
import RemoteEntitySelect, { type EntitySelectProps } from './RemoteEntitySelect'
import { tenantLabel, type Tenant } from './tenant'

export default function TenantSelect(props: EntitySelectProps) {
  return (
    <RemoteEntitySelect<Tenant>
      {...props}
      api={tenantApi}
      entityName="租户"
      placeholder="请选择租户，可搜索名称或编码"
      getLabel={tenantLabel}
    />
  )
}
