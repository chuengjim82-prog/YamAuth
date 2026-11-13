import { apiGet, apiPost, invalidApiResponse } from './request'
import type { LoginRequest, LoginResult, MenuNode } from '@/types/auth'

export async function login(userName: string, password: string) {
  const result = await apiPost<LoginResult, LoginRequest>('/v1/auth/login', { userName, password })
  if (
    !result ||
    typeof result.token !== 'string' ||
    !result.token.trim() ||
    typeof result.userName !== 'string' ||
    !result.userName.trim() ||
    typeof result.nickName !== 'string'
  )
    return invalidApiResponse()
  return result
}

function isMenuNode(value: unknown): value is MenuNode {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'id' in value &&
    typeof value.id === 'number' &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    'parentId' in value &&
    typeof value.parentId === 'number' &&
    Number.isSafeInteger(value.parentId) &&
    'menuName' in value &&
    typeof value.menuName === 'string' &&
    'menuUrl' in value &&
    typeof value.menuUrl === 'string' &&
    'menuIcon' in value &&
    typeof value.menuIcon === 'string' &&
    'children' in value &&
    isMenuTree(value.children)
  )
}

function isMenuTree(value: unknown): value is MenuNode[] {
  return Array.isArray(value) && value.every(isMenuNode)
}

export async function fetchMenuTree() {
  const result = await apiGet<unknown>('/v1/auth/menus')
  if (!isMenuTree(result)) return invalidApiResponse()
  return result
}
