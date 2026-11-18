import { useApp } from '@/store/AppContext'
import { appEmblem, usePageTitle } from '@/branding'
import styles from './Home.module.css'

export default function Home() {
  const { user } = useApp()
  usePageTitle('首页')
  return (
    <section className={styles.page}>
      <div className={styles.panel}>
        <img className={styles.emblem} src={appEmblem} alt="" />
        <h1 className={styles.welcome}>欢迎，{user?.nickName || user?.userName}</h1>
        <p className={styles.description}>从导航菜单进入用户、权限、公司和部门等维护页面。</p>
      </div>
    </section>
  )
}
