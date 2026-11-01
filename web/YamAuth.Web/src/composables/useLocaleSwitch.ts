import { useLocaleStore } from '@/stores/locale';
import { useMenuStore } from '@/stores/menu';
import { fetchMenuTree } from '@/api/auth';
import { loadDynamicRoutes } from '@/router/dynamic';
import { localizeMenuTree } from '@/utils/menuI18n';
import router from '@/router';

/** 切换 UI 语言并刷新菜单树（侧边栏/面包屑） */
export async function switchLocale(code: string) {
  const localeStore = useLocaleStore();
  localeStore.setLocale(code);

  const menu = useMenuStore();
  const currentPath = router.currentRoute.value.fullPath;

  try {
    const tree = localizeMenuTree(await fetchMenuTree());
    menu.setTree(tree);
    loadDynamicRoutes(router, tree);
    if (currentPath !== '/login') {
      await router.replace(currentPath);
    }
  } catch {
    // 菜单拉取失败时不阻断语言切换
  }
}

export function useLocaleSwitch() {
  return { switchLocale };
}
