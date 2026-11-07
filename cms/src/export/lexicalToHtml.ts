import { sanitizeUrl } from 'payload/shared'
import { convertLexicalToHTML, defaultHTMLConverters } from '@payloadcms/richtext-lexical/html'
import type { HTMLConverters } from '@payloadcms/richtext-lexical/html'

const escapeHTML = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/**
 * Payloads Link-Feld kodiert beim Speichern URLs, die es nicht als URL erkennt, mit encodeURIComponent
 * (beforeChange-Hook in richtext-lexical). Ein Link-Ziel `{{site.booking}}` (Platzhalter, Inhaltsformat
 * v1 Abschnitt 9) käme so als `%7B%7Bsite.booking%7D%7D` an. Hier wird genau diese Form zurückgewandelt;
 * aufgelöst und geprüft wird der Platzhalter erst im Website-Build.
 */
export function decodeLinkPlaceholders(url: string): string {
  return url.replace(/%7B%7B((?:%20)*site\.[A-Za-z][A-Za-z0-9_]*(?:%20)*)%7D%7D/gi, (_, inner: string) =>
    `{{${decodeURIComponent(inner)}}}`,
  )
}

type LinkNode = { fields?: { url?: string; linkType?: string; newTab?: boolean; nofollow?: boolean } }

/** rel/target nach Site-Konvention: newTab → target=_blank + noopener, nofollow → "noopener nofollow". */
function anchor(node: LinkNode, href: string, children: string, style: string): string {
  const rel = [node.fields?.newTab ? 'noopener' : '', node.fields?.nofollow ? 'nofollow' : ''].filter(Boolean)
  const attrs =
    (rel.length ? ` rel="${rel.join(' ')}"` : '') + (node.fields?.newTab ? ' target="_blank"' : '')
  return `<a${style} href="${escapeHTML(sanitizeUrl(decodeLinkPlaceholders(href)))}"${attrs}>${children}</a>`
}

/**
 * Lexical-Zustand → HTML-String (ohne Container-Div). Eigener Link-Converter
 * (rel/target wie im statischen Markup). Interne Dokument-Links sind nicht
 * unterstützt: href "#" und Rückmeldung über `onInternalLink`.
 */
export function lexicalToHtml(data: unknown, opts: { onInternalLink?: () => void } = {}): string {
  const converters: HTMLConverters = {
    ...defaultHTMLConverters,
    link: ({ node, nodesToHTML, providedStyleTag }: any) => {
      const children = nodesToHTML({ nodes: node.children }).join('')
      let href = node.fields?.url ?? ''
      if (node.fields?.linkType === 'internal') {
        opts.onInternalLink?.()
        href = '#'
      }
      return anchor(node, href, children, providedStyleTag)
    },
    autolink: ({ node, nodesToHTML, providedStyleTag }: any) =>
      anchor(node, node.fields?.url ?? '', nodesToHTML({ nodes: node.children }).join(''), providedStyleTag),
  }
  return convertLexicalToHTML({ data: data as any, converters, disableContainer: true })
}

/** Rich-Text ohne sichtbaren Inhalt (leerer Editor, nur leere Absätze). */
export function isEmptyRichText(v: unknown): boolean {
  const walk = (n: any): boolean =>
    !n ||
    (typeof n.text === 'string' ? n.text.trim() === '' : true) &&
      (n.type === 'linebreak' || n.type === 'horizontalrule' ? false : (n.children ?? []).every(walk))
  const root = (v as any)?.root
  return !root || (root.children ?? []).every(walk)
}
