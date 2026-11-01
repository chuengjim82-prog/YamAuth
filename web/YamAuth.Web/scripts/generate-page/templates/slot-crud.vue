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
    <SearchForm :initial="query" @search="onSearch">
      <template #default="{ form }">
        <el-form-item :label="labels.keyword">
          <el-input v-model="form.keyword" clearable />
        </el-form-item>
        <!-- TODO: 添加更多搜索字段 -->
        <!--
        <el-form-item label="状态">
          <el-select v-model="form.status" clearable>
            <el-option label="选项1" value="1" />
            <el-option label="选项2" value="2" />
          </el-select>
        </el-form-item>
        -->
      </template>
      <template #actions>
        <el-button type="primary" v-has="{{PERMISSION_MODULE}}.create" @click="openCreate">
          {{ labels.create }}
        </el-button>
      </template>
    </SearchForm>

    <DataTable
      :items="items"
      :total="total"
      :page="query.page"
      :size="query.size"
      :loading="loading"
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
      <!-- 基础列 -->
      <el-table-column prop="id" :label="t('common.id')" width="80" />

      <!-- TODO: 添加数据列 -->
      <!--
      <el-table-column prop="code" :label="t('entity.{{MODULE_NAME}}.{{ENTITY_NAME}}.code')" width="120" />
      <el-table-column prop="name" :label="t('entity.{{MODULE_NAME}}.{{ENTITY_NAME}}.name')" />
      -->

      <!-- 启用/禁用列 -->
      <el-table-column prop="isActived" :label="labels.enabled" width="80">
        <template #default="{ row }">
          <el-switch v-model="row.isActived" disabled />
        </template>
      </el-table-column>

      <!-- 操作列 -->
      <el-table-column :label="labels.actions" width="200">
        <template #default="{ row }">
          <el-button link type="primary" v-has="{{PERMISSION_MODULE}}.update" @click="openEdit(row)">
            {{ labels.edit }}
          </el-button>
          <el-popconfirm :title="labels.confirmDelete" @confirm="remove(row.id)">
            <template #reference>
              <el-button link type="danger" v-has="{{PERMISSION_MODULE}}.delete">
                {{ labels.delete }}
              </el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </DataTable>

    <FormDialog v-model="dialogVisible" :title="dialogTitle" :initial="dialogForm" :rules="rules" @submit="onSubmit">
      <template #default="{ form }">
        <!-- TODO: 添加表单字段 -->
        <!--
        <el-form-item label="编码" prop="code">
          <el-input v-model="form.code" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        -->
        <el-form-item :label="labels.enabled" prop="isActived">
          <el-switch v-model="form.isActived" />
        </el-form-item>
        <el-form-item :label="labels.remark" prop="remark">
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

import SearchForm from '@/components/SearchForm.vue'
import DataTable from '@/components/DataTable.vue'
import FormDialog from '@/components/FormDialog.vue'
import { createCrudApi } from '@/api/crud'
import { useCrudLabels } from '@/composables/useCrudLabels'
import { {{PERMISSION_MODULE}} } from '@/constants/permissions.manual'

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

// ==================== 弹窗状态 ====================
const dialogVisible = ref(false)
const dialogTitle = ref('')
const dialogForm = ref<any>({})
const editingId = ref<number | null>(null)

// ==================== 表单校验规则 ====================
const rules = computed(() => ({
  // TODO: 添加表单校验规则
  // code: [{ required: true, message: t('validation.enterCode') }],
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

// ==================== 初始化 ====================
onMounted(load)
</script>

<style scoped>
/* TODO: 添加自定义样式 */
</style>
