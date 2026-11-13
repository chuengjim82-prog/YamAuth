import { requiredNumber } from '../formValues'
import type {
  UserDto,
  UserCreateDto,
  UserUpdateDto,
  TenantDto,
  TenantCreateDto,
  TenantUpdateDto,
  AppsInfoDto,
  AppsInfoCreateDto,
  AppsInfoUpdateDto,
  AppsUserDto,
  AppsUserCreateDto,
  AppsUserUpdateDto,
  CrudInfoDto,
  CrudInfoCreateDto,
  CrudInfoUpdateDto,
  CrudItemDto,
  CrudItemCreateDto,
  CrudItemUpdateDto,
  CrudMenuDto,
  CrudMenuCreateDto,
  CrudMenuUpdateDto,
  CrudRoleDto,
  CrudRoleCreateDto,
  CrudRoleUpdateDto,
  CrudRoleCrudDto,
  CrudRoleCrudCreateDto,
  CrudRoleCrudUpdateDto,
  CrudRoleUserDto,
  CrudRoleUserCreateDto,
  CrudRoleUserUpdateDto,
  DataRoleDto,
  DataRoleCreateDto,
  DataRoleUpdateDto,
  DataRoleUserDto,
  DataRoleUserCreateDto,
  DataRoleUserUpdateDto
} from '@/types/auth'

/** Auth 编辑状态与传输 DTO 分离，数字字段允许暂时清空。 */
export interface UserForm {
  tenantId: number | null
  userName: string
  nickName: string
  password: string
  avatar: string
  phone: string
  email: string
  isAdmin: boolean
  isActived: boolean
  remark: string
}

export function userToForm(row?: UserDto): UserForm {
  return {
    tenantId: row?.tenantId ?? null,
    userName: row?.userName ?? '',
    nickName: row?.nickName ?? '',
    password: '',
    avatar: row?.avatar ?? '',
    phone: row?.phone ?? '',
    email: row?.email ?? '',
    isAdmin: row?.isAdmin ?? false,
    isActived: row?.isActived ?? false,
    remark: row?.remark ?? ''
  }
}

export function userToCreate(values: UserForm): UserCreateDto {
  return {
    tenantId: values.tenantId ?? null,
    userName: values.userName,
    nickName: values.nickName,
    password: values.password,
    avatar: values.avatar,
    phone: values.phone,
    email: values.email,
    isAdmin: values.isAdmin,
    isActived: values.isActived,
    remark: values.remark
  }
}

export function userToUpdate(values: UserForm): UserUpdateDto {
  return {
    tenantId: values.tenantId ?? null,
    userName: values.userName,
    nickName: values.nickName,
    ...(values.password ? { password: values.password } : {}),
    avatar: values.avatar,
    phone: values.phone,
    email: values.email,
    isAdmin: values.isAdmin,
    isActived: values.isActived,
    remark: values.remark
  }
}

export interface TenantForm {
  tenantCode: string
  tenantName: string
  isActived: boolean
  remark: string
}

export function tenantToForm(row?: TenantDto): TenantForm {
  return {
    tenantCode: row?.tenantCode ?? '',
    tenantName: row?.tenantName ?? '',
    isActived: row?.isActived ?? false,
    remark: row?.remark ?? ''
  }
}

export function tenantToCreate(values: TenantForm): TenantCreateDto {
  return {
    tenantCode: values.tenantCode,
    tenantName: values.tenantName,
    isActived: values.isActived,
    remark: values.remark
  }
}

export function tenantToUpdate(values: TenantForm): TenantUpdateDto {
  return {
    tenantCode: values.tenantCode,
    tenantName: values.tenantName,
    isActived: values.isActived,
    remark: values.remark
  }
}

export interface AppsInfoForm {
  tenantId: number | null
  parentId: number | null | undefined
  appsCode: string
  appsName: string
  appKey: string
  appSecret: string
  remark: string
}

