# CodeGen 操作说明

## 运行前

- 配置位于 `src/YamAuth.CodeGen/appsettings.json`，从程序输出目录加载；独立于 API 配置，不读取 `scripts/database.local.json` 或环境变量配置源。先确认连接和 Output 路径，入口见 [Program.cs](../src/YamAuth.CodeGen/Program.cs)。
- 当前读取 YamBase 配置连接中的全部 `tb_*` 表；没有单表过滤、差异预览或 dry-run 参数。数据库迁移需单独处理。
- **会直接覆盖 Entity、Repository、DTO、Service、Controller 等标准文件，即使没有 `.g.cs` 后缀。** 生成校验器前会删除 `Validators/Generated/` 内全部 `*.g.cs`；中途失败不自动回滚。
- 运行前识别已有改动和手工补丁。生成规则改在 Generator / Schema；现有 `*.Extensions.cs`、`*.Hierarchy.cs` 扩展需保持签名兼容。部分生成方法依赖手写扩展，不能假定任意新表生成后即可运行。
- React 资源、菜单和业务校验仍需按需求维护；旧 `gen-crud-views.ps1` 不适用于当前前端。

## 执行与检查

确认本次任务需要生成且覆盖范围已处理后，在仓库根目录执行；需要 .NET SDK 8.x 和数据库元数据读取权限：

```sh
dotnet run --project src/YamAuth.CodeGen/YamAuth.CodeGen.csproj
```

检查所有生成差异及新增文件，特别是无关表、定制逻辑和输出路径；不要整批回退用户改动。随后在仓库根目录执行：

```sh
git status --short
git diff --check
dotnet build src/YamAuth.sln -c Release
```

如涉及前端资源，按 [前端约定](../web/YamAuth.Web/AGENTS.md) 检查，并验收对应接口与页面。
