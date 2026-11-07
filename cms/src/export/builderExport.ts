/**
 * Export-Modul für den Builder (BUILDER_EXPORT_MODULE, s. builder/src/server.mjs):
 * exportFn(outDir, { drafts }) → exportContent(payload, …). Der Builder-Prozess hält dafür
 * eine eigene Payload-Instanz (eigene DB-Verbindung, keine Admin-UI). Start aus cms/:
 *
 *   cd cms && BUILDER_EXPORT_MODULE=src/export/builderExport.ts node --import tsx ../builder/src/server.mjs
 */
import 'dotenv/config'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { exportContent, type ExportResult } from './exportContent'

let instance: Promise<Payload> | undefined

export default async function exportFn(outDir: string, opts: { drafts: boolean }): Promise<ExportResult> {
  instance ??= getPayload({ config: await config }).catch((err) => {
    instance = undefined // nächster Lauf versucht es neu
    throw err
  })
  return exportContent(await instance, { outDir, drafts: opts.drafts })
}
