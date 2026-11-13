import { fieldsFor } from './fields'
import type { ResourceDef } from './types'
import * as authForms from './forms/auth'
import * as unitForms from './forms/unit'
import * as bzssForms from './forms/bzss'
import * as api from '@/api/entities'
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
import type {
  DepartmentDto,
  DepartmentCreateDto,
  DepartmentUpdateDto,
  EmployeeDto,
  EmployeeCreateDto,
  EmployeeUpdateDto
} from '@/types/unit'
import type {
  CompanyDto,
  CompanyCreateDto,
  CompanyUpdateDto,
  ProjectDto,
  ProjectCreateDto,
  ProjectUpdateDto
} from '@/types/bzss'

const userFields = fieldsFor<UserDto, authForms.UserForm>()
export const userResource = {
  path: '/auth/users',
  title: '用户',
  api: api.userApi,
  relations: { tenantId: (row) => row.tenantId },
  load: (page, size, keyword) => api.userApi.page({ page, size, ...(keyword ? { keyword } : {}) }),
  toForm: authForms.userToForm,
  toCreate: authForms.userToCreate,
  toUpdate: authForms.userToUpdate,
  fields: [
    userFields.id,
    userFields.form(
      'tenantId',
      '租户',
      { kind: 'number', table: true, nullable: true, formControl: 'tenant' },
      (row) => row.tenantId
    ),
    userFields.form(
      'userName',
      '用户名',
      { kind: 'string', required: true, table: true },
      (row) => row.userName
    ),
    userFields.form(
      'nickName',
      '昵称',
      { kind: 'string', required: true, table: true },
      (row) => row.nickName
    ),
    userFields.form(
      'password',
      '密码',
      { kind: 'password', required: true, table: false },
      () => undefined
    ),
    userFields.form('avatar', '头像', { kind: 'string', table: true }, (row) => row.avatar),
    userFields.form('phone', '电话', { kind: 'string', table: true }, (row) => row.phone),
    userFields.form(
      'email',
      '邮箱',
      { kind: 'string', required: true, table: true },
      (row) => row.email
    ),
    userFields.form('isAdmin', '管理员', { kind: 'bool', table: true }, (row) => row.isAdmin),
    userFields.form('isActived', '启用', { kind: 'bool', table: true }, (row) => row.isActived),
    userFields.form('remark', '备注', { kind: 'textarea', table: true }, (row) => row.remark)
  ]
} satisfies ResourceDef<UserDto, authForms.UserForm, UserCreateDto, UserUpdateDto>

const tenantFields = fieldsFor<TenantDto, authForms.TenantForm>()
export const tenantResource = {
  path: '/auth/tenants',
  title: '租户',
  api: api.tenantApi,
  load: (page, size, keyword) =>
    api.tenantApi.page({ page, size, ...(keyword ? { keyword } : {}) }),
  toForm: authForms.tenantToForm,
  toCreate: authForms.tenantToCreate,
  toUpdate: authForms.tenantToUpdate,
  fields: [
    tenantFields.id,
    tenantFields.form(
      'tenantCode',
      '租户编码',
      { kind: 'string', table: true },
      (row) => row.tenantCode
    ),
    tenantFields.form(
      'tenantName',
      '租户名称',
      { kind: 'string', table: true },
      (row) => row.tenantName
    ),
    tenantFields.form('isActived', '启用', { kind: 'bool', table: true }, (row) => row.isActived),
    tenantFields.form('remark', '备注', { kind: 'textarea', table: true }, (row) => row.remark)
  ]
} satisfies ResourceDef<TenantDto, authForms.TenantForm, TenantCreateDto, TenantUpdateDto>

