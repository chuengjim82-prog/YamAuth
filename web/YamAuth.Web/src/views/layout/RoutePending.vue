<template>

  <div class="route-pending" v-loading="true" :element-loading-text="text" />

</template>



<script setup lang="ts">

import { useI18n } from 'vue-i18n';



const { t } = useI18n();

const text = t('common.loading');

</script>

