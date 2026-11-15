# YamAuth

.NET 8 / ASP.NET Core / FreeSql 后端与 React / TypeScript / Ant Design 前端组成的管理端。

## 项目边界

提供服务端会话、平台与租户管理员、按操作授权和数据范围隔离，覆盖现有 16 类资源；前端按服务端身份、菜单、操作与逐行权限展示。部署前须完成显式数据映射和隔离环境验收，参见 [权限切换手册](docs/authorization-rollout.md)。

当前配置使用一个物理库 `YamAuth`。`Base` / `Bzss` 是逻辑连接键，`YamBase` / `YamBzss` 是代码分区；Bzss 模块使用 Bzss 连接。

## 环境与配置

需要 .NET SDK 8.x、结构匹配的 SQL Server 数据库，以及符合 [前端约定](web/YamAuth.Web/AGENTS.md#本地开发) 的 Node.js。

| 使用者 | 配置入口 |
|--------|----------|
| API | `src/YamAuth.Api/appsettings.json`、对应环境配置和环境变量；本地可用 `Db__Base`、`Db__Bzss`、`Jwt__SecretKey` 覆盖，真实凭据不提交 |
| Web | `VITE_API_BASE_URL`，默认为 `/api`；开发代理配置在 `web/YamAuth.Web/vite.config.ts` |
| CodeGen | 独立配置，见 [生成指南](docs/codegen.md) |

API 不会自动读取旧脚本的 `scripts/database.local.json`，被 Git 忽略的配置文件也不会因此自动加载。

Web 登录信息使用单条 `yamauth-session:v1` 记录，避免账号与 token 分开写入造成错配。升级后首次加载会迁移有效的旧登录信息；已经打开的旧版本标签页需刷新。跨标签页切换账号会静默关闭未提交表单并返回首页，退出也会同步；浏览器不能保存登录信息时保持未登录。登录、退出与旧凭据迁移通过 IndexedDB 的事务队列协调跨标签页写入；禁用 IndexedDB 时会明确报告存储错误，不降级为无互斥写入。

## 数据库准备

**不要对现有 YamAuth 库运行 `scripts/init-db.ps1`。** 旧 SQL 不对应当前表模型，初始化还可能修改已有管理员凭据；生产空库基线仍需团队核对；专用迁移工具提供增量升级和仅用于隔离测试的空库基线，使用方式见 [权限切换手册](docs/authorization-rollout.md)。

API 不自动建表或写入 Development 种子。初始管理员必须在迁移清单中明确确认；不得从历史管理员标记直接授予最高权限。

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

- 检查命令见 [AGENTS](AGENTS.md#验证)。前端检查包含编译期契约反例、表单转换、树算法、会话同步与接口异常测试；后端测试位于 `tests/YamAuth.Tests`，未显式配置测试实例时跳过 SQL Server 用例。模拟浏览器服务与集成测试的运行方式见 [切换手册](docs/authorization-rollout.md#测试执行)；构建和离线测试不能替代真实接口及页面验收。
- `scripts/test-backend.ps1` 仍查找不存在的根目录解决方案；`scripts/gen-crud-views.ps1` 仍生成 Vue 页面，均不作为当前开发入口。
- Docker 与 OpenAPI 工具存在适配缺口，使用前查看 [部署说明](deploy/README.md) 和 [契约说明](openapi/README.md)。

## 项目模板

`scripts/new-project.ps1` 尚未完整适配当前项目：文本替换不覆盖 `.tsx`、排除前端锁文件，且末尾仍提示旧初始化和测试步骤。生成后必须核对重命名、数据库及配置，建立锁文件后才能使用 `npm ci`。

不要对本仓库自身生成；`-Force` 会删除已有输出目录，`-InitGit` 会创建提交，仅在相应操作已授权时使用。生成 README 使用 [模板](template/README.stub.md)，模板说明中的链接按目标仓库位置解析。
