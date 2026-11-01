# YamAuth.Web 页面生成器

快速生成 `.vue` 页面的工具，支持 CRUD 页面和模块概览页面，遵循项目现有代码规范和架构模式。

## 快速开始

```bash
node scripts/generate-page/generate.cjs
```

或者通过 npm script：

```bash
npm run generate-page
```

（需先在 `package.json` 中添加脚本：`"generate-page": "node scripts/generate-page/generate.cjs"`）

## 交互流程

脚本会依次询问以下信息：

| 问题         | 说明                                       | 示例                             |
| ------------ | ------------------------------------------ | -------------------------------- |
| 模板选择     | 1=声明式CRUD / 2=插槽式CRUD / 3=模块仪表盘 | 默认 1                           |
| 模块名       | 小写英文，对应 views 子目录                | `base`, `auth`, `goods`, `stock` |
| 实体名       | 小写英文（仅 CRUD 模板）                   | `customer`, `product`, `order`   |
| 实体中文名   | 中文描述（仅 CRUD 模板）                   | `客户`, `产品`, `订单`           |
| API 基础路径 | 后端 API 路径（仅 CRUD 模板）              | `/v1/base/customers`             |
| 目标目录     | 生成路径                                   | 默认 `src/views/{模块名}/`       |

## 可用模板

### 1. standard-crud（声明式字段配置）

适用于标准 CRUD 页面，使用 `:fields` 和 `:columns` 声明式配置。

**特点：**

- 搜索字段集中配置在 `searchFields` 数组中
- 表格列集中配置在 `tableColumns` 数组中
- 使用 `RowActions` 组件渲染行操作按钮
- 内置导入导出功能
- **参考页面：** `src/views/base/Customers.vue`

### 2. slot-crud（插槽式自定义布局）

适用于需要灵活自定义布局的页面。

**特点：**

- SearchForm 使用插槽自定义
- DataTable 直接使用 `<el-table-column>` 子组件
- 操作按钮直接写在模板中
- 布局更灵活，适合有特殊渲染需求的页面
- **参考页面：** `src/views/base/Countries.vue`, `src/views/auth/Users.vue`

### 3. module-dashboard（模块概览仪表盘）⭐ 新增

适用于模块首页，以卡片网格形式展示该模块下的所有子实体导航入口。

**特点：**

- 卡片式导航，每张卡片代表一个子模块/子实体
- 每张卡片配有图标、标题、描述、颜色标识
- 内置权限控制：无权限的卡片自动灰化且不可点击
- 响应式布局：自动适应不同屏幕宽度
- 预留统计概览区域（注释状态，按需启用）
- 生成文件固定命名为 `Index.vue`

**参考布局：**

```
┌─────────────────────────────────────────┐
│  商品管理                                │
│  管理商品相关的基础数据与配置              │
├──────────┬──────────┬──────────┬─────────┤
│ 📄 SPU   │ 📁 SKU   │ 🎫 SKC   │ ⚙ 图片  │
│ 信息管理  │ 信息管理  │ 信息管理  │ 管理    │
├──────────┼──────────┼──────────┼─────────┤
│ ...      │          │          │         │
└──────────┴──────────┴──────────┴─────────┘
```

## 生成后的必要步骤

### CRUD 页面

#### 1️⃣ 注册权限常量

编辑 `src/constants/permissions.manual.ts`：

```ts
export const yourEntity = {
  list: 'module:entity:list',
  read: 'module:entity:read',
  create: 'module:entity:create',
  update: 'module:entity:update',
  delete: 'module:entity:delete',
} as const
```

> 如果后端 CodeGen 已生成权限，则直接在 `permissions.g.ts` 中找到对应的常量名。

#### 2️⃣ 添加 i18n 国际化文案

编辑 `src/i18n/locales/zh-CN.ts` 和 `src/i18n/locales/en-US.ts`，添加对应模块的文案。

#### 3️⃣ 替换 TODO 标记

生成的页面中包含多处 `TODO` 标记，需要根据实际业务替换：

- 搜索字段配置
- 表格列配置
- 表单字段和校验规则
- 弹窗表单的默认值

#### 4️⃣ 在菜单管理后台添加菜单

- 菜单 URL：`/{moduleName}/{entityName}`
- 权限标识：`{permissionModule}.list`

#### 5️⃣ （可选）提取表单子组件

如果表单字段较多，建议将 `FormDialog` 内的字段提取到独立的 `{EntityName}Form.vue` 中，
参考 `src/views/base/CustomerForm.vue` 的模式。

### 模块仪表盘页面

#### 1️⃣ 配置导航卡片

编辑生成的 `Index.vue`，找到 `moduleCards` 数组，将示例的 `entity1~entity4` 替换为实际业务子模块。每个卡片配置包含：

| 字段          | 说明                    | 示例                        |
| ------------- | ----------------------- | --------------------------- |
| `key`         | 唯一标识                | `'spu'`                     |
| `title`       | 卡片标题（建议用 i18n） | `t('module.goods.spu')`     |
| `description` | 卡片描述                | `t('module.goods.spuDesc')` |
| `icon`        | Element Plus 图标组件   | `Document`                  |
| `route`       | 点击跳转路由            | `'/goods/spu-infos'`        |
| `permission`  | 权限标识（可选）        | `'goods:spuinfo:list'`      |
| `color`       | 图标背景色              | `'#409eff'`                 |

#### 2️⃣ 添加 i18n 国际化文案

编辑 `src/i18n/locales/zh-CN.ts`：

```json
"module": {
  "goods": {
    "title": "商品管理",
    "description": "管理商品相关的基础数据与配置",
    "spu": "SPU 信息",
    "spuDesc": "管理商品 SPU 基础信息",
    "sku": "SKU 信息",
    "skuDesc": "管理商品 SKU 规格信息"
  }
}
```

编辑 `src/i18n/locales/en-US.ts` 添加对应英文文案。

#### 3️⃣ 在菜单管理后台添加菜单

- 菜单 URL：`/{moduleName}/index`
- 将此页面设置为该模块的首页

## 模板变量说明

| 变量名                  | 说明              | 示例值               |
| ----------------------- | ----------------- | -------------------- |
| `{{MODULE_NAME}}`       | 模块名            | `base`               |
| `{{ENTITY_NAME}}`       | 实体名            | `customer`           |
| `{{ENTITY_CN}}`         | 实体中文名        | `客户`               |
| `{{ENTITY_PASCAL}}`     | PascalCase 实体名 | `Customer`           |
| `{{API_BASE_PATH}}`     | API 路径          | `/v1/base/customers` |
| `{{PERMISSION_MODULE}}` | 权限模块常量名    | `baseCustomer`       |

## 项目约定

- 使用 Vue 3 Composition API + `<script setup>`
- 自动导入 Element Plus 组件（通过 `unplugin-vue-components`）
- 使用 `@/` 作为 `src/` 的别名
- 使用 `vue-i18n` 进行国际化
- 使用 `v-has` 指令控制权限
- API 统一通过 `createCrudApi` 工厂函数或自定义 API 模块调用
