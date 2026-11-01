import { apiGet, apiPost } from './request'
import type { LoginResult, MenuNode } from '@/types'

export function login(userName: string, password: string) {
  return apiPost<LoginResult>('/v1/auth/login', { userName, password })
}

export function fetchMenuTree() {
  return apiGet<MenuNode[]>('/v1/auth/menus')
}
