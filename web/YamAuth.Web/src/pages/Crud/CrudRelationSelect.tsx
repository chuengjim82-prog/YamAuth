import RelationCandidateSelect from '@/components/RelationCandidateSelect'
import type { EntitySelectProps } from '@/components/RemoteEntitySelect'
import type { CrudRelationKind } from './crudRelation'
export default function CrudRelationSelect({
  kind,
  ...props
}: EntitySelectProps & { kind: CrudRelationKind }) {
  return <RelationCandidateSelect {...props} kind={kind === 'crudInfoId' ? 'crudInfo' : kind} />
}
