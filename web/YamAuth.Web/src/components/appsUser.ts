export type AppOption = {
  id: number
  parentId: number | null
  appsName: string | null
}

export type UserOption = {
  id: number
  userName: string
}

export function appLabel(app: AppOption) {
  return `${app.appsName?.trim() || '未命名应用'}（${app.id}）`
}

export function userLabel(user: UserOption) {
  return `${user.userName.trim() || '未命名用户'}（${user.id}）`
}
