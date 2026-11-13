import type { AppsInfoDto, UserDto } from '@/types/auth'
export type AppOption = Pick<AppsInfoDto, 'id' | 'parentId' | 'appsName'>
export type UserOption = Pick<UserDto, 'id' | 'userName'>

export function appLabel(app: AppOption) {
  return `${app.appsName?.trim() || '未命名应用'}（${app.id}）`
}

export function userLabel(user: UserOption) {
  return `${user.userName.trim() || '未命名用户'}（${user.id}）`
}
