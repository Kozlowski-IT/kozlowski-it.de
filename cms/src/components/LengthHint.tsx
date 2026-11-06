'use client'
import { useField } from '@payloadcms/ui'

/** Sichtbarer Text eines Lexical-Werts oder eines Strings. */
export const visibleLength = (value: unknown): number => {
  if (typeof value === 'string') return value.length
  const walk = (n: any): string =>
    typeof n?.text === 'string'
      ? n.text
      : Array.isArray(n?.children)
        ? n.children.map(walk).join(n.type === 'root' ? '\n' : '')
        : ''
  return (value as any)?.root ? walk((value as any).root).length : 0
}

export const LengthHint = ({ max, path }: { max: number; path?: string }) => {
  const { value } = useField<unknown>(path ? { path } : undefined)
  const len = visibleLength(value)
  const over = len > max
  return (
    <div
      style={{ fontSize: 12, marginTop: 4, color: over ? 'var(--theme-warning-500, #b45309)' : 'var(--theme-elevation-500)' }}
      aria-live="polite"
    >
      {len} / {max} Zeichen{over ? ' — länger als empfohlen' : ''}
    </div>
  )
}
