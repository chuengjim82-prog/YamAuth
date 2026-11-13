import type { PagedQuery } from './api'

export interface LoginRequest {
  userName: string
  password: string
}

export interface LoginResult {
  token: string
  expiresIn: number
  userName: string
  nickName: string
}

export interface MenuNode {
  id: number
  parentId: number
  menuName: string
  menuUrl: string
  menuIcon: string
  children: MenuNode[]
}

/** Auth 传输契约：与后端 DTO 对齐；日期为 JSON 字符串，可空属性仍会出现在响应中。 */
export interface UserDto {
  id: number
  tenantId: number | null
  userName: string
  nickName: string
  avatar: string
  phone: string
  email: string
  isAdmin: boolean
  isActived: boolean
  remark: string | null
  isDeleted: boolean
  creatorId: number
  creatorNic: string
  createTime: string
  updaterId: number | null
  updaterNic: string | null
  updateTime: string | null
  deleterId: number | null
  deleterNic: string | null
  deleteTime: string | null
}

export interface UserCreateDto {
  tenantId: number | null
  userName: string
  nickName: string
  password: string
  avatar: string
  phone: string
  email: string
  isAdmin: boolean
  isActived: boolean
  remark: string | null
}

export interface UserUpdateDto {
  tenantId: number | null
  userName: string
  nickName: string
  password?: string | null
  avatar: string
  phone: string
  email: string
  isAdmin: boolean
  isActived: boolean
  remark: string | null
}

export type UserQueryDto = PagedQuery

export interface TenantDto {
  id: number
  tenantCode: string | null
  tenantName: string | null
  isActived: boolean
  remark: string | null
  isDeleted: boolean
  creatorId: number
  creatorNic: string
  createTime: string
  updaterId: number | null
  updaterNic: string | null
  updateTime: string | null
  deleterId: number | null
  deleterNic: string | null
  deleteTime: string | null
}

export interface TenantCreateDto {
  tenantCode: string | null
  tenantName: string | null
  isActived: boolean
  remark: string | null
}

export interface TenantUpdateDto {
  tenantCode: string | null
  tenantName: string | null
  isActived: boolean
  remark: string | null
}

export type TenantQueryDto = PagedQuery

export interface AppsInfoDto {
  id: number
  tenantId: number | null
  parentId: number | null
  appsCode: string | null
  appsName: string | null
  appKey: string
  appSecret: string
  remark: string | null
  isDeleted: boolean
  creatorId: number
  creatorNic: string
  createTime: string
  updaterId: number | null
  updaterNic: string | null
  updateTime: string | null
  deleterId: number | null
  deleterNic: string | null
  deleteTime: string | null
}

export interface AppsInfoCreateDto {
  tenantId: number | null
  parentId: number | null
  appsCode: string | null
  appsName: string | null
  appKey: string
  appSecret: string
  remark: string | null
}

export interface AppsInfoUpdateDto {
  tenantId: number | null
  parentId: number | null
  appsCode: string | null
  appsName: string | null
  appKey: string
  appSecret: string
  remark: string | null
}

export interface AppsInfoQueryDto extends PagedQuery {
  all?: boolean
}

export interface AppsUserDto {
  id: number
  tenantId: number | null
  appsId: number | null
  userId: number | null
  isAdmin: boolean
  remark: string | null
  isDeleted: boolean
  creatorId: number
  creatorNic: string
  createTime: string
  updaterId: number | null
  updaterNic: string | null
  updateTime: string | null
  deleterId: number | null
  deleterNic: string | null
  deleteTime: string | null
}

export interface AppsUserCreateDto {
  tenantId: number | null
  appsId: number | null
  userId: number | null
  isAdmin: boolean
  remark: string | null
}

export interface AppsUserUpdateDto {
  tenantId: number | null
  appsId: number | null
  userId: number | null
  isAdmin: boolean
  remark: string | null
}

export type AppsUserQueryDto = PagedQuery

export interface CrudInfoDto {
  id: number
  appsId: number | null
  parentId: number
  crudName: string | null
  crudCode: string
  crudType: number
  sortIndex: number
  remark: string | null
  isDeleted: boolean
  creatorId: number
  creatorNic: string
  createTime: string
  updaterId: number | null
  updaterNic: string | null
  updateTime: string | null
  deleterId: number | null
  deleterNic: string | null
  deleteTime: string | null
}

export interface CrudInfoCreateDto {
  appsId: number | null
  parentId: number
  crudName: string | null
  crudCode: string
  crudType: number
  sortIndex: number
  remark: string | null
}

export interface CrudInfoUpdateDto {
  appsId: number | null
  parentId: number
  crudName: string | null
  crudCode: string
  crudType: number
  sortIndex: number
  remark: string | null
}

export interface CrudInfoQueryDto extends PagedQuery {
  all?: boolean
}

export interface CrudItemDto {
  id: number
  crudId: number | null
  parentId: number
  method: string
  apiPath: string | null
  remark: string | null
  isDeleted: boolean
  creatorId: number
  creatorNic: string
  createTime: string
  updaterId: number | null
  updaterNic: string | null
  updateTime: string | null
  deleterId: number | null
  deleterNic: string | null
  deleteTime: string | null
}

