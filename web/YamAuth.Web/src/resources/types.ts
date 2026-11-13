import type { Dayjs } from 'dayjs'
import type { FormItemProps } from 'antd'
import type { CrudApi } from '@/api/crud'
import type { PagedQuery, PagedResult } from '@/types/api'

export interface Entity {
  id: number
}
type StringControl = 'httpMethod' | 'menuType'
type NumberControl =
  'tenant' | 'department' | 'crudInfo' | 'app' | 'user' | 'crudRole' | 'dataRole' | 'crudInfoId'
interface FieldOptionsBase {
  required?: boolean
  table?: boolean
  nullable?: boolean
}
/** 控件必须接受该表单字段的值类型；NoInfer 防止错误控件反向扩大字段名。 */
export type FieldOptions<T> = FieldOptionsBase &
  (NonNullable<T> extends number
    ? { kind: 'number'; formControl?: NumberControl }
    : NonNullable<T> extends boolean
      ? { kind: 'bool'; formControl?: never }
      : NonNullable<T> extends Dayjs
        ? { kind: 'date'; formControl?: never }
        : NonNullable<T> extends string
          ? { kind: 'string' | 'password' | 'textarea' | 'icon'; formControl?: StringControl }
          : never)

interface IdFieldDef<E> extends FieldOptionsBase {
  name: 'id'
  formName?: never
  label: string
  kind: 'number'
  form: false
  formControl?: never
  read: (row: E) => number
  initialValue: () => undefined
}

// 读取值沿用响应字段的空值及日期类型；仅表单存在的字段没有响应值。
export type FieldReadValue<E, K> = K extends keyof E ? E[K] : undefined
export interface FormFieldBinding<E, F, K extends Extract<keyof F, string>> {
  name: K
  formName: K & NonNullable<FormItemProps<F>['name']>
  label: string
  form: true
  read: (row: E) => FieldReadValue<E, K>
  initialValue: (values: F) => F[K]
}
export type FormFieldDef<E, F, K extends Extract<keyof F, string>> = FieldOptions<F[K]> &
  FormFieldBinding<E, F, K>

/** 按字段名保留值与控件的关联，直接配置或展开已有字段也必须满足该关联。 */
export type FieldDef<E, F> =
  | IdFieldDef<E>
  | {
      [K in Extract<keyof F, string>]-?: FormFieldDef<E, F, K>
    }[Extract<keyof F, string>]

export interface TreeConfig<E> {
  nameField: Extract<keyof E, string>
  searchFields: Extract<keyof E, string>[]
  labelFields?: Extract<keyof E, string>[]
  parentSearchFields?: Extract<keyof E, string>[]
  parentId: (row: E) => number | null
  sortIndex?: (row: E) => number | null
  appId?: (row: E) => number | null
}

/** 保留联动字段名与值类型的对应关系，仅在新增且用户未手动选择时应用。 */
type ParentDefault<F> = {
  [K in Extract<keyof F, string>]: {
    field: K & NonNullable<FormItemProps<F>['name']>
    value: (parentId: number) => F[K]
  }
}[Extract<keyof F, string>]

export interface TreeDef<E, F> extends TreeConfig<E> {
  form: {
    parentField: Extract<keyof F, string> & NonNullable<FormItemProps<F>['name']>
    parentId: (values: F) => number | null | undefined
    appField?: Extract<keyof F, string>
    appId?: (values: F) => number | null
    child: (values: F, parent: E) => F
    defaultFromParent?: ParentDefault<F>
  }
}

export interface ResourceDef<E extends Entity, F extends object, C, U> {
  path: string
  title: string
  fields: FieldDef<E, F>[]
  api: Pick<CrudApi<E, C, U, PagedQuery>, 'create' | 'update' | 'remove'>
  load: (page: number, size: number, keyword: string) => Promise<PagedResult<E>>
  toForm: (row?: E) => F
  toCreate: (values: F) => C
  toUpdate: (values: F) => U
  relations?: {
    tenantId?: (row: E) => number | null
    departmentId?: (row: E) => number | null
    appsId?: (row: E) => number | null
    userId?: (row: E) => number | null
    crudRoleId?: (row: E) => number | null
    dataRoleId?: (row: E) => number | null
    crudInfoId?: (row: E) => number | null
    crudId?: (row: E) => number | null
  }
  tree?: TreeDef<E, F>
}

export interface ResourcePageProps {
  size: number
  onSizeChange: (size: number) => void
}
