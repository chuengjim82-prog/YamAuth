import { useEffect } from 'react'
import emblem from '@/assets/login-emblem.svg'

export const appName = '管理工作台'
export const appEmblem = emblem

/** 路由离开后先回到应用标题，避免异步页面加载期间残留上一页名称。 */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · ${appName}`
    return () => {
      document.title = appName
    }
  }, [title])
}
