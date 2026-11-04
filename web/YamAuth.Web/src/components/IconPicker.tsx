import { useLayoutEffect, useMemo, useRef, useState, type Ref } from 'react'
import { Button, Empty, Input, Modal, Pagination, Segmented, type ButtonProps, type GetRef, type InputRef } from 'antd'
import CheckOutlined from '@ant-design/icons/es/icons/CheckOutlined'
import DownOutlined from '@ant-design/icons/es/icons/DownOutlined'
import IconGlyph from './icons/IconGlyph'
import { iconCatalog, resolveIconName, type IconTheme } from './icons/catalog'
import styles from './IconPicker.module.css'

type IconPickerProps = Omit<ButtonProps, 'value' | 'onChange' | 'onClick' | 'children' | 'icon'> & {
  value?: string
  onChange?: (value: string) => void
  /** 外层表单关闭时立即隔离选择操作，不等待退出动画卸载。 */
  active?: boolean
  ref?: Ref<GetRef<typeof Button>>
}

const PAGE_SIZE = 48

export default function IconPicker({ value, onChange, disabled, active = true, className, ref, ...props }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [theme, setTheme] = useState<IconTheme | 'all'>('all')
  const [page, setPage] = useState(1)
  const searchRef = useRef<InputRef>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const interaction = useRef({ enabled: false, open: false })
  const canonical = resolveIconName(value)
  const needle = keyword.trim().toLowerCase()
  const matches = useMemo(() => iconCatalog.filter((icon) => (theme === 'all' || icon.theme === theme) && icon.searchText.includes(needle)), [theme, needle])

  useLayoutEffect(() => {
    interaction.current = { enabled: active && !disabled, open: active && !disabled && open }
    return () => { interaction.current = { enabled: false, open: false } }
  }, [active, disabled, open])

  useLayoutEffect(() => {
    if (!active || disabled) setOpen(false)
  }, [active, disabled])

  useLayoutEffect(() => {
    if (gridRef.current) gridRef.current.scrollTop = 0
  }, [page, keyword, theme])

  function showPicker() {
    if (!interaction.current.enabled) return
    setKeyword('')
    setTheme('all')
    const index = iconCatalog.findIndex((icon) => icon.name === canonical)
    setPage(index < 0 ? 1 : Math.floor(index / PAGE_SIZE) + 1)
    setOpen(true)
  }

  return (
    <>
      <Button {...props} ref={ref} disabled={disabled || !active} htmlType="button"
        className={`${styles.trigger} ${className ?? ''}`} onClick={showPicker}
        aria-haspopup="dialog" aria-expanded={open && active && !disabled}>
        <span className={styles.selection}>
          {value ? <><IconGlyph name={value} className={styles.preview} /><span>{canonical ? '更换图标' : '未识别图标，重新选择'}</span></> : <span className={styles.placeholder}>请选择图标</span>}
        </span>
        <DownOutlined />
      </Button>
      <Modal title="选择图标" open={open && active && !disabled} width={760} centered destroyOnHidden
        className={styles.dialog} classNames={{ body: styles.body }} onCancel={() => setOpen(false)}
        afterOpenChange={(visible) => {
          if (!visible) return
          searchRef.current?.focus()
          gridRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest' })
        }}
        modalRender={(content) => <div onKeyDown={(event) => {
          // 子弹窗键盘操作不能关闭或提交外层菜单表单。
          if (event.key === 'Escape') {
            event.stopPropagation()
            setOpen(false)
          } else if (event.key === 'Enter') {
            event.stopPropagation()
            if (event.target instanceof HTMLInputElement) event.preventDefault()
          }
        }}>{content}</div>}
        footer={<Pagination size="small" current={page} pageSize={PAGE_SIZE} total={matches.length}
          showSizeChanger={false} showTotal={(total) => `共 ${total} 个图标`} responsive
          onChange={setPage} />}>
        <Input ref={searchRef} value={keyword} allowClear aria-label="搜索图标"
          placeholder="搜索英文名称或中文关键词，如 user、用户、锁"
          onChange={(event) => { setKeyword(event.target.value); setPage(1) }} />
        <Segmented block value={theme} options={[
          { label: '全部', value: 'all' }, { label: '线性', value: 'Outlined' },
          { label: '实心', value: 'Filled' }, { label: '双色', value: 'TwoTone' },
        ]} onChange={(next) => { setTheme(next as IconTheme | 'all'); setPage(1) }} />
        <div className={styles.grid} ref={gridRef} aria-label="图标候选列表">
          {matches.length ? matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((icon) => (
            <Button key={icon.name} htmlType="button" title={icon.name} aria-label={icon.name}
              aria-pressed={canonical === icon.name} disabled={disabled || !active}
              className={`${styles.option} ${canonical === icon.name ? styles.selected : ''}`}
              onClick={() => {
                if (!interaction.current.enabled || !interaction.current.open) return
                onChange?.(icon.name)
                setOpen(false)
              }}>
              <IconGlyph name={icon.name} className={styles.optionIcon} />
              <span className={styles.name}>{icon.name}</span>
              {canonical === icon.name && <CheckOutlined className={styles.check} />}
            </Button>
          )) : <Empty className={styles.empty} image={Empty.PRESENTED_IMAGE_SIMPLE} description="未找到匹配的图标" />}
        </div>
      </Modal>
    </>
  )
}
