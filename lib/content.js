// Liest den CMS-Export (content/*.json) für den Eleventy-Build.
// Verzeichnis: env CONTENT_DIR (relativ zum Repo-Root oder absolut), Default <repo>/content.
// Bewusst AUSSERHALB von src/_data: alles dort würde Eleventy als globale Daten laden.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));

export const LANGS = ["de", "en"];
export const FRAMES = ["home", "subpage", "subpageTabs", "landing", "legal", "legalWrap"];
export const BLOCK_TYPES = [
  "hero", "text", "cards", "steps", "faq", "ctaBar", "figure", "contactForm", "vmwareCalculator",
];

export const contentDir = () => resolve(REPO_ROOT, process.env.CONTENT_DIR || "content");

const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    throw new Error(`content: ${file} ist kein gültiges JSON (${err.message})`);
  }
};

/** content/<rel> lesen, sonst undefined (Datei fehlt). */
export function readContent(rel) {
  const file = join(contentDir(), rel);
  return existsSync(file) ? readJson(file) : undefined;
}

/** content/<rel> lesen; fehlt die Datei, bricht der Build ab (Inhalte kommen nur aus dem CMS-Export). */
export function requireContent(rel) {
  const v = readContent(rel);
  if (v === undefined) {
    throw new Error(`content: ${join(contentDir(), rel)} fehlt (zuerst im cms/ "npm run export" ausführen)`);
  }
  return v;
}

export const loadSite = () => requireContent("site.json");

/** chrome.json = { de: {...}, en: {...} } (CMS-Global „chrome", je Sprache). */
export function loadChrome() {
  const chrome = requireContent("chrome.json");
  for (const l of LANGS) if (!chrome?.[l]) throw new Error(`content: chrome.json ohne Sprache ${l}`);
  return chrome;
}

const IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "avif"];
const FORBIDDEN_DIRS = ["/assets/js/", "/assets/css/", "/assets/fonts/"];
const ext = (p) => {
  const m = /\.([a-z0-9]+)$/i.exec(p ?? "");
  const e = m ? m[1].toLowerCase() : "";
  return e === "jpeg" ? "jpg" : e;
};

/**
 * publicPath erneut prüfen (gleiche Regeln wie cms/src/fields/publicPath.ts):
 * beginnt mit /assets/, kein "..", kein Backslash, kein NUL, nicht unter /assets/{js,css,fonts}/,
 * Bild-Endung (jpg/jpeg/png/webp/avif) und — wenn file bekannt — gleiche Endung wie die Datei.
 */
export function assertPublicPath(p, where, file) {
  const fail = (why) => {
    throw new Error(`content: ungültiger publicPath ${JSON.stringify(p)} (${where}): ${why}`);
  };
  if (typeof p !== "string" || !p.startsWith("/assets/")) fail("muss mit /assets/ beginnen");
  if (p.includes("..") || p.includes("\\") || p.includes("\0")) fail('weder "..", Backslash noch NUL');
  if (FORBIDDEN_DIRS.some((d) => p.toLowerCase().startsWith(d))) fail("nicht unter /assets/js|css|fonts/");
  if (!IMAGE_EXT.includes(ext(p))) fail(`Endung muss ${IMAGE_EXT.join("/")} sein`);
  if (file != null && ext(file) !== ext(p)) fail(`Endung passt nicht zur Datei ${JSON.stringify(file)}`);
  return p;
}

/**
 * content/media/index.json → [{ file, publicPath, src }] (geprüft).
 * file muss ein schlichter Dateiname in content/media/ sein und existieren.
 */
