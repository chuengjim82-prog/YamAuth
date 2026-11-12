# OpenAPI 维护状态

**当前 `openapi.json` 是过时快照**，仍含已移除的接口，不可作为当前契约依据。参考 [Controller](../src/YamAuth.Api/Controllers/V1/) 与 [DTO](../src/YamAuth.Dtos/)，或在已配置且启用 Swagger 的 API 上查看 `/swagger/v1/swagger.json`。

[生成脚本](../scripts/generate-openapi.ps1) 及其 [Shell 版本](../scripts/generate-openapi.sh) 尚不可直接使用：

- 缺少本地 .NET 工具清单，现有 `dotnet tool restore` 步骤不完整。
- 前端没有 `openapi:types` 命令、对应生成依赖及类型产物。
- 没有自动契约漂移检查；IntegrationTests 配置文件也不代表存在集成测试或导出无需数据库。

维护生成链路时需核对实际响应包装：[ApiResultFilter](../src/YamAuth.Api/Filters/ApiResultFilter.cs) 会包装常规返回值，不能仅凭 Controller 返回类型推定客户端契约。修复并验证工具后再更新快照和执行说明。
