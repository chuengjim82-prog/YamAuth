<template>
  <div class="popup-select">
    <el-input :model-value="displayText" readonly :placeholder="placeholder" :suffix-icon="Search" @click="openDialog" />
    <el-dialog v-model="visible" :title="title" :width="width" :close-on-click-modal="false">
      <el-table :data="data" v-loading="loading" stripe highlight-current-row style="width: 100%" @row-click="onRowClick">
        <el-table-column v-for="col in columns" :key="col.prop" :prop="col.prop" :label="col.label" :width="col.width" show-overflow-tooltip />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { createCrudApi } from '@/api/crud'
import { Search } from '@element-plus/icons-vue'
import { ref, watch } from 'vue'

export interface PopupColumn {
  prop: string
  label: string
  width?: string | number
}

const props = withDefaults(
  defineProps<{
    modelValue?: number | string | null
    title: string
    apiPath: string
    columns: PopupColumn[]
    /** 显示格式，如 '{code3} - {cnName}' */
    displayFormat: string
    placeholder?: string
    pageSize?: number
    /** 弹窗宽度 */
    width?: string
    /** 用作 value 的字段，默认 'id' */
    valueKey?: string
  }>(),
  {
    pageSize: 200,
    width: '60%',
    placeholder: '',
    valueKey: 'id',
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: number | string | null): void
  (e: 'select', row: Record<string, any>): void
}>()

const visible = ref(false)
const data = ref<any[]>([])
const loading = ref(false)
const displayText = ref('')

/** 记录当前选中的行，用于 formatDisplay 回显 */
let selectedRow: Record<string, any> | null = null

/** 外部 v-model 值被清除时（如 reset），同步清除显示文本 */
watch(
  () => props.modelValue,
  (val) => {
    if (val == null || val === '') {
      displayText.value = ''
      selectedRow = null
    }
  }
)

/** 打开弹窗时自动加载数据（仅首次） */
async function openDialog() {
  visible.value = true
  if (data.value.length === 0) {
    loading.value = true
    try {
      const api = createCrudApi<any, any, any, any>(props.apiPath)
      const { items } = await api.page({ page: 1, size: props.pageSize })
      data.value = items
    } finally {
      loading.value = false
    }
  }
}

function onRowClick(row: any) {
  const val = row[props.valueKey]
  emit('update:modelValue', val ?? null)
  emit('select', row)
  selectedRow = row
  displayText.value = formatDisplay(row)
  visible.value = false
}

function formatDisplay(row: Record<string, any>): string {
  return props.displayFormat.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = row[k]
    return v != null ? String(v) : ''
  })
}

/**
 * 根据 value 回显 displayText
 * 对外暴露，父组件 reset 后可调用
 */
async function echoDisplay(value?: number | string | null) {
  if (value == null || value === '') {
    displayText.value = ''
    selectedRow = null
    return
  }
  // 如果已选中同一行，直接复用
  if (selectedRow && selectedRow[props.valueKey] === value) return

  // 否则从 API 查回
  try {
    const api = createCrudApi<any, any, any, any>(props.apiPath)
    const row = await api.get(value as number)
    selectedRow = row
    displayText.value = formatDisplay(row)
  } catch {
    displayText.value = ''
    selectedRow = null
  }
}

/** 重置显示文本（供父组件 reset 调用） */
function resetDisplay() {
  displayText.value = ''
  selectedRow = null
}

defineExpose({ echoDisplay, resetDisplay })
</script>

<style scoped>
.popup-select {
  width: 100%;
}

.popup-select :deep(.el-input__wrapper) {
  cursor: pointer;
}
</style>
