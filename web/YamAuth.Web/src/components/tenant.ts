import type { TenantDto } from '@/types/auth'
export type Tenant = Pick<TenantDto, 'id' | 'tenantName' | 'tenantCode' | 'isActived'>

export function tenantLabel(tenant: Tenant) {
  const name = tenant.tenantName?.trim()
  const code = tenant.tenantCode?.trim()
  const label = name && code ? `${name}（${code}）` : name || code || `租户 #${tenant.id}`
  return tenant.isActived ? label : `${label} · 已停用`
}
