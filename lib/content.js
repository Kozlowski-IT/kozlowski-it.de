// Liest den CMS-Export (content/*.json) für den Eleventy-Build.
// Verzeichnis: env CONTENT_DIR (relativ zum Repo-Root oder absolut), Default <repo>/content.
// Bewusst AUSSERHALB von src/_data: alles dort würde Eleventy als globale Daten laden.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const LEGACY_DIR = join(REPO_ROOT, "src/_data/legacy");

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

/** content/<rel>, sonst Fallback src/_data/legacy/<legacyRel> (bis Task 8). */
export function readContentOrLegacy(rel, legacyRel) {
  return readContent(rel) ?? readJson(join(LEGACY_DIR, legacyRel));
}

export const loadSite = () => readContentOrLegacy("site.json", "site.json");

/** chrome.json = { de: {...}, en: {...} }; Legacy: i18n/de.json + i18n/en.json. */
export function loadChrome() {
  const chrome = readContent("chrome.json");
  if (chrome) return chrome;
  return Object.fromEntries(LANGS.map((l) => [l, readJson(join(LEGACY_DIR, `i18n/${l}.json`))]));
}

/**
 * publicPath erneut prüfen (gleiche Regeln wie cms/src/collections/Media.ts):
 * beginnt mit /assets/, kein "..", kein Backslash, kein NUL. Wirft sonst.
 */
export function assertPublicPath(p, where) {
  const ok =
    typeof p === "string" && p.startsWith("/assets/") && !p.includes("..") && !p.includes("\\") && !p.includes("\0");
  if (!ok) throw new Error(`content: ungültiger publicPath ${JSON.stringify(p)} (${where})`);
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
    assertPublicPath(m?.publicPath, where);
    const file = m.file;
    if (typeof file !== "string" || !/^[^/\\\0]+$/.test(file) || file === "." || file === "..") {
      throw new Error(`content: ungültiger Dateiname ${JSON.stringify(file)} (${where})`);
    }
    const src = join(contentDir(), "media", file);
    if (!existsSync(src)) throw new Error(`content: Mediendatei fehlt: ${src} (${where})`);
    if (seen.has(m.publicPath) && seen.get(m.publicPath) !== file) {
      throw new Error(`content: publicPath ${m.publicPath} doppelt vergeben (${where})`);
    }
    seen.set(m.publicPath, file);
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
    assertPublicPath(node.publicPath, where);
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
