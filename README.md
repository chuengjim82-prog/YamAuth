# YamAuth

.NET 8 / ASP.NET Core / FreeSql 后端与 React / TypeScript / Ant Design 前端组成的管理端。

## 项目边界

当前提供登录、菜单导航与资源 CRUD。角色、功能、数据角色等表尚未接入操作授权或数据范围控制，不能仅凭这些管理页面认定已实现 RBAC 或租户隔离。

当前配置使用一个物理库 `YamAuth`。`Base` / `Bzss` 是逻辑连接键，`YamBase` / `YamBzss` 是代码分区；Bzss 模块使用 Bzss 连接。

## 环境与配置

需要 .NET SDK 8.x、结构匹配的 SQL Server 数据库，以及符合 [前端约定](web/YamAuth.Web/AGENTS.md#本地开发) 的 Node.js。

| 使用者 | 配置入口 |
|--------|----------|
| API | `src/YamAuth.Api/appsettings.json`、对应环境配置和环境变量；本地可用 `Db__Base`、`Db__Bzss`、`Jwt__SecretKey` 覆盖，真实凭据不提交 |
| Web | `VITE_API_BASE_URL`，默认为 `/api`；开发代理配置在 `web/YamAuth.Web/vite.config.ts` |
| CodeGen | 独立配置，见 [生成指南](docs/codegen.md) |

API 不会自动读取旧脚本的 `scripts/database.local.json`，被 Git 忽略的配置文件也不会因此自动加载。

## 数据库准备

**不要对现有 YamAuth 库运行 `scripts/init-db.ps1`。** 旧 SQL 不对应当前表模型，初始化还可能修改已有管理员凭据；当前仓库没有经过验证的完整空库初始化基线，新环境需另行准备匹配的表结构、初始数据和账号。

API 不自动建表。Development 启动时会分别向空用户表、空菜单表写入种子，不会给已有菜单表补录新增菜单；初始账号及写入条件见 [DevDataSeeder](src/YamAuth.Api/Infrastructure/DevDataSeeder.cs)。连接现有数据库前先确认运行环境和写入影响。

## 本地运行

完成配置后，在仓库根目录打开后端终端：

```sh
dotnet run --project src/YamAuth.Api/YamAuth.Api.csproj
```

另开终端，从仓库根目录启动前端：

```sh
cd web/YamAuth.Web
npm ci
npm run dev
```

默认 API 为 `http://localhost:6500`，前端为 `http://127.0.0.1:6503`，开发时 `/api` 代理到 API。

PowerShell 可在仓库根目录分别使用 `scripts/run-api.ps1` 与 `scripts/dev-web.ps1 -SkipInstall`；后者要求已安装依赖，不传 `-SkipInstall` 会运行 `npm install`，可能更新锁文件。

## 验证与旧工具

- 检查命令见 [AGENTS](AGENTS.md#验证)。当前没有后端测试项目、前端自动化交互测试或 CI 工作流，构建不能替代接口和页面验收。
- `scripts/test-backend.ps1` 仍查找不存在的根目录解决方案；`scripts/gen-crud-views.ps1` 仍生成 Vue 页面，均不作为当前开发入口。
- Docker 与 OpenAPI 工具存在适配缺口，使用前查看 [部署说明](deploy/README.md) 和 [契约说明](openapi/README.md)。

## 项目模板

`scripts/new-project.ps1` 尚未完整适配当前项目：文本替换不覆盖 `.tsx`、排除前端锁文件，且末尾仍提示旧初始化和测试步骤。生成后必须核对重命名、数据库及配置，建立锁文件后才能使用 `npm ci`。

不要对本仓库自身生成；`-Force` 会删除已有输出目录，`-InitGit` 会创建提交，仅在相应操作已授权时使用。生成 README 使用 [模板](template/README.stub.md)，模板说明中的链接按目标仓库位置解析。
