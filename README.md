# YamAuth

基于 [ForgeAbc 脚手架模板](https://github.com/your-org/forgeabc-scaffold) 创建：.NET 8 + Vue 3 管理端，含登录、菜单导航、CodeGen、Docker 与 CI（无权限体系）。

> 由 `scripts/new-project.ps1` 于 2026-10-19 生成。设计文档见 `docs/`。

---

## 技术栈

| 层 | 技术 |
|----|------|
| API | ASP.NET Core 8、FreeSql、JWT、FluentValidation |
| Web | Vue 3、Vite、Element Plus、Pinia |
| 工具 | `YamAuth.CodeGen` |

---

## 本地开发

### 1. 数据库

物理库是已有的 **YamAuth**（`127.0.0.1`）。`Db:Base` 与 `Db:Bzss` 都指向这个库：`tb_Bzss_*` 走 Bzss 键，其余表走 Base 键。

开发环境用户表为空时，API 启动会写入管理员 `admin` / `Admin@123`，并按现有表生成侧边栏菜单。不要对 YamAuth 执行 `init-db.ps1`，那套脚本是脚手架空库用的。

### 2. 运行

```powershell
.\scripts\run-api.ps1
.\scripts\dev-web.ps1
```

（也可双击 `scripts\run-api.cmd`、`scripts\dev-web.cmd`。）

### 3. CodeGen（新业务表）

```bash
dotnet run --project src/YamAuth.CodeGen
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
dotnet test YamAuth.sln -c Release
cd web/YamAuth.Web && npm run test:e2e
```
