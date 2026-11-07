/**
 * Beschreibt den Bausteinkatalog (cms/src/blocks) als JSON auf stdout — Grundlage des
 * Abdeckungstests test/content-format.test.mjs gegen docs/content-format-v1.md.
 *
 * Ausgabe: { [blockSlug]: [{ path, type, localized, required, options?, lengthHint? }] }
 * path: Feldname, Verschachtelung mit "." (group) bzw. "[]." (array), z. B. "cards[].title".
 * Aufruf: `npx tsx src/export/describeBlocks.ts` (aus cms/).
 */
import type { Field } from 'payload'
import { blocks } from '../blocks'

export type FieldInfo = {
  path: string
  type: string
  localized: boolean
  required: boolean
  options?: string[]
  lengthHint?: number
}

export function describeFields(fields: Field[], base = ''): FieldInfo[] {
  const out: FieldInfo[] = []
  for (const f of fields as any[]) {
    if (f.type === 'row' || f.type === 'collapsible') {
      out.push(...describeFields(f.fields, base))
      continue
    }
    if (!f.name) continue
    const path = base ? `${base}.${f.name}` : f.name
    const info: FieldInfo = { path, type: f.type, localized: !!f.localized, required: !!f.required }
    if (f.type === 'select') info.options = f.options.map((o: any) => (typeof o === 'string' ? o : o.value))
    if (f.custom?.lengthHint) info.lengthHint = f.custom.lengthHint
    out.push(info)
    if (f.type === 'group') out.push(...describeFields(f.fields, path))
    if (f.type === 'array') out.push(...describeFields(f.fields, `${path}[]`))
  }
  return out
}

export const describeBlocks = () => Object.fromEntries(blocks.map((b) => [b.slug, describeFields(b.fields)]))

if (process.argv[1]?.endsWith('describeBlocks.ts')) process.stdout.write(JSON.stringify(describeBlocks(), null, 2) + '\n')
