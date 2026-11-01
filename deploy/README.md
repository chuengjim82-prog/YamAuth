# YamAuth 部署指南

> 脚手架阶段以 Docker Compose 为主；裸机部署见 §4。路线图见 [docs/scaffold-roadmap.md](../docs/scaffold-roadmap.md)。

---

## 1. 前置条件

- Docker 24+ 与 Docker Compose v2
- 已创建 SQL Server 库：`YamBase`、`YamBzss`（或运行 `scripts/init-db.ps1 -StartDocker -UpdateAppSettings`）
- 已按 [docs/README.md §常用脚本](../docs/README.md#常用脚本scripts) 执行 Auth / 数据权限相关 SQL（`init-db.ps1` 可自动完成）

---

## 2. Docker Compose 快速启动

在**仓库根目录**：

```bash
cp deploy/.env.example deploy/.env
# 编辑 deploy/.env：Db__Base、Db__Bzss、Jwt__SecretKey（≥32 字节）

docker compose -f deploy/docker-compose.yml up -d --build
```

| 服务 | 默认端口 | 说明 |
|------|----------|------|
| web | 8080 | Nginx 静态页 + `/api` 反代 |
| api | 6500 | 直连 API（也可只用 Web 反代） |

验证：

- 浏览器：`http://localhost:8080`
- 健康检查：`http://localhost:6500/health`（需数据库可达）

### 2.1 可选：Compose 内置 SQL Server

仅本地试用，**生产请用托管数据库**：

```bash
# deploy/.env 中设置 MSSQL_SA_PASSWORD
docker compose -f deploy/docker-compose.yml --profile with-db up -d
# 建库并跑 scripts/ 后再启动 api/web
```

---

## 3. 环境变量说明

Compose 通过 `environment` 注入 ASP.NET Core 配置（`Section__Key` 格式）。

| 变量 | 必填 | 说明 |
|------|------|------|
| `Db__Base` | 是 | YamBase 连接串 |
| `Db__Bzss` | 是 | YamBzss 连接串 |
| `Jwt__SecretKey` | 是 | HS256 密钥，≥32 字符 |
| `Cors__AllowedOrigins__0` | 是 | 与 `WEB_ORIGIN` 一致 |
| `Rbac__SyncPermissionsOnStartup` | — | 生产 **false**；开发 true |
| `Smtp__*` | — | 找回密码；不用则 `Smtp__Enabled=false` |

模板文件：`deploy/.env.example`  
静态默认：`src/YamAuth.Api/appsettings.Production.json`（占位符，不含密钥）

---

## 4. 裸机 / IIS / Kestrel

### 4.1 后端

```bash
dotnet publish src/YamAuth.Api/YamAuth.Api.csproj -c Release -o ./publish
cd publish
export ASPNETCORE_ENVIRONMENT=Production
export Db__Base="..."
export Db__Bzss="..."
export Jwt__SecretKey="..."
dotnet YamAuth.Api.dll --urls http://0.0.0.0:6500
```

### 4.2 前端

```bash
cd web/YamAuth.Web
npm ci
npm run build   # VITE_API_BASE=/api
# 将 dist/ 交给 Nginx/IIS，/api 反代到 Kestrel
```

Nginx 参考：`deploy/docker/nginx.conf`（把 `api:8080` 改为实际后端地址）。

---

## 5. 生产 Checklist

- [ ] `Jwt__SecretKey` 使用强随机值，且不提交到版本库
- [ ] `Rbac__SyncPermissionsOnStartup=false`
- [ ] `Swagger__Enabled=false`
- [ ] CORS 仅允许正式 Web 域名
- [ ] SQL 迁移脚本已在目标库执行完毕
- [ ] 日志目录可写（Serilog File sink，默认 `logs/`）
- [ ] 修改角色/菜单/数据范围后通知用户重新登录
- [ ] CI 通过：`.github/workflows/ci.yml`（push/PR 自动 build + test）

---

## 6. CI

GitHub Actions 工作流 `.github/workflows/ci.yml`：

**dotnet job**

1. `dotnet restore` / `build` / `test`（Release）
2. OpenAPI 导出 + `api.generated.ts` 漂移检查（`scripts/generate-openapi.sh`）
3. `dotnet list package --vulnerable --include-transitive`（有漏洞则失败）

**web job**

1. `npm ci` / `npm run build`（含 `vue-tsc`）
2. `npm audit --audit-level=high`
3. Playwright E2E（冒烟 + 登录流）

若使用 SVN，可在 Jenkins / Azure DevOps 中复用相同命令。

---

## 7. 镜像单独构建

```bash
# API
docker build -f deploy/docker/Dockerfile.api -t yam-auth-api .

# Web
docker build -f deploy/docker/Dockerfile.web -t yam-auth-web .
```

---

## 8. 故障排查

| 现象 | 可能原因 |
|------|----------|
| API 启动即退出 | 连接串或 JWT 未配置 |
| `/health` Unhealthy | 数据库不可达或库名错误 |
| 登录 401 / CORS | `WEB_ORIGIN` 与浏览器地址不一致 |
| 403 有菜单无数据 | 数据范围或 list 权限；重新登录 |
| 找回密码无邮件 | `Smtp__Enabled` 与 SMTP 凭据 |
