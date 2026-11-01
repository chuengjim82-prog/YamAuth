<template>
  <!--
  ============================================================
  菜单注册信息（在后台菜单管理中添加以下配置）:
    菜单名称: {{ENTITY_CN}}管理
    菜单 URL: /{{MODULE_NAME}}/{{ENTITY_NAME}}
    权限标识: {{PERMISSION_MODULE}}.list
    父级菜单: 根据业务模块选择
    排序:     根据需要设置
  ============================================================
  页面 /{{MODULE_NAME}}/{{ENTITY_NAME}}
    → 自动匹配文件: /src/views/{{MODULE_NAME}}/{{ENTITY_PASCAL}}.vue
  ============================================================
  -->
  <div>
    <SearchForm :initial="query" collapsible @search="onSearch" :fields="searchFields">
      <template #actions>
        <el-button type="primary" v-has="{{PERMISSION_MODULE}}.create" @click="openCreate">{{ labels.create }}</el-button>
      </template>
    </SearchForm>

    <DataTable
      :items="items"
      :total="total"
      :page="query.page"
      :size="query.size"
      :loading="loading"
      :columns="tableColumns"
      @update:page="
        (p: number) => {
          query.page = p
          load()
        }
      "
      @update:size="
        (s: number) => {
          query.size = s
          load()
        }
      "
    >
      <template #toolbar>
        <TableToolbar :actions="toolbarActions" />
      </template>
      <!-- 自定义列渲染示例 -->
      <!--
      <template #cell-isActived="{ row }">
        <el-switch v-model="row.isActived" disabled />
      </template>
      -->
      <template #cell-actions="{ row }">
        <RowActions
          :max-visible="2"
          :actions="[
          { label: labels.edit, onClick: () => openEdit(row), permission: {{PERMISSION_MODULE}}.update, collapsed: true },
          {
            label: labels.delete,
            onClick: () => remove(row.id),
            type: 'danger',
            permission: {{PERMISSION_MODULE}}.delete,
            popconfirm: labels.confirmDelete,
            collapsed: true,
          },
        ]"
        />
      </template>
    </DataTable>

    <!-- 导入用隐藏文件选择器 -->
    <input ref="fileInputRef" type="file" accept=".xlsx,.xls" style="display: none" @change="onFileSelected" />

    <FormDialog v-model="dialogVisible" :title="dialogTitle" :initial="dialogForm" :rules="rules" @submit="onSubmit">
      <template #default="{ form }">
        <!-- ==================== 表单字段区 ==================== -->
        <!-- 方式一：使用独立的 Form 子组件（推荐） -->
        <!-- <{{ENTITY_PASCAL}}Form :model="form" :columns="formColumns" /> -->

        <!-- 方式二：直接在弹窗内写表单字段 -->
        <el-form-item label="字段1" prop="field1">
          <el-input v-model="form.field1" />
        </el-form-item>
        <el-form-item label="字段2" prop="field2">
          <el-input v-model="form.field2" />
        </el-form-item>
        <el-form-item label="启用" prop="isActived">
          <el-switch v-model="form.isActived" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" />
        </el-form-item>
      </template>
    </FormDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'

import SearchForm, { type SearchFormField } from '@/components/SearchForm.vue'
import DataTable, { type TableColumn } from '@/components/DataTable.vue'
import FormDialog from '@/components/FormDialog.vue'
import RowActions from '@/components/RowActions.vue'
import TableToolbar, { type ToolbarAction } from '@/components/TableToolbar.vue'
import { createCrudApi } from '@/api/crud'
import { useCrudLabels } from '@/composables/useCrudLabels'
import { useExport } from '@/composables/useExport'
import { useImport } from '@/composables/useImport'
import { {{PERMISSION_MODULE}} } from '@/constants/permissions.manual'
import { Download, Upload } from '@element-plus/icons-vue'

const { t } = useI18n()
const { labels } = useCrudLabels()

// ==================== API ====================
const api = createCrudApi<any, any, any, any>('{{API_BASE_PATH}}')

// ==================== 搜索/列表状态 ====================
const query = reactive({
  page: 1,
  size: 20,
  keyword: '',
  // TODO: 添加更多搜索参数
})

const items = ref<any[]>([])
const total = ref(0)
const loading = ref(false)

// ==================== 搜索字段配置 ====================
const searchFields: SearchFormField[] = [
  { prop: 'keyword', type: 'input', placeholder: 'common.keyword' },
  // TODO: 添加更多搜索字段
  // { prop: 'code', type: 'input', placeholder: 'entity.{{MODULE_NAME}}.{{ENTITY_NAME}}.code' },
  // { prop: 'createTime', type: 'date-picker' },
]

// ==================== 表格列配置 ====================
const tableColumns: TableColumn[] = [
  { prop: 'id', label: 'common.id', width: 80 },
  // TODO: 添加更多列
  // { prop: 'code', label: 'entity.{{MODULE_NAME}}.{{ENTITY_NAME}}.code', width: 120 },
  { prop: 'actions', label: 'common.actions', width: 140, fixed: 'right' },
]

// ==================== 工具栏 ====================
const toolbarActions: ToolbarAction[] = [
  { icon: Upload, label: t('common.importData'), onClick: handleDownload },
  { icon: Download, label: t('common.exportData'), onClick: handleExport },
]

// ==================== 弹窗状态 ====================
const dialogVisible = ref(false)
const dialogTitle = ref('')
const dialogForm = ref<any>({})
const editingId = ref<number | null>(null)

// ==================== 表单校验规则 ====================
const rules = computed(() => ({
  // TODO: 添加表单校验
  // field1: [{ required: true, message: t('validation.enterField') }],
}))

// ==================== 方法 ====================
async function load() {
  loading.value = true
  try {
    const { total: t, items: list } = await api.page(query)
    total.value = t
    items.value = list
  } finally {
    loading.value = false
  }
}

function onSearch(f: any) {
  Object.assign(query, f)
  query.page = 1
  load()
}

function openCreate() {
  editingId.value = null
  dialogTitle.value = labels.value.createTitle
  dialogForm.value = {
    isActived: true,
    remark: '',
    // TODO: 设置默认值
  }
  dialogVisible.value = true
}

function openEdit(row: any) {
  editingId.value = row.id
  dialogTitle.value = labels.value.editTitle
  dialogForm.value = { ...row }
  dialogVisible.value = true
}

async function onSubmit(form: any) {
  if (editingId.value) {
    await api.update(editingId.value, form)
  } else {
    await api.create(form)
  }
  ElMessage.success(t('message.saveSuccess'))
  load()
}

async function remove(id: number) {
  await api.remove(id)
  ElMessage.success(t('message.deleteSuccess'))
  load()
}

// ==================== 导入导出 ====================
const { exportExcel } = useExport('{{API_BASE_PATH}}/export', '{{ENTITY_CN}}')
const { importFile } = useImport('{{API_BASE_PATH}}/import')

const fileInputRef = ref<HTMLInputElement | null>(null)

function handleDownload() {
  fileInputRef.value?.click()
}

function handleExport() {
  const params: Record<string, any> = {}
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)) {
      params[k] = v
    }
  }
  exportExcel(params)
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const result = await importFile(file)
  if (result) load()
  input.value = ''
}

// ==================== 初始化 ====================
onMounted(load)
</script>

<style scoped>
/* TODO: 添加自定义样式 */
</style>
