# AI 助手快速入口

**完整指引**：[ONBOARDING.md](./ONBOARDING.md)

## 改代码前

1. 读 [ONBOARDING.md §2](./ONBOARDING.md#2-给-ai-助手优先阅读) 的约束表
2. 确认任务是否落在 [scaffold-roadmap.md](./docs/scaffold-roadmap.md) 当前范围内
3. 涉及权限 / 新表 → 先查 [rbac-guide.md](./docs/rbac-guide.md)，优先 CodeGen 而非手写

## 关键路径

| 用途 | 路径 |
|------|------|
| API | `src/YamAuth.Api/` |
| DTO | `src/YamAuth.Dtos/`（勿用 `Service/Dtos/`） |
| 前端 | `web/YamAuth.Web/src/` |
| 动态路由 | `web/YamAuth.Web/src/router/dynamic.ts` |
| 开发规范 | `docs/development-conventions.md` |
| DB 初始化 | `scripts/init-db.ps1` + `init-db.manifest.json` |
| CodeGen | `dotnet run --project src/YamAuth.CodeGen` |

## 验证

```powershell
dotnet build YamAuth.sln -c Release
.\scripts\test-backend.ps1
```

未明确要求时不要 `git commit` / `git push`。
