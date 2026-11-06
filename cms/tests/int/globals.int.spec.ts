import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { getPayload, type Payload, ValidationError } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, expect } from 'vitest'
import { seedGlobals } from '@/seed/seedGlobals'

const dataDir = path.resolve(__dirname, '../../../src/_data/legacy')
const json = (rel: string) => JSON.parse(fs.readFileSync(path.join(dataDir, rel), 'utf8'))

const META = new Set(['id', 'createdAt', 'updatedAt', 'globalType'])
const strip = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(strip)
    : v && typeof v === 'object'
      ? Object.fromEntries(
          Object.entries(v).filter(([k]) => !META.has(k)).map(([k, x]) => [k, strip(x)]),
        )
      : v

let payload: Payload

describe('Globals site + chrome', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    await seedGlobals(payload)
  })

  it('site == site.json', async () => {
    expect(strip(await payload.findGlobal({ slug: 'site' }))).toEqual(json('site.json'))
  })

  for (const locale of ['de', 'en'] as const) {
    it(`chrome (${locale}) == i18n/${locale}.json`, async () => {
      const got = await payload.findGlobal({ slug: 'chrome', locale })
      expect(strip(got)).toEqual(json(`i18n/${locale}.json`))
    })
  }

  it.each([
    ['chrome nav.items[].url', () =>
      payload.updateGlobal({ slug: 'chrome', locale: 'de', data: { nav: { ...json('i18n/de.json').nav, items: [{ label: 'x', url: 'javascript:alert(1)' }] } } as any })],
    ['chrome footer.legal[].url', () =>
      payload.updateGlobal({ slug: 'chrome', locale: 'de', data: { footer: { ...json('i18n/de.json').footer, legal: [{ label: 'x', url: 'javascript:alert(1)' }] } } as any })],
    ['chrome subnav.tabs[].url', () =>
      payload.updateGlobal({ slug: 'chrome', locale: 'de', data: { subnav: { tabs: [{ key: 'demos', label: 'x', url: 'javascript:alert(1)' }] } } as any })],
    ['chrome home', () => payload.updateGlobal({ slug: 'chrome', locale: 'de', data: { home: 'javascript:alert(1)' } as any })],
    ['site booking', () => payload.updateGlobal({ slug: 'site', data: { booking: 'javascript:alert(1)' } as any })],
    ['site portal', () => payload.updateGlobal({ slug: 'site', data: { portal: ' JavaScript:alert(1)' } as any })],
  ])('javascript: in %s wird abgelehnt', async (_label, save) => {
    const read = async () => [
      strip(await payload.findGlobal({ slug: 'site' })),
      strip(await payload.findGlobal({ slug: 'chrome', locale: 'de' })),
    ]
    const before = await read()
    const e = await (save as () => Promise<unknown>)().catch((err: unknown) => err)
    expect(e).toBeInstanceOf(ValidationError)
    expect(await read()).toEqual(before)
  })

  it('Seed ist idempotent', async () => {
    const read = async () => [
      strip(await payload.findGlobal({ slug: 'site' })),
      strip(await payload.findGlobal({ slug: 'chrome', locale: 'de' })),
      strip(await payload.findGlobal({ slug: 'chrome', locale: 'en' })),
    ]
    const before = await read()
    await seedGlobals(payload)
    expect(await read()).toEqual(before)
  })
})
