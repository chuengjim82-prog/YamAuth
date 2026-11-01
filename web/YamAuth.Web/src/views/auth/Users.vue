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
      <el-table-column prop="userName" label="用户名" />
      <el-table-column prop="nickName" label="昵称" />
      <el-table-column prop="avatar" label="头像" />
      <el-table-column prop="phone" label="电话" />
      <el-table-column prop="email" label="邮箱" />
      <el-table-column prop="isAdmin" label="管理员" />
      <el-table-column prop="isActived" label="启用" />
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
        <el-form-item label="用户名" prop="userName"><el-input v-model="form.userName" /></el-form-item>
        <el-form-item label="昵称" prop="nickName"><el-input v-model="form.nickName" /></el-form-item>
        <el-form-item label="密码" prop="password"><el-input v-model="form.password" type="password" show-password /></el-form-item>
        <el-form-item label="头像" prop="avatar"><el-input v-model="form.avatar" /></el-form-item>
        <el-form-item label="电话" prop="phone"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="邮箱" prop="email"><el-input v-model="form.email" /></el-form-item>
        <el-form-item label="管理员" prop="isAdmin"><el-switch v-model="form.isAdmin" /></el-form-item>
        <el-form-item label="启用" prop="isActived"><el-switch v-model="form.isActived" /></el-form-item>
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
const api = createCrudApi<any, any, any, any>('/v1/auth/users');

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
  dialogForm.value = { tenantId: null, userName: '', nickName: '', password: '', avatar: '', phone: '', email: '', isAdmin: false, isActived: false, remark: '' };
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