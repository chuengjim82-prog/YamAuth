<template>
  <el-result icon="warning" :title="t('page.notFound')" :sub-title="t('page.notFoundDesc')" />
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>
