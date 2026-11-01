# Users.vue 拆分实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `Users.vue` 拆分为 `UserList.vue`（列表）和 `UserEdit.vue`（编辑对话框），放入 `views/auth/User/` 目录。

**Architecture:** UserList.vue 作为主入口组件，包含列表、搜索、权限分配对话框，并通过 ref 调用 UserEdit.vue 的 `open()` 方法打开编辑对话框。UserEdit.vue 封装 FormDialog 和表单逻辑，通过 `saved` 事件通知父组件刷新。动态路由新增 `*List.vue` 解析策略以匹配新文件结构。

**Tech Stack:** Vue 3 (Composition API), TypeScript, Element Plus, vue-i18n, Vue Router (动态路由)

---

## 文件结构

| 操作 | 文件路径 | 职责 |
|------|----------|------|
| 创建 | `web/YamAuth.Web/src/views/auth/User/UserEdit.vue` | 编辑对话框（FormDialog + 表单 + 校验 + API） |
| 创建 | `web/YamAuth.Web/src/views/auth/User/UserList.vue` | 列表页面（SearchForm + DataTable + 权限分配对话框） |
| 修改 | `web/YamAuth.Web/src/router/dynamic.ts:34-36` | 新增 `*List.vue` 解析策略 |
| 删除 | `web/YamAuth.Web/src/views/auth/Users.vue` | 旧文件，功能已迁移 |

---

## Task 1: 创建 UserEdit.vue（编辑对话框组件）

**Files:**
- Create: `web/YamAuth.Web/src/views/auth/User/UserEdit.vue`

- [ ] **Step 1: 创建 UserEdit.vue 完整代码**

```vue
<template>
  <FormDialog
    v-model="visible"
    :title="title"
    :initial="form"
    :rules="formRules"
    @submit="onSubmit">
    <template #default="{ form }">
      <el-form-item :label="t('auth.userName')" prop="userName">
        <el-input v-model="form.userName" autocomplete="off" :placeholder="t('auth.loginAccount')" />
      </el-form-item>
      <el-form-item :label="t('auth.nickName')" prop="nickName">
        <el-input v-model="form.nickName" autocomplete="off" />
      </el-form-item>
      <template v-if="isCreate">
        <el-form-item :label="t('auth.initialPassword')" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            autocomplete="new-password"
            :placeholder="t('auth.passwordPlaceholder')"
          />
        </el-form-item>
        <el-form-item :label="t('auth.confirmPassword')" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            show-password
            autocomplete="new-password"
            :placeholder="t('auth.confirmPasswordPlaceholder')"
          />
        </el-form-item>
      </template>
      <template v-else>
        <el-form-item :label="t('auth.newPasswordOptional')" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            autocomplete="new-password"
            :placeholder="t('auth.newPasswordPlaceholder')"
          />
        </el-form-item>
        <el-form-item v-if="form.password" :label="t('auth.confirmPassword')" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            show-password
            autocomplete="new-password"
            :placeholder="t('auth.confirmNewPasswordPlaceholder')"
          />
        </el-form-item>
      </template>
      <el-form-item :label="t('auth.phone')" prop="phone"><el-input v-model="form.phone" /></el-form-item>
      <el-form-item :label="t('auth.email')" prop="email"><el-input v-model="form.email" /></el-form-item>
      <el-form-item :label="labels.enabled" prop="isActived"><el-switch v-model="form.isActived" /></el-form-item>
      <el-form-item :label="labels.remark" prop="remark"><el-input v-model="form.remark" type="textarea" /></el-form-item>
    </template>
  </FormDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import FormDialog from '@/components/FormDialog.vue';
import { usersApi } from '@/api/users';
import type { UserDto, UserForm } from '@/types/user';
import { emptyUserForm, toCreatePayload, toUpdatePayload, toUserForm, validateUserPassword } from '@/types/user';
import { useCrudLabels } from '@/composables/useCrudLabels';

const { t } = useI18n();
const { labels } = useCrudLabels();

const emit = defineEmits<{ (e: 'saved'): void }>();

const visible = ref(false);
const title = ref('');
const form = ref<UserForm>(emptyUserForm());
const editingId = ref<number | null>(null);
const isCreate = computed(() => editingId.value === null);

const formRules = computed<FormRules>(() => ({
  userName: [{ required: true, message: t('validation.enterUserName'), trigger: 'blur' }],
  nickName: [{ required: true, message: t('validation.enterNickName'), trigger: 'blur' }],
  email: [
    { required: true, message: t('validation.enterEmail'), trigger: 'blur' },
    { type: 'email', message: t('validation.emailFormat'), trigger: ['blur', 'change'] }
  ],
  ...(isCreate.value
    ? {
        password: [
          { required: true, message: t('validation.enterPassword'), trigger: 'blur' },
          { min: 6, max: 128, message: t('validation.passwordLengthRange'), trigger: 'blur' }
        ],
        confirmPassword: [
          { required: true, message: t('validation.enterConfirmPassword'), trigger: 'blur' }
        ]
      }
    : {
        password: [
          { min: 6, max: 128, message: t('validation.passwordLengthRange'), trigger: 'blur' }
        ]
      })
}));

function open(mode: 'create' | 'edit', row?: UserDto) {
  if (mode === 'create') {
    editingId.value = null;
    title.value = t('auth.createUser');
    form.value = emptyUserForm();
  } else {
    editingId.value = row!.id;
    title.value = t('auth.editUser');
    form.value = toUserForm(row!);
  }
  visible.value = true;
}

async function onSubmit(formData: UserForm) {
  const pwdError = validateUserPassword(formData, isCreate.value);
  if (pwdError) {
    ElMessage.warning(pwdError);
    throw new Error(pwdError);
  }

  if (isCreate.value) {
    await usersApi.create(toCreatePayload(formData));
  } else {
    await usersApi.update(editingId.value!, toUpdatePayload(formData));
  }
  ElMessage.success(t('message.saveSuccess'));
  emit('saved');
}

defineExpose({ open });
</script>
```

