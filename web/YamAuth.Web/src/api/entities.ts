import { createCrudApi, withAll } from './crud'
import type {
  UserDto,
  UserCreateDto,
  UserUpdateDto,
  UserQueryDto,
  TenantDto,
  TenantCreateDto,
  TenantUpdateDto,
  TenantQueryDto,
  AppsInfoDto,
  AppsInfoCreateDto,
  AppsInfoUpdateDto,
  AppsInfoQueryDto,
  AppsUserDto,
  AppsUserCreateDto,
  AppsUserUpdateDto,
  AppsUserQueryDto,
  CrudInfoDto,
  CrudInfoCreateDto,
  CrudInfoUpdateDto,
  CrudInfoQueryDto,
  CrudItemDto,
  CrudItemCreateDto,
  CrudItemUpdateDto,
  CrudItemQueryDto,
  CrudMenuDto,
  CrudMenuCreateDto,
  CrudMenuUpdateDto,
  CrudMenuQueryDto,
  CrudRoleDto,
  CrudRoleCreateDto,
  CrudRoleUpdateDto,
  CrudRoleQueryDto,
  CrudRoleCrudDto,
  CrudRoleCrudCreateDto,
  CrudRoleCrudUpdateDto,
  CrudRoleCrudQueryDto,
  CrudRoleUserDto,
  CrudRoleUserCreateDto,
  CrudRoleUserUpdateDto,
  CrudRoleUserQueryDto,
  DataRoleDto,
  DataRoleCreateDto,
  DataRoleUpdateDto,
  DataRoleQueryDto,
  DataRoleUserDto,
  DataRoleUserCreateDto,
  DataRoleUserUpdateDto,
  DataRoleUserQueryDto
} from '@/types/auth'
import type {
  DepartmentDto,
  DepartmentCreateDto,
  DepartmentUpdateDto,
  DepartmentQueryDto,
  EmployeeDto,
  EmployeeCreateDto,
  EmployeeUpdateDto,
  EmployeeQueryDto
} from '@/types/unit'
import type {
  CompanyDto,
  CompanyCreateDto,
  CompanyUpdateDto,
  CompanyQueryDto,
  ProjectDto,
  ProjectCreateDto,
  ProjectUpdateDto,
  ProjectQueryDto
} from '@/types/bzss'
export const userApi = createCrudApi<UserDto, UserCreateDto, UserUpdateDto, UserQueryDto>(
  '/v1/auth/users'
)
export const tenantApi = createCrudApi<TenantDto, TenantCreateDto, TenantUpdateDto, TenantQueryDto>(
  '/v1/auth/tenants'
)
export const appsInfoApi = withAll(
  createCrudApi<AppsInfoDto, AppsInfoCreateDto, AppsInfoUpdateDto, AppsInfoQueryDto>(
    '/v1/auth/apps-infos'
  ),
  { all: true }
)
export const appsUserApi = createCrudApi<
  AppsUserDto,
  AppsUserCreateDto,
  AppsUserUpdateDto,
  AppsUserQueryDto
>('/v1/auth/apps-users')
export const crudInfoApi = withAll(
  createCrudApi<CrudInfoDto, CrudInfoCreateDto, CrudInfoUpdateDto, CrudInfoQueryDto>(
    '/v1/auth/crud-infos'
  ),
  { all: true }
)
export const crudItemApi = withAll(
  createCrudApi<CrudItemDto, CrudItemCreateDto, CrudItemUpdateDto, CrudItemQueryDto>(
    '/v1/auth/crud-items'
  ),
  { all: true }
)
export const crudMenuApi = withAll(
  createCrudApi<CrudMenuDto, CrudMenuCreateDto, CrudMenuUpdateDto, CrudMenuQueryDto>(
    '/v1/auth/crud-menus'
  ),
  { all: true }
)
export const crudRoleApi = withAll(
  createCrudApi<CrudRoleDto, CrudRoleCreateDto, CrudRoleUpdateDto, CrudRoleQueryDto>(
    '/v1/auth/crud-roles'
  ),
  { all: true }
)
export const crudRoleCrudApi = createCrudApi<
  CrudRoleCrudDto,
  CrudRoleCrudCreateDto,
  CrudRoleCrudUpdateDto,
  CrudRoleCrudQueryDto
>('/v1/auth/crud-role-cruds')
export const crudRoleUserApi = createCrudApi<
  CrudRoleUserDto,
  CrudRoleUserCreateDto,
  CrudRoleUserUpdateDto,
  CrudRoleUserQueryDto
>('/v1/auth/crud-role-users')
export const dataRoleApi = withAll(
  createCrudApi<DataRoleDto, DataRoleCreateDto, DataRoleUpdateDto, DataRoleQueryDto>(
    '/v1/auth/data-roles'
  ),
  { all: true }
)
export const dataRoleUserApi = createCrudApi<
  DataRoleUserDto,
  DataRoleUserCreateDto,
  DataRoleUserUpdateDto,
  DataRoleUserQueryDto
>('/v1/auth/data-role-users')
export const companyApi = createCrudApi<
  CompanyDto,
  CompanyCreateDto,
  CompanyUpdateDto,
  CompanyQueryDto
>('/v1/bzss/companies')
export const projectApi = createCrudApi<
  ProjectDto,
  ProjectCreateDto,
  ProjectUpdateDto,
  ProjectQueryDto
>('/v1/bzss/projects')
export const departmentApi = createCrudApi<
  DepartmentDto,
  DepartmentCreateDto,
  DepartmentUpdateDto,
  DepartmentQueryDto
>('/v1/unit/departments')
export const employeeApi = createCrudApi<
  EmployeeDto,
  EmployeeCreateDto,
  EmployeeUpdateDto,
  EmployeeQueryDto
>('/v1/unit/employees')
