import { postgresAdapter } from '@payloadcms/db-postgres'
import { LinkFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
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

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
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
  // Release-Liste/Zurückschalten im Admin (Builder wird nur serverseitig gerufen)
  endpoints: [releasesEndpoint, rollbackEndpoint],
  collections: [Users, Media, Pages],
  globals: [Site, Chrome, PublishStatus],
  editor: lexicalEditor({
    features: ({ defaultFeatures }) => [
      ...defaultFeatures.filter((f) => f.key !== 'link'),
      // rel="nofollow" für Quellen-Links (z. B. Preisquellen auf der Landingpage)
      LinkFeature({
        fields: ({ defaultFields }) => [...defaultFields, { name: 'nofollow', type: 'checkbox' }],
      }),
    ],
  }),
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
  }),
  sharp,
  plugins: [],
  // Builder-Hinweis + publishStatus nach Neustart abgleichen (blockiert den Start nicht)
  onInit: (payload) => initBuilder(payload),
})