export function appsInfoToForm(row?: AppsInfoDto): AppsInfoForm {
  return {
    tenantId: row?.tenantId ?? null,
    parentId: row?.parentId ?? null,
    appsCode: row?.appsCode ?? '',
    appsName: row?.appsName ?? '',
    appKey: row?.appKey ?? '',
    appSecret: row?.appSecret ?? '',
    remark: row?.remark ?? ''
  }
}

export function appsInfoToCreate(values: AppsInfoForm): AppsInfoCreateDto {
  return {
    tenantId: values.tenantId ?? null,
    parentId: values.parentId ?? null,
    appsCode: values.appsCode,
    appsName: values.appsName,
    appKey: values.appKey,
    appSecret: values.appSecret,
    remark: values.remark
  }
}

export function appsInfoToUpdate(values: AppsInfoForm): AppsInfoUpdateDto {
  return {
    tenantId: values.tenantId ?? null,
    parentId: values.parentId ?? null,
    appsCode: values.appsCode,
    appsName: values.appsName,
    appKey: values.appKey,
    appSecret: values.appSecret,
    remark: values.remark
  }
}

export interface AppsUserForm {
  tenantId: number | null
  appsId: number | null
  userId: number | null
  isAdmin: boolean
  remark: string
}

export function appsUserToForm(row?: AppsUserDto): AppsUserForm {
  return {
    tenantId: row?.tenantId ?? null,
    appsId: row?.appsId ?? null,
    userId: row?.userId ?? null,
    isAdmin: row?.isAdmin ?? false,
    remark: row?.remark ?? ''
  }
}

export function appsUserToCreate(values: AppsUserForm): AppsUserCreateDto {
  return {
    tenantId: values.tenantId ?? null,
    appsId: values.appsId ?? null,
    userId: values.userId ?? null,
    isAdmin: values.isAdmin,
    remark: values.remark
  }
}

export function appsUserToUpdate(values: AppsUserForm): AppsUserUpdateDto {
  return {
    tenantId: values.tenantId ?? null,
    appsId: values.appsId ?? null,
    userId: values.userId ?? null,
    isAdmin: values.isAdmin,
    remark: values.remark
  }
}

export interface CrudInfoForm {
  appsId: number | null
  parentId: number | null | undefined
  crudName: string
  crudCode: string
  crudType: number | null
  sortIndex: number | null
  remark: string
}

export function crudInfoToForm(row?: CrudInfoDto): CrudInfoForm {
  return {
    appsId: row?.appsId ?? null,
    parentId: row?.parentId ?? 0,
    crudName: row?.crudName ?? '',
    crudCode: row?.crudCode ?? '',
    crudType: row?.crudType ?? 0,
    sortIndex: row?.sortIndex ?? 0,
    remark: row?.remark ?? ''
  }
}

export function crudInfoToCreate(values: CrudInfoForm): CrudInfoCreateDto {
  return {
    appsId: values.appsId ?? null,
    parentId: requiredNumber(values.parentId, '上级'),
    crudName: values.crudName,
    crudCode: values.crudCode,
    crudType: requiredNumber(values.crudType, '功能类型'),
    sortIndex: requiredNumber(values.sortIndex, '排序'),
    remark: values.remark
  }
}

export function crudInfoToUpdate(values: CrudInfoForm): CrudInfoUpdateDto {
  return {
    appsId: values.appsId ?? null,
    parentId: requiredNumber(values.parentId, '上级'),
    crudName: values.crudName,
    crudCode: values.crudCode,
    crudType: requiredNumber(values.crudType, '功能类型'),
    sortIndex: requiredNumber(values.sortIndex, '排序'),
    remark: values.remark
  }
}

export interface CrudItemForm {
  crudId: number | null
  parentId: number | null | undefined
  method: string
  apiPath: string
  remark: string
}

export function crudItemToForm(row?: CrudItemDto): CrudItemForm {
  return {
    crudId: row?.crudId ?? null,
    parentId: row?.parentId ?? 0,
    method: row?.method ?? '',
    apiPath: row?.apiPath ?? '',
    remark: row?.remark ?? ''
  }
}

export function crudItemToCreate(values: CrudItemForm): CrudItemCreateDto {
  return {
    crudId: values.crudId ?? null,
    parentId: requiredNumber(values.parentId, '上级'),
    method: values.method,
    apiPath: values.apiPath,
    remark: values.remark
  }
}

