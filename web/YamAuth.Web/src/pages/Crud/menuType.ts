import { CrudMenuType, isCrudMenuType } from '@/types/auth'

const labels: Record<CrudMenuType, string> = {
  [CrudMenuType.Directory]: '目录',
  [CrudMenuType.Menu]: '菜单'
}

export const crudMenuTypeOptions = Object.values(CrudMenuType).map((value) => ({
  value,
  label: labels[value]
}))

export function crudMenuTypeLabel(value: unknown): string {
  return isCrudMenuType(value) ? labels[value] : '未识别类型'
}
