# 前端开发约定

## 实现约定

- 新增资源优先复用 `src/resources.ts` 与 `src/pages/Crud/`，请求复用 `src/api/request.ts` 的鉴权及错误处理。
- 菜单 RoutePath、资源 path 与接口地址需分别匹配；菜单记录不会自动创建页面或接口。
- 样式沿用相邻 `*.module.css`，全局样式集中于 `src/index.css`。
- 检查规则以 ESLint、Prettier 和 TypeScript 配置为准，不通过放宽规则掩盖问题；格式化和自动修复仅限本次改动文件。
- 为业务数据及接口保留准确类型，不用 `any`、宽泛字典或类型断言替代业务类型。

## 本地开发

使用 Node.js 22.13+（22.x）或 24+，在本目录执行：

```sh
npm ci
npm run dev
npm run check
```

`check` 执行 lint、格式、类型检查和构建。配置与启动地址见 [项目 README](../../README.md#环境与配置)；前端环境变量会进入客户端产物，不得存放密钥。
