// Eleventy rendert CMS-Seiten aus content/*.json (Task 5).
// Baut einmal mit den Fixtures (CONTENT_DIR=test/fixtures/content, nur CMS-Seiten)
// nach .test-site/ und prüft das erzeugte HTML.
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const FIXTURES = join(ROOT, "test/fixtures/content");
const OUT = join(ROOT, ".test-site");
const DOMAIN = "https://kozlowski-it.de";
const TMP = process.env.TMPDIR || tmpdir();

function eleventy(output, env) {
  rmSync(output, { recursive: true, force: true });
  return spawnSync(process.execPath, [join(ROOT, "node_modules/@11ty/eleventy/cmd.cjs"), `--output=${output}`, "--quiet"], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

const html = (url) => readFileSync(join(OUT, url, url.endsWith(".html") ? "" : "index.html"), "utf8");
const $ = (url) => cheerio.load(html(url));

function walkHtml(dir) {
  return readdirSync(dir).flatMap((e) => {
    const full = join(dir, e);
    return statSync(full).isDirectory() ? walkHtml(full) : e.endsWith(".html") ? [full] : [];
  });
}

before(() => {
  const r = eleventy(OUT, { CONTENT_DIR: FIXTURES, LEGACY_PAGES: "off" });
  assert.equal(r.status, 0, `Eleventy-Build fehlgeschlagen:\n${r.stdout}\n${r.stderr}`);
});

test("/ und /en/ existieren mit lang de/en", () => {
  assert.equal($("/")("html").attr("lang"), "de");
  assert.equal($("/en/")("html").attr("lang"), "en");
  assert.equal($("/en/it-care/")("html").attr("lang"), "en");
  assert.equal($("/")("html").attr("data-translation-key"), "home");
  assert.equal($("/")("html").attr("data-bilingual"), "true");
  // wirklich die CMS-Seite (nicht die Legacy-Vorlage)
  assert.match($("/")("title").text(), /^Fixture-Start/);
  assert.equal($("/en/")("title").text(), "Fixture home");
  assert.equal($("/en/it-care/")("title").text(), "IT care · Fixture");
});

test("hreflang-Links zeigen gegenseitig aufeinander", () => {
  assert.equal($("/it-betreuung/")("title").text(), "IT-Betreuung · Fixture");
  const alt = (url, lang) => $(url)(`link[rel=alternate][hreflang=${lang}]`).attr("href");
  assert.equal(alt("/", "en"), `${DOMAIN}/en/`);
  assert.equal(alt("/", "de"), `${DOMAIN}/`);
  assert.equal(alt("/en/", "de"), `${DOMAIN}/`);
  assert.equal(alt("/en/", "en"), `${DOMAIN}/en/`);
  assert.equal(alt("/it-betreuung/", "en"), `${DOMAIN}/en/it-care/`);
  assert.equal(alt("/en/it-care/", "de"), `${DOMAIN}/it-betreuung/`);
  // Sprachumschalter im Header
  assert.equal($("/it-betreuung/")("a.lang").attr("href"), "/en/it-care/");
  assert.equal($("/en/it-care/")("a.lang").attr("href"), "/it-betreuung/");
  // nicht-bilinguale Seite: kein hreflang
  assert.equal($("/impressum/")("link[rel=alternate]").length, 0);
  assert.equal($("/impressum/")("html").attr("data-bilingual"), "false");
});

test("Fixture-Text <script>alert(1)</script> & \"x\" erscheint nur escaped", () => {
  for (const f of walkHtml(OUT)) {
    assert.ok(!readFileSync(f, "utf8").includes("<script>alert(1)</script>"), `unescaped in ${f}`);
  }
  const h = html("/");
  assert.ok(h.includes("<h1>&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot;</h1>"), "h1 escaped");
  assert.ok(h.includes("<title>Fixture-Start &lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot;</title>"), "title escaped (einfach)");
  // Rich-Text aus dem Export bleibt HTML (| safe), Entities werden nicht doppelt escaped
  assert.ok(h.includes('<p class="claim">Betreuung &amp; Server.</p>'), "claim als Rich-Text");
});

test("Seite mit contactForm bindet contact.js ein, ohne nicht; vmwareCalculator → vmware-rechner.js", () => {
  assert.match(html("/"), /<script src="\/assets\/js\/contact\.js(\?v=[0-9a-f]+)?" defer><\/script>/);
  assert.match(html("/en/"), /contact\.js/);
  assert.doesNotMatch(html("/it-betreuung/"), /contact\.js/);
  assert.doesNotMatch(html("/it-betreuung/"), /vmware-rechner\.js/);
  assert.match(html("/vmware-ausstieg/"), /vmware-rechner\.js/);
  assert.doesNotMatch(html("/vmware-ausstieg/"), /contact\.js/);
});

test("Meta: title/description/og/robots/JSON-LD/minimalHeader", () => {
  const d = $("/");
  assert.equal(d('meta[name=description]').attr("content"), "Fixture-Beschreibung");
  assert.equal(d('meta[property="og:title"]').attr("content"), "OG-Titel DE");
  assert.equal(d('meta[property="og:description"]').attr("content"), "Fixture-Beschreibung");
  assert.equal(d('meta[property="og:url"]').attr("content"), `${DOMAIN}/`);
  assert.equal(d('link[rel=canonical]').attr("href"), `${DOMAIN}/`);
  assert.equal(d('script[type="application/ld+json"]').length, 1);
  assert.equal($("/en/it-care/")('script[type="application/ld+json"]').length, 0);
  assert.equal(d("meta[name=robots]").length, 0);
  assert.equal($("/impressum/")("meta[name=robots]").attr("content"), "noindex");
  assert.ok($("/vmware-ausstieg/")("header.site.minimal").length === 1);
  assert.ok(d("header.site.minimal").length === 0);
  const sitemap = readFileSync(join(OUT, "sitemap.xml"), "utf8");
  assert.ok(sitemap.includes(`<loc>${DOMAIN}/en/it-care/</loc>`));
  assert.ok(!sitemap.includes(`<loc>${DOMAIN}/impressum/</loc>`), "noindex nicht in Sitemap");
});

test("Seitenrahmen (frame) + Subnav/Tabs aus chrome.subnav", () => {
  const home = $("/");
  assert.equal(home("main#main").attr("class"), undefined);
  assert.equal(home('section[data-section-key="hero"] > div.wrap').length, 1);
  assert.equal(home('section[data-section-key="leistungen"] > div.wrap > div.why > h3').text(), "Server");

  const sub = $("/it-betreuung/");
  assert.equal(sub("main#main").attr("class"), "wrap");
  assert.equal(sub("main > div.subnav > a.subnav-home").attr("href"), "/");
  assert.equal(sub("main > div.subnav > a.subnav-home").text(), "‹ Startseite");
  assert.equal(sub("nav.page-tabs").length, 0);
  assert.equal($("/en/it-care/")("a.subnav-home").text(), "‹ Home");
  assert.equal($("/en/it-care/")("a.subnav-home").attr("href"), "/en/");

  const tabs = $("/demos/");
  assert.equal(tabs("nav.page-tabs").attr("aria-label"), "Bereich wechseln");
  assert.equal(tabs("nav.page-tabs a.tab.active").attr("href"), "/demos/");
  assert.equal(tabs("nav.page-tabs a.tab.active").attr("aria-current"), "page");
  assert.equal(tabs("nav.page-tabs a.tab:not(.active)").text(), "Projekte & Referenzen");
  assert.ok(html("/demos/").includes("Projekte &amp; Referenzen"));
  assert.equal($("/en/demos/")("nav.page-tabs a.tab.active").attr("href"), "/en/demos/");

  assert.equal($("/vmware-ausstieg/")("main#main").attr("class"), "wrap lp");
  assert.equal($("/vmware-ausstieg/")("div.subnav").length, 0);
  const legal = $("/impressum/");
  assert.equal(legal("main#main").attr("class"), "legal");
  assert.equal(legal("main > h1").text(), "Impressum");
  assert.equal(legal("main section").length, 0);
});

test("Sections: data-section-key immer, id nur bei anchorId", () => {
  const d = $("/");
  assert.deepEqual(d("[data-section-key]").map((_, e) => d(e).attr("data-section-key")).get(), ["hero", "sicherheitscheck", "leistungen", "kontakt"]);
  assert.equal(d('section[data-section-key="hero"]').attr("id"), undefined);
  assert.equal(d('section[data-section-key="hero"]').attr("class"), "hero");
  assert.equal(d('section[data-section-key="sicherheitscheck"]').attr("id"), "sicherheitscheck");
  assert.equal($("/en/")('section[data-section-key="sicherheitscheck"]').attr("id"), "security-check");
  assert.equal(d('section[data-section-key="kontakt"]').attr("class"), "contact");
});

test("Block-Markup: hero/text/cards/steps/faq/ctaBar/figure/contactForm/vmwareCalculator", () => {
  const d = $("/");
  const hero = d('section.hero');
  assert.equal(hero.find("img.portrait").attr("src"), "/assets/media/fixture-portrait.png");
  assert.equal(hero.find("img.portrait").attr("alt"), "Porträt von Pascal Kozlowski");
  assert.equal(hero.find("img.portrait").attr("width"), "132");
  assert.equal(hero.find("img.portrait").attr("fetchpriority"), "high");
  assert.equal($("/en/")("img.portrait").attr("alt"), "Portrait from media", "Fallback media.alt");
  assert.equal(hero.find("p.eyebrow.hero-eyebrow").text(), "IT-Betreuung · Fixture");
  assert.equal(hero.find("ul.hero-trust > li").length, 2);
  assert.equal(hero.find("div.cta-row > a.btn.primary.big").attr("href"), "#sicherheitscheck");

  const callout = d('section#sicherheitscheck > div.wrap > div.callout');
  assert.equal(callout.find("p.callout-sub").text(), "Ein kleiner erster Schritt.");
  assert.equal(callout.find("p.lead").text(), "Ich komme zu Ihnen.");
  assert.equal(callout.find("ul.why-points > li").length, 2);
  assert.ok(!html("/").includes("list-bullet"), "Lexical-Listenklasse entfernt");
  assert.ok(!/<li\s[^>]*value=/.test(html("/")), "Lexical-li-Attribute entfernt");
  assert.equal(callout.find("p.callout-note").text(), "Der Umfang ist klein.");
  assert.equal(callout.find("p.card-cta > a.btn.primary.big").attr("href"), "#kontakt");
  assert.equal(d("div.why a.card-link").attr("href"), "/vmware-ausstieg/");
  assert.equal(d('section#leistungen p.trust-bar').text(), "Monatspakete · Festpreise");

  const form = d("section.contact form.contact-form");
  assert.equal(form.attr("data-contact-error"), "Bitte E-Mail oder Telefon angeben.");
  assert.equal(form.find('select[name=art] option').eq(1).text(), "IT-Betreuung & Sicherheit");
  assert.equal(d("section.contact div.booking").attr("data-booking-url"), "https://cal.kozlowski-it.de/erstgespraech");
  assert.equal(d("section.contact p.plain-mail strong").text(), "0162 8213267");

  const sub = $("/it-betreuung/");
  assert.equal(sub("section.demos-intro > h1").text(), "IT-Betreuung & Infrastruktur");
  assert.equal(sub("section.demos-intro > p.lead").text(), "Für alle ohne IT-Abteilung.");
  assert.equal(sub("section.demos-intro > p.note > span[aria-hidden=true]").text(), "ℹ️");
  const arts = sub('section[data-section-key="preis"] div.fields > article');
  assert.equal(arts.eq(0).attr("class"), "field");
  assert.equal(arts.eq(0).find("p.eyebrow").attr("class"), "eyebrow infra");
  assert.equal(arts.eq(1).attr("class"), "field dev");
  assert.equal(arts.eq(2).attr("class"), "field");
  assert.equal(sub('section[data-section-key="preis"] > p.lead').text(), "Kein Stundenzählen.");
  assert.equal(sub('section[data-section-key="ablauf"] article.field > p.eyebrow.infra').text(), "1 · Erstgespräch");
  assert.equal(sub('section[data-section-key="ablauf"] article.field > p.card-desc').text(), "Wir klären Ziel.");
  assert.equal(sub("section#faq details summary").text(), "Was kostet das?");
  assert.equal(sub("section#faq details p em").text(), "bevor");
  assert.equal(sub("section.end-cta > div.cta-row.center > a").attr("href"), "/#kontakt");

  const demos = $("/demos/");
  const demo = demos("section.demo-list > article.demo");
  assert.equal(demo.find("a.demo-shot").attr("target"), "_blank");
  assert.equal(demo.find("a.demo-shot img").attr("alt"), "FlowGate: Board");
  assert.equal(demo.find("p.demo-sub span.oss-tag").text(), "Open Source");
  assert.equal(demo.find("div.demo-chips span.chip").length, 2);
  assert.equal(demo.find("div.demo-actions a.btn.primary").attr("rel"), "noopener");

  const lp = $("/vmware-ausstieg/");
  assert.equal(lp("section.lp-hero > p.lead").length, 2);
  assert.equal(lp("section.lp-hero > p.cta-row > a").attr("href"), "#rechner");
  assert.equal(lp("section.lp-hero > p.source-note a").attr("rel"), "noopener nofollow");
  assert.equal(lp("section.rechner-wrap#rechner form#vmware-rechner").length, 1);
  assert.equal(lp("#r-edition option[value=vvf]").attr("selected"), "selected");
  assert.equal(lp("#r-rechnen").text(), "Rechnen");
  assert.equal(lp("section.lp-beleg > img").attr("src"), "/assets/media/fixture-portrait.png");
  assert.equal(lp("section.lp-beleg > p.r-hint").text(), "Sobald die erste Migration fertig ist.");
  const cta = lp("section.end-cta").children();
  assert.equal(cta.eq(0).attr("class"), "cta-row center", "buttonsFirst");
});

test("Medien: content/media/<file> liegt in der Ausgabe unter publicPath", () => {
  const out = join(OUT, "assets/media/fixture-portrait.png");
  assert.ok(existsSync(out), "Mediendatei fehlt in der Ausgabe");
  assert.equal(readFileSync(out, "utf8"), readFileSync(join(FIXTURES, "media/fixture-portrait-1.png"), "utf8"));
});

function fixtureCopy(mutate) {
  const dir = mkdtempSync(join(TMP, "cms-fixture-"));
  cpSync(FIXTURES, dir, { recursive: true });
  mutate(dir);
  return dir;
}

// Baut eine veränderte Fixture-Kopie; liefert das spawnSync-Ergebnis (+ Ausgabeordner bleibt bis cleanup()).
function buildVariant(mutate, { prepareOut } = {}) {
  const dir = fixtureCopy(mutate);
  const out = mkdtempSync(join(TMP, "cms-out-"));
  if (prepareOut) {
    prepareOut(out);
  } else {
    rmSync(out, { recursive: true, force: true });
  }
  const r = spawnSync(process.execPath, [join(ROOT, "node_modules/@11ty/eleventy/cmd.cjs"), `--output=${out}`, "--quiet"], {
    cwd: ROOT,
    env: { ...process.env, CONTENT_DIR: dir, LEGACY_PAGES: "off" },
    encoding: "utf8",
  });
  r.out = out;
  r.cleanup = () => {
    rmSync(dir, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  };
  return r;
}

const setMedia = (entries) => (d) => writeFileSync(join(d, "media/index.json"), JSON.stringify(entries));
const failsWith = (r, re) => {
  r.cleanup();
  assert.notEqual(r.status, 0, `Build hätte scheitern müssen:\n${r.stdout}`);
  assert.match(r.stdout + r.stderr, re);
};

for (const bad of [
  "/etc/passwd.png",
  "/assets/../../x.png",
  "/assets\\media\\x.png",
  "/assets/media/x\u0000.png",
  "/assets/js/evil.png",
  "/assets/css/x.png",
  "/assets/fonts/x.png",
  "/assets/js/evil.js",
  "/assets/media/x.svg",
  "/assets/media/x.html",
  "/assets/media/x.webp", // Endung passt nicht zur Datei (.png)
]) {
  test(`ungültiger publicPath ${JSON.stringify(bad)} in media/index.json bricht den Build ab`, () => {
    failsWith(buildVariant(setMedia([{ file: "fixture-portrait-1.png", publicPath: bad }])), /publicPath/);
  });
}

test("ungültiger publicPath in einem Block-Bild bricht den Build ab", () => {
  const r = buildVariant((d) => {
    const p = join(d, "pages.json");
    writeFileSync(p, readFileSync(p, "utf8").replaceAll('"publicPath": "/assets/media/fixture-portrait.png"', '"publicPath": "/assets/../secret.png"'));
  });
  failsWith(r, /publicPath/);
});

test("Kollision mit abweichender Repo-Datei (assets/-Passthrough) bricht den Build ab", () => {
  const r = buildVariant((d) => {
    writeFileSync(join(d, "media/avatar-x.webp"), "nicht das echte Bild");
    setMedia([
      { file: "fixture-portrait-1.png", publicPath: "/assets/media/fixture-portrait.png" },
      { file: "avatar-x.webp", publicPath: "/assets/img/avatar2.webp" },
    ])(d);
  });
  failsWith(r, /kollidiert|anderem Inhalt/);
});

test("Kollision mit byte-identischer Repo-Datei (migriertes Bestandsbild, R3) ist erlaubt", () => {
  const r = buildVariant((d) => {
    cpSync(join(ROOT, "assets/img/avatar2.webp"), join(d, "media/avatar2-1.webp"));
    setMedia([
      { file: "fixture-portrait-1.png", publicPath: "/assets/media/fixture-portrait.png" },
      { file: "avatar2-1.webp", publicPath: "/assets/img/avatar2.webp" },
    ])(d);
  });
  const ok = r.status === 0;
  const same = ok && readFileSync(join(r.out, "assets/img/avatar2.webp")).equals(readFileSync(join(ROOT, "assets/img/avatar2.webp")));
  r.cleanup();
  assert.ok(ok, `${r.stdout}\n${r.stderr}`);
  assert.ok(same);
});

test("abweichende Datei schon im Ausgabeordner am Medien-Ziel bricht den Build ab", () => {
  const r = buildVariant(() => {}, {
    prepareOut: (out) => {
      mkdirSync(join(out, "assets/media"), { recursive: true });
      writeFileSync(join(out, "assets/media/fixture-portrait.png"), "fremd");
    },
  });
  failsWith(r, /anderem Inhalt/);
});

for (const bad of ["javascript:alert(1)", "JavaScript:alert(1)", " javascript:alert(1)", "java\tscript:alert(1)", "data:text/html,x", "//evil.example", "/\\evil.example", "vbscript:x"]) {
  test(`Button-href ${JSON.stringify(bad)} bricht den Build ab`, () => {
    const r = buildVariant((d) => {
      const p = join(d, "pages.json");
      const pages = JSON.parse(readFileSync(p, "utf8"));
      pages.find((x) => x.translationKey === "it-betreuung").locales.de.blocks.at(-1).buttons[0].href = bad;
      writeFileSync(p, JSON.stringify(pages));
    });
    failsWith(r, /unerlaubtes Link-Ziel/);
  });
}

test("Tab-URL / Nav-URL aus chrome.json mit javascript: bricht den Build ab", () => {
  for (const mutate of [
    (c) => (c.de.subnav.tabs[1].url = "javascript:alert(1)"),
    (c) => (c.de.nav.items[0].url = "javascript:alert(1)"),
  ]) {
    const r = buildVariant((d) => {
      const p = join(d, "chrome.json");
      const c = JSON.parse(readFileSync(p, "utf8"));
      mutate(c);
      writeFileSync(p, JSON.stringify(c));
    });
    failsWith(r, /unerlaubtes Link-Ziel/);
  }
});

test("ohne content/: Legacy-Seiten bauen weiter (site/i18n aus legacy/), CMS-Pagination erzeugt nichts", () => {
  const out = join(TMP, `cms-legacy-${process.pid}`);
  const r = eleventy(out, { CONTENT_DIR: join(TMP, "gibt-es-nicht") });
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
  const d = cheerio.load(readFileSync(join(out, "index.html"), "utf8"));
  assert.equal(d("html").attr("lang"), "de");
  assert.equal(d("a.skip").text(), "Zum Inhalt springen");
  assert.equal(d('meta[property="og:url"]').attr("content"), `${DOMAIN}/`);
  assert.equal(cheerio.load(readFileSync(join(out, "en/index.html"), "utf8"))("a.lang").attr("href"), "/");
  rmSync(out, { recursive: true, force: true });
});
