import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Payload } from 'payload'
import type { SeedOptions } from './seedPages'

// Seed-Quelle der Globals (früher src/_data/site.json + i18n/*.json der statischen Seite)
export const globalsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'globals')

const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(globalsDir, rel), 'utf8'))

const META = new Set(['id', 'createdAt', 'updatedAt', 'globalType'])
/** Hat der gespeicherte Stand Inhalt (irgendein nicht-leerer Text/Wert außer Metadaten)? */
const hasValue = (v: unknown): boolean =>
  Array.isArray(v)
    ? v.some(hasValue)
    : v && typeof v === 'object'
      ? Object.entries(v).some(([k, x]) => !META.has(k) && hasValue(x))
      : typeof v === 'string'
        ? v.trim() !== ''
        : typeof v === 'number'

/**
 * Schreibt globals/site.json und globals/chrome.{de,en}.json in die Globals site/chrome.
 * Ein Global mit vorhandenem Inhalt bleibt unverändert (Admin-Änderungen), außer `force`.
 * Rückgabe: geschriebene Globals.
 */
export async function seedGlobals(payload: Payload, opts: SeedOptions = {}): Promise<string[]> {
  const log = opts.log ?? (() => {})
  const written: string[] = []

  const site = await payload.findGlobal({ slug: 'site', depth: 0 })
  if (hasValue(site) && !opts.force) log('seed: Global site übersprungen (existiert)')
  else {
    await payload.updateGlobal({ slug: 'site', data: readJson('site.json'), context: { skipBuild: true } })
    written.push('site')
  }

  const chrome = await Promise.all(
    (['de', 'en'] as const).map((locale) => payload.findGlobal({ slug: 'chrome', locale, depth: 0 })),
  )
  if (chrome.some(hasValue) && !opts.force) log('seed: Global chrome übersprungen (existiert)')
  else {
    for (const locale of ['de', 'en'] as const) {
      await payload.updateGlobal({ slug: 'chrome', locale, data: readJson(`chrome.${locale}.json`), context: { skipBuild: true } })
    }
    written.push('chrome')
  }
  return written
}
