<template>
  <div>
    <SearchForm :initial="query" @search="onSearch">
      <template #default="{ form }">
        <el-form-item :label="labels.keyword"><el-input v-model="form.keyword" clearable /></el-form-item>
      </template>
      <template #actions>
        <el-button type="primary" @click="openCreate">{{ labels.create }}</el-button>
      </template>
    </SearchForm>

    <DataTable
      :items="items" :total="total"
      :page="query.page" :size="query.size" :loading="loading"
      @update:page="(p: number) => { query.page = p; load(); }"
      @update:size="(s: number) => { query.size = s; load(); }">
      <el-table-column prop="id" label="编号" width="90" />
      <el-table-column prop="tenantId" label="租户" />
      <el-table-column prop="projCode" label="项目编码" />
      <el-table-column prop="projName" label="项目名称" />
      <el-table-column prop="remark" label="备注" />
      <el-table-column :label="labels.actions" width="160" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">{{ labels.edit }}</el-button>
          <el-popconfirm :title="labels.confirmDelete" @confirm="remove(row.id)">
            <template #reference><el-button link type="danger">{{ labels.delete }}</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </DataTable>

    <FormDialog v-model="dialogVisible" :title="dialogTitle" :initial="dialogForm" @submit="onSubmit">
      <template #default="{ form }">
        <el-form-item label="租户" prop="tenantId"><el-input-number v-model="form.tenantId" :controls="false" /></el-form-item>
        <el-form-item label="项目编码" prop="projCode"><el-input v-model="form.projCode" /></el-form-item>
        <el-form-item label="项目名称" prop="projName"><el-input v-model="form.projName" /></el-form-item>
        <el-form-item label="备注" prop="remark"><el-input v-model="form.remark" type="textarea" /></el-form-item>
      </template>
    </FormDialog>
  </div>
</template>
<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import SearchForm from '@/components/SearchForm.vue';
import DataTable from '@/components/DataTable.vue';
import FormDialog from '@/components/FormDialog.vue';
import { createCrudApi } from '@/api/crud';
import { useCrudLabels } from '@/composables/useCrudLabels';

const { labels } = useCrudLabels();
const api = createCrudApi<any, any, any, any>('/v1/bzss/projects');

const query = reactive({ page: 1, size: 20, keyword: '' });
const items = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);
const dialogVisible = ref(false);
const dialogTitle = ref('');
const dialogForm = ref<any>({});
const editingId = ref<number | null>(null);

async function load() {
  loading.value = true;
  try {
    const { total: count, items: list } = await api.page(query);
    total.value = count;
    items.value = list;
  } finally { loading.value = false; }
}

function onSearch(form: any) { Object.assign(query, form); query.page = 1; load(); }

function openCreate() {
  editingId.value = null;
  dialogTitle.value = labels.value.createTitle;
  dialogForm.value = { tenantId: null, projCode: '', projName: '', remark: '' };
  dialogVisible.value = true;
}

function openEdit(row: any) {
  editingId.value = row.id;
  dialogTitle.value = labels.value.editTitle;
  dialogForm.value = { ...row };
  dialogVisible.value = true;
}

async function onSubmit(form: any) {
  if (editingId.value) await api.update(editingId.value, form);
  else await api.create(form);
  ElMessage.success(labels.value.saveSuccess);
  dialogVisible.value = false;
  await load();
}

async function remove(id: number) {
  await api.remove(id);
  ElMessage.success(labels.value.deleteSuccess);
  await load();
}

onMounted(load);
</script>