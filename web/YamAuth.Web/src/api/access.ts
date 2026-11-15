import type { UserDto, UserCreateDto, UserUpdateDto } from '@/types/auth'
import type {
  ResetPassword,
  UserStatus,
  EmployeeAssignment,
  OwnershipTransfer
} from '@/types/access'
import { apiDelete, apiGet, apiPost, apiPut, invalidApiResponse } from './request'
import { isMenuTree } from './auth'
import type {
  Access,
  Me,
  Candidate,
  CandidateQuery,
  CandidatePurpose,
  RoleGrant,
  PermissionOption,
  TenantContext,
  AuditEvent
} from '@/types/access'
import type { PagedQuery, PagedResult } from '@/types/api'
import type { EntityReader } from './crud'

function isMe(value: unknown): value is Me {
  return (
    !!value &&
    typeof value === 'object' &&
    'id' in value &&
    typeof value.id === 'number' &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    'userName' in value &&
    typeof value.userName === 'string' &&
    'nickName' in value &&
    typeof value.nickName === 'string' &&
    'avatar' in value &&
    typeof value.avatar === 'string' &&
    'phone' in value &&
    typeof value.phone === 'string' &&
    'email' in value &&
    typeof value.email === 'string' &&
    'identity' in value &&
    ['PlatformAdministrator', 'TenantAdministrator', 'Member'].some(
      (identity) => identity === value.identity
    ) &&
    'mustChangePassword' in value &&
    typeof value.mustChangePassword === 'boolean' &&
    'tenantId' in value &&
    (value.tenantId === null || typeof value.tenantId === 'number') &&
    'accountTenantId' in value &&
    (value.accountTenantId === null || typeof value.accountTenantId === 'number') &&
    'tenantName' in value &&
    (value.tenantName === null || typeof value.tenantName === 'string') &&
    'contextId' in value &&
    (value.contextId === null || typeof value.contextId === 'string')
  )
}
export async function fetchMe() {
  const data = await apiGet<unknown>('/v1/auth/me')
  if (!isMe(data)) return invalidApiResponse()
  return data
}
export async function fetchAccess(): Promise<Access> {
  const data = await apiGet<Access>('/v1/auth/access')
  if (
    !data ||
    !isMe(data.me) ||
    !isMenuTree(data.menus) ||
    !Number.isSafeInteger(data.appsId) ||
    !Number.isSafeInteger(data.authorizationVersion) ||
    !Number.isSafeInteger(data.catalogVersion) ||
    !Array.isArray(data.permissions) ||
    !data.permissions.every(
      (entry) =>
        entry &&
        typeof entry.code === 'string' &&
        typeof entry.self === 'boolean' &&
        typeof entry.tenantAll === 'boolean' &&
        Array.isArray(entry.departmentIds) &&
        entry.departmentIds.every((id) => Number.isSafeInteger(id) && id > 0)
    )
  )
    return invalidApiResponse()
  return data
}
export const updateProfile = (data: Pick<Me, 'nickName' | 'avatar' | 'phone'>) =>
  apiPut<null, typeof data>('/v1/auth/me/profile', data)
export const changeEmail = (data: { email: string; password: string }) =>
  apiPut<null, typeof data>('/v1/auth/me/email', data)
export const changePassword = (data: { oldPassword: string; newPassword: string }) =>
  apiPost<null, typeof data>('/v1/auth/change-password', data)
export const revokeSession = () => apiPost<null, object>('/v1/auth/logout', {})
export const enterTenant = (tenantId: number) =>
  apiPost<TenantContext, { tenantId: number }>('/v1/auth/tenant-contexts', { tenantId })
export const exitTenant = (id: string) => apiDelete<null>(`/v1/auth/tenant-contexts/${id}`)
export const fetchCatalog = (appsId: number) =>
  apiGet<PermissionOption[], { appsId: number }>('/v1/auth/permission-catalog', { appsId })
export const fetchRoleGrants = (id: number) =>
  apiGet<RoleGrant[]>(`/v1/auth/crud-roles/${id}/permissions`)
export const saveRoleGrants = (id: number, grants: RoleGrant[]) =>
  apiPut<null, { grants: RoleGrant[] }>(`/v1/auth/crud-roles/${id}/permissions`, { grants })
export const fetchUserRoles = (id: number, appsId: number) =>
  apiGet<number[], { appsId: number }>(`/v1/auth/users/${id}/roles`, { appsId })
export const saveUserRoles = (id: number, appsId: number, roleIds: number[]) =>
  apiPut<null, { appsId: number; roleIds: number[] }>(`/v1/auth/users/${id}/roles`, {
    appsId,
    roleIds
  })
export const fetchAudit = (query: PagedQuery) =>
  apiGet<PagedResult<AuditEvent>, PagedQuery>('/v1/auth/audit', query)

export function candidateApi(purpose: CandidatePurpose): EntityReader<Candidate> {
  async function page(query: PagedQuery & { ids?: number[] }) {
    const data = await apiGet<PagedResult<Candidate>, CandidateQuery>('/v1/auth/candidates', {
      ...query,
      ...purpose
    })
    if (
      !data ||
      !Number.isSafeInteger(data.total) ||
      !Array.isArray(data.items) ||
      !data.items.every(
        (row) => row && Number.isSafeInteger(row.id) && row.id > 0 && typeof row.label === 'string'
      )
    )
      return invalidApiResponse()
    return data
  }
  return {
    page,
    detail: async (id) => (await page({ page: 1, size: 1, ids: [id] })).items[0] ?? null
  }
}

export const fetchAdministrators = (query: PagedQuery) =>
  apiGet<PagedResult<UserDto>, PagedQuery>('/v1/auth/administrators', query)
export const createAdministrator = (data: UserCreateDto) =>
  apiPost<number, UserCreateDto>('/v1/auth/administrators', data)
export const updateAdministrator = (id: number, data: UserUpdateDto) =>
  apiPut<null, UserUpdateDto>(`/v1/auth/administrators/${id}`, data)
export const deleteAdministrator = (id: number) => apiDelete<null>(`/v1/auth/administrators/${id}`)
export const appointAdministrator = (id: number, isAdministrator: boolean) =>
  apiPut<null, { isAdministrator: boolean }>(`/v1/auth/users/${id}/tenant-administrator`, {
    isAdministrator
  })
export const resetUserPassword = (id: number, data: ResetPassword, administrator = false) =>
  apiPost<null, ResetPassword>(
    `/v1/auth/${administrator ? 'administrators' : 'users'}/${id}/reset-password`,
    data
  )
export const setUserStatus = (id: number, data: UserStatus, administrator = false) =>
  apiPut<null, UserStatus>(
    `/v1/auth/${administrator ? 'administrators' : 'users'}/${id}/status`,
    data
  )
export const assignEmployee = (id: number, data: EmployeeAssignment) =>
  apiPut<null, EmployeeAssignment>(`/v1/unit/employees/${id}/assignment`, data)
export const transferOwnership = (
  resource: 'companies' | 'projects',
  id: number,
  data: OwnershipTransfer,
  rowVersion: string | undefined
) => apiPut<null, OwnershipTransfer>(`/v1/bzss/${resource}/${id}/ownership`, data, rowVersion)
