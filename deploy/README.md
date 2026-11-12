# 部署说明

当前 Docker 工具有已知缺口，尚不能直接按 Compose 文件完成部署。先确认 [数据库准备](../README.md#数据库准备) 与 [授权边界](../README.md#项目边界)；生产环境不会执行开发种子，账号需提前准备。

## 发布配置

通过目标环境配置提供以下项目，不沿用开发凭据或将真实密钥提交到仓库：

| 配置 | 要求 |
|------|------|
| `ASPNETCORE_ENVIRONMENT` | Production；运行发布 DLL 不读取 launchSettings |
| `Db__Base` / `Db__Bzss` | 目标数据库的两条逻辑连接 |
| `Jwt__SecretKey` / `Jwt__Issuer` / `Jwt__Audience` | 部署专用强随机密钥，签发与验证约定一致 |
| `Cors__AllowedOrigins__*` | 核对最终合并列表，只保留所需来源 |
| `Swagger__Enabled` | 生产明确设为 false；当前 Production JSON 仍为 true，Compose 会覆盖为 false |
| `VITE_API_BASE_URL` | 前端构建时设置，默认 /api；构建完成后改运行环境变量不会更新客户端 |

## 手工发布

需要 .NET SDK 8.x，在仓库根目录执行：

```sh
dotnet publish src/YamAuth.Api/YamAuth.Api.csproj -c Release -o ./publish
```

在目标主机配置好上述环境后，进入发布目录，使用 .NET 8 ASP.NET Core 运行时：

```sh
dotnet YamAuth.Api.dll --urls http://0.0.0.0:6500
```

前端按 [Node.js 要求](../web/YamAuth.Web/AGENTS.md#本地开发) 准备环境，从仓库根目录执行：

```sh
cd web/YamAuth.Web
npm ci
npm run check
```

将生成的 `dist/` 交给静态服务器，`/api/` 反代到后端。[Nginx 示例](docker/nginx.conf) 中的 `api:8080` 需替换为实际地址。

## Docker 已知限制

- [API Dockerfile](docker/Dockerfile.api) 复制了不存在的根目录解决方案，且缺少 YamAuth.Dtos，需修复后验证构建。
- [Web Dockerfile](docker/Dockerfile.web) 使用旧变量 VITE_API_BASE，自定义地址需适配 VITE_API_BASE_URL 及构建传参。
- [Compose](docker-compose.yml) 和环境样例保留旧 RBAC / SMTP 变量，当前代码未接入对应功能。`with-db` 只启动数据库容器，不准备业务表或账号。

修复后验证 Compose 时，从仓库根目录显式传入 `--env-file deploy/.env -f deploy/docker-compose.yml`，避免读错配置。本页未完成部署验收；应分别验证镜像构建、API `/health`、登录和代表性 CRUD。健康检查仅检查数据库可达性，不代表业务结构和接口正确。
