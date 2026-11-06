/** 明确处理接口中的标量、JSON 数组和普通对象，保持原有字段文本及搜索结果。 */
export function fieldText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item: unknown) => (item == null ? '' : fieldText(item))).join(',')
  }
  if (value instanceof Date) return value.toString()
  if (typeof value === 'object' && value !== null) return Object.prototype.toString.call(value)
  return String(value)
}
