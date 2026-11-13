# 前端开发约定

## 实现约定

- 新增资源优先复用 `src/resources.ts` 与 `src/pages/Crud/`，请求复用 `src/api/request.ts` 的鉴权及错误处理。
- 菜单 RoutePath、资源 path 与接口地址需分别匹配；菜单记录不会自动创建页面或接口。
- 样式沿用相邻 `*.module.css`，全局样式集中于 `src/index.css`。
- 检查规则以 ESLint、Prettier 和 TypeScript 配置为准，不通过放宽规则掩盖问题；格式化和自动修复仅限本次改动文件。
- 为业务数据及接口保留准确类型，不用 `any`、宽泛字典或类型断言替代业务类型。

## 类型放置约定

- `src/types/api.ts` 维护响应包装与分页协议，`src/types/auth.ts`、`unit.ts`、`bzss.ts` 按领域维护接口请求与响应契约；传输契约不依赖组件、表单模型或 UI 库。
- 项目内部从具体契约文件导入类型；`src/types/index.ts` 仅作类型转导出入口，不新增业务定义。
- 表单模型与 `toForm`、`toCreate`、`toUpdate` 同放在 `src/resources/forms/` 下对应领域文件，保持编辑状态与接口 DTO 的区别。
- 组件 Props、状态、树算法和选择器展示类型由所属模块维护；同一模块内需要共享时提取相邻的类型文件，不因跨文件引用就移入全局 `src/types`。
- CRUD 配置类型放在 `src/resources/types.ts`，字段工厂放在 `src/resources/fields.ts`；纯类型引用使用 `import type`。
- 普通业务类型使用 `.ts`；`.d.ts` 用于环境声明和第三方模块声明扩展。

## 本地开发

使用 Node.js 22.13+（22.x）或 24+，在本目录执行：

```sh
npm ci
npm run dev
npm run check
```

`check` 执行 lint、格式、编译期契约反例、表单转换与树算法测试、类型检查和构建。配置与启动地址见 [项目 README](../../README.md#环境与配置)；前端环境变量会进入客户端产物，不得存放密钥。
