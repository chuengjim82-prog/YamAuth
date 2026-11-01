# YamAuth 开发者 / AI 上手指引

欢迎加入本仓库。本文档面向**新加入的开发者**与**代码助手（Cursor 等 AI）**，帮助在 30 分钟内理解项目边界、跑通环境、按既有约定改代码。

> 快速命令与测试数量见 [README.md](./README.md)；专题设计见 [docs/README.md](./docs/README.md)。

---

## 1. 项目是什么

YamAuth 是一个 **.NET 8 + Vue 3 管理端脚手架**，不是单一业务产品。当前阶段重点是：

- RBAC 权限（菜单 / 按钮 / API 三层）
- 数据权限（Customer、Self、OrgMember 等）
- CodeGen 驱动的 CRUD 全链路
- 组织与用户归属、国际化、Docker / CI 基线

**原则**：先打牢脚手架，再 CodeGen 业务表。路线图与「明确不做」的范围见 [docs/scaffold-roadmap.md](./docs/scaffold-roadmap.md)。

---

## 2. 给 AI 助手（优先阅读）

改代码前请遵守以下约束，避免重复踩坑：

| 约束 | 说明 |
|------|------|
| **最小改动** | 只改与任务相关的文件；不要顺手重构、不要恢复已删除的旧代码 |
| **Windows 环境** | 用 PowerShell / `.ps1` / `.cmd`；**不要用** bash 的 `&&` 串联命令 |
| **版本控制** | 团队可能使用 SVN；**未经明确要求不要 commit / push** |
| **DTO 位置** | 契约 DTO 在 `src/YamAuth.Dtos/`（命名空间 `YamAuth.Dtos.*`）；**不要**在 `YamAuth.Service/Dtos/` 下重建旧目录 |
| **DbInit** | 数据库初始化走 SQL 脚本 + `init-db.manifest.json`；**不要**恢复 `SchemaSync` / `DevBootstrap`（FreeSql CodeFirst 种子） |
| **权限码** | **不要手写**权限清单；改表或资源后跑 CodeGen，见 [docs/rbac-guide.md](./docs/rbac-guide.md) |
| **国际化** | 前端 `vue-i18n` v11 + Composition API（`legacy: false`）；文案 key 见 `web/YamAuth.Web/src/i18n/locales/` |
| **动态路由** | 菜单页懒加载在 `web/YamAuth.Web/src/router/dynamic.ts`；加载态用 `defineAsyncComponent` + `RoutePending` |
| **新模块清单** | 双库 DDL、MenuUrl↔组件名、keep-alive 刷新、双语 i18n：见 [development-conventions.md](./docs/development-conventions.md) |
| **密钥与配置** | 不提交 `database.local.json`、`.env`、真实密码；本地库连接写在 `scripts/database.local.json`（gitignore） |

**改完应验证**（按任务范围选做）：

```powershell
dotnet build YamAuth.sln -c Release
.\scripts\test-backend.ps1
cd web\YamAuth.Web; npx vite build
```

---

## 3. 本地环境（新人 30 分钟）

### 3.1 前置依赖

| 工具 | 版本建议 |
|------|----------|
| .NET SDK | 8.x |
| Node.js | 20+（前端 Vite 8） |
| SQL Server | 2019+ 或 Docker 中的 SQL Server |
| sqlcmd | 可选；`init-db.ps1` 会尝试定位 |

### 3.2 首次初始化

1. **配置数据库**（若尚无 `scripts/database.local.json`）  
   - 从模板复制或执行 `new-project.ps1` 生成（见 [docs/template-guide.md](./docs/template-guide.md)）  
   - 填写 `Server`、`User`、`Password`、`DbBase`、`DbSecondary`

2. **建库 + 表结构 + 种子数据**

   ```powershell
   .\scripts\init-db.ps1
   ```

   流程：`YamAuth.DbInit` 创建库 → 按 `scripts/init-db.manifest.json` 执行 SQL → 用本地配置覆盖管理员密码。

   | 脚本 | 作用 |
   |------|------|
   | `init_db.sql` | 表结构 + 索引 |
   | `init_db.seed.sql` | 菜单、权限、超级管理员 |
   | `init_db.secondary.sql` | 第二库（如库存表） |

