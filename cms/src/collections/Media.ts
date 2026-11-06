import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CollectionConfig } from 'payload'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Medien. Upload mit automatischen WebP-Größen; `publicPath` ist der Pfad, unter dem
 * der Export die Datei in die statische Ausgabe kopiert (R3). Migrierte Bestandsbilder
 * behalten ihren heutigen Pfad (z. B. /assets/img/avatar2.webp).
 */
export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  admin: { useAsTitle: 'filename' },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'publicPath',
      type: 'text',
      admin: {
        description: 'Pfad in der Website-Ausgabe. Leer = /assets/media/<Dateiname>.',
      },
      hooks: {
        beforeChange: [
          ({ value, data, originalDoc }) =>
            value || `/assets/media/${data?.filename ?? originalDoc?.filename}`,
        ],
      },
    },
  ],
  upload: {
    // cms/media (gitignored); der Export kopiert genutzte Dateien nach publicPath
    staticDir: path.resolve(dirname, '../../media'),
    mimeTypes: ['image/*'],
    imageSizes: [
      { name: 'sm', width: 480, withoutEnlargement: true, formatOptions: { format: 'webp', options: { quality: 80 } } },
      { name: 'md', width: 960, withoutEnlargement: true, formatOptions: { format: 'webp', options: { quality: 80 } } },
      { name: 'lg', width: 1600, withoutEnlargement: true, formatOptions: { format: 'webp', options: { quality: 80 } } },
    ],
  },
}
