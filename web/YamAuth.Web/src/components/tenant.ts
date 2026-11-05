export interface Tenant {
  id: number
  tenantName?: string | null
  tenantCode?: string | null
  isActived: boolean
}

export function tenantLabel(tenant: Tenant) {
  const name = tenant.tenantName?.trim()
  const code = tenant.tenantCode?.trim()
  const label = name && code ? `${name}（${code}）` : name || code || `租户 #${tenant.id}`
  return tenant.isActived ? label : `${label} · 已停用`
}