const appsInfoFields = fieldsFor<AppsInfoDto, authForms.AppsInfoForm>()
export const appsInfoResource = {
  path: '/auth/apps-infos',
  title: '应用',
  api: api.appsInfoApi,
  relations: { tenantId: (row) => row.tenantId },
  load: () => api.appsInfoApi.all(),
  toForm: authForms.appsInfoToForm,
  toCreate: authForms.appsInfoToCreate,
  toUpdate: authForms.appsInfoToUpdate,
  tree: {
    nameField: 'appsName',
    searchFields: [
      'appsCode',
      'appsName',
      'appKey',
      'remark',
      'creatorNic',
      'updaterNic',
      'deleterNic'
    ],
    parentSearchFields: ['appsName', 'appsCode', 'id'],
    parentId: (row) => row.parentId,
    form: {
      parentField: 'parentId',
      parentId: (values) => values.parentId,
      child: (values, parent) => ({ ...values, parentId: parent.id })
    }
  },
  fields: [
    appsInfoFields.id,
    appsInfoFields.form(
      'tenantId',
      '租户',
      { kind: 'number', table: true, nullable: true, formControl: 'tenant' },
      (row) => row.tenantId
    ),
    appsInfoFields.form(
      'parentId',
      '上级',
      { kind: 'number', table: true, nullable: true },
      (row) => row.parentId
    ),
    appsInfoFields.form(
      'appsCode',
      '应用编码',
      { kind: 'string', table: true },
      (row) => row.appsCode
    ),
    appsInfoFields.form(
      'appsName',
      '应用名称',
      { kind: 'string', table: true },
      (row) => row.appsName
    ),
    appsInfoFields.form(
      'appKey',
      'AppKey',
      { kind: 'string', required: true, table: true },
      (row) => row.appKey
    ),
    appsInfoFields.form(
      'appSecret',
      '密钥',
      { kind: 'password', required: true, table: false },
      (row) => row.appSecret
    ),
    appsInfoFields.form('remark', '备注', { kind: 'textarea', table: true }, (row) => row.remark)
  ]
} satisfies ResourceDef<AppsInfoDto, authForms.AppsInfoForm, AppsInfoCreateDto, AppsInfoUpdateDto>

const appsUserFields = fieldsFor<AppsUserDto, authForms.AppsUserForm>()
export const appsUserResource = {
  path: '/auth/apps-users',
  title: '应用用户',
  api: api.appsUserApi,
  relations: {
    tenantId: (row) => row.tenantId,
    appsId: (row) => row.appsId,
    userId: (row) => row.userId
  },
  load: (page, size, keyword) =>
    api.appsUserApi.page({ page, size, ...(keyword ? { keyword } : {}) }),
  toForm: authForms.appsUserToForm,
  toCreate: authForms.appsUserToCreate,
  toUpdate: authForms.appsUserToUpdate,
  fields: [
    appsUserFields.id,
    appsUserFields.form(
      'tenantId',
      '租户',
      { kind: 'number', table: true, nullable: true, formControl: 'tenant' },
      (row) => row.tenantId
    ),
    appsUserFields.form(
      'appsId',
      '应用',
      { kind: 'number', table: true, nullable: true, formControl: 'app' },
      (row) => row.appsId
    ),
    appsUserFields.form(
      'userId',
      '用户',
      { kind: 'number', table: true, nullable: true, formControl: 'user' },
      (row) => row.userId
    ),
    appsUserFields.form('isAdmin', '管理员', { kind: 'bool', table: true }, (row) => row.isAdmin),
    appsUserFields.form('remark', '备注', { kind: 'textarea', table: true }, (row) => row.remark)
  ]
} satisfies ResourceDef<AppsUserDto, authForms.AppsUserForm, AppsUserCreateDto, AppsUserUpdateDto>

