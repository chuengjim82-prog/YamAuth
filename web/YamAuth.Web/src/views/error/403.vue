<template>
  <div data-testid="forbidden-page">
    <el-result icon="error" :title="t('page.forbidden')" :sub-title="t('page.forbiddenDesc')" />
  </div>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>
