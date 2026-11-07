import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { exportContent } from './exportContent'

const args = process.argv.slice(2)
const drafts = args.includes('--drafts')
const outIdx = args.indexOf('--out')
const outDir = outIdx >= 0 ? args[outIdx + 1] : undefined

const payload = await getPayload({ config: await config, disableOnInit: true })
const res = await exportContent(payload, { drafts, ...(outDir ? { outDir } : {}) })
payload.logger.info(`export: ${res.pages} Seiten (${drafts ? 'Entwürfe' : 'veröffentlicht'}), ${res.missing.length} fehlend`)
for (const m of res.missing) payload.logger.warn(`missing: ${m}`)
// Veröffentlichen blockieren: ohne --drafts ist "fehlend" ein Fehler
process.exit(res.missing.length && !drafts ? 1 : 0)
