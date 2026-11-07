/**
 * Vorschau-URL einer Seite: `${PREVIEW_URL}<permalink>` — gleiche Permalink-Regel wie der
 * Eleventy-Build (lib/content.js permalinkFor): DE `/<slug>/`, EN `/en/<slugEn>/`, `index` = Wurzel.
 * EN ohne slugEn bzw. nicht bilinguale Seite → DE-Pfad. Ohne PREVIEW_URL → null (Live-Vorschau aus).
 */
export function previewUrl(
  data: { slug?: string | null; slugEn?: string | null; bilingual?: boolean | null },
  locale: string | undefined,
): string | null {
  const base = (process.env.PREVIEW_URL || '').replace(/\/+$/, '')
  if (!base) return null
  const en = locale === 'en' && data.bilingual !== false && !!data.slugEn
  const slug = (en ? data.slugEn : data.slug) || 'index'
  const prefix = en ? '/en/' : '/'
  return base + (slug === 'index' ? prefix : `${prefix}${encodeURI(slug)}/`)
}
