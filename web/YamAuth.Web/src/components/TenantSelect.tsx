import RemoteEntitySelect, { type EntitySelectProps } from './RemoteEntitySelect'

interface Tenant {
  id: number
  tenantName?: string | null
  tenantCode?: string | null
  isActived: boolean
}

function tenantLabel(tenant: Tenant) {
  const name = tenant.tenantName?.trim()
  const code = tenant.tenantCode?.trim()
  const label = name && code ? `${name}（${code}）` : name || code || `租户 #${tenant.id}`
  return tenant.isActived ? label : `${label} · 已停用`
}

export default function TenantSelect(props: EntitySelectProps) {
  return <RemoteEntitySelect<Tenant>
    {...props}
    apiPath="/v1/auth/tenants"
    entityName="租户"
    placeholder="请选择租户，可搜索名称或编码"
    getLabel={tenantLabel}
  />
}
