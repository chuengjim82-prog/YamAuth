<template>
  <div class="page-toolbar ">
    <el-form :inline="true" :model="form" class="search-form" @submit.prevent>
      <div class="search-form__fields">
        <template v-if="fields.length">
          <el-form-item v-for="field in visibleDefaultFields" :key="field.prop">
            <component :is="renderComponent(field)" v-model="form[field.prop]" v-bind="getComponentProps(field)" />
          </el-form-item>

          <div v-show="!collapsible || expanded" class="search-form__collapsed">
            <el-form-item v-for="field in collapsedFields" :key="field.prop">
              <component :is="renderComponent(field)" v-model="form[field.prop]" v-bind="getComponentProps(field)" />
            </el-form-item>
          </div>
        </template>

        <template v-else>
          <slot :form="form" />
          <div v-show="expanded" class="search-form__collapsed">
            <slot name="collapsed" :form="form" />
          </div>
        </template>

        <div class="search-form__actions">
          <el-button type="primary" @click="$emit('search', form)">{{ t('common.search') }}</el-button>
          <el-button @click="onReset">{{ t('common.reset') }}</el-button>
          <span v-if="$slots.actions" class="search-form-actions-extra">
            <slot name="actions" />
          </span>
          <el-button v-if="collapsible && fields.length > 3" link type="primary" @click="expanded = !expanded">
            {{ expanded ? t('common.collapse') : t('common.expand') }}
          </el-button>
        </div>
      </div>
    </el-form>

    <el-dialog v-model="dialogVisible" :title="popupTitle" :width="popupWidth"
      @close="emit('update:popupVisible', false)">
      <el-table :data="popupData" v-loading="popupLoading" stripe highlight-current-row style="width: 100%"
        @row-click="onPopupRowClick">
        <slot name="popup-columns" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import CountrySelectPopup from '@/components/CountrySelectPopup.vue'
import CustomerSelectPopup from '@/components/CustomerSelectPopup.vue'
import EntitySelect from '@/components/EntitySelect.vue'
import PopupSelect from '@/components/PopupSelect.vue'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const popupComponentMap: Record<string, any> = {
  CountrySelectPopup,
  CustomerSelectPopup,
}

/* ---------- Types & Props ---------- */
export interface SearchFormField {
  prop: string
  type: 'input' | 'EntitySelect' | 'popup' | 'date-picker'
  placeholder?: string
  apiPath?: string
  labelFormat?: string
  popup?: {
    title: string
    apiPath: string
    columns: any[]
    displayFormat: string
    pageSize?: number
  }
  popupComponent?: string
  dateType?: string
  valueFormat?: string
}

const props = withDefaults(
  defineProps<{
    initial?: Record<string, any>
    collapsible?: boolean
    fields?: SearchFormField[]
    popupWidth?: string
    popupVisible?: boolean
    popupTitle?: string
    popupData?: any[]
    popupLoading?: boolean
  }>(),
  {
    collapsible: false,
    fields: () => [],
    popupWidth: '60%',
    popupVisible: false,
    popupTitle: '',
    popupData: () => [],
    popupLoading: false,
  }
)

const emit = defineEmits<{
  (e: 'search', form: any): void
  (e: 'reset'): void
  (e: 'update:popupVisible', v: boolean): void
  (e: 'popup-row-click', row: any): void
}>()

const expanded = ref(false)
const resolveLabel = (key?: string) => (key ? t(key) : '')

const getInitialValues = () => JSON.parse(JSON.stringify(props.initial ?? {}))
const form = reactive(getInitialValues())

/* ---------- 核心改动：基于数量动态拆分字段 ---------- */
// 第一行固定展示前 3 个字段
const visibleDefaultFields = computed(() => {
  return props.collapsible ? props.fields.slice(0, 3) : props.fields
})

// 剩下的字段全部归入折叠区域
const collapsedFields = computed(() => {
  return props.collapsible ? props.fields.slice(3) : []
})

function renderComponent(field: SearchFormField) {
  if (field.type === 'input') return 'el-input'
  if (field.type === 'date-picker') return 'el-date-picker'
  if (field.type === 'EntitySelect') return EntitySelect
  if (field.type === 'popup') {
    return field.popupComponent ? popupComponentMap[field.popupComponent] : PopupSelect
  }
  return 'el-input'
}

function getComponentProps(field: SearchFormField) {
  const baseProps: Record<string, any> = {
    placeholder: resolveLabel(field.placeholder),
  }

  if (field.type === 'input') {
    return { ...baseProps, clearable: true }
  }

  if (field.type === 'EntitySelect') {
    return { ...baseProps, apiPath: field.apiPath, labelFormat: field.labelFormat }
  }

  if (field.type === 'popup' && !field.popupComponent && field.popup) {
    return {
      ...baseProps,
      title: field.popup.title,
      apiPath: field.popup.apiPath,
      columns: field.popup.columns,
      displayFormat: field.popup.displayFormat,
      pageSize: field.popup.pageSize,
    }
  }

  if (field.type === 'date-picker') {
    return {
      type: field.dateType || 'daterange',
      'value-format': field.valueFormat || 'YYYY-MM-DD',
      'range-separator': '-',
      'start-placeholder': t('common.startDate'),
      'end-placeholder': t('common.endDate'),
      style: { width: '100%' },
    }
  }

  return baseProps
}

function onReset() {
  const initials = getInitialValues()
  Object.keys(form).forEach((key) => {
    form[key] = key in initials ? initials[key] : Array.isArray(form[key]) ? [] : undefined
  })
  emit('reset')
  emit('search', form)
}

/* ---------- 旧弹窗模式兼容 ---------- */
const dialogVisible = ref(props.popupVisible ?? false)
watch(
  () => props.popupVisible,
  (v) => (dialogVisible.value = v ?? false)
)
watch(dialogVisible, (v) => emit('update:popupVisible', v))
const onPopupRowClick = (row: any) => emit('popup-row-click', row)
</script>

<style scoped>
.search-form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
}

.search-form__fields {
  display: flex;
  flex-wrap: wrap;
  flex: 1 1 100%;
  gap: 0 18px;
}

/* 依然保持一行三列的网格流 */
.search-form__fields :deep(.el-form-item),
.search-form__collapsed :deep(.el-form-item) {
  flex: 0 0 calc((100% - 36px) / 3);
  margin: 0 0 4px 0;
}

.search-form__fields :deep(.el-form-item__content)>* {
  width: 100% !important;
}

/* 让折叠包裹层作为独立的 css 元素不破开 flex 流 */
.search-form__collapsed {
  display: contents;
}

.search-form__actions {
  flex: 0 0 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.page-toolbar {
  background: #fff;
  /* padding: 12px; */
  padding: 8px 12px 4px 12px;
  border-radius: 6px;
  margin-bottom: 0px;
}
</style>
