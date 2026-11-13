import { userApi } from '@/api/entities'
import RemoteEntitySelect, { type EntitySelectProps } from './RemoteEntitySelect'
import { userLabel, type UserOption } from './appsUser'

export default function UserSelect(props: EntitySelectProps) {
  return (
    <RemoteEntitySelect<UserOption>
      {...props}
      api={userApi}
      entityName="用户"
      placeholder="请选择用户，可搜索用户名、昵称或编号"
      getLabel={userLabel}
    />
  )
}
