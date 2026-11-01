<template>
  <div ref="panelRef" class="data-table-panel">
    <div class="data-table-toolbar" v-if="$slots.toolbar">
      <slot name="toolbar" />
    </div>
    <div>
      <el-table :data="items" :height="tableHeight" stripe v-loading="loading" :empty-text="t('common.noData')"
        style="width: 100%">
        <template #empty>
          <div class="no-data-container">
            <svg class="no-data-icon" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <!-- 背景圆形 -->
              <circle cx="100" cy="85" r="70" fill="#F5F7FA" />
              <!-- 文件夹 -->
              <g>
                <path
                  d="M 60 60 L 60 130 Q 60 140 70 140 L 150 140 Q 160 140 160 130 L 160 75 Q 160 65 150 65 L 95 65 L 82 50 Q 78 45 70 45 L 70 45 Q 60 45 60 55 Z"
                  fill="none" stroke="#B0B6BE" stroke-width="2.5" stroke-linejoin="round" />
                <!-- 文件中的横线 -->
                <line x1="75" y1="80" x2="145" y2="80" stroke="#B0B6BE" stroke-width="1.5" stroke-linecap="round" />
                <line x1="75" y1="95" x2="135" y2="95" stroke="#B0B6BE" stroke-width="1.5" stroke-linecap="round" />
                <line x1="75" y1="110" x2="130" y2="110" stroke="#B0B6BE" stroke-width="1.5" stroke-linecap="round" />
              </g>
              <!-- 放大镜 -->
              <g>
                <circle cx="135" cy="155" r="18" fill="none" stroke="#909399" stroke-width="2" />
                <line x1="148" y1="168" x2="158" y2="178" stroke="#909399" stroke-width="2" stroke-linecap="round" />
              </g>
            </svg>
            <div class="no-data-text">{{ t('common.noData') }}</div>
          </div>
        </template>
        <el-table-column v-for="(col, index) in displayColumns" :key="`${col.prop}-${index}`" :prop="col.prop"
          :label="t(col.label)" :width="col.width" :min-width="col.minWidth" :fixed="col.fixed"
          :show-overflow-tooltip="col.showOverflowTooltip" :class-name="col.className"
          :label-class-name="col.labelClassName">
          <template #header>
            <span class="data-table-header-label">
              <span class="data-table-header-text">{{ t(col.label) }}</span>
              <el-tooltip v-if="col.tooltip" :content="t(col.tooltip)" placement="top"
                popper-class="data-table-header-tooltip">
                <el-icon class="data-table-header-help">
                  <InfoFilled />
                </el-icon>
              </el-tooltip>
            </span>
          </template>
          <template #default="scope">
            <span v-if="col.isFiller" aria-hidden="true"></span>
            <slot v-else-if="$slots[`cell-${col.prop}`]" :name="`cell-${col.prop}`" v-bind="scope" />
          </template>
        </el-table-column>
        <slot />
      </el-table>
    </div>
    <div class="page-table-footer" aria-hidden="true">
      <slot name="footer" />
    </div>
  </div>
</template>
<style scoped>
.data-table-toolbar {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  margin-bottom: 5px;
  margin-top: 5px;
  margin-right: 2px;
}

/* ========== Table Header 统一样式 ========== */
/* 设置表头背景色（通过 CSS 变量和直接覆盖双保险） */
.data-table-panel {
  margin-top: 5px;
  --el-table-header-bg-color: #f5f7fa !important;
}

::v-deep .el-table {
  --el-table-header-bg-color: #f5f7fa !important;
}

/* 表头行/单元格统一背景 */
::v-deep .el-table__header-wrapper,
::v-deep .el-table__header-wrapper .el-table__cell,
::v-deep .el-table__header th {
  background-color: #f5f7fa !important;
}

/* 固定列表头 */
::v-deep .el-table__fixed .el-table__header-wrapper,
::v-deep .el-table__fixed-right .el-table__header-wrapper,
::v-deep .el-table__fixed-left .el-table__header-wrapper {
  background-color: #f5f7fa !important;
}

::v-deep .el-table__fixed .el-table__header-wrapper .el-table__cell,
::v-deep .el-table__fixed-right .el-table__header-wrapper .el-table__cell,
::v-deep .el-table__fixed-left .el-table__header-wrapper .el-table__cell {
  background-color: #f5f7fa !important;
}

