import RelationCandidateSelect from '@/components/RelationCandidateSelect'
import type { EntitySelectProps } from '@/components/RemoteEntitySelect'
export default function CrudInfoSelect(props: EntitySelectProps) {
  return <RelationCandidateSelect {...props} kind="crudInfo" />
}