const crudInfoFields = fieldsFor<CrudInfoDto, authForms.CrudInfoForm>()
export const crudInfoResource = {
  path: '/auth/crud-infos',
  title: '功能',
  api: api.crudInfoApi,
  relations: { appsId: (row) => row.appsId },
  load: () => api.crudInfoApi.all(),
  toForm: authForms.crudInfoToForm,
  toCreate: authForms.crudInfoToCreate,
  toUpdate: authForms.crudInfoToUpdate,
  tree: {
    nameField: 'crudName',
    searchFields: ['crudName', 'crudCode', 'remark', 'creatorNic', 'updaterNic', 'deleterNic'],
    parentId: (row) => row.parentId,
    sortIndex: (row) => row.sortIndex,
    appId: (row) => row.appsId,
    form: {
      parentField: 'parentId',
      parentId: (values) => values.parentId,
      appField: 'appsId',
      appId: (values) => values.appsId,
      child: (values, parent) => ({ ...values, parentId: parent.id, appsId: parent.appsId })
    }
  },
  fields: [
    crudInfoFields.id,
    crudInfoFields.form(
      'appsId',
      '应用',
      { kind: 'number', table: true, nullable: true, formControl: 'app' },
      (row) => row.appsId
    ),
    crudInfoFields.form('parentId', '上级', { kind: 'number', table: true }, (row) => row.parentId),
    crudInfoFields.form(
      'crudName',
      '功能名称',
      { kind: 'string', table: true },
      (row) => row.crudName
    ),
    crudInfoFields.form(
      'crudCode',
      '功能编码',
      { kind: 'string', required: true, table: true },
      (row) => row.crudCode
    ),
    crudInfoFields.form(
      'crudType',
      '功能类型',
      { kind: 'number', table: true },
      (row) => row.crudType
    ),
    crudInfoFields.form(
      'sortIndex',
      '排序',
      { kind: 'number', table: true },
      (row) => row.sortIndex
    ),
    crudInfoFields.form('remark', '备注', { kind: 'textarea', table: true }, (row) => row.remark)
  ]
} satisfies ResourceDef<CrudInfoDto, authForms.CrudInfoForm, CrudInfoCreateDto, CrudInfoUpdateDto>

const crudItemFields = fieldsFor<CrudItemDto, authForms.CrudItemForm>()
export const crudItemResource = {
  path: '/auth/crud-items',
  title: '功能接口',
  api: api.crudItemApi,
  load: () => api.crudItemApi.all(),
  toForm: authForms.crudItemToForm,
  toCreate: authForms.crudItemToCreate,
  toUpdate: authForms.crudItemToUpdate,
  tree: {
    nameField: 'apiPath',
    labelFields: ['method', 'apiPath'],
    searchFields: ['method', 'apiPath', 'remark', 'creatorNic', 'updaterNic', 'deleterNic'],
    parentSearchFields: ['method', 'apiPath', 'id'],
    parentId: (row) => row.parentId,
    form: {
      parentField: 'parentId',
      parentId: (values) => values.parentId,
      child: (values, parent) => ({ ...values, parentId: parent.id })
    }
  },
  fields: [
    crudItemFields.id,
    crudItemFields.form(
      'crudId',
      '功能',
      { kind: 'number', table: true, nullable: true, formControl: 'crudInfo' },
      (row) => row.crudId
    ),
    crudItemFields.form('parentId', '上级', { kind: 'number', table: true }, (row) => row.parentId),
    crudItemFields.form(
      'method',
      '方法',
      { kind: 'string', required: true, table: true, formControl: 'httpMethod' },
      (row) => row.method
    ),
    crudItemFields.form(
      'apiPath',
      '接口路径',
      { kind: 'string', table: true },
      (row) => row.apiPath
    ),
    crudItemFields.form('remark', '备注', { kind: 'textarea', table: true }, (row) => row.remark)
  ]
} satisfies ResourceDef<CrudItemDto, authForms.CrudItemForm, CrudItemCreateDto, CrudItemUpdateDto>

