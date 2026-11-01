# Repository Guidelines

## 项目结构与模块组织

本目录是 YamAuth 管理端，使用 React 19、TypeScript、Ant Design 6 和 Vite 8；仓库根目录为 `../..`。

- `src/pages/`：登录、首页及通用 CRUD 页面；资源字段和接口映射集中在 `src/resources.ts`。
- `src/components/`、`src/layouts/`：公共组件与布局；样式使用相邻的 `*.module.css`，全局样式在 `src/index.css`。
- `src/api/`：请求封装；`src/store/AppContext.tsx`：共享状态；`src/types/`：类型定义。
- `src/router/index.tsx`：路由配置，配合 `src/App.tsx` 中的 `HashRouter`。
- 根目录 `src/YamAuth.Api/`、`src/YamAuth.Service/`、`src/YamAuth.Dtos/` 分别存放 API、业务逻辑和契约；`scripts/` 存放开发脚本。

当前没有独立静态资源目录或测试目录；新增资源应就近组织。

## 构建与本地开发

在本目录执行：

```sh
npm ci              # 按锁文件安装依赖
npm run dev         # 启动开发服务：127.0.0.1:6503
npm run build       # TypeScript 检查并生成 dist/
npm run preview     # 预览已构建产物
```

开发服务将 `/api` 代理到 `http://localhost:6500`。后端命令从仓库根目录执行：

```powershell
.\scripts\run-api.ps1
dotnet build src/YamAuth.sln -c Release
```

## 编码风格与命名

使用两空格缩进、单引号、无语句分号，沿用现有尾逗号风格。组件和类型用 `PascalCase`，变量、函数用 `camelCase`；页面入口使用 `index.tsx`。优先使用 `@/` 导入别名和 `import type`，遵守 TypeScript 严格模式。

复用 `src/api/request.ts` 的鉴权及错误处理。文档和新增注释使用中文。当前未配置 ESLint 或 Prettier，避免无关格式化。

## 测试与验证

当前没有自动化测试框架、测试命名约定或覆盖率门槛，也没有 `npm test`、`test:e2e` 脚本。前端改动至少运行 `npm run build`，并按影响范围人工检查登录、菜单导航、CRUD、分页和会话失效；构建成功不代表交互验收通过。

新增测试设施时，同步补充执行命令与命名规则。现有 `scripts/test-backend.ps1` 使用根目录解决方案路径，与实际 `src/YamAuth.sln` 不符；当前也未包含后端测试项目。

## 提交与 Pull Request

现有两条提交采用简短英文说明，尚未形成 Conventional Commits 约定。提交标题应以动作说明变更，例如 `Fix pagination after deleting a user`，每次提交聚焦一个目的。

PR 应说明问题、行为变化、验证结果和未覆盖项；有关联 issue 时附链接，界面变更附截图，配置变更注明部署影响。未经明确要求，不执行 `git commit` 或 `git push`。

## 配置与协作约束

改动前阅读根目录 `AGENTS.md` 和 `ONBOARDING.md`；其中 Vue、`router/dynamic.ts` 及部分文档链接已过时，应核对当前文件。新增表优先评估现有 CodeGen，DTO 保持在 `src/YamAuth.Dtos/`。

API 地址由 `VITE_API_BASE_URL` 配置。不得在前端环境变量中保存密钥，或提交真实密码、令牌及 `scripts/database.local.json`。保留用户已有改动，仅修改任务相关内容。
