// @vitest-environment node
// Export-Prozesse (Builder-Export-Modul, `npm run export`) dürfen Payloads onInit nicht ausführen:
// sonst setzt reconcilePublishStatus ein laufendes Publish fälschlich auf failed.
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import type { AddressInfo } from 'node:net'
import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest'
import { seedGlobals } from '@/seed/seedGlobals'
import { writeStatus } from '@/hooks/triggerBuild'

const RELEASE = '2026-11-07_120000'
const env = { ...process.env }
let setup: Payload
let server: http.Server
let calls: string[] = []

/** frischer Export-Prozess: Modul-Cache und Payload-Instanz-Cache ('default') verwerfen */
async function freshExport() {
  vi.resetModules()
  ;(globalThis as any)._payload?.delete('default')
  return (await import('@/export/builderExport')).default
}

async function runExport(): Promise<string> {
  const exportFn = await freshExport()
  const logs: string[] = []
  // pino/sonic-boom schreibt per fs.writeSync/fs.write auf fd 1 — beides mitschneiden
  const grab = (a: unknown[]) => logs.push(a.map((x) => (typeof x === 'string' || Buffer.isBuffer(x) ? String(x) : '')).join(''))
  const ws = fs.writeSync
  const w = fs.write
  const spies = [
    vi.spyOn(fs, 'writeSync').mockImplementation(((...a: any[]) => (grab(a.slice(1, 2)), (ws as any)(...a))) as any),
    vi.spyOn(fs, 'write').mockImplementation(((...a: any[]) => (grab(a.slice(1, 2)), (w as any)(...a))) as any),
  ]
  const so = vi.spyOn(process.stdout, 'write')
  try {
    await exportFn(fs.mkdtempSync(path.join(os.tmpdir(), 'export-proc-')), { drafts: true })
    logs.push(...so.mock.calls.map((c) => String(c[0])))
  } finally {
    spies.forEach((s) => s.mockRestore())
    so.mockRestore()
  }
  return logs.join('')
}

describe('Export-Prozess ohne onInit', () => {
  beforeAll(async () => {
    server = http.createServer((req, res) => {
      calls.push(`${req.method} ${req.url}`)
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ current: RELEASE, releases: [RELEASE] }))
    })
    await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok))
    // eigene Instanz fürs Setup (Key ≠ 'default'), ohne onInit
    setup = await getPayload({ config: await config, key: 'export-proc-setup', disableOnInit: true })
    await seedGlobals(setup, { force: true })
  })

  afterAll(async () => {
    process.env = env
    await new Promise((ok) => server.close(ok))
  })

  it('lässt publishStatus "running" unangetastet und fragt den Builder nicht', async () => {
    process.env.BUILDER_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    process.env.BUILDER_TOKEN = 'geheim-'.padEnd(48, 'x')
    await writeStatus(setup, { state: 'running', action: 'publish', at: new Date().toISOString(), release: RELEASE, reason: null, warning: null })
    calls = []
    await runExport()
    await new Promise((r) => setTimeout(r, 300)) // onInit-Abgleich wäre nicht blockierend
    const st: any = await setup.findGlobal({ slug: 'publishStatus', context: { raw: true } })
    expect(st.state).toBe('running')
    expect(calls).toEqual([])
  })

  it('loggt die BUILDER_URL/TOKEN-Warnung nicht', async () => {
    delete process.env.BUILDER_URL
    delete process.env.BUILDER_TOKEN
    const out = await runExport()
    expect(out).not.toContain('BUILDER_URL/BUILDER_TOKEN fehlen')
  })
})
