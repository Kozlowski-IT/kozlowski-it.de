import type { Endpoint, PayloadRequest } from 'payload'
import { isReleaseName, listReleases, rollbackTo } from '../hooks/triggerBuild'

/**
 * Payload-Endpoints für die Release-Liste im Admin. Der Browser spricht nur mit Payload;
 * Payload ruft den Builder serverseitig mit BUILDER_TOKEN auf (Token verlässt nie den Server).
 *
 *   GET  /api/site/releases            → { current, releases[] }        (nur eingeloggt)
 *   POST /api/site/rollback {release}  → { ok, release } | { ok:false, reason }
 *
 * Rollback: nur eingeloggt (Users = Admins), nur JSON (kein Formular-POST von fremden Seiten),
 * Release-Name wird vor dem Weiterleiten geprüft (gleiche Regel wie im Builder).
 */
const deny = () => Response.json({ ok: false, reason: 'nicht angemeldet' }, { status: 401 })

export const releasesEndpoint: Endpoint = {
  path: '/site/releases',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    if (!req.user) return deny()
    const { status, body } = await listReleases()
    return Response.json(body, { status, headers: { 'cache-control': 'no-store' } })
  },
}

export const rollbackEndpoint: Endpoint = {
  path: '/site/rollback',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    if (!req.user) return deny()
    if (!/^application\/json\b/i.test(req.headers.get('content-type') ?? '')) {
      return Response.json({ ok: false, reason: 'nur application/json' }, { status: 415 })
    }
    let body: any
    try {
      body = await req.json?.()
    } catch {
      return Response.json({ ok: false, reason: 'Body ist kein gültiges JSON' }, { status: 400 })
    }
    const release = body?.release
    if (!isReleaseName(release)) {
      return Response.json({ ok: false, reason: `Release-Name ungültig: ${JSON.stringify(release ?? null)}` }, { status: 400 })
    }
    const { status, body: out } = await rollbackTo(req.payload, release)
    return Response.json(out, { status })
  },
}
