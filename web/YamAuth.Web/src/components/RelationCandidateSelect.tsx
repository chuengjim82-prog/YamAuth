import { createContext, useContext, useMemo } from 'react'
import RemoteEntitySelect, { type EntitySelectProps } from './RemoteEntitySelect'
import { candidateApi } from '@/api/access'
import type { Candidate, CandidateKind, CandidatePurpose } from '@/types/access'

export const CandidateContext = createContext<Omit<CandidatePurpose, 'kind'> | null>(null)
const names: Record<CandidateKind, string> = {
  user: '用户',
  department: '部门',
  app: '应用',
  crudRole: '角色',
  dataRole: '历史数据角色',
  crudInfo: '操作权限',
  employee: '员工',
  tenant: '租户'
}
const label = (candidate: Candidate) => `${candidate.label}（${candidate.id}）`

export default function RelationCandidateSelect({
  kind,
  purpose,
  targetId,
  appsId,
  active = true,
  ...props
}: EntitySelectProps & {
  kind: CandidateKind
  purpose?: string
  targetId?: number
  appsId?: number
}) {
  const inherited = useContext(CandidateContext)
  const actualPurpose = purpose ?? inherited?.purpose
  const actualTarget = targetId ?? inherited?.targetId
  const actualApp = appsId ?? inherited?.appsId
  const api = useMemo(
    () =>
      candidateApi({
        kind,
        purpose: actualPurpose ?? '',
        ...(actualTarget === undefined ? {} : { targetId: actualTarget }),
        ...(actualApp === undefined ? {} : { appsId: actualApp })
      }),
    [kind, actualPurpose, actualTarget, actualApp]
  )
  return (
    <RemoteEntitySelect
      {...props}
      active={active && !!actualPurpose}
      api={api}
      entityName={names[kind]}
      getLabel={label}
      placeholder={`请选择${names[kind]}，支持搜索`}
    />
  )
}