3. **启动后端**（默认 `http://localhost:6500`）

   ```powershell
   .\scripts\run-api.ps1
   ```

4. **启动前端**（默认 `http://localhost:6501`，`/api` 代理到 6500）

   ```powershell
   .\scripts\dev-web.ps1
   ```

5. **登录**  
   默认管理员见 `database.local.json` 或 init 脚本输出（常见为 `admin` / 本地配置的密码）。

### 3.3 常用脚本一览

| 脚本 | 用途 |
|------|------|
| `scripts/run-api.ps1` | 启动 API |
| `scripts/dev-web.ps1` | `npm install` + 前端 dev |
| `scripts/test-backend.ps1` | `dotnet test` |
| `scripts/init-db.ps1` | 数据库初始化 |
| `scripts/new-project.ps1` | 从本仓库**生成新项目**（勿在 YamAuth 本仓内对己身执行） |
| `scripts/generate-openapi.ps1` | 导出 OpenAPI |

---

## 4. 仓库地图

```
src/
  YamAuth.Api/           HTTP 入口、JWT、中间件、Controller
  YamAuth.Dtos/          API 契约 DTO（Auth / Base / Goods / Stock）
  YamAuth.Service/       业务逻辑、RBAC、DataScope
  YamAuth.Repository/    FreeSql 仓储
  YamAuth.Entity/        实体（与表对应）
  YamAuth.CodeGen/       从 DB 生成 Entity / Service / API / Vue / 权限
  YamAuth.DbInit/        建库 + 执行 SQL 脚本
web/YamAuth.Web/         Vue 3 管理端
tests/                     单元测试 + API 集成测试
scripts/                   初始化、模板、OpenAPI
docs/                      设计文档与专题指南
deploy/                    Docker Compose、生产配置模板
template/                  new-project 排除列表与 token 配置
```

**双库约定**（CodeGen `appsettings.json`）：

- `YamBase` — 认证、基础数据、商品等主库
- `YamBzss` — 第二业务库（如库存）

---

## 5. 日常开发怎么改

### 5.1 新增 / 修改业务表（推荐路径）

1. 在 SQL Server 建表或写迁移脚本到 `scripts/`
2. 更新 `init_db.sql`（结构）或独立迁移脚本；种子数据放 `init_db.seed.sql` 或专用 seed
3. 运行 CodeGen：

   ```powershell
   dotnet run --project src/YamAuth.CodeGen
   ```

4. 检查生成物：Entity、Repository、Service、Controller、Vue 页面、`Permissions.g.cs`、`permissions.g.ts`、MenuItem 种子 SQL
5. 权限与菜单细节见 [docs/rbac-guide.md](./docs/rbac-guide.md)
6. 前端文案补充 `zh-CN.ts` / `en-US.ts`，菜单多语言见 [docs/i18n-guide.md](./docs/i18n-guide.md)

### 5.2 只改前端页面

- 页面：`web/YamAuth.Web/src/views/{module}/`
- 公共组件：`components/`、`composables/useCrudLabels.ts`
- 路由：静态路由在 `router/index.ts`；**菜单动态路由**在 `router/dynamic.ts`（`menuUrl` 应对应 views 路径）
- 权限按钮：`v-has="permissions.xxx"`，常量来自 `permissions.g.ts`（**生成文件，勿手改**）
- **路由、keep-alive、双库、新模块清单**：见 [docs/development-conventions.md](./docs/development-conventions.md)

### 5.3 只改后端 API

- Controller：`src/YamAuth.Api/`
- 校验：`FluentValidation`，生成或手写在对应 Validator
- 数据权限：Service 层 `[DataScope]` 与 `ApplyDataScope`，见 [docs/data-permission-design.md](./docs/data-permission-design.md)

---

## 6. 架构要点（避免误改）