export interface CrudItemCreateDto {
  crudId: number | null
  parentId: number
  method: string
  apiPath: string | null
  remark: string | null
}

export interface CrudItemUpdateDto {
  crudId: number | null
  parentId: number
  method: string
  apiPath: string | null
  remark: string | null
}

export interface CrudItemQueryDto extends PagedQuery {
  all?: boolean
}

export interface CrudMenuDto {
  id: number
  crudId: number | null
  parentId: number
  menuCode: string
  menuName: string | null
  menuType: string
  iconName: string
  routePath: string | null
  redirect: string | null
  openType: boolean | null
  sortIndex: number
  isHided: boolean
  allowAny: boolean
  remark: string | null
  isDeleted: boolean
  creatorId: number
  creatorNic: string
  createTime: string
  updaterId: number | null
  updaterNic: string | null
  updateTime: string | null
  deleterId: number | null
  deleterNic: string | null
  deleteTime: string | null
}

export interface CrudMenuCreateDto {
  crudId: number | null
  parentId: number
  menuCode: string
  menuName: string | null
  menuType: string
  iconName: string
  routePath: string | null
  redirect: string | null
  openType: boolean | null
  sortIndex: number
  isHided: boolean
  allowAny: boolean
  remark: string | null
}

export interface CrudMenuUpdateDto {
  crudId: number | null
  parentId: number
  menuCode: string
  menuName: string | null
  menuType: string
  iconName: string
  routePath: string | null
  redirect: string | null
  openType: boolean | null
  sortIndex: number
  isHided: boolean
  allowAny: boolean
  remark: string | null
}

export interface CrudMenuQueryDto extends PagedQuery {
  all?: boolean
}

export interface CrudRoleDto {
  id: number
  tenantId: number | null
  appsId: number | null
  parentId: number
  roleCode: string | null
  roleName: string
  sortIndex: number | null
  isSystem: boolean
  remark: string | null
  isDeleted: boolean
  creatorId: number
  creatorNic: string
  createTime: string
  updaterId: number | null
  updaterNic: string | null
  updateTime: string | null
  deleterId: number | null
  deleterNic: string | null
  deleteTime: string | null
}

export interface CrudRoleCreateDto {
  tenantId: number | null
  appsId: number | null
  parentId: number
  roleCode: string | null
  roleName: string
  sortIndex: number | null
  isSystem: boolean
  remark: string | null
}

export interface CrudRoleUpdateDto {
  tenantId: number | null
  appsId: number | null
  parentId: number
  roleCode: string | null
  roleName: string
  sortIndex: number | null
  isSystem: boolean
  remark: string | null
}

export interface CrudRoleQueryDto extends PagedQuery {
  all?: boolean
}

export interface CrudRoleCrudDto {
  id: number
  crudRoleId: number
  crudInfoId: number
  isDeleted: boolean
  creatorId: number
  creatorNic: string
  createTime: string
  deleterId: number | null
  deleterNic: string | null
  deleteTime: string | null
}

export interface CrudRoleCrudCreateDto {
  crudRoleId: number
  crudInfoId: number
}

export interface CrudRoleCrudUpdateDto {
  crudRoleId: number
  crudInfoId: number
}

export type CrudRoleCrudQueryDto = PagedQuery

export interface CrudRoleUserDto {
  id: number
  roleId: number
  userId: number
  isDeleted: boolean
  creatorId: number
  creatorNic: string
  createTime: string
  deleterId: number | null
  deleterNic: string | null
  deleteTime: string | null
}

export interface CrudRoleUserCreateDto {
  roleId: number
  userId: number
}

export interface CrudRoleUserUpdateDto {
  roleId: number
  userId: number
}

export type CrudRoleUserQueryDto = PagedQuery

export interface DataRoleDto {
  id: number
  tenantId: number | null
  appsId: number | null
  parentId: number
  roleCode: string | null
  roleName: string
  sortIndex: number | null
  isSystem: boolean
  remark: string | null
  isDeleted: boolean
  creatorId: number
  creatorNic: string
  createTime: string
  updaterId: number | null
  updaterNic: string | null
  updateTime: string | null
  deleterId: number | null
  deleterNic: string | null
  deleteTime: string | null
}

export interface DataRoleCreateDto {
  tenantId: number | null
  appsId: number | null
  parentId: number
  roleCode: string | null
  roleName: string
  sortIndex: number | null
  isSystem: boolean
  remark: string | null
}

export interface DataRoleUpdateDto {
  tenantId: number | null
  appsId: number | null
  parentId: number
  roleCode: string | null
  roleName: string
  sortIndex: number | null
  isSystem: boolean
  remark: string | null
}

export interface DataRoleQueryDto extends PagedQuery {
  all?: boolean
}

export interface DataRoleUserDto {
  id: number
  roleId: number
  userId: number
  isDeleted: boolean
  creatorId: number
  creatorNic: string
  createTime: string
  deleterId: number | null
  deleterNic: string | null
  deleteTime: string | null
}

export interface DataRoleUserCreateDto {
  roleId: number
  userId: number
}

export interface DataRoleUserUpdateDto {
  roleId: number
  userId: number
}

export type DataRoleUserQueryDto = PagedQuery
