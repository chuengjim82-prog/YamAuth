export interface Department {
  id: number
  deptName?: string | null
}

export function departmentLabel(department: Department) {
  const name = department.deptName?.trim()
  // 部门可能同名，也可能未填写名称，始终用 ID 区分。
  return name ? `${name}（#${department.id}）` : `部门 #${department.id}`
}
