// 仅供隔离浏览器验收：同一端口提供 Vite 和模拟接口，不连接真实后端。
import { createServer as createHttpServer } from 'node:http'
import { createServer } from 'vite'
let mode = 'member'
let revoked = false
const requests = []
const me = (contextId = null) => ({
  id: 3,
  userName: 'preview',
  nickName: '验收用户',
  avatar: '',
  phone: '',
  email: 'preview@example.test',
  identity:
    mode === 'platform'
      ? 'PlatformAdministrator'
      : mode === 'manager'
        ? 'TenantAdministrator'
        : 'Member',
  mustChangePassword: mode === 'password',
  accountTenantId: mode === 'platform' ? null : 1,
  tenantId: mode === 'platform' && !contextId ? null : 1,
  tenantName: mode === 'platform' && !contextId ? null : '验收租户',
  contextId
})
const row = {
  id: 101,
  tenantId: 1,
  projCode: 'A101',
  projName: '本人项目',
  remark: '',
  ownerUserId: 3,
  ownerDepartmentId: 10,
  rowVersion: 'AAAAAAAAAAE=',
  allowedActions: ['update', 'transfer'],
  relatedLabels: { tenant: '验收租户', ownerUser: '验收用户', ownerDepartment: '开发部' }
}
const server = createHttpServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost')
  if (url.pathname === '/__fixture') {
    if (url.searchParams.has('mode')) mode = url.searchParams.get('mode')
    if (url.searchParams.has('revoked')) revoked = url.searchParams.get('revoked') === 'true'
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify({ mode, revoked, requests }))
    return
  }
  if (!url.pathname.startsWith('/api/')) {
    vite.middlewares(request, response)
    return
  }
  requests.push({
    path: url.pathname,
    method: request.method,
    context: request.headers['x-yamauth-context'] ?? null
  })
  let data = null,
    status = 200
  const path = url.pathname.slice(4)
  const contextId = request.headers['x-yamauth-context'] ?? null
  const version = mode === 'platform' && !contextId ? 0 : revoked ? 2 : 1
  response.setHeader('X-YamAuth-Authorization-Version', String(version))
  response.setHeader('X-YamAuth-Catalog-Version', '1')
  if (path === '/v1/auth/login')
    data = {
      token: 'isolated-preview-session',
      expiresIn: 3600,
      userName: 'preview',
      nickName: '验收用户'
    }
  else if (path === '/v1/auth/me') data = me(contextId)
  else if (path === '/v1/auth/access')
    data = {
      me: me(contextId),
      appsId: 100,
      authorizationVersion: version,
      catalogVersion: 1,
      permissions: revoked
        ? []
        : ['read', 'update', 'create', 'transfer'].map((action) => ({
            code: `bzss.projects.${action}`,
            self: action !== 'read',
            tenantAll: action === 'read',
            departmentIds: []
          })),
      menus: revoked
        ? []
        : [
            {
              id: 1,
              parentId: 0,
              menuName: '项目管理',
              menuUrl: '/bzss/projects',
              menuIcon: '',
              children: []
            }
          ]
    }
  else if (path === '/v1/bzss/projects' && request.method === 'GET') {
    if (revoked) status = 403
    else
      data = {
        total: 2,
        items: [
          row,
          { ...row, id: 102, projCode: 'A102', projName: '他人项目', allowedActions: [] }
        ]
      }
  } else if (path.startsWith('/v1/bzss/projects/') && request.method === 'PUT') data = null
  else if (path === '/v1/auth/candidates')
    data = {
      total: 1,
      items: [
        {
          id:
            url.searchParams.get('kind') === 'tenant'
              ? 1
              : url.searchParams.get('kind') === 'department'
                ? 10
                : 3,
          label:
            url.searchParams.get('kind') === 'tenant'
              ? '验收租户'
              : url.searchParams.get('kind') === 'department'
                ? '开发部'
                : '验收用户'
        }
      ]
    }
  else if (path === '/v1/auth/tenant-contexts' && request.method === 'POST')
    data = {
      id: '00000000-0000-4000-8000-000000000001',
      tenantId: 1,
      expiresAt: '2099-01-01T00:00:00Z'
    }
  else if (path.startsWith('/v1/auth/tenant-contexts/') && request.method === 'DELETE') data = null
  else if (
    path === '/v1/auth/me/profile' ||
    path === '/v1/auth/me/email' ||
    path === '/v1/auth/change-password' ||
    path === '/v1/auth/logout'
  )
    data = null
  else status = 403
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json')
  response.end(
    JSON.stringify({
      code: status === 200 ? 0 : status,
      message: status === 200 ? 'OK' : '没有执行该操作的权限',
      data
    })
  )
})
const vite = await createServer({
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api') },
  server: { middlewareMode: true, ws: { server } },
  appType: 'spa'
})
server.listen(42731, '127.0.0.1', () => console.log('授权模拟验收：http://127.0.0.1:42731'))
async function stop() {
  await vite.close()
  server.close()
  process.exit()
}
process.on('SIGINT', () => void stop())
process.on('SIGTERM', () => void stop())
