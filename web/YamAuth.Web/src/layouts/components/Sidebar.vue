<template>
  <div class="sidebar-menu-wrap">
    <div class="sidebar-logo" :class="{ 'is-collapsed': collapsed }">
      <template v-if="!collapsed">{{ t('layout.appTitle') }}</template>
      <template v-else>P</template>
    </div>
    <el-menu
      :key="localeStore.locale"
      :default-active="route.path"
      :collapse="collapsed"
      :collapse-transition="false"
      router
    >
      <SidebarItem v-for="node in menuStore.tree" :key="node.id" :node="node" />
    </el-menu>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useMenuStore } from '@/stores/menu';
import { useLocaleStore } from '@/stores/locale';
import SidebarItem from './SidebarItem.vue';

defineProps<{ collapsed: boolean }>();

const { t } = useI18n();
const route = useRoute();
const menuStore = useMenuStore();
const localeStore = useLocaleStore();
</script>
