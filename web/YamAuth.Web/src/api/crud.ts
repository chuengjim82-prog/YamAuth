import { apiDelete, apiGet, apiPost, apiPut } from './request'
import type { PagedResult, Row } from '@/types'

export function createCrudApi(basePath: string) {
  return {
    all: () => apiGet<PagedResult<Row>>(basePath, { all: true }),
    page: (page: number, size: number, keyword: string) =>
      apiGet<PagedResult<Row>>(basePath, { page, size, keyword: keyword || undefined }),
    create: (data: Row) => apiPost<number>(basePath, data),
    update: (id: number, data: Row) => apiPut<void>(`${basePath}/${id}`, data),
    remove: (id: number) => apiDelete<void>(`${basePath}/${id}`)
  }
}
