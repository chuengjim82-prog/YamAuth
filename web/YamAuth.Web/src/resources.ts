export type FieldKind = 'string' | 'number' | 'bool' | 'date' | 'password' | 'textarea' | 'icon'

export interface FieldDef {
  name: string
  label: string
  kind: FieldKind
  /** 新建时必填。更新时密码类字段留空表示不修改。 */
  required?: boolean
  table?: boolean
  form?: boolean
  nullable?: boolean
  /** 仅对显式配置的字段使用关联选择器，保留原有数据类型。 */
  formControl?: 'tenant' | 'department'
}

export interface ResourceDef {
  path: string
  api: string
  title: string
  fields: FieldDef[]
  /** 显式启用层级管理，不能仅凭存在 parentId 自动推断业务。 */
  tree?: TreeDef
}

export interface TreeDef {
  nameField: string
  searchFields: string[]
  appScoped?: boolean
}

function f(
  name: string,
  label: string,
  kind: FieldKind = 'string',
  extra: Partial<FieldDef> = {},
): FieldDef {
  return {
    name,
    label,
    kind,
    table: kind !== 'password',
    form: name !== 'id',
    ...extra,
  }
}

const id = f('id', '编号', 'number', { form: false })
const tenantId = f('tenantId', '租户', 'number', { nullable: true })
const remark = f('remark', '备注', 'textarea')

