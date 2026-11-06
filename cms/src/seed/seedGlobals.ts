import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Payload } from 'payload'

// cms/src/seed -> Repo-Root (unabhängig vom cwd)
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const dataDir = path.join(repoRoot, 'src/_data')

const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(dataDir, rel), 'utf8'))

/** Idempotent: schreibt site.json und i18n/{de,en}.json in die Globals site/chrome. */
export async function seedGlobals(payload: Payload): Promise<void> {
  await payload.updateGlobal({ slug: 'site', data: readJson('site.json') })
  for (const locale of ['de', 'en'] as const) {
    await payload.updateGlobal({
      slug: 'chrome',
      locale,
      data: readJson(`i18n/${locale}.json`),
    })
  }
}
