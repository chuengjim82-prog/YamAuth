import { useApp } from '@/store/AppContext'

export default function Home() {
  const { user } = useApp()
  return (
    <div style={{ background: '#fff', border: '1px solid #edf0f5', padding: 24 }}>
      <h2 style={{ marginBottom: 8 }}>欢迎，{user?.nickName || user?.userName}</h2>
      <p style={{ color: '#667085' }}>从左侧菜单进入用户、权限、公司和部门等维护页面。</p>
    </div>
  )
}
