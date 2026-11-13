import { departmentApi } from '@/api/entities'
import RemoteEntitySelect, { type EntitySelectProps } from './RemoteEntitySelect'
import { departmentLabel, type Department } from './department'

export default function DepartmentSelect(props: EntitySelectProps) {
  return (
    <RemoteEntitySelect<Department>
      {...props}
      api={departmentApi}
      entityName="部门"
      placeholder="请选择部门，可搜索名称"
      getLabel={departmentLabel}
    />
  )
}
