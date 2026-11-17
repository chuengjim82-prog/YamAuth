import { test as base, expect } from '@playwright/test'

export { expect }

// 每个用例使用独立上下文。未显式模拟的 API 和外部请求一律阻断并报告。
export const test = base.extend({
  page: async ({ page, context, baseURL }, use) => {
    const unexpectedRequests = []
    const pageErrors = []
    const observedPages = new Set()
    const onPageError = (error) => pageErrors.push(error.message)
    const observePage = (opened) => {
      if (observedPages.has(opened)) return
      observedPages.add(opened)
      opened.on('pageerror', onPageError)
    }
    context.on('page', observePage)
    context.pages().forEach(observePage)
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url())
      if (url.origin !== baseURL || url.pathname.startsWith('/api/')) {
        unexpectedRequests.push(`${route.request().method()} ${url.origin}${url.pathname}`)
        await route.abort()
      } else {
        await route.continue()
      }
    })
    await use(page)
    context.off('page', observePage)
    observedPages.forEach((opened) => opened.off('pageerror', onPageError))
    expect(unexpectedRequests, '不应连接真实后端或漏掉请求模拟').toEqual([])
    expect(pageErrors, '页面不应发生未捕获异常').toEqual([])
  }
})
