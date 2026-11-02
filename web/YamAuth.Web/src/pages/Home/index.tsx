import { useApp } from '@/store/AppContext'
import PageHeader from '@/components/PageHeader'
import styles from './Home.module.css'

export default function Home() {
  const { user } = useApp()
  return (
    <section className={styles.page}>
      <PageHeader title="首页" />
      <div className={styles.panel}>
        <h3 className={styles.welcome}>欢迎，{user?.nickName || user?.userName}</h3>
        <p className={styles.description}>从左侧菜单进入用户、权限、公司和部门等维护页面。</p>
      </div>
    </section>
  )
}
