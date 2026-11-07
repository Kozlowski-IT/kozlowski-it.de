'use client'
import { useConfig } from '@payloadcms/ui'
import { useCallback, useEffect, useState } from 'react'

type Releases = { current: string | null; releases: string[] }

/** Release-Name (UTC, YYYY-MM-DD_HHmmss[-n]) → lokale Zeit zum Anzeigen */
export const releaseLabel = (name: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})(\d{2})(?:-(\d+))?$/.exec(name)
  if (!m) return name
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]))
  return d.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'medium' }) + (m[7] ? ` (#${m[7]})` : '')
}

/**
 * Release-Liste mit „wieder live schalten“. Spricht NUR mit Payloads eigenen Endpoints
 * (/api/site/releases, /api/site/rollback) — nie direkt mit dem Builder.
 */
export const ReleaseList = () => {
  const { config } = useConfig()
  const api = `${config.serverURL ?? ''}${config.routes?.api ?? '/api'}`
  const [data, setData] = useState<Releases | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch(`${api}/site/releases`, { credentials: 'include', cache: 'no-store' })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.reason ?? `HTTP ${res.status}`)
      setData(body)
    } catch (err: any) {
      setError(`Release-Liste nicht verfügbar: ${err?.message ?? err}`)
    }
  }, [api])

  useEffect(() => {
    void load()
  }, [load])

  const rollback = async (release: string) => {
    if (!window.confirm(`Release ${releaseLabel(release)} wieder live schalten?`)) return
    setBusy(release)
    setNote(null)
    setError(null)
    try {
      const res = await fetch(`${api}/site/rollback`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ release }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok || !body?.ok) throw new Error(body?.reason ?? `HTTP ${res.status}`)
      setNote(`${releaseLabel(release)} ist wieder live. (Seite neu laden, um den Status oben zu aktualisieren.)`)
      await load()
    } catch (err: any) {
      setError(`Zurückschalten fehlgeschlagen: ${err?.message ?? err}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="field-type" style={{ marginTop: 24 }}>
      <h3 style={{ marginBottom: 8 }}>Releases</h3>
      {error && <p style={{ color: 'var(--theme-error-500)' }}>{error}</p>}
      {note && <p style={{ color: 'var(--theme-success-500)' }}>{note}</p>}
      {!data && !error && <p>lädt …</p>}
      {data && data.releases.length === 0 && <p>Noch keine Releases.</p>}
      {data && data.releases.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {data.releases.map((r) => (
            <li key={r} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--theme-elevation-100)' }}>
              <span style={{ fontFamily: 'monospace' }} title={`${r} (UTC)`}>{releaseLabel(r)}</span>
              {r === data.current ? (
                <strong>live</strong>
              ) : (
                <button type="button" className="btn btn--style-secondary btn--size-small" disabled={!!busy} onClick={() => rollback(r)}>
                  {busy === r ? 'schalte …' : 'wieder live schalten'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="btn btn--style-subtle btn--size-small" onClick={() => void load()} disabled={!!busy}>
        aktualisieren
      </button>
    </div>
  )
}
