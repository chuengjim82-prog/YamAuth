import assert from 'node:assert/strict'
import path from 'node:path'
import ts from 'typescript'

// 在内存中编译反例，不把故意非法的代码写入业务源码，也不依赖忽略诊断指令。
const configPath = path.resolve('tsconfig.app.json')
const loaded = ts.readConfigFile(configPath, ts.sys.readFile)
assert.equal(loaded.error, undefined)
const config = ts.parseJsonConfigFileContent(loaded.config, ts.sys, process.cwd())
const probePath = path.resolve('src/__type_contract_probe__.ts')
const cases = [
  {
    name: '原文数字输入不能绑定只接受 number 的关联选择器',
    code: "fieldsFor<CompanyDto, CompanyForm>().form('countryId', '国家', { kind: 'number', numberKind: 'safeInteger', formControl: 'tenant' }, row => row.countryId)"
  },
  {
    name: '原文数字表单不能直接作为数字 DTO 提交',
    code: "companyApi.create({ ...companyToCreate(companyForm), countryId: '1' })"
  },
  {
    name: '数字字段必须声明后端整数范围',
    code: "field.form('tenantId', '租户', { kind: 'number' }, row => row.tenantId)"
  },
  {
    name: '整数范围不能使用未知类型',
    code: "field.form('tenantId', '租户', { kind: 'number', numberKind: 'float' }, row => row.tenantId)"
  },
  {
    name: '菜单新增不能提交任意字符串',
    code: "crudMenuApi.create({ ...menuCreate, menuType: 'page' })"
  },
  {
    name: '菜单编辑不能提交空类型',
    code: 'crudMenuApi.update(1, { ...menuCreate, menuType: undefined })'
  },
  {
    name: '菜单表单不能传入非枚举值',
    code: "const invalid: CrudMenuForm = { ...menuForm, menuType: 'other' }; void invalid"
  },

  {
    name: '不存在的字段名',
    code: "field.form('missing', '不存在', { kind: 'string' }, () => undefined)"
  },
  {
    name: '数字字段不能使用文本控件',
    code: "field.form('tenantId', '租户', { kind: 'string' }, row => row.tenantId)"
  },
  {
    name: '字符串字段不能使用租户选择器',
    code: "field.form('userName', '用户名', { kind: 'string', formControl: 'tenant' }, row => row.userName)"
  },
  {
    name: '文本字段不能读取布尔属性',
    code: "field.form('userName', '用户名', { kind: 'string' }, row => row.isAdmin)"
  },
  {
    name: '非空响应字段不能读取 undefined',
    code: "field.form('userName', '用户名', { kind: 'string' }, () => undefined)"
  },
  {
    name: '仅表单存在的密码字段不能读取其他响应属性',
    code: "field.form('password', '密码', { kind: 'password' }, row => row.nickName)"
  },
  {
    name: '展开字段配置不能将文本字段改为数字控件',
    code: "const invalid: FieldDef<UserDto, UserForm> = { ...userNameField, kind: 'number' }; void invalid"
  },
  {
    name: '展开字段配置不能将文本字段改为关联选择器',
    code: "const invalid: FieldDef<UserDto, UserForm> = { ...userNameField, formControl: 'tenant' }; void invalid"
  },
  {
    name: '展开字段配置不能替换为不匹配的读取函数',
    code: 'const invalid: FieldDef<UserDto, UserForm> = { ...userNameField, read: row => row.isAdmin }; void invalid'
  },
  {
    name: '新增用户不能省略密码',
    code: 'const { password, ...withoutPassword } = userCreate; void password; userApi.create(withoutPassword)'
  },
  { name: '非空用户名称不能提交 null', code: 'userApi.create({ ...userCreate, userName: null })' },
  {
    name: '应用更新仍须提供密钥',
    code: 'const { appSecret, ...withoutSecret } = appUpdate; void appSecret; appsInfoApi.update(1, withoutSecret)'
  },
  { name: '日期表单不能当作传输 DTO', code: 'companyApi.create(companyForm)' },
  { name: '非树资源没有全量查询能力', code: 'userApi.all()' },
  { name: '非树查询不能传入 all', code: 'userApi.page({ all: true })' },
  { name: '不能给非树资源添加全量查询能力', code: 'withAll(userApi, { all: true })' },
  {
    name: '查询变量不能反向扩大非树资源的查询契约',
    code: 'withAll(userApi, allQuery)'
  },
  { name: '全量查询不能配置为 false', code: 'withAll(appsInfoApi, { all: false })' },
  {
    name: '响应可空属性不等于可省略',
    code: 'const { tenantName, ...withoutName } = tenant; void tenantName; const incomplete: TenantDto = withoutName; void incomplete'
  },
  { name: '页面不能把用户对象当作公司表单', code: 'companyToCreate(userForm)' }
]
const prelude = `
import { fieldsFor } from './resources/fields'
import type { FieldDef } from './resources/types'
import { withAll } from './api/crud'
import { userApi, appsInfoApi, companyApi, crudMenuApi } from './api/entities'
import { companyToCreate } from './resources/forms/bzss'
import { CrudMenuType } from './types/auth'
import type { UserDto, UserCreateDto, AppsInfoUpdateDto, TenantDto, CrudMenuCreateDto } from './types/auth'
import type { CompanyDto } from './types/bzss'
import type { UserForm, CrudMenuForm } from './resources/forms/auth'
import type { CompanyForm } from './resources/forms/bzss'
declare const menuCreate: CrudMenuCreateDto
declare const menuForm: CrudMenuForm
crudMenuApi.create({ ...menuCreate, menuType: CrudMenuType.Directory })
crudMenuApi.update(1, { ...menuCreate, menuType: CrudMenuType.Menu })
declare const userCreate: UserCreateDto
declare const userForm: UserForm
declare const companyForm: CompanyForm
declare const appUpdate: AppsInfoUpdateDto
declare const tenant: TenantDto
const field = fieldsFor<UserDto, UserForm>()
const userNameField = field.form('userName', '用户名', { kind: 'string' }, row => row.userName)
const textAreaField: FieldDef<UserDto, UserForm> = { ...userNameField, kind: 'textarea' }
void textAreaField
field.form('password', '密码', { kind: 'password' }, () => undefined)
field.form('remark', '备注', { kind: 'textarea' }, row => row.remark)
fieldsFor<CompanyDto, CompanyForm>().form('regDate', '注册日期', { kind: 'date' }, row => row.regDate)
field.form('tenantId', '租户', { kind: 'number', numberKind: 'safeInteger', formControl: 'tenant' }, row => row.tenantId)
const allQuery = { all: true } as const
withAll(appsInfoApi, allQuery).all()
userApi.update(1, { ...userCreate, password: null })
appsInfoApi.all()
companyApi.create(companyToCreate(companyForm))
companyApi.create(companyToCreate({ ...companyForm, countryId: '9007199254740991', classify: '-1' }))
`
const source = prelude + cases.map(({ code }) => `{ ${code} }`).join('\n')
const firstLine = prelude.split('\n').length - 1
const host = ts.createCompilerHost(config.options)
const originalRead = host.readFile.bind(host)
host.readFile = (filename) =>
  path.resolve(filename) === probePath ? source : originalRead(filename)
