<template>
  <el-breadcrumb
    separator="/"
    :class="compact ? 'is-compact' : 'is-default'"
  >
    <el-breadcrumb-item
      v-for="(item, index) in crumbs"
      :key="`${item.title}-${index}`"
      :to="item.to"
    >
      {{ item.title }}
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useMenuStore } from '@/stores/menu';
import { findMenuBreadcrumbByPath, normalizeMenuPath } from '@/utils/menuI18n';

withDefaults(
  defineProps<{ compact?: boolean }>(),
  { compact: false }
);

const route = useRoute();
const menuStore = useMenuStore();
const { t } = useI18n();

function resolveRouteTitle(): string | undefined {
  const title = route.meta.title as string | undefined;
  if (title) return title;
  const titleKey = route.meta.titleKey as string | undefined;
  return titleKey ? t(titleKey) : undefined;
}

const crumbs = computed(() => {
  let chain = findMenuBreadcrumbByPath(menuStore.tree, route.path);
  if (!chain.length) {
    const menuUrl = route.meta.menuUrl as string | undefined;
    if (menuUrl) chain = findMenuBreadcrumbByPath(menuStore.tree, menuUrl);
  }

  if (chain.length) {
    const items = chain.map((node, index) => ({
      title: node.menuName,
      to: index < chain.length - 1 && node.menuUrl ? node.menuUrl : undefined,
    }));

    const lastUrl = normalizeMenuPath(chain[chain.length - 1].menuUrl);
    const currentPath = normalizeMenuPath(route.path);
    if (currentPath !== lastUrl) {
      const title = resolveRouteTitle();
      if (title) items.push({ title, to: undefined });
    }
    return items;
  }

  const title = resolveRouteTitle();
  return title ? [{ title, to: undefined }] : [];
});
</script>

<style scoped>
.is-default { margin: 12px 0; }
.is-compact { margin: 0 0 0 16px; }
</style>
