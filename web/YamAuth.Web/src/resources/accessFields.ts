/** 通用表单只展示该入口允许写入的字段；后端 DTO 和服务再次独立验证。 */
export function editableField(path: string, name: string, editing: boolean) {
  if (name === 'tenantId' || name === 'isSystem' || name === 'allowAny') return false
  if (
    path === '/auth/users' &&
    (name === 'isAdmin' ||
      name === 'isActived' ||
      (editing && (name === 'password' || name === 'email')))
  )
    return false
  if (path === '/unit/employees' && editing && (name === 'userId' || name === 'departmentId'))
    return false
  if (
    (path === '/bzss/companies' || path === '/bzss/projects') &&
    editing &&
    (name === 'ownerUserId' || name === 'ownerDepartmentId')
  )
    return false
  return true
}