- [ ] **Step 2: 提交**

```bash
git add web/YamAuth.Web/src/views/auth/User/UserEdit.vue
git commit -m "feat: add UserEdit.vue component for user create/edit dialog"
```

---

## Task 2: 创建 UserList.vue（列表页面组件）

**Files:**
- Create: `web/YamAuth.Web/src/views/auth/User/UserList.vue`

- [ ] **Step 1: 创建 UserList.vue 完整代码**

```vue
<template>
  <div>
    <SearchForm :initial="query" @search="onSearch">
      <template #default="{ form }">
        <el-form-item :label="labels.keyword"><el-input v-model="form.keyword" clearable /></el-form-item>
      </template>
      <template #actions>
        <el-button type="primary" v-has="authUser.create" @click="openCreate">{{ labels.create }}</el-button>
      </template>
    </SearchForm>

    <DataTable
      :items="items" :total="total"
      :page="query.page" :size="query.size" :loading="loading"
      @update:page="(p: number) => { query.page = p; load(); }"
      @update:size="(s: number) => { query.size = s; load(); }">
      <el-table-column prop="id" :label="t('common.id')" width="80" />
      <el-table-column prop="userName" :label="t('auth.userName')" />
      <el-table-column prop="nickName" :label="t('auth.nickName')" />
      <el-table-column prop="phone" :label="t('auth.phone')" />
      <el-table-column prop="email" :label="t('auth.email')" />
      <el-table-column prop="isActived" :label="labels.enabled" width="80">
        <template #default="{ row }"><el-switch v-model="row.isActived" disabled /></template>
      </el-table-column>
      <el-table-column :label="labels.actions" width="280">
        <template #default="{ row }">
          <el-button
            v-if="canOpenAuth"
            link
            type="primary"
            @click="openAssignAuth(row)">
            {{ t('auth.assignAuth') }}
          </el-button>
          <el-button link type="primary" v-has="authUser.update" @click="openEdit(row)">{{ labels.edit }}</el-button>
          <el-popconfirm :title="labels.confirmDelete" @confirm="remove(row.id)">
            <template #reference><el-button link type="danger" v-has="authUser.delete">{{ labels.delete }}</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </DataTable>

    <UserEdit ref="editRef" @saved="load" />

    <el-dialog
      v-model="assignVisible"
      :title="assignDialogTitle"
      width="760px"
      destroy-on-close
      @closed="assignUserId = 0">
      <UserAuthAssignPanel
        v-if="assignUserId"
        ref="assignPanelRef"
        :user-id="assignUserId"
        @saved="onAssignSaved" />
      <template #footer>
        <el-button @click="assignVisible = false">{{ t('common.cancel') }}</el-button>
        <el-button
          v-if="canSaveAuth"
          type="primary"
          @click="saveAssignAuth">
          {{ labels.save }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { authRole, authUser } from '@/constants/permissions.g';
import SearchForm from '@/components/SearchForm.vue';
import DataTable from '@/components/DataTable.vue';
import UserAuthAssignPanel from '@/components/auth/UserAuthAssignPanel.vue';
import { usersApi } from '@/api/users';
import type { UserDto } from '@/types/user';
import { useCrudLabels } from '@/composables/useCrudLabels';
import { useUserStore } from '@/stores/user';
import UserEdit from './UserEdit.vue';

const { t } = useI18n();
const { labels } = useCrudLabels();
const userStore = useUserStore();

const canOpenAuth = computed(() =>
  userStore.hasPerm(authUser.read)
  || userStore.hasPerm(authUser.assignRole)
  || userStore.hasPerm(authUser.assignOrg)
  || userStore.hasPerm(authRole.assignDataScope)
  || userStore.hasPerm(authUser.update));
const canSaveAuth = computed(() =>
  userStore.hasPerm(authUser.assignRole)
  || userStore.hasPerm(authUser.assignOrg)
  || userStore.hasPerm(authRole.assignDataScope)
  || userStore.hasPerm(authUser.update));

const query = reactive({ page: 1, size: 20, keyword: '' });
const items = ref<UserDto[]>([]);
const total = ref(0);
const loading = ref(false);

const editRef = ref<InstanceType<typeof UserEdit>>();

const assignVisible = ref(false);
const assignUserId = ref(0);
const assignUserName = ref('');
const assignPanelRef = ref<InstanceType<typeof UserAuthAssignPanel>>();
const assignDialogTitle = computed(() =>
  assignUserName.value
    ? t('entity.userAuthAssign.dialogTitle', { name: assignUserName.value })
    : t('entity.userAuthAssign.title')
);

async function load() {
  loading.value = true;
  try {
    const { total: t, items: list } = await usersApi.page(query);
    total.value = t;
    items.value = list;
  } finally {
    loading.value = false;
  }
}

function onSearch(f: typeof query) {
  Object.assign(query, f);
  query.page = 1;
  load();
}

function openCreate() {
  editRef.value?.open('create');
}

function openEdit(row: UserDto) {
  editRef.value?.open('edit', row);
}

function openAssignAuth(row: UserDto) {
  assignUserId.value = row.id;
  assignUserName.value = row.userName;
  assignVisible.value = true;
}

async function saveAssignAuth() {
  await assignPanelRef.value?.save();
}

function onAssignSaved() {
  ElMessage.success(t('message.saveSuccess'));
  assignVisible.value = false;
}

async function remove(id: number) {
  await usersApi.remove(id);
  ElMessage.success(t('message.deleteSuccess'));
  load();
}

onMounted(load);
</script>
```

