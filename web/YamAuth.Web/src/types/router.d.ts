import type { NavigateOptions, To } from 'react-router'

// 本项目使用 HashRouter 的声明式路由，navigate 同步返回；Data Router 才返回 Promise。
declare module 'react-router' {
  interface NavigateFunction {
    (to: To, options?: NavigateOptions): void
    (delta: number): void
  }
}
