import type { MenuNode } from '@/stores/menu'
import { reactive } from 'vue'
import type { Router } from 'vue-router'

const viewModules = import.meta.glob('/src/views/**/*.vue')

export const routeState = reactive({
  loaded: false,
  navigating: false,
})

const registeredRouteNames = new Set<string>()
const prefetchedUrls = new Set<string>()

function kebabToPascalCase(value: string) {
  return value
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('')
}

function resolveViewLoader(menuUrl: string): () => Promise<any> {
  const directKey = `/src/views${menuUrl}.vue`

  const segments = menuUrl.split('/').filter(Boolean)
  const lastSegment = segments.pop() || ''
  const parentPath = segments.length ? `/${segments.join('/')}` : ''
  const pascalName = kebabToPascalCase(lastSegment)
  const pascalKey = `/src/views${parentPath}/${pascalName}.vue`

  const indexKey = `/src/views${menuUrl}/index.vue`

  // 处理 /home → /src/views/home/Home.vue 这类情况
  const subPascalKey = `/src/views${parentPath}/${lastSegment}/${pascalName}.vue`

  // 支持 *List.vue 模式（如 /auth/users → User/UserList.vue）
  const listKey = `/src/views${parentPath}/${pascalName}List.vue`
  // 处理复数 URL → 单数文件夹（如 /auth/users → User/UserList.vue）
  const singularPascal = pascalName.endsWith('s') ? pascalName.slice(0, -1) : pascalName
  // const singularFolder = lastSegment.endsWith('s') ? lastSegment.slice(0, -1) : lastSegment
  const listKeySingular = `/src/views${parentPath}/${singularPascal}/${singularPascal}List.vue`

  const loader = viewModules[directKey] || viewModules[pascalKey] || viewModules[indexKey] || viewModules[subPascalKey] || viewModules[listKey] || viewModules[listKeySingular]

  if (!loader) {
    console.warn(`Missing view for menuUrl ${menuUrl}`)
    return () => import('@/views/error/404.vue')
  }
  return loader as () => Promise<any>
}

function urlToComponent(menuUrl: string) {
  const loader = resolveViewLoader(menuUrl)
  return () =>
    loader().catch((err) => {
      console.error(`Failed to load view for ${menuUrl}`, err)
      return import('@/views/error/404.vue')
    })
}

function collectMenuUrls(tree: MenuNode[]): string[] {
  const urls: string[] = []
  function walk(nodes: MenuNode[]) {
    for (const node of nodes) {
      if (node.menuUrl && node.menuUrl !== '/home') urls.push(node.menuUrl)
      if (node.children?.length) walk(node.children)
    }
  }
  walk(tree)
  return urls
}

export function prefetchMenuComponent(menuUrl: string) {
  if (!menuUrl || prefetchedUrls.has(menuUrl)) return
  prefetchedUrls.add(menuUrl)
  void resolveViewLoader(menuUrl)()
}

export function resetDynamicRoutes(router: Router) {
  for (const name of registeredRouteNames) {
    router.removeRoute(name)
  }
  registeredRouteNames.clear()
  prefetchedUrls.clear()
  routeState.loaded = false
}

export function loadDynamicRoutes(router: Router, tree: MenuNode[]) {
  const nextNames = new Set<string>()

  function add(node: MenuNode, parent = 'Default') {
    if (node.menuUrl && node.menuUrl !== '/home') {
      const name = `Menu_${node.id}`
      if (router.hasRoute(name)) {
        router.removeRoute(name)
      }
      router.addRoute(parent, {
        name,
        path: node.menuUrl.replace(/^\//, ''),
        component: urlToComponent(node.menuUrl),
        meta: { title: node.menuName, menuUrl: node.menuUrl },
      })
      nextNames.add(name)
    }
    node.children.forEach((c) => add(c, parent))
  }

  tree.forEach((n) => add(n))

  for (const name of [...registeredRouteNames]) {
    if (!nextNames.has(name)) {
      router.removeRoute(name)
      registeredRouteNames.delete(name)
    }
  }
  for (const name of nextNames) {
    registeredRouteNames.add(name)
  }

  routeState.loaded = true
  for (const url of collectMenuUrls(tree)) {
    if (url !== '/home') {
      prefetchMenuComponent(url)
    }
  }
}

let ensureRoutesPromise: Promise<void> | null = null

export function ensureDynamicRoutes(router: Router, loader: () => Promise<MenuNode[]>): Promise<void> {
  if (routeState.loaded) {
    return Promise.resolve()
  }
  if (!ensureRoutesPromise) {
    ensureRoutesPromise = loader()
      .then((tree) => {
        loadDynamicRoutes(router, tree)
      })
      .finally(() => {
        ensureRoutesPromise = null
      })
  }
  return ensureRoutesPromise
}