export const resources: ResourceDef[] = [
  {
    path: '/auth/users',
    api: '/v1/auth/users',
    title: '用户',
    fields: [
      id,
      tenantId,
      f('userName', '用户名', 'string', { required: true }),
      f('nickName', '昵称', 'string', { required: true }),
      f('password', '密码', 'password', { required: true }),
      f('avatar', '头像'),
      f('phone', '电话'),
      f('email', '邮箱', 'string', { required: true }),
      f('isAdmin', '管理员', 'bool'),
      f('isActived', '启用', 'bool'),
      remark,
    ],
  },
  {
    path: '/auth/tenants',
    api: '/v1/auth/tenants',
    title: '租户',
    fields: [
      id,
      f('tenantCode', '租户编码'),
      f('tenantName', '租户名称'),
      f('isActived', '启用', 'bool'),
      remark,
    ],
  },
  {
    path: '/auth/apps-infos',
    api: '/v1/auth/apps-infos',
    title: '应用',
    fields: [
      id,
      tenantId,
      f('parentId', '上级', 'number', { nullable: true }),
      f('appsCode', '应用编码'),
      f('appsName', '应用名称'),
      f('appKey', 'AppKey', 'string', { required: true }),
      f('appSecret', '密钥', 'password', { required: true, table: false }),
      remark,
    ],
  },
  {
    path: '/auth/apps-users',
    api: '/v1/auth/apps-users',
    title: '应用用户',
    fields: [
      id,
      tenantId,
      f('appsId', '应用', 'number', { nullable: true }),
      f('userId', '用户', 'number', { nullable: true }),
      f('isAdmin', '管理员', 'bool'),
      remark,
    ],
  },
  {
    path: '/auth/crud-infos',
    api: '/v1/auth/crud-infos',
    title: '功能',
    tree: {
      nameField: 'crudName',
      appScoped: true,
      searchFields: ['crudName', 'crudCode', 'remark', 'creatorNic', 'updaterNic', 'deleterNic'],
    },
    fields: [
      id,
      f('appsId', '应用', 'number', { nullable: true }),
      f('parentId', '上级', 'number'),
      f('crudName', '功能名称'),
      f('crudCode', '功能编码', 'string', { required: true }),
      f('crudType', '功能类型', 'number'),
      f('sortIndex', '排序', 'number'),
      remark,
    ],
  },
  {
    path: '/auth/crud-items',
    api: '/v1/auth/crud-items',
    title: '功能接口',
    fields: [
      id,
      f('crudId', '功能', 'number', { nullable: true }),
      f('parentId', '上级', 'number'),
      f('method', '方法', 'string', { required: true }),
      f('apiPath', '接口路径'),
      remark,
    ],
  },
  {
    path: '/auth/crud-menus',
    api: '/v1/auth/crud-menus',
    title: '菜单',
    tree: {
      nameField: 'menuName',
      searchFields: ['menuCode', 'menuName', 'menuType', 'iconName', 'routePath', 'redirect', 'remark', 'creatorNic', 'updaterNic', 'deleterNic'],
    },
    fields: [
      id,
      f('crudId', '功能', 'number', { nullable: true }),
      f('parentId', '上级', 'number'),
      f('menuCode', '菜单编码', 'string', { required: true }),
      f('menuName', '菜单名称'),
      f('menuType', '菜单类型', 'string', { required: true }),
      f('iconName', '图标', 'icon', { required: true }),
      f('routePath', '路由'),
      f('redirect', '重定向'),
      f('openType', '打开方式', 'bool', { nullable: true }),
      f('sortIndex', '排序', 'number'),
      f('isHided', '隐藏', 'bool'),
      f('allowAny', '匿名访问', 'bool'),
      remark,
    ],
  },
  {
    path: '/auth/crud-roles',
    api: '/v1/auth/crud-roles',
    title: '功能角色',
    fields: [
      id,
      tenantId,
      f('appsId', '应用', 'number', { nullable: true }),
      f('parentId', '上级', 'number'),
      f('roleCode', '角色编码'),
      f('roleName', '角色名称', 'string', { required: true }),
      f('sortIndex', '排序', 'number', { nullable: true }),
      f('isSystem', '系统角色', 'bool'),
      remark,
    ],
  },
  {
    path: '/auth/crud-role-cruds',
    api: '/v1/auth/crud-role-cruds',
    title: '角色功能',
    fields: [
      id,
      f('crudRoleId', '功能角色', 'number', { required: true }),
      f('crudInfoId', '功能', 'number', { required: true }),
    ],
  },
  {
    path: '/auth/crud-role-users',
    api: '/v1/auth/crud-role-users',
    title: '角色用户',
    fields: [
      id,
      f('roleId', '角色', 'number', { required: true }),
      f('userId', '用户', 'number', { required: true }),
    ],
  },
  {
    path: '/auth/data-roles',
    api: '/v1/auth/data-roles',
    title: '数据角色',
    fields: [
      id,
      tenantId,
      f('appsId', '应用', 'number', { nullable: true }),
      f('parentId', '上级', 'number'),
      f('roleCode', '角色编码'),
      f('roleName', '角色名称', 'string', { required: true }),
      f('sortIndex', '排序', 'number', { nullable: true }),
      f('isSystem', '系统角色', 'bool'),
      remark,
    ],
  },
  {
    path: '/auth/data-role-users',
    api: '/v1/auth/data-role-users',
    title: '数据角色用户',
    fields: [
      id,
      f('roleId', '角色', 'number', { required: true }),
      f('userId', '用户', 'number', { required: true }),
    ],
  },
  {
    path: '/bzss/companies',
    api: '/v1/bzss/companies',
    title: '公司',
    fields: [
      id,
      { ...tenantId, formControl: 'tenant' },
      f('nameCn', '中文名'),
      f('nameEn', '英文名'),
      f('registratioNo', '注册号'),
      f('legalName', '法人'),
      f('countryId', '国家', 'number', { nullable: true }),
      f('regDate', '注册日期', 'date'),
      f('classify', '分类', 'number', { nullable: true }),
      f('currency', '币种'),
      remark,
    ],
  },
  {
    path: '/bzss/projects',
    api: '/v1/bzss/projects',
    title: '项目',
    fields: [
      id,
      { ...tenantId, formControl: 'tenant' },
      f('projCode', '项目编码'),
      f('projName', '项目名称'),
      remark,
    ],
  },
  {
    path: '/unit/departments',
    api: '/v1/unit/departments',
    title: '部门',
    fields: [
      id,
      { ...tenantId, formControl: 'tenant' },
      f('deptName', '部门名称'),
      f('empCount', '人数', 'number', { nullable: true }),
      f('directorId', '负责人', 'number', { nullable: true }),
      remark,
    ],
  },
  {
    path: '/unit/employees',
    api: '/v1/unit/employees',
    title: '员工',
    fields: [
      id,
      f('departmentId', '部门', 'number', { nullable: true, formControl: 'department' }),
      f('userId', '用户', 'number', { nullable: true }),
      remark,
    ],
  },
]

export function findResource(pathname: string) {
  return resources.find((item) => item.path === pathname)
}
