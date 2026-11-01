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
      <el-table-column prop="crudId" label="功能" />
      <el-table-column prop="parentId" label="上级" />
      <el-table-column prop="menuCode" label="菜单编码" />
      <el-table-column prop="menuName" label="菜单名称" />
      <el-table-column prop="menuType" label="菜单类型" />
      <el-table-column prop="iconName" label="图标" />
      <el-table-column prop="routePath" label="路由" />
      <el-table-column prop="redirect" label="重定向" />
      <el-table-column prop="openType" label="打开方式" />
      <el-table-column prop="sortIndex" label="排序" />
      <el-table-column prop="isHided" label="隐藏" />
      <el-table-column prop="allowAny" label="匿名访问" />
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
        <el-form-item label="功能" prop="crudId"><el-input-number v-model="form.crudId" :controls="false" /></el-form-item>
        <el-form-item label="上级" prop="parentId"><el-input-number v-model="form.parentId" :controls="false" /></el-form-item>
        <el-form-item label="菜单编码" prop="menuCode"><el-input v-model="form.menuCode" /></el-form-item>
        <el-form-item label="菜单名称" prop="menuName"><el-input v-model="form.menuName" /></el-form-item>
        <el-form-item label="菜单类型" prop="menuType"><el-input v-model="form.menuType" /></el-form-item>
        <el-form-item label="图标" prop="iconName"><el-input v-model="form.iconName" /></el-form-item>
        <el-form-item label="路由" prop="routePath"><el-input v-model="form.routePath" /></el-form-item>
        <el-form-item label="重定向" prop="redirect"><el-input v-model="form.redirect" /></el-form-item>
        <el-form-item label="打开方式" prop="openType"><el-switch v-model="form.openType" /></el-form-item>
        <el-form-item label="排序" prop="sortIndex"><el-input-number v-model="form.sortIndex" :controls="false" /></el-form-item>
        <el-form-item label="隐藏" prop="isHided"><el-switch v-model="form.isHided" /></el-form-item>
        <el-form-item label="匿名访问" prop="allowAny"><el-switch v-model="form.allowAny" /></el-form-item>
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
const api = createCrudApi<any, any, any, any>('/v1/auth/crud-menus');

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
  dialogForm.value = { crudId: null, parentId: 0, menuCode: '', menuName: '', menuType: '', iconName: '', routePath: '', redirect: '', openType: false, sortIndex: 0, isHided: false, allowAny: false, remark: '' };
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