import type { GlobalConfig } from 'payload'
import { validateHref } from '../fields/url'
import { globalAfterChange } from '../hooks/triggerBuild'

const text = (name: string, required = true) => ({ name, type: 'text' as const, required })
// Link-/Asset-Ziele (Allow-List, s. fields/url.ts)
const url = (name: string, required = true) => ({ ...text(name, required), validate: validateHref })

export const Site: GlobalConfig = {
  slug: 'site',
  label: 'Site (Stammdaten)',
  access: { read: () => true },
  hooks: { afterChange: [globalAfterChange] }, // Speichern → veröffentlichen
  fields: [
    text('name'),
    text('owner'),
    url('domain'),
    text('tel'),
    text('telDisplay'),
    url('telHref'),
    text('email'),
    text('street'),
    text('postalCode'),
    text('city'),
    text('region'),
    url('booking'),
    url('portal'),
    url('github'),
    url('logo'),
  ],
}
