// @vitest-environment node
// Task 3 (Carry f): Anmeldung über die von edge02 (oauth2-proxy) gesetzten Header.
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, beforeEach, afterAll, expect, vi } from 'vitest'
import { edgeHeaderStrategy, resetEdgeHeaderWarning } from '@/auth/edgeHeader'

const EMAIL = 'pk@kozlowski-it.de'
const SECRET = 's'.repeat(40)
const H = (h: Record<string, string>) => new Headers(h)
const ok = (extra: Record<string, string> = {}) =>
  H({
    'x-edge-secret': SECRET,
    'x-auth-request-email': EMAIL,
    'x-auth-request-groups': 'cms-editor',
    ...extra,
  })

let payload: Payload
const env = { ...process.env }
const auth = (headers: Headers) => edgeHeaderStrategy.authenticate({ headers, payload })

describe('edgeHeaderStrategy', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    await payload.delete({ collection: 'users', where: { email: { equals: EMAIL } }, overrideAccess: true })
    await payload.create({ collection: 'users', data: { email: EMAIL, password: 'break-glass-123' } })
  })

  beforeEach(() => {
    process.env.EDGE_SHARED_SECRET = SECRET
    resetEdgeHeaderWarning()
  })

  afterAll(async () => {
    await payload.delete({ collection: 'users', where: { email: { equals: EMAIL } }, overrideAccess: true })
    process.env = env
  })

  it('heißt edge-header und ist neben der lokalen Passwort-Strategie in users registriert', () => {
    expect(edgeHeaderStrategy.name).toBe('edge-header')
    const users = payload.collections.users.config
    expect(users.auth.strategies.map((s) => s.name)).toContain('edge-header')
    expect(users.auth.disableLocalStrategy).toBeFalsy()
  })

  it('richtiges Secret + Rolle + bekannter User → user', async () => {
    const { user } = await auth(ok({ 'x-auth-request-email': '  PK@Kozlowski-IT.de ' }))
    expect(user?.email).toBe(EMAIL)
    expect(user?.collection).toBe('users')
    expect(user?._strategy).toBe('edge-header')
  })

  it('wirkt auch über Payloads Strategie-Kette (payload.auth)', async () => {
    const { user } = await payload.auth({ headers: ok() })
    expect(user?.email).toBe(EMAIL)
    expect((user as { _strategy?: string } | null)?._strategy).toBe('edge-header')
    const anon = await payload.auth({ headers: ok({ 'x-edge-secret': 'x'.repeat(40) }) })
    expect(anon.user).toBeNull()
  })

  it('falsches Secret → null', async () => {
    expect((await auth(ok({ 'x-edge-secret': 't'.repeat(40) }))).user).toBeNull()
    // gleicher Präfix, andere Länge
    expect((await auth(ok({ 'x-edge-secret': SECRET + 's' }))).user).toBeNull()
    expect((await auth(ok({ 'x-edge-secret': SECRET.slice(0, 39) }))).user).toBeNull()
    expect((await auth(ok({ 'x-edge-secret': '' }))).user).toBeNull()
  })

  it('fehlendes Secret-Header → null', async () => {
    const h = ok()
    h.delete('x-edge-secret')
    expect((await auth(h)).user).toBeNull()
  })

  it('Secret ok, Gruppe fehlt (groups="foo,bar") → null', async () => {
    expect((await auth(ok({ 'x-auth-request-groups': 'foo,bar' }))).user).toBeNull()
    // kein Teilstring-/Präfix-Match
    expect((await auth(ok({ 'x-auth-request-groups': 'cms-editor-x,xcms-editor' }))).user).toBeNull()
    expect((await auth(ok({ 'x-auth-request-groups': '' }))).user).toBeNull()
    const h = ok()
    h.delete('x-auth-request-groups')
    expect((await auth(h)).user).toBeNull()
  })

  it('Secret ok, Rolle ok, unbekannte E-Mail → null (kein Auto-Anlegen)', async () => {
    expect((await auth(ok({ 'x-auth-request-email': 'fremd@example.org' }))).user).toBeNull()
    const n = await payload.count({ collection: 'users', where: { email: { equals: 'fremd@example.org' } } })
    expect(n.totalDocs).toBe(0)
    expect((await auth(ok({ 'x-auth-request-email': '   ' }))).user).toBeNull()
    const h = ok()
    h.delete('x-auth-request-email')
    expect((await auth(h)).user).toBeNull()
  })

  it('EDGE_SHARED_SECRET leer/zu kurz → Strategy liefert immer null (eine Warnung)', async () => {
    const warn = vi.spyOn(payload.logger, 'warn')
    try {
      for (const s of [undefined, '', 's'.repeat(31)]) {
        if (s === undefined) delete process.env.EDGE_SHARED_SECRET
        else process.env.EDGE_SHARED_SECRET = s
        // auch wenn der Header exakt dem (zu kurzen) Env-Wert entspricht
        expect((await auth(ok({ 'x-edge-secret': s ?? '' }))).user).toBeNull()
        expect((await auth(ok({ 'x-edge-secret': s ?? '' }))).user).toBeNull()
      }
      const edgeWarnings = warn.mock.calls.filter((c) => JSON.stringify(c).includes('EDGE_SHARED_SECRET'))
      expect(edgeWarnings).toHaveLength(1)
      // das Secret selbst landet nie im Log
      expect(JSON.stringify(warn.mock.calls)).not.toContain('s'.repeat(31))
    } finally {
      warn.mockRestore()
    }
  })

  it('Gruppen-Header mit Leerzeichen "a, cms-editor" → erkannt', async () => {
    expect((await auth(ok({ 'x-auth-request-groups': 'a, cms-editor' }))).user?.email).toBe(EMAIL)
    expect((await auth(ok({ 'x-auth-request-groups': ' cms-editor ,,b' }))).user?.email).toBe(EMAIL)
  })
})
