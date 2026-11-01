<template>
  <el-container class="layout-container">
    <el-aside
      :width="collapsed ? '64px' : '220px'"
      class="layout-aside"
    >
      <Sidebar :collapsed="collapsed" />
    </el-aside>
    <el-container>
      <el-header class="layout-header">
        <Header v-model:collapsed="collapsed" />
      </el-header>
      <el-main class="layout-main">
        <div class="layout-padding">
          <div class="layout-padding-view">
            <div class="page-shell">
              <router-view v-slot="{ Component, route }">
                <keep-alive :max="15">
                  <component :is="Component" :key="route.path" v-if="Component" />
                </keep-alive>
              </router-view>
            </div>
          </div>
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Sidebar from './components/Sidebar.vue';
import Header from './components/Header.vue';

const collapsed = ref(false);
</script>
