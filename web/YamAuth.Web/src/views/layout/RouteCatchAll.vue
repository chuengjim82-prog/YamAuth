<template>
  <RoutePending v-if="!routeState.loaded" />
  <NotFound v-else />
</template>

<script setup lang="ts">
import { routeState } from '@/router/dynamic';
import RoutePending from './RoutePending.vue';
import NotFound from '@/views/error/404.vue';
</script>
