# {{ProjectName}}

自 YamAuth 源码生成于 {{GeneratedDate}}，使用 .NET 8 与 React / TypeScript。当前只有登录认证，角色相关 CRUD 尚未接入操作授权或数据隔离。

## 使用前核对

- 模板尚未完整适配当前项目：`.tsx` 未参与文本替换，前端锁文件被排除；核对重命名并建立锁文件后再用 `npm ci`。
- 数据库参数为 `{{DbBase}}` / `{{DbSecondary}}`，需分别核对 API 和 CodeGen 配置、实际表分布。旧 `init-db.ps1` 不对应当前模型且可能修改管理员凭据，不要直接运行。
- 开发启动可能写入空表种子；目标库的结构、初始数据及账号需提前准备。脚本末尾的旧初始化、测试提示不能直接照做。
- 复制的文档描述来源项目，需按目标项目核实；开发约束见 [AGENTS](AGENTS.md)，工具限制见 [部署说明](deploy/README.md) 和 [OpenAPI 说明](openapi/README.md)。

## 配置后运行

需要 .NET SDK 8.x，Node.js 要求见 [前端约定](web/{{ProjectName}}.Web/AGENTS.md#本地开发)。在目标仓库根目录的后端终端执行：

```sh
dotnet build src/{{ProjectName}}.sln -c Release
dotnet run --project src/{{ProjectName}}.Api/{{ProjectName}}.Api.csproj
```

另开终端，从目标仓库根目录执行；此时应已有前端锁文件：

```sh
cd web/{{ProjectName}}.Web
npm ci
npm run dev
```

API 默认 6500，前端默认 6503；API 使用 appsettings 与环境变量，前端使用构建配置 VITE_API_BASE_URL（默认 /api）。真实凭据不提交。交付检查见 [AGENTS](AGENTS.md#验证)，生成代码前读 [CodeGen 指南](docs/codegen.md)。
