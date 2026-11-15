import RelationCandidateSelect from './RelationCandidateSelect'
import type { EntitySelectProps } from './RemoteEntitySelect'
export default function DepartmentSelect(props: EntitySelectProps) {
  return <RelationCandidateSelect {...props} kind="department" />
}
