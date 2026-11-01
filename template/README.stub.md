# {{ProjectName}}

基于 [YamAuth 脚手架模板](https://github.com/your-org/yam-auth-scaffold) 创建：.NET 8 + Vue 3 管理端，含登录、菜单导航、CodeGen、Docker 与 CI（无权限体系）。

> 由 `scripts/new-project.ps1` 于 {{GeneratedDate}} 生成。设计文档见 `docs/`。

---

## 技术栈

| 层 | 技术 |
|----|------|
| API | ASP.NET Core 8、FreeSql、JWT、FluentValidation |
| Web | Vue 3、Vite、Element Plus、Pinia |
| 工具 | `{{ProjectName}}.CodeGen` |

---

## 本地开发

### 1. 数据库

连接信息在 **`scripts/database.local.json`**（`new-project` 时已生成）。一键初始化：

```powershell
.\scripts\init-db.ps1

# 本地无 SQL Server：
.\scripts\init-db.ps1 -StartDocker
```

默认管理员：`admin` / `Admin@123`。

### 2. 运行

```powershell
.\scripts\run-api.ps1
.\scripts\dev-web.ps1
```

（也可双击 `scripts\run-api.cmd`、`scripts\dev-web.cmd`。）

### 3. CodeGen（新业务表）

```bash
dotnet run --project src/{{ProjectName}}.CodeGen
```

---

## 文档索引

| 文档 | 说明 |
|------|------|
| [docs/scaffold-roadmap.md](docs/scaffold-roadmap.md) | 脚手架路线图 |
| [docs/rbac-guide.md](docs/rbac-guide.md) | 权限开发 |
| [docs/data-permission-design.md](docs/data-permission-design.md) | 数据权限 |
| [deploy/README.md](deploy/README.md) | Docker / 上线 |

---

## 测试

```bash
dotnet test {{ProjectName}}.sln -c Release
cd web/{{ProjectName}}.Web && npm run test:e2e
```
