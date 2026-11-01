export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
  traceId: string
}

export interface LoginResult {
  token: string
  expiresIn: number
  userName: string
  nickName: string
}

export interface UserInfo {
  userName: string
  nickName: string
}

export interface MenuNode {
  id: number
  parentId: number
  menuName: string
  menuUrl: string
  menuIcon: string
  children: MenuNode[]
}

export interface PagedResult<T> {
  total: number
  items: T[]
}

export type Row = Record<string, unknown>