const program = ts.createProgram([...config.fileNames, probePath], config.options, host)
// 第三方回调的上下文 any 不一定触发 noImplicitAny，检查自有参数声明防止再次泄漏。
const checker = program.getTypeChecker()
for (const file of program.getSourceFiles()) {
  if (
    !file.fileName.startsWith(path.resolve('src') + path.sep) ||
    file.isDeclarationFile ||
    file.fileName === probePath
  )
    continue
  function visit(node) {
    if (ts.isParameter(node) && checker.getTypeAtLocation(node).flags & ts.TypeFlags.Any) {
      const line = file.getLineAndCharacterOfPosition(node.getStart()).line + 1
      throw new Error(
        `自有回调参数不能隐式使用 any：${file.fileName}:${line} ${node.name.getText()}`
      )
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
}
const diagnostics = ts.getPreEmitDiagnostics(program)
const matched = new Set()
for (const diagnostic of diagnostics) {
  const line = diagnostic.file?.getLineAndCharacterOfPosition(diagnostic.start ?? 0).line
  if (
    diagnostic.file?.fileName === probePath &&
    line >= firstLine &&
    line < firstLine + cases.length
  ) {
    matched.add(line - firstLine)
  } else {
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext([diagnostic], {
        getCurrentDirectory: ts.sys.getCurrentDirectory,
        getCanonicalFileName: (name) => name,
        getNewLine: () => '\n'
      })
    )
  }
}
for (const [index, test] of cases.entries()) {
  assert.ok(matched.has(index), `类型约束失效：${test.name}`)
}
console.log(`通过 ${cases.length} 个编译期契约反例与正例检查`)
