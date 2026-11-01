<template>
  <PopupSelect
    :model-value="modelValue"
    :title="title"
    api-path="/v1/base/countries"
    :columns="columns"
    display-format="{code3} - {cnName}"
    :placeholder="placeholder"
    :width="width"
    @update:model-value="emit('update:modelValue', $event)"
    @select="emit('select', $event)"
  />
</template>

<script setup lang="ts">
import PopupSelect from '@/components/PopupSelect.vue'

defineOptions({ name: 'CountrySelectPopup' })

const props = withDefaults(
  defineProps<{
    modelValue?: number | string | null
    placeholder?: string
    title?: string
    width?: string
  }>(),
  {
    title: '选择国家',
    width: '60%',
    placeholder: '',
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: number | string | null): void
  (e: 'select', row: Record<string, any>): void
}>()

const columns = [
  { prop: 'code2', label: 'Code2' },
  { prop: 'code3', label: 'Code3' },
  { prop: 'cnName', label: '中文名称' },
  { prop: 'enName', label: 'English Name' },
  { prop: 'creatorNic', label: 'Creator' },
]
</script>