- [ ] **Step 2: 提交**

```bash
git add web/YamAuth.Web/src/views/auth/User/UserList.vue
git commit -m "feat: add UserList.vue component for user list page"
```

---

## Task 3: 更新 dynamic.ts 路由解析策略

**Files:**
- Modify: `web/YamAuth.Web/src/router/dynamic.ts:29-36`

- [ ] **Step 1: 在 resolveViewLoader 函数中新增 listKey 解析策略**

找到 `resolveViewLoader` 函数（约第 22-43 行），在 `subPascalKey` 之后、`loader` 赋值之前，新增 `listKey`：

**修改前（第 29-36 行）：**
```ts
  const subPascalKey = `/src/views${parentPath}/${lastSegment}/${pascalName}.vue`

  const loader = viewModules[directKey] || viewModules[pascalKey] || viewModules[indexKey] || viewModules[subPascalKey]
```

**修改后：**
```ts
  const subPascalKey = `/src/views${parentPath}/${lastSegment}/${pascalName}.vue`

  // 新增：支持 *List.vue 模式（如 /auth/users → User/UserList.vue）
  const listKey = `/src/views${parentPath}/${pascalName}List.vue`

  const loader = viewModules[directKey] || viewModules[pascalKey] || viewModules[indexKey] || viewModules[subPascalKey] || viewModules[listKey]
```

- [ ] **Step 2: 提交**

```bash
git add web/YamAuth.Web/src/router/dynamic.ts
git commit -m "feat: add *List.vue resolution strategy to dynamic router"
```

---

## Task 4: 删除旧文件并验证

**Files:**
- Delete: `web/YamAuth.Web/src/views/auth/Users.vue`

- [ ] **Step 1: 删除旧的 Users.vue 文件**

```bash
git rm web/YamAuth.Web/src/views/auth/Users.vue
git commit -m "chore: remove Users.vue (split into User/UserList.vue + User/UserEdit.vue)"
```

- [ ] **Step 2: 运行 TypeScript 类型检查**

```bash
cd web/YamAuth.Web && npm run type-check
```

预期：无错误（如有导入路径错误，修复后重新检查）

- [ ] **Step 3: 运行前端构建验证**

```bash
cd web/YamAuth.Web && npm run build
```

预期：构建成功，无编译错误

- [ ] **Step 4: 启动开发服务器并手动验证**

```bash
cd web/YamAuth.Web && npm run dev
```

在浏览器中验证：
1. 访问用户管理页面，确认列表正常显示
2. 点击"新建"按钮，确认创建对话框正常弹出
3. 点击"编辑"按钮，确认编辑对话框正常弹出且数据回显
4. 提交表单，确认保存成功且列表刷新
5. 点击"删除"按钮，确认删除功能正常
6. 点击"分配权限"按钮，确认权限分配对话框正常弹出

- [ ] **Step 5: 最终提交（如有修复）**

```bash
git add -A
git commit -m "fix: resolve issues found during verification"
```

---

## 验证清单

完成所有 Task 后，确认以下检查项：

- [ ] `web/YamAuth.Web/src/views/auth/User/UserEdit.vue` 存在
- [ ] `web/YamAuth.Web/src/views/auth/User/UserList.vue` 存在
- [ ] `web/YamAuth.Web/src/views/auth/Users.vue` 已删除
- [ ] `web/YamAuth.Web/src/router/dynamic.ts` 包含 `listKey` 解析策略
- [ ] TypeScript 类型检查通过
- [ ] 前端构建成功
- [ ] 用户管理页面功能完整（列表、新建、编辑、删除、权限分配）
