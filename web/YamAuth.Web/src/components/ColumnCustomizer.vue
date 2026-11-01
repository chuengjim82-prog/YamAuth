<template>
  <el-dialog v-model="visible" :title="t('common.columnSettings')" width="480px" class="column-customizer-dialog">
    <div class="column-customizer__list" @dragover.prevent @drop="onDrop">
      <div
        v-for="(col, index) in settings"
        :key="col.key"
        class="column-customizer__item"
        :class="{
          'is-locked': col.lock,
          'is-dragging': draggingIndex === index,
          'is-drag-over': dragOverIndex === index,
        }"
        :draggable="!col.lock"
        @dragstart="onDragStart(index, $event)"
        @dragover="onDragOver(index, $event)"
        @dragend="onDragEnd"
      >
        <span class="drag-handle">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
        </span>

        <el-checkbox :model-value="col.visible" :disabled="col.lock" @update:model-value="$emit('toggleVisibility', col.key)" />
        <span class="column-customizer__label">{{ t(col.label) }}</span>
      </div>
    </div>
    <template #footer>
      <el-button @click="$emit('reset')">{{ t('common.reset') }}</el-button>
      <el-button type="primary" @click="onConfirm">{{ t('common.save') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { ColumnSetting } from '@/composables/useColumnCustomizer'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  settings: ColumnSetting[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'moveUp', index: number): void
  (e: 'moveDown', index: number): void
  (e: 'moveTo', fromIndex: number, toIndex: number): void
  (e: 'toggleVisibility', prop: string): void
  (e: 'reset'): void
  (e: 'confirm'): void
}>()

const visible = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => (visible.value = v)
)
watch(visible, (v) => emit('update:modelValue', v))

const draggingIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function onDragStart(index: number, event: DragEvent) {
  draggingIndex.value = index
  event.dataTransfer?.setData('text/plain', String(index))
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

function onDragOver(index: number, event: DragEvent) {
  if (draggingIndex.value === null) return
  const col = props.settings[index]
  if (col.lock) return
  event.dataTransfer!.dropEffect = 'move'
  dragOverIndex.value = index
}

function onDragEnd() {
  draggingIndex.value = null
  dragOverIndex.value = null
}

function onDrop(event: DragEvent) {
  const fromIndex = Number(event.dataTransfer?.getData('text/plain'))
  const toIndex = dragOverIndex.value
  draggingIndex.value = null
  dragOverIndex.value = null

  if (isNaN(fromIndex) || toIndex === null || fromIndex === toIndex) return

  const target = props.settings[toIndex]
  if (target.lock) return

  emit('moveTo', fromIndex, toIndex)
}

function onConfirm() {
  emit('confirm')
  visible.value = false
  emit('update:modelValue', false)
}
</script>

<style scoped>
.column-customizer__list {
  max-height: 400px;
  overflow-y: auto;
}

.column-customizer__item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--el-border-color-light);
  transition:
    background-color 0.15s,
    opacity 0.15s;
  cursor: default;
  user-select: none;
}

.column-customizer__item:hover {
  background-color: var(--el-fill-color-light);
}

.column-customizer__item.is-dragging {
  opacity: 0.4;
  background-color: var(--el-fill-color);
}

.column-customizer__item.is-drag-over {
  border-top: 1px dashed var(--el-border-color-light);
}

.column-customizer__item.is-locked {
  opacity: 0.7;
}

.drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
  padding: 2px;
  border-radius: 4px;
  transition: color 0.15s;
}

.drag-handle:hover {
  color: var(--el-color-primary);
}

.column-customizer__move-btns {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.column-customizer__move-btns .el-button {
  min-height: 18px;
  height: 18px;
  padding: 0 2px;
}

.column-customizer__label {
  flex: 1;
  font-size: 14px;
}
</style>
