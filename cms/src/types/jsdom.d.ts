// Minimale Typen für jsdom (devDependency; nur der Seed nutzt es für convertHTMLToLexical).
// Bewusst kein @types/jsdom (kein zusätzliches Paket für eine Konstruktor-Signatur).
declare module 'jsdom' {
  export class JSDOM {
    constructor(html?: string)
    window: { document: Document }
  }
}
