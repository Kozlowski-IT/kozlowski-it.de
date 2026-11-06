import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CollectionConfig } from 'payload'
import { checkPublicPath } from '../fields/publicPath'

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
      unique: true,
      // Der Export kopiert die Datei an diesen Pfad → nur Bilder unter /assets/ (nicht js/css/fonts),
      // kein Traversal, Endung passend zur Datei (fields/publicPath.ts; Eleventy prüft erneut).
      validate: (value: string | null | undefined, { data, originalDoc }: any) => {
        if (value == null || value === '') return true // Default setzt der Hook
        return checkPublicPath(value, data?.filename ?? originalDoc?.filename)
      },
      admin: {
        description: 'Pfad in der Website-Ausgabe. Leer = /assets/media/<Dateiname>.',
      },
      hooks: {
        // beforeValidate, damit auch der Default durch validate läuft
        beforeValidate: [
          ({ value, data, originalDoc }) =>
            value || `/assets/media/${data?.filename ?? originalDoc?.filename}`,
        ],
      },
    },
  ],
  upload: {
    // cms/media (gitignored); der Export kopiert genutzte Dateien nach publicPath
    staticDir: path.resolve(dirname, '../../media'),
    // nur Rasterbilder; kein SVG (kann Skript tragen)
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    imageSizes: [
      { name: 'sm', width: 480, withoutEnlargement: true, formatOptions: { format: 'webp', options: { quality: 80 } } },
      { name: 'md', width: 960, withoutEnlargement: true, formatOptions: { format: 'webp', options: { quality: 80 } } },
      { name: 'lg', width: 1600, withoutEnlargement: true, formatOptions: { format: 'webp', options: { quality: 80 } } },
    ],
  },
}
