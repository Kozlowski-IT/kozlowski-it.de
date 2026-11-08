import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Site } from './globals/Site'
import { Chrome } from './globals/Chrome'
import { PublishStatus } from './globals/PublishStatus'
import { releasesEndpoint, rollbackEndpoint } from './endpoints/rollback'
import { previewUrl } from './lib/previewUrl'
import { initBuilder } from './hooks/triggerBuild'
import { richTextFeatures } from './lexical/features'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Öffentliche Adresse des Admins (Prod: https://cms.kozlowski-it.de). Ungesetzt (lokal, Tests)
// bleiben serverURL/csrf auf Payload-Default.
const serverURL = process.env.PAYLOAD_PUBLIC_SERVER_URL || undefined

export default buildConfig({
  serverURL,
  // Cookie-Auth nur von der eigenen Admin-Origin; keine Cross-Origin-API-Zugriffe
  ...(serverURL ? { csrf: [serverURL] } : {}),
  cors: [],
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    // Live-Vorschau = statische Vorschau des Builders: ${PREVIEW_URL}<permalink> je Locale
    livePreview: {
      collections: ['pages'],
      url: ({ data, locale }) => previewUrl(data, locale?.code),
    },
  },
  // GraphQL wird nirgends genutzt (Admin + Export laufen über REST/Local API) → aus; Routen gelöscht
  graphQL: { disable: true },
  // Release-Liste/Zurückschalten im Admin (Builder wird nur serverseitig gerufen)
  endpoints: [releasesEndpoint, rollbackEndpoint],
  collections: [Users, Media, Pages],
  globals: [Site, Chrome, PublishStatus],
  // nur Formate, die die Rich-Text-Teilmenge der Website besteht (src/lexical/features.ts)
  editor: lexicalEditor({ features: richTextFeatures }),
  localization: {
    locales: [
      { code: 'de', label: 'Deutsch' },
      { code: 'en', label: 'English' },
    ],
    defaultLocale: 'de',
    fallback: false,
  },
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    // Prod: kein Schema-Push; das Schema kommt aus src/migrations und läuft beim Start (prodMigrations).
    // Schema-Änderung → `npm run payload migrate:create <name>` und Migration mitcommitten.
    push: process.env.NODE_ENV !== 'production',
    prodMigrations: migrations,
  }),
  sharp,
  plugins: [],
  // Builder-Hinweis + publishStatus nach Neustart abgleichen (blockiert den Start nicht)
  onInit: (payload) => initBuilder(payload),
})
