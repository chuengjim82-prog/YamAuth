import RemoteEntitySelect, { type EntitySelectProps } from './RemoteEntitySelect'
import { departmentLabel, type Department } from './department'

export default function DepartmentSelect(props: EntitySelectProps) {
  return <RemoteEntitySelect<Department>
    {...props}
    apiPath="/v1/unit/departments"
    entityName="部门"
    placeholder="请选择部门，可搜索名称"
    getLabel={departmentLabel}
  />
}
