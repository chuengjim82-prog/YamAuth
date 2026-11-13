import { Component, type ReactNode } from 'react'
import styles from './PageErrorBoundary.module.css'

/** Suspense 只处理等待；模块加载失败需要可操作的错误界面。 */
export default class PageErrorBoundary extends Component<
  { children: ReactNode; resetKey: string },
  { failed: boolean; resetKey: string }
> {
  state = { failed: false, resetKey: this.props.resetKey }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  static getDerivedStateFromProps(props: { resetKey: string }, state: { resetKey: string }) {
    return props.resetKey !== state.resetKey ? { failed: false, resetKey: props.resetKey } : null
  }

  render() {
    if (this.state.failed) {
      return (
        <section role="alert" className={styles.error}>
          <h1>页面加载失败</h1>
          <p>请检查网络连接，然后重新加载页面。</p>
          <button type="button" onClick={() => window.location.reload()}>
            重新加载
          </button>
        </section>
      )
    }
    return this.props.children
  }
}
