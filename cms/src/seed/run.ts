import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { seedGlobals } from './seedGlobals'

const payload = await getPayload({ config: await config })
await seedGlobals(payload)
payload.logger.info('seed: globals site/chrome geschrieben')
process.exit(0)