const crudMenuFields = fieldsFor<CrudMenuDto, authForms.CrudMenuForm>()
export const crudMenuResource = {
  path: '/auth/crud-menus',
  title: '菜单',
  api: api.crudMenuApi,
  relations: { crudId: (row) => row.crudId },
  load: () => api.crudMenuApi.all(),
  toForm: authForms.crudMenuToForm,
  toCreate: authForms.crudMenuToCreate,
  toUpdate: authForms.crudMenuToUpdate,
  tree: {
    nameField: 'menuName',
    searchFields: [
      'menuCode',
      'menuName',
      'iconName',
      'routePath',
      'redirect',
      'remark',
      'creatorNic',
      'updaterNic',
      'deleterNic'
    ],
    parentId: (row) => row.parentId,
    sortIndex: (row) => row.sortIndex,
    form: {
      parentField: 'parentId',
      parentId: (values) => values.parentId,
      child: (values, parent) => ({
        ...values,
        parentId: parent.id,
        menuType: authForms.crudMenuDefaultForParent(parent.id)
      }),
      defaultFromParent: { field: 'menuType', value: authForms.crudMenuDefaultForParent }
    }
  },
  fields: [
    crudMenuFields.id,
    crudMenuFields.form(
      'crudId',
      '功能',
      { kind: 'number', table: true, nullable: true, formControl: 'crudInfo' },
      (row) => row.crudId
    ),
    crudMenuFields.form('parentId', '上级', { kind: 'number', table: true }, (row) => row.parentId),
    crudMenuFields.form(
      'menuCode',
      '菜单编码',
      { kind: 'string', required: true, table: true },
      (row) => row.menuCode
    ),
    crudMenuFields.form(
      'menuName',
      '菜单名称',
      { kind: 'string', table: true },
      (row) => row.menuName
    ),
    crudMenuFields.form(
      'menuType',
      '菜单类型',
      { kind: 'string', required: true, table: true, formControl: 'menuType' },
      (row) => row.menuType
    ),
    crudMenuFields.form(
      'iconName',
      '图标',
      { kind: 'icon', required: true, table: true },
      (row) => row.iconName
    ),
    crudMenuFields.form(
      'routePath',
      '路由',
      { kind: 'string', table: true },
      (row) => row.routePath
    ),
    crudMenuFields.form(
      'redirect',
      '重定向',
      { kind: 'string', table: true },
      (row) => row.redirect
    ),
    crudMenuFields.form(
      'openType',
      '打开方式',
      { kind: 'bool', table: true, nullable: true },
      (row) => row.openType
    ),
    crudMenuFields.form(
      'sortIndex',
      '排序',
      { kind: 'number', table: true },
      (row) => row.sortIndex
    ),
    crudMenuFields.form('isHided', '隐藏', { kind: 'bool', table: true }, (row) => row.isHided),
    crudMenuFields.form(
      'allowAny',
      '匿名访问',
      { kind: 'bool', table: true },
      (row) => row.allowAny
    ),
    crudMenuFields.form('remark', '备注', { kind: 'textarea', table: true }, (row) => row.remark)
  ]
} satisfies ResourceDef<CrudMenuDto, authForms.CrudMenuForm, CrudMenuCreateDto, CrudMenuUpdateDto>

const crudRoleFields = fieldsFor<CrudRoleDto, authForms.CrudRoleForm>()
export const crudRoleResource = {
  path: '/auth/crud-roles',
  title: '功能角色',
  api: api.crudRoleApi,
  relations: { tenantId: (row) => row.tenantId, appsId: (row) => row.appsId },
  load: () => api.crudRoleApi.all(),
  toForm: authForms.crudRoleToForm,
  toCreate: authForms.crudRoleToCreate,
  toUpdate: authForms.crudRoleToUpdate,
  tree: {
    nameField: 'roleName',
    searchFields: ['roleCode', 'roleName', 'remark', 'creatorNic', 'updaterNic', 'deleterNic'],
    parentSearchFields: ['roleName', 'roleCode', 'id'],
    parentId: (row) => row.parentId,
    sortIndex: (row) => row.sortIndex,
    form: {
      parentField: 'parentId',
      parentId: (values) => values.parentId,
      child: (values, parent) => ({ ...values, parentId: parent.id })
    }
  },
  fields: [
    crudRoleFields.id,
    crudRoleFields.form(
      'tenantId',
      '租户',
      { kind: 'number', table: true, nullable: true, formControl: 'tenant' },
      (row) => row.tenantId
    ),
    crudRoleFields.form(
      'appsId',
      '应用',
      { kind: 'number', table: true, nullable: true, formControl: 'app' },
      (row) => row.appsId
    ),
    crudRoleFields.form('parentId', '上级', { kind: 'number', table: true }, (row) => row.parentId),
    crudRoleFields.form(
      'roleCode',
      '角色编码',
      { kind: 'string', table: true },
      (row) => row.roleCode
    ),
    crudRoleFields.form(
      'roleName',
      '角色名称',
      { kind: 'string', required: true, table: true },
      (row) => row.roleName
    ),
    crudRoleFields.form(
      'sortIndex',
      '排序',
      { kind: 'number', table: true, nullable: true },
      (row) => row.sortIndex
    ),
    crudRoleFields.form(
      'isSystem',
      '系统角色',
      { kind: 'bool', table: true },
      (row) => row.isSystem
    ),
    crudRoleFields.form('remark', '备注', { kind: 'textarea', table: true }, (row) => row.remark)
  ]
} satisfies ResourceDef<CrudRoleDto, authForms.CrudRoleForm, CrudRoleCreateDto, CrudRoleUpdateDto>

