import type { MenuNode } from './auth'
import type { PagedQuery } from './api'

export type Identity = 'PlatformAdministrator' | 'TenantAdministrator' | 'Member'
export type ScopeType = 'Self' | 'Department' | 'CustomDepartments' | 'TenantAll'
export interface Me {
  id: number
  userName: string
  nickName: string
  avatar: string
  phone: string
  email: string
  identity: Identity
  mustChangePassword: boolean
  accountTenantId: number | null
  tenantId: number | null
  tenantName: string | null
  contextId: string | null
}
export interface EffectivePermission {
  code: string
  self: boolean
  tenantAll: boolean
  departmentIds: number[]
}
export interface Access {
  me: Me
  appsId: number
  authorizationVersion: number
  catalogVersion: number
  permissions: EffectivePermission[]
  menus: MenuNode[]
}
export interface RelationLabels {
  tenant: string | null
  department: string | null
  user: string | null
  app: string | null
  crudRole: string | null
  dataRole: string | null
  crudInfo: string | null
  ownerUser: string | null
  ownerDepartment: string | null
}
export interface PermissionOption {
  code: string
  name: string
  resource: string
  supportedScopes: ScopeType[]
}
export interface RoleGrant {
  permission: string
  scopeType: ScopeType
  departmentIds: number[]
}
export interface Candidate {
  id: number
  label: string
}
export type CandidateKind =
  'user' | 'department' | 'app' | 'crudRole' | 'dataRole' | 'crudInfo' | 'employee' | 'tenant'
export interface CandidatePurpose {
  purpose: string
  kind: CandidateKind
  targetId?: number
  appsId?: number
}
export interface CandidateQuery extends PagedQuery, CandidatePurpose {
  ids?: number[]
}
export interface TenantContext {
  id: string
  tenantId: number
  expiresAt: string
}
export interface AuditEvent {
  id: string
  userId: number | null
  tenantId: number | null
  action: string
  targetType: string
  targetId: string | null
  result: string
  createdAt: string
  traceId: string
  summary: string
}
export interface ResetPassword {
  password: string
}
export interface UserStatus {
  isActived: boolean
}
export interface EmployeeAssignment {
  userId: number | null
  departmentId: number | null
}
export interface OwnershipTransfer {
  ownerUserId: number | null
  ownerDepartmentId: number | null
}
