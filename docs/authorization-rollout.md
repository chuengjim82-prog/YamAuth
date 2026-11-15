# 权限与数据隔离实施及切换

本分支实现 [设计方案](authorization-and-data-isolation-design.md) 中的统一权限边界。部署前必须在隔离 SQL Server 中完成迁移演练和接口测试。代码构建、离线测试或模拟页面验收不能证明现有数据库已完成切换。

## 部署约束

- API 的 `Db:Base` 与 `Db:Bzss` 必须指向同一服务器、同一物理数据库；启动时会核对。所有已认证写操作在显式 Serializable 事务内再次核对权限，基础表、业务表和审计 outbox 共用该事务。
- API 不自动建表、不执行迁移，也不再调用 Development 种子。不要运行旧 `scripts/init-db.ps1`。
- 旧 JWT 缺少服务端会话标识和安全版本，升级后失效。新令牌仍会逐请求核对账号、会话、租户状态以及授权版本。
- 内置后台应用身份为代码固定的 `yamauth.backend` / `Backend`；可编辑的 `RoleCode`、`IsSystem`、数据库 API 路径均不能赋予平台或租户管理员身份。
- `Authorization:AuditRetentionDays` 默认为 180，必须大于零。业务事件先写入同事务的 outbox，后台每 10 秒汇入统一审计；未汇入事件不会按保留期清除。

## 检查和准备映射

迁移工具不读取 API、CodeGen 或旧脚本的连接配置。仅接受显式环境变量 `YAMAUTH_MIGRATION_CONNECTION`；连接字符串不要放进命令历史或提交到仓库。使用本地凭据管理或未提交的环境配置设置后运行：

```sh
dotnet run --project src/YamAuth.Migrations -c Release -- inspect > authorization-inspection.json
```

`inspect` 为只读操作，输出各资源数量、待确认的记录编号、登录标识冲突和当前迁移状态。先在备份副本核对真实列类型、长度、索引和数据规模，再审阅 [加法迁移](../src/YamAuth.Migrations/Sql/001-authorization.sql) 与 [约束脚本](../src/YamAuth.Migrations/Sql/002-constraints.sql)。脚本预期当前实体对应的 `dbo.tb_*` 基线；缺表、登录标识冲突、重复有效员工绑定或关联约束不成立都会中止并回滚。遇到与基线不同的数据库结构，应先准备经审阅的兼容迁移，不能改用旧初始化脚本。

人工确认初始清单。下面的编号仅展示格式，必须换成目标库已核对的实际编号；清单不包含密码：

```json
{
  "database": "YamAuth",
  "users": [
    { "id": 1, "tenantId": null, "platformAdministrator": true, "tenantAdministrator": false },
    { "id": 2, "tenantId": 10, "platformAdministrator": false, "tenantAdministrator": true },
    { "id": 3, "tenantId": 10, "platformAdministrator": false, "tenantAdministrator": false }
  ],
  "departments": [{ "id": 20, "tenantId": 10 }],
  "employees": [{ "id": 30, "tenantId": 10, "userId": 3, "departmentId": 20 }],
  "owners": [
    { "resource": "bzss.projects", "id": 40, "tenantId": 10, "ownerUserId": 3, "ownerDepartmentId": 20 }
  ],
  "apps": [{ "id": 50, "tenantId": 10 }],
  "roles": [{
    "id": 60,
    "tenantId": 10,
    "appsId": null,
    "grants": [
      { "permission": "bzss.projects.read", "scopeType": "TenantAll", "departmentIds": [] },
      { "permission": "bzss.projects.update", "scopeType": "Self", "departmentIds": [] }
    ],
    "userIds": [3]
  }]
}
```

`users` 显式决定新系统身份，绝不继承旧 `IsAdmin`。`roles.appsId: null` 表示新建的固定后台应用；普通角色只能授予代码清单中允许的业务操作。初始清单中的授权只接受后台操作；外部应用可映射应用、角色及成员，具体操作在外部应用维护页面重新确认后授权。

未列入清单的账号保持 `SecurityReady=false`；员工、公司、项目保持未确认归属状态。未确认业务数据只在已有合法租户边界内对管理员可见；普通用户不能读取。缺少租户的记录、未确认的旧角色与授权不会变成公共数据。旧表和旧关联不删除，检查结果写入 `tb_Auth_MigrationIssue`。旧 `DataRole` / `DataRoleUser` 不参与后台授权。

## 执行、核对与回退

1. 备份数据库及对应应用版本，验证恢复流程；维护窗口停止旧 API 和所有写入者。
2. 保存并审阅只读检查报告和明确映射清单，在隔离副本运行完整测试与人工验收。
3. 在目标库执行以下命令，再核对检查报告、实际数量、首批管理员、归属和授权范围。

```sh
dotnet run --project src/YamAuth.Migrations -c Release -- apply /绝对路径/authorization-mapping.json
dotnet run --project src/YamAuth.Migrations -c Release -- verify
```

