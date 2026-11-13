import { apiDelete, apiGet, apiPost, apiPut, invalidApiResponse } from './request'
import type { PagedQuery, PagedResult } from '@/types/api'

export interface EntityReader<TEntity> {
  page: (query: PagedQuery) => Promise<PagedResult<TEntity>>
  detail: (id: number) => Promise<TEntity | null>
}

export interface CrudApi<TEntity, TCreate, TUpdate, TQuery extends PagedQuery> {
  page: (query: TQuery) => Promise<PagedResult<TEntity>>
  detail: (id: number) => Promise<TEntity | null>
  create: (data: TCreate) => Promise<number>
  update: (id: number, data: TUpdate) => Promise<void>
  remove: (id: number) => Promise<void>
}

function isEntity(value: unknown) {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'id' in value &&
    typeof value.id === 'number' &&
    Number.isSafeInteger(value.id) &&
    value.id > 0
  )
}

function isPage(value: unknown) {
  return (
    !!value &&
    typeof value === 'object' &&
    'total' in value &&
    typeof value.total === 'number' &&
    Number.isSafeInteger(value.total) &&
    value.total >= 0 &&
    'items' in value &&
    Array.isArray(value.items) &&
    value.items.every(isEntity)
  )
}

export function createCrudApi<TEntity, TCreate, TUpdate, TQuery extends PagedQuery>(
  basePath: string
): CrudApi<TEntity, TCreate, TUpdate, TQuery> {
  return {
    page: async (query) => {
      const result = await apiGet<PagedResult<TEntity>, TQuery>(basePath, query)
      if (!isPage(result)) return invalidApiResponse()
      return result
    },
    detail: async (id) => {
      const result = await apiGet<TEntity | null>(`${basePath}/${id}`)
      if (result !== null && !isEntity(result)) return invalidApiResponse()
      return result
    },
    create: async (data) => {
      const result = await apiPost<number, TCreate>(basePath, data)
      if (!Number.isSafeInteger(result) || result <= 0) return invalidApiResponse()
      return result
    },
    update: async (id, data) => {
      const result = await apiPut<null, TUpdate>(`${basePath}/${id}`, data)
      if (result !== null) invalidApiResponse()
    },
    remove: async (id) => {
      const result = await apiDelete<null>(`${basePath}/${id}`)
      if (result !== null) invalidApiResponse()
    }
  }
}

/** 仅为查询契约声明 all 的树资源绑定全量查询能力，参数不能反向扩大契约。 */
export function withAll<TEntity, TCreate, TUpdate, TQuery extends PagedQuery>(
  api: CrudApi<TEntity, TCreate, TUpdate, TQuery>,
  query: NoInfer<TQuery & ('all' extends keyof TQuery ? { all: true } : never)>
) {
  return { ...api, all: () => api.page(query) }
}
