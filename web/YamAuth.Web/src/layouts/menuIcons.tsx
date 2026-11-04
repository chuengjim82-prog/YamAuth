import IconGlyph from '@/components/icons/IconGlyph'

export function menuIcon(name?: string) {
  if (!name) return undefined
  return <IconGlyph name={name} />
}
