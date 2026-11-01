<template>
  <el-config-provider :locale="epLocale">
    <router-view />
  </el-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useLocaleStore } from '@/stores/locale';
import { getEpLocale } from '@/i18n/supportedLocales';
import { applyTheme } from '@/utils/theme';

const localeStore = useLocaleStore();
const epLocale = computed(() => getEpLocale(localeStore.locale));

onMounted(() => applyTheme());
</script>
