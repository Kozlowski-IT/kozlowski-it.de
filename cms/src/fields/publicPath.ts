/**
 * Regeln für media.publicPath (gleiche Regeln wie assertPublicPath in lib/content.js):
 * /assets/-Präfix, kein "..", Backslash, NUL; nicht unter /assets/{js,css,fonts}/;
 * Bild-Endung jpg/jpeg/png/webp/avif, passend zur hochgeladenen Datei (jpg ≙ jpeg).
 */
export const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp', 'avif']
const FORBIDDEN_DIRS = ['/assets/js/', '/assets/css/', '/assets/fonts/']

export const ext = (p: string | null | undefined): string => {
  const m = /\.([a-z0-9]+)$/i.exec(p ?? '')
  const e = m ? m[1].toLowerCase() : ''
  return e === 'jpeg' ? 'jpg' : e
}

/** true oder Fehlermeldung. `file` = Dateiname der Upload-Datei (falls bekannt). */
export function checkPublicPath(value: string, file?: string | null): true | string {
  if (!value.startsWith('/assets/')) return 'publicPath muss mit /assets/ beginnen'
  if (value.includes('..') || value.includes('\\') || value.includes('\0'))
    return 'publicPath darf weder "..", Backslash noch NUL enthalten'
  if (FORBIDDEN_DIRS.some((d) => value.toLowerCase().startsWith(d)))
    return 'publicPath darf nicht unter /assets/js/, /assets/css/ oder /assets/fonts/ liegen'
  if (!IMAGE_EXT.includes(ext(value))) return `publicPath braucht eine Bild-Endung (${IMAGE_EXT.join(', ')})`
  if (file && ext(file) !== ext(value)) return `Endung von publicPath passt nicht zur Datei (${file})`
  return true
}