`apply` 使用数据库应用锁与单事务，包含加列、内部表、代码权限目录、初始映射、约束及迁移审计。中途失败全部回滚；相同文件重复执行只核对，不重复插入目录或授权。清单 SHA-256 与迁移版本一并保存，已完成后拒绝用不同清单覆盖初始身份。后续正常变更通过专用管理接口；仍被隔离的无租户历史数据需另行制定增量映射版本。

`verify` 核对唯一后台应用、有效平台管理员、启用且已有成员租户的管理员、统一登录标识和关键外键。它不是替代业务验收的全面数据库审计。

4. 部署匹配的 API 与前端，使用平台管理员重新登录；进入目标租户维护成员、角色、员工组织关系和业务归属。新建或重置密码的账号需先改密。
5. 若维护窗口内发现问题，保持写入关闭，恢复备份及旧版本，再核对数据；不要只回退前端或把旧 API 接到已接受新写入的库。切换后已有业务写入时，应制定包含新增数据的恢复方案。

## 接口与界面契约

- `/api/v1/auth/me` 返回服务端身份；`/access` 返回后台应用、授权版本、按操作计算的范围和菜单。前端在这些数据加载成功前不请求业务资源。
- 平台管理员通过 `POST /auth/tenant-contexts` 获取绑定当前账号、会话和租户的上下文；业务请求携带 `X-YamAuth-Context`。前端只存于当前标签页的 sessionStorage，切换后丢弃旧请求和表单。退出接口为 `DELETE /auth/tenant-contexts/{id}`。
- 普通 CRUD 不接收租户、管理员身份、安全版本或所有权确认字段。用户编辑不接收密码、邮箱或启停状态；员工普通编辑不改变用户绑定和部门。
- 个人资料与邮箱使用 `/auth/me/profile`、`/auth/me/email`；邮箱和本人改密都校验原密码。`/auth/change-password`、账号重置密码、停用及删除会撤销相关会话。
- 角色权限配置使用 `/auth/crud-roles/{id}/permissions`，用户角色分配使用 `/auth/users/{id}/roles`。数据范围为 `Self`、`Department`、`CustomDepartments`、`TenantAll`，只合并同一操作。员工组织关系通过 `/unit/employees/{id}/assignment` 维护。
- 公司、项目更新、删除及 `/{id}/ownership` 归属转移须携带 `If-Match: "<rowVersion 的 Base64>"`。创建和转移分别校验负责人候选、部门候选及结果记录范围；转移还校验原记录。负责人当前部门与业务归属部门可以不同，但都必须落在该操作各自允许的目标集合内；版本不符返回 409。
- `/auth/candidates` 按 `purpose`、目标记录及应用校验，只返回 `id` / `label`；列表 DTO 的 `relatedLabels` 只解释已授权记录的关联。`allowedActions` 用于逐行控制按钮，实际写入仍由后端重新校验。
- 401 表示会话无效；403 表示缺少操作权限并触发前端重新加载授权；404 统一表示记录不存在或超出数据范围；409 表示并发或关系冲突。授权版本响应头供前端识别已变化的权限。
- 回到标签页会重新检查授权；版本和身份未变时保留未保存表单，确认变更或加载失败后使旧操作失效。退出和本人改密按登录会话处理，不携带租户上下文，也不使用租户授权版本判定完成结果。

## 测试执行

```sh
dotnet build src/YamAuth.sln -c Release
dotnet test tests/YamAuth.Tests -c Release
cd web/YamAuth.Web
npm run check
```

未设置 `YAMAUTH_TEST_SERVER` 时，SQL Server 用例明确跳过，离线用例检查同操作范围合并、归属目标限制、菜单层级、管理员策略、接口权限覆盖、16 类资源条件、敏感 DTO，以及临时源码副本中的全部标准后端重新生成、API 编译和生成后目录校验器的实际行为。

团队在**独立测试 SQL Server 实例**设置 `YAMAUTH_TEST_SERVER` 后运行同一测试命令。该连接需有创建数据库权限；每个用例创建唯一的 `YamAuth_Test_<GUID>` 库，并仅清理该库，不读取 API 的连接配置。用例覆盖真实登录/会话、16 类资源的未授权访问、跨租户 ID、读写范围分离、归属目标直接请求、管理员保护、最后管理员并发、上下文会话绑定、撤权/重置密码、行版本冲突、业务与 outbox 同事务回滚、迁移重复执行及中段失败回滚。应先确认测试实例资源和账号权限，不向生产实例提供此变量。

工具另有 `test-init` 命令，只能初始化**已经存在、没有用户表、以 `YamAuth_Test_` 开头**的空数据库。测试基线从旧实体契约构造，用于演练，不是生产空库初始化方案，不写入固定管理员凭据。

前端模拟验收可在 `web/YamAuth.Web` 执行 `node scripts/authorization-preview.mjs`，打开 `http://127.0.0.1:42731`。任意非空测试账号密码均由模拟接口接受；该服务仅监听本机，不连接后端。`/__fixture?revoked=true` 模拟撤权，`/__fixture?mode=password` 模拟强制改密。模拟服务不用于部署。
