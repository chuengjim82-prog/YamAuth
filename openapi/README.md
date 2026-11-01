# OpenAPI 契约

API 的 OpenAPI 3 描述，用于生成前端 TypeScript 类型（与手写 `permissions.g.ts` 互补）。

## 生成

在仓库根目录：

```powershell
# 1. 构建 API
dotnet build src/YamAuth.Api/YamAuth.Api.csproj -c Release

# 2. 导出 openapi.json（使用 IntegrationTests 配置，无需真实数据库）
dotnet tool restore
$env:ASPNETCORE_ENVIRONMENT = "IntegrationTests"
dotnet swagger tofile src/YamAuth.Api/bin/Release/net8.0/YamAuth.Api.dll v1 openapi/openapi.json

# 3. 生成前端类型
cd web/YamAuth.Web
npm run openapi:types
```

或使用脚本：

- Windows：`scripts/generate-openapi.ps1`
- Linux / macOS / CI：`scripts/generate-openapi.sh`

CI 会在每次 push/PR 时运行上述脚本并 `git diff --exit-code`，防止契约漂移。

## 产物

| 文件 | 说明 |
|------|------|
| `openapi/openapi.json` | Swagger 导出（可提交版本库） |
| `web/.../src/types/api.generated.ts` | `openapi-typescript` 生成，**勿手改** |

权限常量仍由 CodeGen 生成 `permissions.g.ts`；OpenAPI 类型用于 DTO / 响应体补全。
