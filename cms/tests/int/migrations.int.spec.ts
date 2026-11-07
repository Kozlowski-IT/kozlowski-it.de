// @vitest-environment node
// Produktion: kein Schema-Push, das Schema entsteht aus den Migrationen in src/migrations
// (prodMigrations laufen beim Start). Geprüft gegen eine frisch angelegte, leere Datenbank.
import { getPayload, type Payload } from 'payload'
import pg from 'pg'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'

const TEST_URL = new URL(process.env.DATABASE_URL || '')
const DB = 'cms_migtest'
const adminUrl = () => Object.assign(new URL(TEST_URL), { pathname: '/postgres' }).toString()
const migUrl = Object.assign(new URL(TEST_URL), { pathname: `/${DB}` }).toString()

async function admin(sql: string) {
  const c = new pg.Client({ connectionString: adminUrl() })
  await c.connect()
  try {
    await c.query(sql)
  } finally {
    await c.end()
  }
}

let payload: Payload
const env = { DATABASE_URL: process.env.DATABASE_URL, NODE_ENV: process.env.NODE_ENV }
const q = async (sql: string, params: unknown[] = []) => (await (payload.db as any).pool.query(sql, params)).rows

describe('Produktions-Migrationen', () => {
  beforeAll(async () => {
    await admin(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`)
    await admin(`CREATE DATABASE ${DB}`)
    process.env.DATABASE_URL = migUrl
    ;(process.env as any).NODE_ENV = 'production'
    // Konfiguration erst jetzt laden: push/prodMigrations/DATABASE_URL werden beim Import gelesen
    const config = (await import('@/payload.config')).default
    payload = await getPayload({ config: await config, key: 'migtest' })
  }, 120_000)

  afterAll(async () => {
    // payload.destroy() schließt den pg-Pool nicht (der Adapter hält eine Verbindung dauerhaft);
    // DROP … WITH (FORCE) beendet sie — der Fehler-Listener verhindert einen unbehandelten 57P01.
    const pool = (payload?.db as any)?.pool
    pool?.on('error', () => {})
    await payload?.destroy()
    void pool?.end().catch(() => {})
    process.env.DATABASE_URL = env.DATABASE_URL
    ;(process.env as any).NODE_ENV = env.NODE_ENV
    await admin(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`)
  })

  it('Start auf leerer DB mit NODE_ENV=production legt Schema per Migration an', async () => {
    const rows = await q('SELECT name, batch FROM payload_migrations ORDER BY name')
    const names = rows.map((r: any) => r.name)
    expect(names.some((n: string) => /_initial$/.test(n))).toBe(true)
    // kein Dev-Push-Eintrag (batch -1)
    expect(rows.every((r: any) => Number(r.batch) > 0)).toBe(true)

    const tables = (await q(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    )).map((r: any) => r.table_name)
    for (const t of ['pages', 'media', 'users', 'site', 'chrome', 'publish_status']) expect(tables).toContain(t)
  })

  it('Migrationen decken das Schema der Konfiguration vollständig ab (kein Drift)', async () => {
    // Schema-Änderung ohne `payload migrate:create` → Push hätte noch etwas zu tun → rot
    const db = payload.db as any
    const { pushSchema } = db.requireDrizzleKit()
    const { statementsToExecute } = await pushSchema(db.schema, db.drizzle)
    // drizzle-kit erkennt den numeric-Default von users.login_attempts nie als gleich (DB: 0, Schema: 0)
    // und schlägt ihn bei jedem Push erneut vor — auch auf der per Push angelegten Test-DB.
    const KNOWN_NOOP = ['ALTER TABLE "users" ALTER COLUMN "login_attempts" SET DEFAULT 0;']
    expect(statementsToExecute.filter((st: string) => !KNOWN_NOOP.includes(st))).toEqual([])
  })

  it('die migrierte DB ist benutzbar (users anlegen/finden)', async () => {
    const email = `mig-${Date.now()}@example.com`
    const created = await payload.create({ collection: 'users', data: { email, password: 'test-pass-123' } })
    const found = await payload.find({ collection: 'users', where: { email: { equals: email } } })
    expect(found.docs.map((d) => d.id)).toContain(created.id)
  })
})
