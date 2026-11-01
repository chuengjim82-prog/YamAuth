<template>
  <el-dialog v-model="visible" :title="title" width="600px" @close="emit('update:modelValue', false)">
    <el-descriptions :column="2" border>
      <el-descriptions-item v-for="col in columns" :key="col.prop" :label="col.label" :span="col.span ?? 1">
        {{ formatValue(col, data[col.prop]) }}
      </el-descriptions-item>
    </el-descriptions>
    <template #footer>
      <el-button @click="visible = false">{{ t('common.close') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

export interface DetailColumn {
  prop: string
  label: string
  span?: number
  type?: 'text' | 'switch' | 'date'
}

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  title: string
  data: Record<string, any>
  columns: DetailColumn[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const visible = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => (visible.value = v)
)

function formatValue(col: DetailColumn, val: any): string {
  if (val == null || val === '') return '-'
  switch (col.type) {
    case 'switch':
      return val ? '是' : '否'
    case 'date':
      return new Date(val).toLocaleString()
    default:
      return String(val)
  }
}
</script>
