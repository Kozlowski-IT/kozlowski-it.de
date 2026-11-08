import { timingSafeEqual } from 'node:crypto'
import type { AuthStrategy, AuthStrategyResult, Payload } from 'payload'

/**
 * Anmeldung über die Header von edge02 (Carry f).
 *
 * edge02-nginx prüft per oauth2-proxy `auth_request` Zitadel-Login + Rolle und
 * ÜBERSCHREIBT danach immer `X-Auth-Request-Email`, `X-Auth-Request-Groups` und
 * `X-Edge-Secret`. Payload ist nur von edge02 erreichbar (Firewall); andere
 * Container im selben DMZ-VLAN könnten es aber direkt ansprechen — deshalb
 * zählen die Header nur zusammen mit dem gemeinsamen Edge-Secret.
 *
 * Grenze (ehrlich): Der Builder kennt das Edge-Secret nicht, hat aber
 * PAYLOAD_SECRET und eine schreibende DATABASE_URL. Ein kompromittierter
 * Builder ist damit ein kompromittiertes CMS; das fehlende Edge-Secret ist nur
 * Defense in depth, keine Isolation. Echte Trennung erst mit einem Export über
 * eine Nur-Lese-DB-Rolle (deploy/cms/README.md, „Bekannte Grenze“).
 *
 * Kein Auto-Anlegen: nur bereits vorhandene Users werden angemeldet.
 * Die lokale Passwort-Strategie bleibt aktiv (Break-Glass, nur intern erreichbar).
 */

export const EDGE_STRATEGY_NAME = 'edge-header'
export const EDITOR_GROUP = 'cms-editor'
const MIN_SECRET_LENGTH = 32

const NONE: AuthStrategyResult = { user: null }

let warned = false
/** Nur für Tests: die einmalige Warnung wieder scharf schalten. */
export const resetEdgeHeaderWarning = () => {
  warned = false
}

/** Konstantzeit-Vergleich; unterschiedliche Länge → false. */
const sameSecret = (given: string, expected: string): boolean => {
  const a = Buffer.from(given, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/** Exakter Treffer pro Eintrag nach trim; leere Einträge zählen nicht. */
const hasEditorGroup = (groups: string | null): boolean =>
  (groups ?? '')
    .split(',')
    .map((g) => g.trim())
    .some((g) => g === EDITOR_GROUP)

const reject = (payload: Payload, reason: string): AuthStrategyResult => {
  // bewusst ohne Header-Werte (kein Secret, keine E-Mail im Log)
  payload.logger.debug(`${EDGE_STRATEGY_NAME} abgelehnt: ${reason}`)
  return NONE
}

export const edgeHeaderStrategy: AuthStrategy = {
  name: EDGE_STRATEGY_NAME,
  authenticate: async ({ headers, payload }) => {
    const expected = process.env.EDGE_SHARED_SECRET ?? ''
    if (expected.length < MIN_SECRET_LENGTH) {
      if (!warned) {
        warned = true
        payload.logger.warn(
          `EDGE_SHARED_SECRET fehlt oder ist kürzer als ${MIN_SECRET_LENGTH} Zeichen — Anmeldung über edge02-Header ist deaktiviert`,
        )
      }
      return NONE
    }

    const given = headers.get('x-edge-secret')
    if (!given) return reject(payload, 'Edge-Secret fehlt')
    if (!sameSecret(given, expected)) return reject(payload, 'Edge-Secret falsch')

    if (!hasEditorGroup(headers.get('x-auth-request-groups'))) {
      return reject(payload, `Rolle ${EDITOR_GROUP} fehlt`)
    }

    const email = (headers.get('x-auth-request-email') ?? '').trim().toLowerCase()
    if (!email) return reject(payload, 'E-Mail fehlt')

    const { docs } = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    const user = docs[0]
    if (!user) return reject(payload, 'unbekannter User')

    return { user: { ...user, collection: 'users', _strategy: EDGE_STRATEGY_NAME } }
  },
}
