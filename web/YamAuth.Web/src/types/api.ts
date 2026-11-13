export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
  traceId: string
}

export interface PagedResult<T> {
  total: number
  items: T[]
}

/** 查询省略字段时由服务端应用分页默认值。 */
export interface PagedQuery {
  page?: number
  size?: number
  keyword?: string | null
}