| 主题 | 要点 |
|------|------|
| **权限** | JWT 携带 `perm`；`RequiresPermission` 校验 API；前端 `v-has` + 路由 `meta.permissions` |
| **超级管理员** | 权限码 `*:*:*`；菜单 `AllowAny` 展开整页权限 |
| **数据权限** | 角色 `DataScopeType` + `RoleDataScope`；Customer 维度已落地 |
| **组织** | `OrgUnit` 树 + `UserOrgUnit`；**不做** `Customer.OrgUnitId` |
| **会话** | `User.PermVersion` 变更使旧 Token 失效；需重新登录 |
| **i18n** | `Accept-Language` 请求头；菜单名可存 `tb_Auth_MenuInfo_i18n` |

---

## 7. 测试与质量

| 类型 | 命令 / 位置 |
|------|-------------|
| 后端单元 + 集成 | `.\scripts\test-backend.ps1` |
| 前端 E2E | `cd web\YamAuth.Web; npm run test:e2e` |
| CI | `.github/workflows/ci.yml` |
| OpenAPI 漂移 | CI 中对比 `openapi/openapi.json` |

改 RBAC、DataScope、Org 相关逻辑时，优先跑 `YamAuth.Service.Tests`。

---

## 8. 文档索引（按场景）

| 我要… | 读 |
|-------|-----|
| 整体路线图、哪些需求已作废 | [docs/scaffold-roadmap.md](./docs/scaffold-roadmap.md) |
| 从本仓库 fork 新项目 | [docs/template-guide.md](./docs/template-guide.md) |
| 加权限、MenuItem、v-has | [docs/rbac-guide.md](./docs/rbac-guide.md) |
| 数据权限、Customer 范围 | [docs/data-permission-design.md](./docs/data-permission-design.md) |
| 组织树、用户归属 | [docs/org-structure-design.md](./docs/org-structure-design.md) |
| 多语言、菜单翻译 | [docs/i18n-guide.md](./docs/i18n-guide.md) |
| 新模块（路由/双库/列表刷新/清单） | [docs/development-conventions.md](./docs/development-conventions.md) |
| Docker / 生产部署 | [deploy/README.md](./deploy/README.md) |
| SQL 脚本清单与顺序 | [docs/README.md](./docs/README.md) |

---

## 9. 常见问题

**Q：`dotnet build` 报 `YamAuth.Service.Dtos` 与 `YamAuth.Dtos` 冲突？**  
A：说明 `src/YamAuth.Service/Dtos/` 被误恢复，应删除该目录及 `Abstractions/PagedQuery.cs`、`PagedResult.cs`（分页类型已在 `YamAuth.Dtos`）。

**Q：`DbInit` 报找不到 FreeSql？**  
A：不要恢复 `SchemaSync.cs` / `DevBootstrap.cs`；当前入口是 `Program.cs` + SQL manifest。

**Q：PowerShell 里命令没反应？**  
A：用 `.\scripts\xxx.ps1`，多条命令用 `;` 分隔，不要用 `&&`。

**Q：改权限后前端按钮还在 / API 403？**  
A：重新登录；开发环境确认 `Rbac:SyncPermissionsOnStartup`；检查 CodeGen 是否已跑、MenuItem 种子是否进库。

**Q：第一次点菜单白屏？**  
A：动态路由懒加载；应看到 `RoutePending` 加载态。登录后会预取菜单 chunk；仍异常时查 `router/dynamic.ts`。

**Q：菜单能打开但 404 / 控制台 `Missing view for menuUrl`？**  
A：`MenuUrl` 与 `views/` 下文件名不一致。见 [development-conventions §3](./docs/development-conventions.md#3-前端路由)。

**Q：从详情返回列表，数据不更新？**  
A：列表页需 `onActivated(load)`，不要只写 `onMounted`。见 [development-conventions §5](./docs/development-conventions.md#5-keep-alive-与列表刷新)。

---

## 10. 联系与贡献习惯

- 大改前先读 [docs/scaffold-roadmap.md](./docs/scaffold-roadmap.md) 确认是否在范围内
- 新增 SQL 迁移：一次性脚本用 `YYYYMMDD_` 前缀；纳入 `init-db.manifest.json` 或合并进 `init_db.sql` / seed，并在 [docs/README.md](./docs/README.md) 补充说明
- 文档默认放 `docs/`；根目录只保留 README 与本指引

---

*最后更新：2026-06 — 与 DbInit SQL 化、YamAuth.Dtos 拆分、vue-i18n v11 保持一致。*
