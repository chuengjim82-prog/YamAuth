<template>
  <PopupSelect
    :model-value="modelValue"
    :title="title"
    api-path="/v1/base/customers"
    :columns="columns"
    display-format="{code} - {name}"
    :placeholder="placeholder"
    :width="width"
    @update:model-value="emit('update:modelValue', $event)"
    @select="emit('select', $event)"
  />
</template>

<script setup lang="ts">
import PopupSelect from '@/components/PopupSelect.vue'

defineOptions({ name: 'CustomerSelectPopup' })

const props = withDefaults(
  defineProps<{
    modelValue?: number | string | null
    placeholder?: string
    title?: string
    width?: string
  }>(),
  {
    title: '选择客户',
    width: '60%',
    placeholder: '',
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: number | string | null): void
  (e: 'select', row: Record<string, any>): void
}>()

const columns = [
  { prop: 'code', label: '客户代码', width: 120 },
  { prop: 'name', label: '客户名称' },
  { prop: 'cityName', label: '城市', width: 120 },
  { prop: 'contact', label: '联系人', width: 120 },
  { prop: 'phone', label: '电话', width: 140 },
]
</script>
