import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { seedGlobals } from './seedGlobals'
import { seedPages } from './seedPages'

const pagesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'pages')

const payload = await getPayload({ config: await config })
await seedGlobals(payload)
payload.logger.info('seed: globals site/chrome geschrieben')
const keys = await seedPages(payload, pagesDir)
payload.logger.info(`seed: Seiten veröffentlicht: ${keys.join(', ')}`)
process.exit(0)
