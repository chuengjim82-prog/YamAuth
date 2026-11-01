import { fetchMenuTree } from '@/api/auth'
import { ensureDynamicRoutes, routeState } from '@/router/dynamic'
import { useMenuStore } from '@/stores/menu'
import { useUserStore } from '@/stores/user'
import { localizeMenuTree } from '@/utils/menuI18n'
import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'

const staticRoutes: RouteRecordRaw[] = [
  { path: '/login', component: () => import('@/views/login/Login.vue') },
  {
    path: '/',
    name: 'Default',
    component: () => import('@/layouts/DefaultLayout.vue'),
    redirect: '/home',
    children: [
      { path: 'home', component: () => import('@/views/home/Home.vue') },
      { path: '403', component: () => import('@/views/error/403.vue') },
      {
        path: ':pathMatch(.*)*',
        name: 'DefaultCatchAll',
        component: () => import('@/views/layout/RouteCatchAll.vue'),
      },
    ],
  },
]

const router = createRouter({ history: createWebHistory(), routes: staticRoutes })
const publicPaths = new Set(['/login'])

router.beforeEach(async (to) => {
  const user = useUserStore()
  if (publicPaths.has(to.path)) { routeState.navigating = false; return true }
  if (!user.token) { routeState.loaded = false; routeState.navigating = false; return '/login' }

  if (!routeState.loaded) {
    routeState.navigating = true
    try {
      const menu = useMenuStore()
      await ensureDynamicRoutes(router, async () => {
        const tree = localizeMenuTree(await fetchMenuTree())
        menu.setTree(tree)
        return tree
      })
      return to.fullPath
    } catch {
      user.clearLocal(); routeState.loaded = false; routeState.navigating = false; return '/login'
    }
  }
  return true   // 去权限：登录后一律放行
})

router.afterEach(() => { routeState.navigating = false })
router.onError(() => { routeState.navigating = false })

export default router
