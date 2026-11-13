import { apiDelete, apiGet, apiPost, apiPut } from './request'
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

export function createCrudApi<TEntity, TCreate, TUpdate, TQuery extends PagedQuery>(
  basePath: string
): CrudApi<TEntity, TCreate, TUpdate, TQuery> {
  return {
    page: (query) => apiGet<PagedResult<TEntity>, TQuery>(basePath, query),
    detail: (id) => apiGet<TEntity | null>(`${basePath}/${id}`),
    create: (data) => apiPost<number, TCreate>(basePath, data),
    update: async (id, data) => {
      await apiPut<null, TUpdate>(`${basePath}/${id}`, data)
    },
    remove: async (id) => {
      await apiDelete<null>(`${basePath}/${id}`)
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
