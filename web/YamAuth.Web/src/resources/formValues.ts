/** 表单清空的中间态不能冒充非空接口字段。 */
export class FormValueError extends Error {}

export function requiredNumber(value: number | null | undefined, label: string): number {
  if (value == null || !Number.isFinite(value)) {
    throw new FormValueError(`请填写${label}`)
  }
  return value
}
