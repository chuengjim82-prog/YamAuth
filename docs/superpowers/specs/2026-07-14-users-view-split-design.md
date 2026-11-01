# Users.vue 拆分设计规格

**日期**: 2026-07-14
**目标**: 将 `views/auth/Users.vue` 拆分为 `UserList.vue`（列表）和 `UserEdit.vue`（编辑对话框），放入 `views/auth/User/` 目录。

## 背景

当前 `Users.vue`（约 270 行）将列表展示、编辑表单、权限分配对话框三个功能混合在一个文件中，职责不清晰。项目使用动态路由（`dynamic.ts`），通过菜单 URL 自动解析 view 文件。

## 决策

- **编辑模式**: 保持对话框（FormDialog），不改为独立页面路由
- **拆分方案**: UserList 为主入口，UserEdit 通过 ref 调用

## 文件结构

```
views/auth/User/
├── UserList.vue     ← 列表主页面（路由入口，列表 + 权限分配对话框）
└── UserEdit.vue     ← 编辑对话框（FormDialog + 表单）
```

## 职责划分

### UserList.vue

**模板**:
- `SearchForm` — 关键词搜索
- `DataTable` — 用户分页表格，操作列含：分配权限、编辑、删除按钮
- `<UserEdit ref="editRef" @saved="load" />` — 编辑对话框组件
- `el-dialog` + `UserAuthAssignPanel` — 权限分配对话框（保留在列表中，因从列表行触发）

**状态**:
- `query: { page, size, keyword }` — 列表查询参数
- `items: UserDto[]` — 列表数据
- `total: number` — 总记录数
- `loading: boolean` — 加载状态
- `assignVisible`, `assignUserId`, `assignUserName`, `assignPanelRef` — 权限分配对话框状态
- `canOpenAuth`, `canSaveAuth` — 权限计算属性

**方法**:
- `load()` — 加载列表数据
- `onSearch()` — 搜索处理
- `remove(id)` — 删除用户
- `openCreate()` → `editRef.value.open('create')`
- `openEdit(row)` → `editRef.value.open('edit', row)`
- `openAssignAuth(row)` — 打开权限分配对话框
- `saveAssignAuth()` — 保存权限分配
- `onAssignSaved()` — 权限保存成功回调

**依赖**:
- `@/components/SearchForm.vue`
- `@/components/DataTable.vue`
- `@/components/auth/UserAuthAssignPanel.vue`
- `@/api/users` — `usersApi.page()`, `usersApi.remove()`
- `@/stores/user` — 权限判断
- `@/constants/permissions.g` — 权限常量
- `./UserEdit.vue` — 编辑子组件

### UserEdit.vue

**模板**:
- `FormDialog` — 表单对话框
  - userName, nickName（必填）
  - password（新建必填，编辑可选，带条件校验）
  - confirmPassword（新建必填，编辑时密码非空才显示）
  - phone, email（必填+邮箱格式校验）
  - isActived（开关）
  - remark（多行文本）

**Props**: 无（通过 `open()` 方法接收数据）

**内部状态**:
- `visible: boolean` — 对话框可见性
- `title: string` — 对话框标题
- `isCreate: boolean` — 是否新建模式
- `editingId: number | null` — 正在编辑的用户ID
- `form: UserForm` — 表单数据
- `formRules: FormRules` — 校验规则（根据 isCreate 动态变化）

**对外接口**:
- `defineExpose({ open })` — `open(mode: 'create' | 'edit', row?: UserDto)`
- `emit('saved')` — 提交成功后通知父组件

**方法**:
- `open(mode, row?)` — 打开对话框，设置模式和数据
- `onSubmit(form)` — 提交处理（密码校验 → API 调用 → 通知父组件）

**依赖**:
- `@/components/FormDialog.vue`
- `@/api/users` — `usersApi.create()`, `usersApi.update()`
- `@/types/user` — `UserDto`, `UserForm`, `emptyUserForm`, `toUserForm`, `toCreatePayload`, `toUpdatePayload`, `validateUserPassword`

## 路由兼容性

当前动态路由通过菜单 URL（如 `/auth/users`）解析 view 文件。去掉 index.vue 后，需要在 `dynamic.ts` 的 `resolveViewLoader` 中新增一条 `*List.vue` 解析策略：

**在 dynamic.ts 中新增**：
```ts
// 新增：/src/views/auth/users/UserList.vue 模式
const listKey = `/src/views${parentPath}/${pascalName}List.vue`
```

这样菜单 URL `/auth/users` 会尝试匹配：
1. `/src/views/auth/users.vue`（直接匹配）
2. `/src/views/auth/Users.vue`（PascalCase）
3. `/src/views/auth/users/index.vue`（index）
4. `/src/views/auth/users/Users.vue`（SubPascal）
5. **`/src/views/auth/Users/UserList.vue`（新增：*List 模式）** ← 命中

> 注意：此策略是通用的，未来其他 CRUD 视图拆分时也能自动匹配，无需每次修改路由代码。

## 数据流

```
UserList                          UserEdit
   │                                 │
   │ open('create')                  │
   ├────────────────────────────────►│
   │                                 │ 显示 FormDialog
   │                                 │ 用户填写表单
   │                                 │ onSubmit()
   │                                 │ → 密码校验
   │                                 │ → usersApi.create/update()
   │              emit('saved')      │
   │◄────────────────────────────────┤
   │ load() 刷新列表                  │
   │                                 │
```

## 不做的事

- 不改变现有 UX（对话框样式、交互行为不变）
- 不重构权限分配对话框（保留在 UserList 中）
- 不修改 FormDialog 组件本身
- 不修改 API 接口或类型定义
- 不修改其他已有的 CRUD 视图
