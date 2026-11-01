# YamAuth 重建设计方案

- 日期：2026-07-10
- 来源项目：`D:\OSOO\Code\ProxySale`（.NET 8 + Vue 3 脚手架）
- 目标项目：`D:\CODE\YamAuth`
- 目标数据库：`YamBase`（主库）、`YamBzss`（第二业务库），均为 `127.0.0.1 / sa`

## 1. 背景与目标

ProxySale 现有权限体系（数据权限 DataScope、资源/API 三层 Resource、组织树 OrgUnit、菜单角色 RBAC、i18n）过于复杂。用户重建了两个精简数据库，希望**照抄 ProxySale 的前后端架构与代码**，但只保留新库中存在的表，并**去掉全部权限逻辑，只保留登录**。

核心决策（已与用户确认）：

1. **权限范围**：只保留登录 / JWT + 用户表；登录后所有人看到全部菜单；不做角色→菜单过滤，不做按钮权限，不做数据权限。
2. **角色三表**：`MenuRole` / `MenuRoleMenu` / `MenuRoleUser` **保留表和 CRUD 页面，但不生效**（不参与任何登录后可见性或校验）。
3. **命名**：全面重命名为 `YamAuth`（解决方案、项目、命名空间、前端），双库目录用 `YamBase` / `YamBzss` 分区。
4. **产出方式**：手工完整拷贝（拷贝整棵树 → 重命名 → 删除无表文件 → 剥离权限代码）。
5. **测试**：暂不搬 `tests/`，交付标准为 build 通过 + 冒烟运行通过。

“只抄新库中有的表，没有的表不抄”是硬性规则。

## 2. 数据库现状（照此驱动取舍）

### YamBase（主库）
- `tb_Auth_User`
- `tb_Auth_MenuGroup`
- `tb_Auth_MenuInfo`（保留 `AllowAny` 列，但不使用）
- `tb_Auth_MenuItem`（保留 `AllowAny` 列，但不使用）
- `tb_Auth_MenuRole`
- `tb_Auth_MenuRoleMenu`
- `tb_Auth_MenuRoleUser`
- `tb_Base_Country`
- `tb_Base_Currency`
- `tb_Base_Customer`（新建；普通客户表，无 OrgUnitId）
- `tb_Goods_SpuInfo`（含 `CustomerId`）
- `tb_Goods_SkcInfo`（含 `CustomerId`）
- `tb_Goods_SkuInfo`（含 `CustomerId`）

### YamBzss（第二业务库）
- `tb_Stock_SkuStock`

### 未在新库中出现（因此不抄）
RefreshToken、PasswordResetToken、Resource、ResourceDimension、RoleResource、DataPolicy、RoleDataScope、UserDataScope、OrgUnit、UserOrgUnit、所有 `*I18n` 表、SkcImage、SkuImage、Consignment（Order / OrderItem）。

## 3. 项目结构（重命名后）

保留 ProxySale 的分层，全部 `ProxySale` → `YamAuth`，双库键名沿用 `Base` / `Bzss`：

```
YamAuth.sln
src/
  YamAuth.Api/          HTTP 入口、JWT、中间件、Controller
  YamAuth.Dtos/         API 契约 DTO（Auth / Base / Goods / Stock）
  YamAuth.Service/      业务逻辑 + 登录
  YamAuth.Repository/   FreeSql 仓储
  YamAuth.Entity/       实体（YamBase / YamBzss 两库分区）
  YamAuth.DbInit/       建库 + 执行 SQL
  YamAuth.CodeGen/      代码生成（模板同步去权限）
web/YamAuth.Web/        Vue 3 管理端
scripts/                 init-db / run-api / dev-web（端口沿用 6500 / 6501）
docs/ deploy/            按需保留
```

- 不含 `tests/`。
- 命名空间统一 `YamAuth.*`；`DbKeys` 仍为 `Base` / `Bzss`。
- 实体目录 `YamAuth.Entity/YamBase/{Auth,Base,Goods}`、`YamAuth.Entity/YamBzss/{Stock}`。

## 4. 抄哪些、删哪些（按表驱动）

| 模块 | 保留（有表） | 删除（无表） |
|---|---|---|
| Auth 实体 | User, MenuGroup, MenuInfo, MenuItem, MenuRole, MenuRoleMenu, MenuRoleUser | RefreshToken, PasswordResetToken, Resource, ResourceDimension, RoleResource, DataPolicy, RoleDataScope, UserDataScope, OrgUnit, UserOrgUnit, 所有 *I18n |
| Base | Country, Currency, **Customer** | —（Customer 现已保留） |
| Goods | SpuInfo, SkcInfo, SkuInfo | SkcImage, SkuImage |
| Bzss | SkuStock | Consignment（Order / OrderItem） |

对应删除的 Controller / Service / Repository / Dto / Vue 页面（无表支撑者）：
- 后端：`DataScopeDimensionsController`、`OrgUnitsController`、`RoleAssignmentsController`、`RbacController`、`ConsignmentOrdersController`、`SkcImagesController`、`SkuImagesController`；登录中的 `refresh` / `logout` / `forgot-password` / `reset-password`。
- Service：`DataPermissionService`、`DataPermissionResolver`、`DataScopeAccessor`、`ResourceDimensionProvider`、`PasswordResetService`、`PermissionSyncService`、`RbacService`、`RoleAssignmentService`、`SessionInvalidationService`、`SmtpEmailService` 及 DataScope/Resource/Org 全套支撑类。
- 前端：`login/ForgotPassword.vue`、`login/ResetPassword.vue`、`auth/OrgUnits.vue`、`auth/RoleDataScopeAssign.vue`、`auth/RoleCustomersAssign.vue`、`consignment/*`、`goods/SkcImages.vue`、`goods/SkuImages.vue`、`api/dataScope.ts`、`api/orgUnit.ts` 及 `api/roleAssignment.ts` 中不再需要的部分。

