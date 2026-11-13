import type { DepartmentDto } from '@/types/unit'
export type Department = Pick<DepartmentDto, 'id' | 'deptName'>

export function departmentLabel(department: Department) {
  const name = department.deptName?.trim()
  // 部门可能同名，也可能未填写名称，始终用 ID 区分。
  return name ? `${name}（#${department.id}）` : `部门 #${department.id}`
}
