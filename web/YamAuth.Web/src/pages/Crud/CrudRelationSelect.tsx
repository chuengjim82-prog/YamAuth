import type { Ref } from 'react'
import { Button, Spin, TreeSelect, type GetRef, type TreeSelectProps } from 'antd'
import { crudRelationNames, type CrudRelationKind } from './crudRelation'
import { useCrudRelationOptions } from './useCrudRelationOptions'

type Props = Pick<
  TreeSelectProps<number | null>,
  'id' | 'onBlur' | 'onFocus' | 'aria-describedby' | 'aria-invalid' | 'aria-required'
> & {
  ref?: Ref<GetRef<typeof TreeSelect>>
  value?: number | null
  onChange?: (value: number | null) => void
  kind: CrudRelationKind
  active: boolean
  disabled: boolean
}

export default function CrudRelationSelect({
  kind,
  value,
  onChange,
  active,
  disabled,
  ...props
}: Props) {
  const { options, loading, failed, retry, label } = useCrudRelationOptions(kind, active)
  const name = crudRelationNames[kind]
  const missing = value != null && !options.some((option) => option.value === value)
  // 失效关联只供编辑回显，不作为新候选；保留包括 0 在内的历史值。
  const treeData = missing
    ? [...options, { id: `missing-${value}`, pId: 0, value, title: label(value), disabled: true }]
    : options
  return (
    <>
      <TreeSelect<number | null | undefined>
        {...props}
        style={{ width: '100%' }}
        value={value ?? undefined}
        onChange={(nextValue) => {
          if (active && !disabled) onChange?.(nextValue ?? null)
        }}
        disabled={!active || disabled}
        allowClear
        loading={loading}
        showSearch={{ treeNodeFilterProp: 'searchText' }}
        treeDefaultExpandAll
        treeDataSimpleMode={{ id: 'id', pId: 'pId', rootPId: 0 }}
        treeData={treeData}
        placeholder={`请选择${name}，可搜索名称或编号`}
        notFoundContent={
          loading ? <Spin size="small" /> : failed ? `${name}加载失败` : `未找到匹配的${name}`
        }
        onInputKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault()
        }}
      />
      {failed ? (
        <div role="alert">
          {name}加载失败，已保留原值。
          <Button type="link" size="small" disabled={!active || disabled} onClick={retry}>
            重试
          </Button>
        </div>
      ) : missing && !loading ? (
        <div role="status">{name}不存在或已删除，已保留原值；可清空或重新选择。</div>
      ) : null}
    </>
  )
}