const crudRoleCrudFields = fieldsFor<CrudRoleCrudDto, authForms.CrudRoleCrudForm>()
export const crudRoleCrudResource = {
  path: '/auth/crud-role-cruds',
  title: '角色功能',
  api: api.crudRoleCrudApi,
  load: (page, size, keyword) =>
    api.crudRoleCrudApi.page({ page, size, ...(keyword ? { keyword } : {}) }),
  toForm: authForms.crudRoleCrudToForm,
  toCreate: authForms.crudRoleCrudToCreate,
  toUpdate: authForms.crudRoleCrudToUpdate,
  fields: [
    crudRoleCrudFields.id,
    crudRoleCrudFields.form(
      'crudRoleId',
      '功能角色',
      { kind: 'number', required: true, table: true },
      (row) => row.crudRoleId
    ),
    crudRoleCrudFields.form(
      'crudInfoId',
      '功能',
      { kind: 'number', required: true, table: true },
      (row) => row.crudInfoId
    )
  ]
} satisfies ResourceDef<
  CrudRoleCrudDto,
  authForms.CrudRoleCrudForm,
  CrudRoleCrudCreateDto,
  CrudRoleCrudUpdateDto
>

const crudRoleUserFields = fieldsFor<CrudRoleUserDto, authForms.CrudRoleUserForm>()
export const crudRoleUserResource = {
  path: '/auth/crud-role-users',
  title: '角色用户',
  api: api.crudRoleUserApi,
  load: (page, size, keyword) =>
    api.crudRoleUserApi.page({ page, size, ...(keyword ? { keyword } : {}) }),
  toForm: authForms.crudRoleUserToForm,
  toCreate: authForms.crudRoleUserToCreate,
  toUpdate: authForms.crudRoleUserToUpdate,
  fields: [
    crudRoleUserFields.id,
    crudRoleUserFields.form(
      'roleId',
      '角色',
      { kind: 'number', required: true, table: true },
      (row) => row.roleId
    ),
    crudRoleUserFields.form(
      'userId',
      '用户',
      { kind: 'number', required: true, table: true },
      (row) => row.userId
    )
  ]
} satisfies ResourceDef<
  CrudRoleUserDto,
  authForms.CrudRoleUserForm,
  CrudRoleUserCreateDto,
  CrudRoleUserUpdateDto
>

