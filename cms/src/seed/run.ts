import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { seedGlobals } from './seedGlobals'
import { seedPages } from './seedPages'

// npm run seed            → legt nur an, was fehlt (vorhandene Seiten/Medien/Globals bleiben)
// npm run seed -- --force → überschreibt vorhandene Inhalte mit dem Seed-Stand
// (das "--" am Ende des npm-Skripts ist nötig: `payload run` reicht nur Positionsargumente an
// das Skript durch, Flags wie --force schluckt sein minimist; nach "--" gilt --force als Position)
const force = process.argv.slice(2).includes('--force')
const pagesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'pages')

const payload = await getPayload({ config: await config })
const log = (msg: string) => payload.logger.info(msg)
const globals = await seedGlobals(payload, { force, log })
log(`seed: Globals geschrieben: ${globals.join(', ') || '—'}`)
const { written, skipped } = await seedPages(payload, pagesDir, { force, log })
log(`seed: Seiten veröffentlicht: ${written.join(', ') || '—'}; übersprungen: ${skipped.join(', ') || '—'}`)
process.exit(0)