export function crudItemToUpdate(values: CrudItemForm): CrudItemUpdateDto {
  return {
    crudId: values.crudId ?? null,
    parentId: requiredNumber(values.parentId, '上级'),
    method: values.method,
    apiPath: values.apiPath,
    remark: values.remark
  }
}

export interface CrudMenuForm {
  crudId: number | null
  parentId: number | null | undefined
  menuCode: string
  menuName: string
  menuType: string
  iconName: string
  routePath: string
  redirect: string
  openType: boolean
  sortIndex: number | null
  isHided: boolean
  allowAny: boolean
  remark: string
}

export function crudMenuToForm(row?: CrudMenuDto): CrudMenuForm {
  return {
    crudId: row?.crudId ?? null,
    parentId: row?.parentId ?? 0,
    menuCode: row?.menuCode ?? '',
    menuName: row?.menuName ?? '',
    menuType: row?.menuType ?? '',
    iconName: row?.iconName ?? '',
    routePath: row?.routePath ?? '',
    redirect: row?.redirect ?? '',
    openType: row?.openType ?? false,
    sortIndex: row?.sortIndex ?? 0,
    isHided: row?.isHided ?? false,
    allowAny: row?.allowAny ?? false,
    remark: row?.remark ?? ''
  }
}

export function crudMenuToCreate(values: CrudMenuForm): CrudMenuCreateDto {
  return {
    crudId: values.crudId ?? null,
    parentId: requiredNumber(values.parentId, '上级'),
    menuCode: values.menuCode,
    menuName: values.menuName,
    menuType: values.menuType,
    iconName: values.iconName,
    routePath: values.routePath,
    redirect: values.redirect,
    openType: values.openType,
    sortIndex: requiredNumber(values.sortIndex, '排序'),
    isHided: values.isHided,
    allowAny: values.allowAny,
    remark: values.remark
  }
}

export function crudMenuToUpdate(values: CrudMenuForm): CrudMenuUpdateDto {
  return {
    crudId: values.crudId ?? null,
    parentId: requiredNumber(values.parentId, '上级'),
    menuCode: values.menuCode,
    menuName: values.menuName,
    menuType: values.menuType,
    iconName: values.iconName,
    routePath: values.routePath,
    redirect: values.redirect,
    openType: values.openType,
    sortIndex: requiredNumber(values.sortIndex, '排序'),
    isHided: values.isHided,
    allowAny: values.allowAny,
    remark: values.remark
  }
}

export interface CrudRoleForm {
  tenantId: number | null
  appsId: number | null
  parentId: number | null | undefined
  roleCode: string
  roleName: string
  sortIndex: number | null
  isSystem: boolean
  remark: string
}

export function crudRoleToForm(row?: CrudRoleDto): CrudRoleForm {
  return {
    tenantId: row?.tenantId ?? null,
    appsId: row?.appsId ?? null,
    parentId: row?.parentId ?? 0,
    roleCode: row?.roleCode ?? '',
    roleName: row?.roleName ?? '',
    sortIndex: row?.sortIndex ?? null,
    isSystem: row?.isSystem ?? false,
    remark: row?.remark ?? ''
  }
}

export function crudRoleToCreate(values: CrudRoleForm): CrudRoleCreateDto {
  return {
    tenantId: values.tenantId ?? null,
    appsId: values.appsId ?? null,
    parentId: requiredNumber(values.parentId, '上级'),
    roleCode: values.roleCode,
    roleName: values.roleName,
    sortIndex: values.sortIndex ?? null,
    isSystem: values.isSystem,
    remark: values.remark
  }
}

export function crudRoleToUpdate(values: CrudRoleForm): CrudRoleUpdateDto {
  return {
    tenantId: values.tenantId ?? null,
    appsId: values.appsId ?? null,
    parentId: requiredNumber(values.parentId, '上级'),
    roleCode: values.roleCode,
    roleName: values.roleName,
    sortIndex: values.sortIndex ?? null,
    isSystem: values.isSystem,
    remark: values.remark
  }
}

