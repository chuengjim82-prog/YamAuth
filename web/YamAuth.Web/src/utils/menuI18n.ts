import { i18n } from '@/i18n';
import type { MenuNode } from '@/stores/menu';

function urlToKey(menuUrl: string): string {
  return menuUrl.replace(/^\//, '').replace(/\//g, '.').replace(/-/g, '_');
}

/** 非 zh-CN 时，用前端 locale 覆盖菜单名（后端无翻译时的 fallback） */
function resolveMenuName(menuUrl: string, fallback: string): string {
  const locale = i18n.global.locale.value;
  if (String(locale).startsWith('zh')) return fallback;

  if (menuUrl) {
    const urlKey = `menu.byUrl.${urlToKey(menuUrl)}`;
    if (i18n.global.te(urlKey)) return i18n.global.t(urlKey);
  }
  const nameKey = `menu.byName.${fallback}`;
  if (i18n.global.te(nameKey)) return i18n.global.t(nameKey);
  return fallback;
}

function localizeNode(node: MenuNode): MenuNode {
  const children = (node.children ?? []).map(localizeNode);
  return {
    ...node,
    menuName: resolveMenuName(node.menuUrl, node.menuName),
    children
  };
}

export function localizeMenuTree(tree: MenuNode[]): MenuNode[] {
  return tree.map(localizeNode);
}

export function normalizeMenuPath(path: string): string {
  if (!path || path === '/') return '/';
  return path.replace(/\/+$/, '') || '/';
}

/** 根据当前路由 path 从菜单树解析完整面包屑链（含目录父级） */
export function findMenuBreadcrumbByPath(tree: MenuNode[], path: string): MenuNode[] {
  const target = normalizeMenuPath(path);

  function dfs(nodes: MenuNode[], trail: MenuNode[]): MenuNode[] | null {
    for (const node of nodes) {
      const next = [...trail, node];
      if (node.children?.length) {
        const hit = dfs(node.children, next);
        if (hit) return hit;
      }
      const url = normalizeMenuPath(node.menuUrl);
      if (url && url !== '/' && target === url) {
        return next;
      }
    }
    return null;
  }

  return dfs(tree, []) ?? [];
}

/** 根据当前路由 path 从菜单树解析本地化标题（面包屑最后一级） */
export function findMenuTitleByPath(tree: MenuNode[], path: string): string | undefined {
  const chain = findMenuBreadcrumbByPath(tree, path);
  return chain.length ? chain[chain.length - 1].menuName : undefined;
}
