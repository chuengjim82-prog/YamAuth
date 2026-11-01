<template>
  <div class="page-welcome">
    <h2>{{ t('page.home') }}，{{ userStore.nickName }}</h2>
    <p>{{ t('layout.appTitle') }}</p>
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useUserStore } from '@/stores/user';
const { t } = useI18n();
const userStore = useUserStore();
</script>
