<template>
  <el-sub-menu v-if="node.children?.length" :index="String(node.id)">
    <template #title>
      <el-icon v-if="icon"><component :is="icon" /></el-icon>
      <span>{{ node.menuName }}</span>
    </template>
    <SidebarItem v-for="c in node.children" :key="c.id" :node="c" />
  </el-sub-menu>
  <el-menu-item
    v-else
    :index="node.menuUrl"
    @mouseenter="onPrefetch"
  >
    <el-icon v-if="icon"><component :is="icon" /></el-icon>
    <span>{{ node.menuName }}</span>
  </el-menu-item>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import * as Icons from '@element-plus/icons-vue';
import type { MenuNode } from '@/stores/menu';
import { prefetchMenuComponent } from '@/router/dynamic';

const props = defineProps<{ node: MenuNode }>();

const icon = computed(() => {
  if (!props.node.menuIcon) return null;
  const resolved = (Icons as Record<string, unknown>)[props.node.menuIcon];
  if (!resolved) {
    console.warn(`[Sidebar] 图标 "${props.node.menuIcon}" 在 @element-plus/icons-vue 中未找到（菜单: ${props.node.menuName}）`);
  }
  return resolved ?? null;
});

function onPrefetch() {
  if (props.node.menuUrl) {
    prefetchMenuComponent(props.node.menuUrl);
  }
}
</script>
