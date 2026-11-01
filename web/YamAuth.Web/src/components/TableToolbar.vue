<template>
  <div class="table-toolbar">
    <template v-for="(action, index) in actions" :key="index">
      <div class="table-toolbar-item">
        <el-tooltip :content="action.label" placement="top">
          <el-button type="text" @click="action.onClick" :aria-label="!showText ? action.label : undefined"
            class="table-toolbar-button">
            <el-icon class="table-toolbar-icon">
              <component :is="action.icon" />
            </el-icon>
            <span v-if="showText" class="table-toolbar-label">{{ action.label }}</span>
          </el-button>
        </el-tooltip>
      </div>
    </template>
  </div>
</template>
<script setup lang="ts">
import type { Component } from 'vue'

export interface ToolbarAction {
  icon: Component
  label: string
  onClick: () => void
}

const props = withDefaults(
  defineProps<{
    actions: ToolbarAction[]
    showText?: boolean
  }>(),
  {
    showText: false,
  },
)

const { actions, showText } = props
</script>

<style scoped>
.table-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px;
  background-color: transparent;
}

.table-toolbar-item {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f2f7;
  border-radius: 5px;
  /* padding: 0px 3px; */
  min-width: 35px;
}

.table-toolbar-button {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #606266;
  padding: 0;
}

.table-toolbar-button:hover {
  background-color: transparent;
}

.table-toolbar-icon {
  font-size: 18px;
}

.table-toolbar-label {
  margin-left: 6px;
  color: #606266;
}
</style>
