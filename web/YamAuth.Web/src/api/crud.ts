import { request } from '@/utils/request';

export function createCrudApi<TDto, TCreate, TUpdate, TQuery>(basePath: string) {
  return {
    page: (q: TQuery) => request<{ total: number; items: TDto[] }>({ url: basePath, method: 'GET', params: q }),
    get: (id: number) => request<TDto>({ url: `${basePath}/${id}`, method: 'GET' }),
    listChildren: (parentId: number) => request<TDto[]>({ url: `${basePath}/children`, method: 'GET', params: { parentId } }),
    create: (data: TCreate) => request<number>({ url: basePath, method: 'POST', data }),
    update: (id: number, data: TUpdate) => request<void>({ url: `${basePath}/${id}`, method: 'PUT', data }),
    remove: (id: number) => request<void>({ url: `${basePath}/${id}`, method: 'DELETE' })
  };
}
