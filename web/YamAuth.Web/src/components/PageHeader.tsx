import styles from './PageHeader.module.css'

export default function PageHeader({ title }: { title: string }) {
  return <h2 className={styles.title}>{title}</h2>
}
