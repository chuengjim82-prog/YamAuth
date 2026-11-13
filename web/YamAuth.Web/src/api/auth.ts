import { apiGet, apiPost } from './request'
import type { LoginRequest, LoginResult, MenuNode } from '@/types/auth'

export function login(userName: string, password: string) {
  return apiPost<LoginResult, LoginRequest>('/v1/auth/login', { userName, password })
}

export function fetchMenuTree() {
  return apiGet<MenuNode[]>('/v1/auth/menus')
}
