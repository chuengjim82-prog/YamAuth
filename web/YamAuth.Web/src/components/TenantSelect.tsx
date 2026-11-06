import RemoteEntitySelect, { type EntitySelectProps } from './RemoteEntitySelect'
import { tenantLabel, type Tenant } from './tenant'

export default function TenantSelect(props: EntitySelectProps) {
  return (
    <RemoteEntitySelect<Tenant>
      {...props}
      apiPath="/v1/auth/tenants"
      entityName="租户"
      placeholder="请选择租户，可搜索名称或编码"
      getLabel={tenantLabel}
    />
  )
}
