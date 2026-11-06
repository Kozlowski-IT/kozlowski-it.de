import type { GlobalConfig } from 'payload'

const text = (name: string, required = true) => ({ name, type: 'text' as const, required })

export const Site: GlobalConfig = {
  slug: 'site',
  label: 'Site (Stammdaten)',
  access: { read: () => true },
  fields: [
    text('name'),
    text('owner'),
    text('domain'),
    text('tel'),
    text('telDisplay'),
    text('telHref'),
    text('email'),
    text('street'),
    text('postalCode'),
    text('city'),
    text('region'),
    text('booking'),
    text('portal'),
    text('github'),
    text('logo'),
  ],
}
