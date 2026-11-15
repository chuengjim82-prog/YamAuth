import RelationCandidateSelect from './RelationCandidateSelect'
import type { EntitySelectProps } from './RemoteEntitySelect'
export default function UserSelect(props: EntitySelectProps) {
  return <RelationCandidateSelect {...props} kind="user" />
}
