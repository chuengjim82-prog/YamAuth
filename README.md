# YamAuth

基于 [ForgeAbc 脚手架模板](https://github.com/your-org/forgeabc-scaffold) 创建：.NET 8 + React 19 + TypeScript 管理端，含登录、菜单导航、CodeGen、Docker 与 CI（无权限体系）。

> 由 `scripts/new-project.ps1` 于 2026-10-19 生成。设计文档见 `docs/`。

---

## 技术栈

| 层 | 技术 |
|----|------|
| API | ASP.NET Core 8、FreeSql、JWT、FluentValidation |
| Web | React 19、TypeScript 6、Vite 8、Ant Design 6、React Router 7、Axios；状态管理使用 React Context |
| 工具 | `YamAuth.CodeGen` |
| 前端质量 | ESLint 10、typescript-eslint 类型感知检查、React Hooks 推荐规则、Prettier 3 |

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

前端开发使用 Node.js 22.13+（22.x）或 24+，在 `web/YamAuth.Web` 执行 `npm ci` 安装锁定依赖。`npm run lint` 检查代码，`npm run lint:fix` 自动修复支持的问题，`npm run format` 统一格式，`npm run format:check` 只检查格式。交付前执行 `npm run check`，依次检查代码、格式并构建；日常 `dev`、`build` 的职责保持不变。具体规则见 [前端开发约定](web/YamAuth.Web/AGENTS.md)。

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
cd web/YamAuth.Web
npm run check
```

前端检查要求零 lint 错误和警告、格式一致及构建成功。当前未配置 `test:e2e` 或自动化测试框架，交互仍需按影响范围验收；模拟接口浏览器回归不等同于真实后端联调。
