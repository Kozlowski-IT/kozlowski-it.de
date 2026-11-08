import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, expect, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

let payload: Payload

describe('Payload-Grundgerüst', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  it('nutzt die Test-DB', () => {
    expect(process.env.DATABASE_URL).toContain('/cms_test')
  })

  it('hat Locales de (Default) und en ohne Fallback', () => {
    const loc = payload.config.localization
    if (!loc) throw new Error('localization fehlt')
    expect(loc.locales.map((l) => l.code)).toEqual(['de', 'en'])
    expect(loc.defaultLocale).toBe('de')
    expect(loc.fallback).toBe(false)
  })

  it('legt users an und findet sie wieder', async () => {
    const email = `t1-${Date.now()}@example.com`
    const created = await payload.create({
      collection: 'users',
      data: { email, password: 'test-pass-123' },
    })
    try {
      const found = await payload.find({
        collection: 'users',
        where: { email: { equals: email } },
      })
      expect(found.docs.map((d) => d.id)).toContain(created.id)
    } finally {
      await payload.delete({ collection: 'users', id: created.id })
    }
  })

  it('GraphQL ist aus (Config + keine GraphQL-Routen)', () => {
    expect(payload.config.graphQL.disable).toBe(true)
    const api = path.resolve(dirname, '../../src/app/(payload)/api')
    expect(fs.existsSync(path.join(api, 'graphql'))).toBe(false)
    expect(fs.existsSync(path.join(api, 'graphql-playground'))).toBe(false)
  })

  it('ohne PAYLOAD_PUBLIC_SERVER_URL: serverURL/csrf auf Payload-Default, cors leer', () => {
    expect(process.env.PAYLOAD_PUBLIC_SERVER_URL ?? '').toBe('')
    expect(payload.config.serverURL).toBe('')
    expect(payload.config.csrf).toEqual([])
    expect(payload.config.cors).toEqual([])
  })

  it('mit PAYLOAD_PUBLIC_SERVER_URL: serverURL gesetzt, csrf nur diese Origin', async () => {
    process.env.PAYLOAD_PUBLIC_SERVER_URL = 'https://cms.kozlowski-it.de'
    try {
      vi.resetModules()
      const c = await (await import('@/payload.config')).default
      expect(c.serverURL).toBe('https://cms.kozlowski-it.de')
      expect([...new Set(c.csrf)]).toEqual(['https://cms.kozlowski-it.de'])
      expect(c.cors).toEqual([])
    } finally {
      delete process.env.PAYLOAD_PUBLIC_SERVER_URL
      vi.resetModules()
    }
  })
})
