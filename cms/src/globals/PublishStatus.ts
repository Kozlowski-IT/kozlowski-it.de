import type { GlobalConfig } from 'payload'

/**
 * Ergebnis des letzten Veröffentlichens/Zurückschaltens (geschrieben vom Server, s. hooks/triggerBuild.ts).
 * Für Redakteure nur lesbar; `release` = der Stand, der live ist (bleibt bei einem Fehlschlag stehen).
 * Darunter die Release-Liste mit „wieder live schalten“ (spricht nur mit Payloads eigenen Endpoints).
 */
export const PublishStatus: GlobalConfig = {
  slug: 'publishStatus',
  label: 'Veröffentlichung (Status)',
  access: {
    read: ({ req }) => !!req.user,
    update: () => false, // nur serverseitig (Local API mit overrideAccess)
  },
  admin: { hideAPIURL: true },
  fields: [
    {
      name: 'state',
      type: 'select',
      label: 'Zustand',
      options: [
        { label: 'läuft', value: 'running' },
        { label: 'live', value: 'live' },
        { label: 'fehlgeschlagen', value: 'failed' },
      ],
      admin: { readOnly: true },
    },
    {
      name: 'action',
      type: 'select',
      label: 'Letzte Aktion',
      options: [
        { label: 'Veröffentlichen', value: 'publish' },
        { label: 'Zurückschalten', value: 'rollback' },
      ],
      admin: { readOnly: true },
    },
    { name: 'at', type: 'date', label: 'Zeitpunkt', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'release', type: 'text', label: 'Live-Release', admin: { readOnly: true } },
    { name: 'reason', type: 'textarea', label: 'Grund (Fehler)', admin: { readOnly: true } },
    { name: 'warning', type: 'textarea', label: 'Warnung', admin: { readOnly: true } },
    {
      name: 'releases',
      type: 'ui',
      admin: { components: { Field: '@/components/ReleaseList#ReleaseList' } },
    },
  ],
}