/* 表头紧凑样式 */
::v-deep .el-table__header-wrapper .el-table__cell,
::v-deep .el-table__header th {
  height: 24px !important;
  line-height: 24px !important;
  padding: 4px 8px !important;
  vertical-align: middle !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ========== 固定列样式 ========== */
::v-deep .el-table__body-wrapper {
  z-index: 1;
}

::v-deep .el-table__fixed,
::v-deep .el-table__fixed-right,
::v-deep .el-table__fixed-left {
  z-index: 9999 !important;
  background-color: #fff !important;
  overflow: hidden;
}

::v-deep .el-table__fixed .el-table__cell,
::v-deep .el-table__fixed-right .el-table__cell,
::v-deep .el-table__fixed-left .el-table__cell {
  background-color: #fff !important;
  position: relative;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

::v-deep .el-table__fixed-right {
  box-shadow: -6px 0 10px rgba(0, 0, 0, 0.06);
}

/* 右固定列的单元格添加左边框 */
::v-deep .el-table__fixed-right .el-table__cell {
  border-left: 1px solid #f0f0f0 !important;
  background-color: #fafafa !important;
}

::v-deep .el-table__fixed-right .el-table__body-wrapper,
::v-deep .el-table__fixed-left .el-table__body-wrapper {
  background-color: #fff !important;
}

/* Ensure body cells match header padding/box model to keep columns aligned */
::v-deep .el-table__body-wrapper .el-table__cell,
::v-deep .el-table__body td,
::v-deep .el-table__fixed .el-table__cell {
  padding: 4px 8px 4px 10px !important;
  box-sizing: border-box !important;
  vertical-align: middle !important;
}

/* Enforce fixed table layout and prevent wrapping inside cells so header/body columns align */
::v-deep .el-table {
  table-layout: fixed !important;
}

::v-deep .el-table .cell,
::v-deep .el-table__header-wrapper .cell,
::v-deep .el-table__body-wrapper .cell {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  box-sizing: border-box !important;
  padding: 4px !important;
}

/* Hide visual scrollbar while preserving scroll behavior */
::v-deep .data-table-body {
  -ms-overflow-style: none !important;
  scrollbar-width: none !important;
}

::v-deep .data-table-body::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
}

::v-deep .el-table__body-wrapper {
  -ms-overflow-style: none !important;
  scrollbar-width: none !important;
}

::v-deep .el-table__body-wrapper::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
}

/* 暂无数据容器样式 */
.no-data-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 12px;
}

.no-data-icon {
  width: 120px;
  height: 120px;
  opacity: 0.6;
}

.no-data-text {
  font-size: 14px;
  color: #909399;
  font-weight: 500;
}

.data-table-header-label {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  gap: 4px;
  vertical-align: middle;
}

.data-table-header-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

.data-table-header-help {
  flex: 0 0 auto;
  color: #909399;
  cursor: pointer;
  font-size: 14px;
}

.data-table-header-help:hover {
  color: var(--el-color-primary);
}

:global(.el-popper.data-table-header-tooltip) {
  max-width: 220px !important;
  white-space: normal !important;
  overflow-wrap: anywhere;
  word-break: break-word;
  line-height: 1.5;
}
</style>

<script setup lang="ts">
import { useDataTableHeight } from '@/composables/useDataTableHeight'
import { InfoFilled } from '@element-plus/icons-vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

export interface TableColumn {
  prop: string
  columnKey?: string
  label: string
  tooltip?: string
  width?: number | string
  minWidth?: number | string
  fixed?: 'left' | 'right' | boolean
  showOverflowTooltip?: boolean
  className?: string
  labelClassName?: string
  isFiller?: boolean
  /** 锁定列，不允许隐藏或移动 */
  lock?: boolean
}

const props = defineProps<{
  items: any[]
  total: number
  page: number
  size: number
  loading?: boolean
  columns?: TableColumn[]
}>()
defineEmits<{ (e: 'update:page', p: number): void; (e: 'update:size', s: number): void }>()

const { t } = useI18n()
const panelRef = ref<HTMLElement>()
const { tableHeight, remeasure } = useDataTableHeight(panelRef)

const displayColumns = computed<TableColumn[]>(() => {
  const columns = props.columns ?? []
  const firstRightFixedIndex = columns.findIndex((col) => col.fixed === 'right')

  if (firstRightFixedIndex === -1) return columns

  const hasFlexibleNonFixedColumn = columns.some(
    (col) => col.fixed !== 'right' && col.fixed !== 'left' && col.width === undefined
  )

  if (hasFlexibleNonFixedColumn) return columns

  const fillerColumn: TableColumn = {
    prop: '__right_fixed_filler',
    label: '',
    minWidth: 1,
    className: 'data-table-filler-column',
    labelClassName: 'data-table-filler-column',
    isFiller: true,
  }

  return [
    ...columns.slice(0, firstRightFixedIndex),
    fillerColumn,
    ...columns.slice(firstRightFixedIndex),
  ]
})

function freezeBodyHeight() {
  const body = panelRef.value?.querySelector('.data-table-body') as HTMLElement | null
  if (!body) return
  try {
    const h = body.getBoundingClientRect().height
    body.style.height = `${Math.round(h)}px`
    body.style.overflow = 'hidden'
  } catch { }
}

function unfreezeBodyHeight() {
  const body = panelRef.value?.querySelector('.data-table-body') as HTMLElement | null
  if (!body) return
  try {
    body.style.height = ''
    body.style.overflow = ''
  } catch { }
}

let pageShellEl: HTMLElement | null = null

onMounted(() => {
  // hide outer page scroll when this data table is present to avoid double scrollbars
  pageShellEl = panelRef.value?.closest('.page-shell') as HTMLElement | null
  if (pageShellEl) pageShellEl.classList.add('no-scroll-outer')

  requestAnimationFrame(() => {
    requestAnimationFrame(remeasure)
  })
})

onUnmounted(() => {
  if (pageShellEl) pageShellEl.classList.remove('no-scroll-outer')
})

defineExpose({ remeasure, freezeBodyHeight, unfreezeBodyHeight })
</script>
