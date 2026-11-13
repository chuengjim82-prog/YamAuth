/** 表单清空的中间态不能冒充非空接口字段。 */
export class FormValueError extends Error {}

export type NumberKind = 'int32' | 'safeInteger'
/** 手工输入先保留十进制文本，通过校验后才转换为传输用的 number。 */
export type IntegerInputValue = number | string | null

export function integerError(
  value: unknown,
  label: string,
  kind: NumberKind,
  required = false
): string | null {
  if (value == null) return required ? `请填写${label}` : null
  if (typeof value === 'string' && !/^[+-]?\d+$/.test(value))
    return `${label}必须是安全范围内的整数`
  const number = typeof value === 'string' ? Number(value) : value
  if (typeof number !== 'number' || !Number.isSafeInteger(number))
    return `${label}必须是安全范围内的整数`
  if (kind === 'int32' && (number < -2147483648 || number > 2147483647))
    return `${label}必须在 -2147483648 至 2147483647 之间`
  return null
}

export function requiredNumber(
  value: IntegerInputValue | undefined,
  label: string,
  kind: NumberKind = 'safeInteger'
): number {
  const error = integerError(value, label, kind, true)
  if (error) throw new FormValueError(error)
  if (value == null) throw new FormValueError(`请填写${label}`)
  return typeof value === 'string' ? Number(value) : value
}

export function nullableNumber(
  value: IntegerInputValue | undefined,
  label: string,
  kind: NumberKind = 'safeInteger'
): number | null {
  return value == null ? null : requiredNumber(value, label, kind)
}