const dataRoleFields = fieldsFor<DataRoleDto, authForms.DataRoleForm>()
export const dataRoleResource = {
  path: '/auth/data-roles',
  title: '数据角色',
  api: api.dataRoleApi,
  relations: { tenantId: (row) => row.tenantId, appsId: (row) => row.appsId },
  load: () => api.dataRoleApi.all(),
  toForm: authForms.dataRoleToForm,
  toCreate: authForms.dataRoleToCreate,
  toUpdate: authForms.dataRoleToUpdate,
  tree: {
    nameField: 'roleName',
    searchFields: ['roleCode', 'roleName', 'remark', 'creatorNic', 'updaterNic', 'deleterNic'],
    parentSearchFields: ['roleName', 'roleCode', 'id'],
    parentId: (row) => row.parentId,
    sortIndex: (row) => row.sortIndex,
    form: {
      parentField: 'parentId',
      parentId: (values) => values.parentId,
      child: (values, parent) => ({ ...values, parentId: parent.id })
    }
  },
  fields: [
    dataRoleFields.id,
    dataRoleFields.form(
      'tenantId',
      '租户',
      { kind: 'number', table: true, nullable: true, formControl: 'tenant' },
      (row) => row.tenantId
    ),
    dataRoleFields.form(
      'appsId',
      '应用',
      { kind: 'number', table: true, nullable: true, formControl: 'app' },
      (row) => row.appsId
    ),
    dataRoleFields.form('parentId', '上级', { kind: 'number', table: true }, (row) => row.parentId),
    dataRoleFields.form(
      'roleCode',
      '角色编码',
      { kind: 'string', table: true },
      (row) => row.roleCode
    ),
    dataRoleFields.form(
      'roleName',
      '角色名称',
      { kind: 'string', required: true, table: true },
      (row) => row.roleName
    ),
    dataRoleFields.form(
      'sortIndex',
      '排序',
      { kind: 'number', table: true, nullable: true },
      (row) => row.sortIndex
    ),
    dataRoleFields.form(
      'isSystem',
      '系统角色',
      { kind: 'bool', table: true },
      (row) => row.isSystem
    ),
    dataRoleFields.form('remark', '备注', { kind: 'textarea', table: true }, (row) => row.remark)
  ]
} satisfies ResourceDef<DataRoleDto, authForms.DataRoleForm, DataRoleCreateDto, DataRoleUpdateDto>

const dataRoleUserFields = fieldsFor<DataRoleUserDto, authForms.DataRoleUserForm>()
export const dataRoleUserResource = {
  path: '/auth/data-role-users',
  title: '数据角色用户',
  api: api.dataRoleUserApi,
  load: (page, size, keyword) =>
    api.dataRoleUserApi.page({ page, size, ...(keyword ? { keyword } : {}) }),
  toForm: authForms.dataRoleUserToForm,
  toCreate: authForms.dataRoleUserToCreate,
  toUpdate: authForms.dataRoleUserToUpdate,
  fields: [
    dataRoleUserFields.id,
    dataRoleUserFields.form(
      'roleId',
      '角色',
      { kind: 'number', required: true, table: true },
      (row) => row.roleId
    ),
    dataRoleUserFields.form(
      'userId',
      '用户',
      { kind: 'number', required: true, table: true },
      (row) => row.userId
    )
  ]
} satisfies ResourceDef<
  DataRoleUserDto,
  authForms.DataRoleUserForm,
  DataRoleUserCreateDto,
  DataRoleUserUpdateDto
>

const companyFields = fieldsFor<CompanyDto, bzssForms.CompanyForm>()
export const companyResource = {
  path: '/bzss/companies',
  title: '公司',
  api: api.companyApi,
  relations: { tenantId: (row) => row.tenantId },
  load: (page, size, keyword) =>
    api.companyApi.page({ page, size, ...(keyword ? { keyword } : {}) }),
  toForm: bzssForms.companyToForm,
  toCreate: bzssForms.companyToCreate,
  toUpdate: bzssForms.companyToUpdate,
  fields: [
    companyFields.id,
    companyFields.form(
      'tenantId',
      '租户',
      { kind: 'number', table: true, nullable: true, formControl: 'tenant' },
      (row) => row.tenantId
    ),
    companyFields.form('nameCn', '中文名', { kind: 'string', table: true }, (row) => row.nameCn),
    companyFields.form('nameEn', '英文名', { kind: 'string', table: true }, (row) => row.nameEn),
    companyFields.form(
      'registratioNo',
      '注册号',
      { kind: 'string', table: true },
      (row) => row.registratioNo
    ),
    companyFields.form(
      'legalName',
      '法人',
      { kind: 'string', table: true },
      (row) => row.legalName
    ),
    companyFields.form(
      'countryId',
      '国家',
      { kind: 'number', table: true, nullable: true },
      (row) => row.countryId
    ),
    companyFields.form('regDate', '注册日期', { kind: 'date', table: true }, (row) => row.regDate),
    companyFields.form(
      'classify',
      '分类',
      { kind: 'number', table: true, nullable: true },
      (row) => row.classify
    ),
    companyFields.form('currency', '币种', { kind: 'string', table: true }, (row) => row.currency),
    companyFields.form('remark', '备注', { kind: 'textarea', table: true }, (row) => row.remark)
  ]
} satisfies ResourceDef<CompanyDto, bzssForms.CompanyForm, CompanyCreateDto, CompanyUpdateDto>