export function loadMedia() {
  const list = readContent("media/index.json") ?? [];
  if (!Array.isArray(list)) throw new Error("content: media/index.json ist kein Array");
  const seen = new Map();
  return list.map((m, i) => {
    const where = `media/index.json[${i}]`;
    const file = m?.file;
    assertPublicPath(m?.publicPath, where, typeof file === "string" ? file : undefined);
    if (typeof file !== "string" || !/^[^/\\\0]+$/.test(file) || file === "." || file === "..") {
      throw new Error(`content: ungültiger Dateiname ${JSON.stringify(file)} (${where})`);
    }
    const src = join(contentDir(), "media", file);
    if (!existsSync(src)) throw new Error(`content: Mediendatei fehlt: ${src} (${where})`);
    if (seen.has(m.publicPath) && seen.get(m.publicPath) !== file) {
      throw new Error(`content: publicPath ${m.publicPath} doppelt vergeben (${where})`);
    }
    seen.set(m.publicPath, file);
    // Gleicher Pfad wie eine Datei aus dem assets/-Passthrough: nur erlaubt, wenn byte-identisch
    // (migrierte Bestandsbilder, R3) — sonst würde das CMS eine Repo-Datei still ersetzen.
    const repoFile = join(REPO_ROOT, m.publicPath);
    if (existsSync(repoFile) && !readFileSync(repoFile).equals(readFileSync(src))) {
      throw new Error(`content: publicPath ${m.publicPath} kollidiert mit abweichender Datei im Repo (${where})`);
    }
    return { file, publicPath: m.publicPath, src };
  });
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

export function permalinkFor(lang, slug) {
  const prefix = lang === "en" ? "/en/" : "/";
  return slug === "index" ? prefix : `${prefix}${slug}/`;
}

/** Alle Bild-Objekte (haben publicPath) in einem Block rekursiv prüfen. */
function checkImages(node, where, known) {
  if (Array.isArray(node)) return node.forEach((n, i) => checkImages(n, `${where}[${i}]`, known));
  if (!node || typeof node !== "object") return;
  if ("publicPath" in node) {
    assertPublicPath(node.publicPath, where, node.file);
    if (!known(node.publicPath)) {
      throw new Error(`content: Bild ${node.publicPath} weder in media/index.json noch unter assets/ (${where})`);
    }
  }
  for (const [k, v] of Object.entries(node)) if (v && typeof v === "object") checkImages(v, `${where}.${k}`, known);
}

/**
 * pages.json → flache Liste, eine Seite pro Seite×Locale:
 * { ...LocalizedPage, lang, translationKey, bilingual, noindex, minimalHeader, structuredData, frame, permalink }.
 * Fehlt pages.json (oder ist leer): [].
 */
export function loadPages() {
  const raw = readContent("pages.json") ?? [];
  if (!Array.isArray(raw)) throw new Error("content: pages.json ist kein Array");
  const mediaPaths = new Set(loadMedia().map((m) => m.publicPath));
  const known = (p) => mediaPaths.has(p) || existsSync(join(REPO_ROOT, p));
  const chrome = loadChrome();

  const out = [];
  const permalinks = new Map();
  for (const page of raw) {
    const key = page?.translationKey;
    if (typeof key !== "string" || !key) throw new Error("content: Seite ohne translationKey in pages.json");
    const frame = page.frame ?? "subpage";
    if (!FRAMES.includes(frame)) throw new Error(`content: ${key}: unbekannter frame ${JSON.stringify(frame)}`);
    const bilingual = page.bilingual !== false;
    for (const lang of bilingual ? LANGS : ["de"]) {
      const loc = page.locales?.[lang];
      const where = `${key}/${lang}`;
      if (!loc || !loc.slug) {
        // Entwurf ohne Slug (z. B. EN noch nicht übersetzt): nicht platzierbar, überspringen.
        console.warn(`[cms] ${where}: kein slug, Seite wird nicht gebaut`);
        continue;
      }
      if (!SLUG.test(loc.slug)) throw new Error(`content: ${where}: ungültiger slug ${JSON.stringify(loc.slug)}`);
      const blocks = loc.blocks ?? [];
      if (!Array.isArray(blocks)) throw new Error(`content: ${where}: blocks ist kein Array`);
      blocks.forEach((b, i) => {
        if (!BLOCK_TYPES.includes(b?.blockType)) {
          throw new Error(`content: ${where}: blocks[${i}] unbekannter blockType ${JSON.stringify(b?.blockType)}`);
        }
        checkImages(b, `${where}/blocks[${i}]`, known);
      });
      if ((frame === "subpage" || frame === "subpageTabs") && !chrome?.[lang]?.subnav) {
        throw new Error(`content: ${where}: frame ${frame} braucht chrome.${lang}.subnav`);
      }
      const permalink = permalinkFor(lang, loc.slug);
      if (permalinks.has(permalink)) {
        throw new Error(`content: Permalink ${permalink} doppelt (${permalinks.get(permalink)} und ${where})`);
      }
      permalinks.set(permalink, where);
      out.push({
        ...loc,
        blocks,
        lang,
        translationKey: key,
        bilingual,
        noindex: !!page.noindex,
        minimalHeader: !!page.minimalHeader,
        structuredData: page.structuredData ?? "none",
        frame,
        permalink,
      });
    }
  }
  return out;
}