## 5. 去权限的具体改动

### 5.1 后端

- **LoginController**：仅保留 `POST api/v1/auth/login` 与 `POST change-password`；删除 `refresh` / `logout` / `forgot-password` / `reset-password`。
- **登录令牌**：只发放 access token；不再有 refresh token；JWT 携带用户身份（`id` / `nic`），**不再携带 `perm` 声明**；不再有 PermVersion 失效逻辑。
- **Program.cs**：移除 `SessionValidationMiddleware`、`PermissionSyncHostedService`、`IDataScopeAccessor`、`IUserSessionValidator`、`LocaleMiddleware` 及 i18n / DataScope / Resource 相关注册；**保留** JWT 认证、CORS、限流（login window）、全局异常中间件、健康检查、FluentValidation、Mapster、双库 keyed `IFreeSql`。
- **Controller 特性**：所有业务 Controller 去掉 `RequiresPermission` / `ResourcePermission`，仅用 `[Authorize]`（登录即可访问）。
- **Repository / Service**：剥离所有 `ApplyDataScope`、`[DataScope]`、`ICustomerScoped`、`CustomerScopedRepositoryBase` 调用，仓储回归普通查询（语义为“查全部”）。
- **残留列（表里有但逻辑不用）**：`MenuInfo.AllowAny`、`MenuItem.AllowAny`、`User.PermVersion` → 实体照常映射为普通字段，不参与任何过滤或校验。（`MenuInfo.ResourceCode`、`MenuRole.DataScopeType` 已在库中删除，实体不含这两列。）

### 5.2 前端

- 登录后**拉取全部菜单**渲染侧边栏与动态路由（保留 `router/dynamic.ts` 懒加载机制），不再按角色过滤。
- 去掉 `v-has` 按钮指令的权限判断（指令可留但恒为 true，或直接移除）；清理 `stores/menu.ts` 中的权限过滤逻辑。
- **保留但不生效** 的角色管理页面：`auth/MenuRoles.vue`、`auth/RoleMenusAssign.vue`（MenuRoleMenu）、`auth/UserRolesAssign.vue`（MenuRoleUser）、`auth/MenuInfos.vue`、`auth/MenuItems.vue`、`auth/MenuGroups`（若有）、`auth/Users.vue` —— 纯 CRUD，不影响登录后的菜单可见性或接口访问。
- 保留业务页面：`base/Countries.vue`、`base/Currencies.vue`、`base/Customers.vue`、`base/CustomerForm.vue`、`goods/SpuInfos.vue`、`goods/SkcInfos.vue`、`goods/SkuInfos.vue`、`stock/SkuStocks.vue`、`home/Home.vue`、`error/403.vue`、`error/404.vue`、`login/Login.vue`。

## 6. 配置与运行

- **`YamAuth.Api/appsettings.json`**：`Db.Base` / `Db.Bzss` 指向 YamBase / YamBzss；删除 `Smtp`、`PasswordReset`、`Rbac`、`Auth.Cache` 段；`Jwt` 去掉 `RefreshTokenDays`。本地连接经 `scripts/database.local.json`（gitignore，`127.0.0.1 / sa`）。
- **`YamAuth.CodeGen/appsettings.json`**：两个连接改为本地 YamBase / YamBzss。
- **CodeGen 模板**：模板中发射的权限代码（`Permissions.g.cs`、`RequiresPermission` 特性、`v-has`、DataScope 绑定、权限种子 SQL）需**同步去掉**，避免下次生成把权限带回。
- **运行脚本**：`scripts/run-api.ps1`（6500）、`scripts/dev-web.ps1`（6501，`/api` 代理到 6500）。
- **DbInit / SQL**：`init_db.sql` / seed 精简为仅保留 12 张主库表 + 1 张 Bzss 表的结构与基础种子（菜单、超级管理员用户，无权限/角色绑定的强制关系）。

## 7. 验证标准

- `dotnet build YamAuth.sln -c Release` 通过。
- API 可启动（`http://localhost:6500`），`/health` 正常。
- 前端 `npx vite build` 通过；`dev-web` 可登录并看到菜单。
- 冒烟：用管理员登录 → 看到全部菜单 → 打开 Countries / Currencies / Customers / Spu/Skc/Sku / SkuStock 列表能加载。

## 8. 风险与边界

- **DataScope 剥离深度**：`SkcInfo` / `SkuInfo` / `SkuStock` 的仓储与服务和 DataScope 深度耦合，逐文件剥离时需保证查询语义正确（回归“查全部”），避免遗留对已删除类型的引用导致编译失败。
- **CodeGen 模板去权限**：若模板未同步清理，后续生成会重新引入权限代码。
- **残留列语义**：`CustomerId`（Goods/Stock）现对应真实 `tb_Base_Customer`，非孤儿列；`AllowAny`（MenuInfo/MenuItem）/ `PermVersion` 保留为惰性字段；`ResourceCode` / `DataScopeType` 列已删，实体不映射。
- **暂不搬测试**：`tests/` 不复制；交付以 build + 冒烟为准，不含自动化测试回归。

## 9. 交付范围（本 spec 边界）

- 一次性产出可编译、可运行、可登录的 YamAuth 前后端骨架 + 保留模块的 CRUD。
- 不含：任何权限/数据权限/组织/i18n 功能，测试工程，生产部署调优。