const projectFields = fieldsFor<ProjectDto, bzssForms.ProjectForm>()
export const projectResource = {
  path: '/bzss/projects',
  title: '项目',
  api: api.projectApi,
  relations: { tenantId: (row) => row.tenantId },
  load: (page, size, keyword) =>
    api.projectApi.page({ page, size, ...(keyword ? { keyword } : {}) }),
  toForm: bzssForms.projectToForm,
  toCreate: bzssForms.projectToCreate,
  toUpdate: bzssForms.projectToUpdate,
  fields: [
    projectFields.id,
    projectFields.form(
      'tenantId',
      '租户',
      { kind: 'number', table: true, nullable: true, formControl: 'tenant' },
      (row) => row.tenantId
    ),
    projectFields.form(
      'projCode',
      '项目编码',
      { kind: 'string', table: true },
      (row) => row.projCode
    ),
    projectFields.form(
      'projName',
      '项目名称',
      { kind: 'string', table: true },
      (row) => row.projName
    ),
    projectFields.form('remark', '备注', { kind: 'textarea', table: true }, (row) => row.remark)
  ]
} satisfies ResourceDef<ProjectDto, bzssForms.ProjectForm, ProjectCreateDto, ProjectUpdateDto>

const departmentFields = fieldsFor<DepartmentDto, unitForms.DepartmentForm>()
export const departmentResource = {
  path: '/unit/departments',
  title: '部门',
  api: api.departmentApi,
  relations: { tenantId: (row) => row.tenantId },
  load: (page, size, keyword) =>
    api.departmentApi.page({ page, size, ...(keyword ? { keyword } : {}) }),
  toForm: unitForms.departmentToForm,
  toCreate: unitForms.departmentToCreate,
  toUpdate: unitForms.departmentToUpdate,
  fields: [
    departmentFields.id,
    departmentFields.form(
      'tenantId',
      '租户',
      { kind: 'number', table: true, nullable: true, formControl: 'tenant' },
      (row) => row.tenantId
    ),
    departmentFields.form(
      'deptName',
      '部门名称',
      { kind: 'string', table: true },
      (row) => row.deptName
    ),
    departmentFields.form(
      'empCount',
      '人数',
      { kind: 'number', table: true, nullable: true },
      (row) => row.empCount
    ),
    departmentFields.form(
      'directorId',
      '负责人',
      { kind: 'number', table: true, nullable: true },
      (row) => row.directorId
    ),
    departmentFields.form('remark', '备注', { kind: 'textarea', table: true }, (row) => row.remark)
  ]
} satisfies ResourceDef<
  DepartmentDto,
  unitForms.DepartmentForm,
  DepartmentCreateDto,
  DepartmentUpdateDto
>

const employeeFields = fieldsFor<EmployeeDto, unitForms.EmployeeForm>()
export const employeeResource = {
  path: '/unit/employees',
  title: '员工',
  api: api.employeeApi,
  relations: { departmentId: (row) => row.departmentId },
  load: (page, size, keyword) =>
    api.employeeApi.page({ page, size, ...(keyword ? { keyword } : {}) }),
  toForm: unitForms.employeeToForm,
  toCreate: unitForms.employeeToCreate,
  toUpdate: unitForms.employeeToUpdate,
  fields: [
    employeeFields.id,
    employeeFields.form(
      'departmentId',
      '部门',
      { kind: 'number', table: true, nullable: true, formControl: 'department' },
      (row) => row.departmentId
    ),
    employeeFields.form(
      'userId',
      '用户',
      { kind: 'number', table: true, nullable: true },
      (row) => row.userId
    ),
    employeeFields.form('remark', '备注', { kind: 'textarea', table: true }, (row) => row.remark)
  ]
} satisfies ResourceDef<EmployeeDto, unitForms.EmployeeForm, EmployeeCreateDto, EmployeeUpdateDto>
