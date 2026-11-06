import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, expect } from 'vitest'

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
})
