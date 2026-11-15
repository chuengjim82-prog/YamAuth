import RelationCandidateSelect from '@/components/RelationCandidateSelect'
import type { EntitySelectProps } from '@/components/RemoteEntitySelect'
export default function AppSelect(props: EntitySelectProps) {
  return <RelationCandidateSelect {...props} kind="app" />
}
