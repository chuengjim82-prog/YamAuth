import RelationCandidateSelect from './RelationCandidateSelect'
import type { EntitySelectProps } from './RemoteEntitySelect'
export default function TenantSelect(props: EntitySelectProps) {
  return <RelationCandidateSelect {...props} kind="tenant" />
}