export interface CrudRoleCrudForm {
  crudRoleId: number | null
  crudInfoId: number | null
}

export function crudRoleCrudToForm(row?: CrudRoleCrudDto): CrudRoleCrudForm {
  return {
    crudRoleId: row?.crudRoleId ?? 0,
    crudInfoId: row?.crudInfoId ?? 0
  }
}

export function crudRoleCrudToCreate(values: CrudRoleCrudForm): CrudRoleCrudCreateDto {
  return {
    crudRoleId: requiredNumber(values.crudRoleId, '功能角色'),
    crudInfoId: requiredNumber(values.crudInfoId, '功能')
  }
}

export function crudRoleCrudToUpdate(values: CrudRoleCrudForm): CrudRoleCrudUpdateDto {
  return {
    crudRoleId: requiredNumber(values.crudRoleId, '功能角色'),
    crudInfoId: requiredNumber(values.crudInfoId, '功能')
  }
}

export interface CrudRoleUserForm {
  roleId: number | null
  userId: number | null
}

export function crudRoleUserToForm(row?: CrudRoleUserDto): CrudRoleUserForm {
  return {
    roleId: row?.roleId ?? 0,
    userId: row?.userId ?? 0
  }
}

export function crudRoleUserToCreate(values: CrudRoleUserForm): CrudRoleUserCreateDto {
  return {
    roleId: requiredNumber(values.roleId, '角色'),
    userId: requiredNumber(values.userId, '用户')
  }
}

export function crudRoleUserToUpdate(values: CrudRoleUserForm): CrudRoleUserUpdateDto {
  return {
    roleId: requiredNumber(values.roleId, '角色'),
    userId: requiredNumber(values.userId, '用户')
  }
}

export interface DataRoleForm {
  tenantId: number | null
  appsId: number | null
  parentId: number | null | undefined
  roleCode: string
  roleName: string
  sortIndex: number | null
  isSystem: boolean
  remark: string
}

export function dataRoleToForm(row?: DataRoleDto): DataRoleForm {
  return {
    tenantId: row?.tenantId ?? null,
    appsId: row?.appsId ?? null,
    parentId: row?.parentId ?? 0,
    roleCode: row?.roleCode ?? '',
    roleName: row?.roleName ?? '',
    sortIndex: row?.sortIndex ?? null,
    isSystem: row?.isSystem ?? false,
    remark: row?.remark ?? ''
  }
}

export function dataRoleToCreate(values: DataRoleForm): DataRoleCreateDto {
  return {
    tenantId: values.tenantId ?? null,
    appsId: values.appsId ?? null,
    parentId: requiredNumber(values.parentId, '上级'),
    roleCode: values.roleCode,
    roleName: values.roleName,
    sortIndex: values.sortIndex ?? null,
    isSystem: values.isSystem,
    remark: values.remark
  }
}

export function dataRoleToUpdate(values: DataRoleForm): DataRoleUpdateDto {
  return {
    tenantId: values.tenantId ?? null,
    appsId: values.appsId ?? null,
    parentId: requiredNumber(values.parentId, '上级'),
    roleCode: values.roleCode,
    roleName: values.roleName,
    sortIndex: values.sortIndex ?? null,
    isSystem: values.isSystem,
    remark: values.remark
  }
}

export interface DataRoleUserForm {
  roleId: number | null
  userId: number | null
}

export function dataRoleUserToForm(row?: DataRoleUserDto): DataRoleUserForm {
  return {
    roleId: row?.roleId ?? 0,
    userId: row?.userId ?? 0
  }
}

export function dataRoleUserToCreate(values: DataRoleUserForm): DataRoleUserCreateDto {
  return {
    roleId: requiredNumber(values.roleId, '角色'),
    userId: requiredNumber(values.userId, '用户')
  }
}

export function dataRoleUserToUpdate(values: DataRoleUserForm): DataRoleUserUpdateDto {
  return {
    roleId: requiredNumber(values.roleId, '角色'),
    userId: requiredNumber(values.userId, '用户')
  }
}
