<template>
  <div class="entity-select">
    <el-select
      :model-value="modelValue"
      filterable
      clearable
      :loading="loading"
      :placeholder="placeholder"
      :disabled="disabled"
      class="entity-select__input"
      @update:model-value="emit('update:modelValue', $event)"
    >
      <el-option v-for="item in options" :key="getKey(item)" :label="formatLabel(item)" :value="getKey(item)" />
    </el-select>
  </div>
</template>

<script setup lang="ts">
import { createCrudApi } from '@/api/crud'
import { onMounted, ref } from 'vue'

interface EntityOption {
  id: number
  code?: string | null
  name?: string | null
  [key: string]: unknown
}

// 全局缓存 — 按 apiPath 缓存选项列表，避免重复请求
const globalCache = new Map<string, EntityOption[] | null>()
const globalLoadPromises = new Map<string, Promise<void>>()

const props = withDefaults(
  defineProps<{
    modelValue?: number | null
    /** API 路径，如 '/v1/base/currencies' */
    apiPath: string
    /** 显示格式模板，支持 {field} 占位，如 '{code} - {name}' */
    labelFormat?: string
    /** 占位提示 */
    placeholder?: string
    /** 是否禁用 */
    disabled?: boolean
    /** 用作 value 的字段，默认 'id' */
    valueKey?: string
    /** 请求时的分页大小 */
    pageSize?: number
    /** 是否自动加载（默认 true） */
    autoLoad?: boolean
  }>(),
  {
    labelFormat: '{code} - {name}',
    placeholder: '',
    valueKey: 'id',
    pageSize: 500,
    autoLoad: true,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: number | undefined | null]
}>()

const options = ref<EntityOption[]>([])
const loading = ref(false)

function getKey(item: EntityOption): number {
  return item[props.valueKey] as number
}

function formatLabel(item: EntityOption): string {
  if (!props.labelFormat) return String(item[props.valueKey])
  return props.labelFormat.replace(/\{(\w+)\}/g, (_, field) => {
    const val = item[field]
    return val != null ? String(val) : ''
  })
}

async function load() {
  const key = props.apiPath
  if (globalCache.has(key)) {
    const cached = globalCache.get(key)
    if (cached) options.value = cached
    return
  }
  if (globalLoadPromises.has(key)) {
    await globalLoadPromises.get(key)
    const cached = globalCache.get(key)
    if (cached) options.value = cached
    return
  }
  loading.value = true
  const promise = (async () => {
    const api = createCrudApi<any, any, any, any>(props.apiPath)
    const { items } = await api.page({ page: 1, size: props.pageSize })
    globalCache.set(key, items)
    options.value = items
  })()
  globalLoadPromises.set(key, promise as Promise<void>)
  try {
    await promise
  } finally {
    loading.value = false
    globalLoadPromises.delete(key)
  }
}

onMounted(() => {
  if (props.autoLoad) load()
})

// 暴露 reload 方法，供父组件按需刷新
defineExpose({ load, reload: load })
</script>

<style scoped>
.entity-select {
  width: 100%;
  min-width: 200px;
}

.entity-select__input {
  width: 100%;
}
</style>
