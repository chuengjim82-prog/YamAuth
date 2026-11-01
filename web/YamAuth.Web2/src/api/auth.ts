import { apiGet, apiPost } from './request'
import type { LoginResult, MenuNode } from '@/types'

export function login(userName: string, password: string) {
  return apiPost<LoginResult>('/api/v1/auth/login', { userName, password })
}

export function fetchMenuTree() {
  return apiGet<MenuNode[]>('/api/v1/auth/menus')
}
