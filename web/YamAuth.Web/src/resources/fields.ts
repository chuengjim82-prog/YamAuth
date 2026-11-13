import type { FormItemProps } from 'antd'
import type {
  Entity,
  FieldDef,
  FieldOptions,
  FieldReadValue,
  FormFieldBinding,
  FormFieldDef
} from './types'

export function fieldsFor<E extends Entity, F extends object>() {
  return {
    id: {
      name: 'id',
      label: '编号',
      kind: 'number',
      form: false,
      read: (row: E) => row.id,
      initialValue: () => undefined
    } satisfies FieldDef<E, F>,
    form<K extends Extract<keyof F, string>>(
      name: K & NonNullable<FormItemProps<F>['name']>,
      label: string,
      options: NoInfer<FieldOptions<F[K]>>,
      read: (row: E) => NoInfer<FieldReadValue<E, K>>
    ): FormFieldDef<E, F, K> {
      const binding: FormFieldBinding<E, F, K> = {
        name,
        formName: name,
        label,
        form: true,
        read,
        initialValue: (values) => values[name]
      }
      return Object.assign({}, options, binding, {
        table: options.table ?? options.kind !== 'password'
      })
    }
  }
}
