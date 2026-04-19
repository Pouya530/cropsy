#!/usr/bin/env node
/**
 * Cropsy demo server — Node.js
 * Serves marketing homepage and interactive formation previews for crop circle designers.
 */

const http = require("http");
const net = require("net");
const { readFileSync, existsSync, statSync } = require("fs");
const { join, resolve, sep, extname } = require("path");

/** Bind all interfaces so localhost / 127.0.0.1 both work; override with HOST=127.0.0.1 */
const HOST = process.env.HOST || "0.0.0.0";
const USER_SET_PORT =
  process.env.PORT !== undefined && process.env.PORT !== "";
/** Shown in footer; updated when listen() succeeds */
let boundPort = 3000;
const ROOT = __dirname;
const PUBLIC_DIR = join(ROOT, "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

/** Set SITE_ORIGIN (e.g. https://yourdomain.com) in production for correct canonical & OG URLs. */
function getSiteOrigin(req) {
  const env = process.env.SITE_ORIGIN && String(process.env.SITE_ORIGIN).trim();
  if (env && /^https?:\/\//i.test(env)) {
    return env.replace(/\/$/, "");
  }
  const host = req.headers.host || `127.0.0.1:${boundPort}`;
  const proto = req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  return `${proto}://${host}`;
}

function absoluteUrl(origin, pathname) {
  const p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${origin}${p}`;
}

function escapeHtmlAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const OG_IMAGE_PATH = "/og-cropsy-default.png";
const OG_IMAGE_W = "1376";
const OG_IMAGE_H = "768";

function metaTagsBlock(opts) {
  const {
    origin,
    title,
    description,
    path,
    imagePath = OG_IMAGE_PATH,
    robots,
    skipImage,
  } = opts;
  const pageUrl = absoluteUrl(origin, path);
  const img = skipImage ? null : absoluteUrl(origin, imagePath);
  const safeTitle = escapeHtmlAttr(title);
  const safeDesc = escapeHtmlAttr(description);
  const robotsContent =
    robots || "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
  let out = `
  <meta name="description" content="${safeDesc}" />
  <link rel="canonical" href="${escapeHtmlAttr(pageUrl)}" />
  <link rel="icon" href="${escapeHtmlAttr(absoluteUrl(origin, OG_IMAGE_PATH))}" type="image/png" />
  <meta name="robots" content="${escapeHtmlAttr(robotsContent)}" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="en_GB" />
  <meta property="og:url" content="${escapeHtmlAttr(pageUrl)}" />
  <meta property="og:site_name" content="Cropsy" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />`;
  if (img) {
    out += `
  <meta property="og:image" content="${escapeHtmlAttr(img)}" />
  <meta property="og:image:width" content="${OG_IMAGE_W}" />
  <meta property="og:image:height" content="${OG_IMAGE_H}" />
  <meta property="og:image:alt" content="${escapeHtmlAttr(`${title} — preview`)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${escapeHtmlAttr(img)}" />`;
  } else {
    out += `
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />`;
  }
  out += `
  <meta name="theme-color" content="#0a120e" />`;
  return out.trim();
}

function jsonLdWelcomeBundle(origin, title, description) {
  const homeUrl = absoluteUrl(origin, "/");
  const logoUrl = absoluteUrl(origin, OG_IMAGE_PATH);
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Nocturnal Cloud Ltd",
      url: "https://nocturnal.cloud/",
      logo: logoUrl,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Cropsy",
      url: homeUrl,
      description:
        "Browser studio for crop circle designers — formation presets, grass and rings previews, cymatics-style plate.",
      publisher: { "@type": "Organization", name: "Nocturnal Cloud Ltd" },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description,
      url: homeUrl,
      isPartOf: { "@type": "WebSite", name: "Cropsy", url: homeUrl },
    },
  ];
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

function jsonLdWebApplication(origin, cfg) {
  const pageUrl = absoluteUrl(origin, cfg.path);
  const data = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: cfg.title,
    description: cfg.description,
    url: pageUrl,
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript. WebGL recommended for previews.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
    isPartOf: { "@type": "WebSite", name: "Cropsy", url: absoluteUrl(origin, "/") },
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

const SIM_HTML_SEO = {
  "grass-crop-circle.html": {
    title: "Cropsy — Grass field formation designer",
    description:
      "Plan crop formations in a live grass preview: geometry presets, path width, scale, wind, flatten maps, and blade density.",
    path: "/grass-crop-circle.html",
  },
  "field.html": {
    title: "Cropsy — Field formation preview (shader)",
    description:
      "Alternate shader grass field with formation presets and readout — compare with the main grass designer.",
    path: "/field.html",
  },
  "crop-circle-3d.html": {
    title: "Cropsy — Aerial rings 3D",
    description:
      "Nested rings and tubes from the same formation presets — clean geometry for aerial-style hierarchy checks.",
    path: "/crop-circle-3d.html",
  },
  "hero-field-embed.html": {
    title: "Cropsy — Hero field embed",
    description: "Decorative bird's-eye grass field animation for the marketing hero.",
    path: "/hero-field-embed.html",
    robots: "noindex, nofollow",
    skipImage: true,
    skipJsonLd: true,
  },
};

const DEMO_LAB_SEO = {
  title: "Cropsy — Cymatics-style plate lab",
  description:
    "Interactive square-plate nodal preview: mode indices, creative Hz labelling for boards and storytelling.",
  path: "/demo/",
};

function injectAfterViewport(html, fragment) {
  const m = html.match(/<meta\s+name="viewport"[^>]*>/i);
  if (!m) return null;
  const insertAt = m.index + m[0].length;
  return html.slice(0, insertAt) + "\n  " + fragment + html.slice(insertAt);
}

function injectSeoIntoPublicHtml(filename, html, origin) {
  const cfg = SIM_HTML_SEO[filename];
  if (!cfg) return null;
  const block = metaTagsBlock({
    origin,
    title: cfg.title,
    description: cfg.description,
    path: cfg.path,
    robots: cfg.robots,
    skipImage: cfg.skipImage,
  });
  const json =
    cfg.skipJsonLd ? "" : `\n  ${jsonLdWebApplication(origin, cfg)}`;
  const injected = injectAfterViewport(html, `${block}${json}`);
  return injected;
}

function injectSeoIntoDemoIndex(html, origin) {
  const cfg = DEMO_LAB_SEO;
  const block = metaTagsBlock({
    origin,
    title: cfg.title,
    description: cfg.description,
    path: cfg.path,
  });
  const json = `\n  ${jsonLdWebApplication(origin, cfg)}`;
  return injectAfterViewport(html, `${block}${json}`);
}

function sitemapXml(origin) {
  const paths = [
    { loc: "/", changefreq: "weekly", priority: "1.0" },
    { loc: "/grass-crop-circle.html", changefreq: "weekly", priority: "0.95" },
    { loc: "/crop-circle-3d.html", changefreq: "weekly", priority: "0.85" },
    { loc: "/field.html", changefreq: "weekly", priority: "0.85" },
    { loc: "/demo/", changefreq: "monthly", priority: "0.8" },
  ];
  const last = new Date().toISOString().slice(0, 10);
  const rows = paths
    .map(
      (p) => `  <url>
    <loc>${escapeXml(absoluteUrl(origin, p.loc))}</loc>
    <lastmod>${last}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows}
</urlset>
`;
}

function robotsTxt(origin) {
  const base = origin;
  return `# Cropsy — ${base}
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: CCBot
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`;
}

function llmsTxt(origin) {
  const b = origin;
  return `# Cropsy

> Browser studio for crop circle designers: formation presets, tunable grass and rings previews, and a cymatics-style plate lab.

## Key pages

- [Home / marketing](${b}/): Product overview, workflow, honest limits on science vs creative labelling.
- [Grass field designer](${b}/grass-crop-circle.html): Main interactive grass preview — path width, pattern scale, wind, flatten maps.
- [Aerial rings 3D](${b}/crop-circle-3d.html): Torus-and-tube reading of the same presets.
- [Field preview (shader)](${b}/field.html): Alternate grass implementation and readout panel.
- [Cymatics plate lab](${b}/demo/): Square-plate nodal shader preview.

## Organisation

- Built by [Nocturnal Cloud](https://nocturnal.cloud/)

## Notes

- Chladni physics on a real plate is mainstream science; in-app Hz / mode pairings next to crop layouts are interpretive styling for designers, not field instruments.
`;
}

/** Optional: serve raw markdown */
const MD_FILES = [
  "CONTEXT.md",
  "SPEC.md",
  "SPEC-3D-FIELD.md",
  "design.md",
  "crop-catelog.md",
];

/** Reference links on the home page (omit catalog so it does not read as site “menu” navigation). */
const REFERENCE_MD_FILES = MD_FILES.filter((f) => f !== "crop-catelog.md");

function htmlPage(siteOrigin) {
  const welcomeTitle = "Cropsy — Design tools for crop circle makers";
  const welcomeDesc =
    "Cropsy helps crop circle designers plan formations: tweak geometry, field lay, and cymatics-style previews in the browser.";
  const headSeo =
    metaTagsBlock({
      origin: siteOrigin,
      title: welcomeTitle,
      description: welcomeDesc,
      path: "/",
    }) +
    "\n  " +
    jsonLdWelcomeBundle(siteOrigin, welcomeTitle, welcomeDesc);
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-H0JB9SJT0R"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'G-H0JB9SJT0R');
  </script>
  ${headSeo}
  <title>${welcomeTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap" rel="stylesheet" />
  <style>
    :root {
      --maintext: #1E1E1E;
      --greytext: #565656;
      --verylightgrey: #EEE;
      --white: #FFFFFF;
      --credits-grey: #707070;
      --link-grey: #797979;
      --border-grey: #CCC;
      --accent-primary: #E91E63;
      --accent-secondary: #e91ecb;
      --accent-tertiary: #129079;
      --menu-divider: #3E3E3E;
      --menudivider: #3e3e3e;
      --margin-sections: 100px;
      --hero-vignette: linear-gradient(182deg, rgba(0,0,0,0) 48.83%, rgba(0,0,0,0.70) 88.46%),
        linear-gradient(1deg, rgba(0,0,0,0) 65.66%, rgba(0,0,0,0.50) 98.46%);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "DM Sans", system-ui, sans-serif;
      font-size: 16px;
      font-weight: 400;
      color: var(--maintext);
      background: var(--white);
      line-height: 1.5;
    }
    a { color: var(--link-grey); text-decoration: none; }
    a:hover { color: var(--accent-primary); transition: color 0.2s ease-in-out; }
    .innerspacer { position: relative; padding: 56px 20px; max-width: 1120px; margin: 0 auto; }
    @media (min-width: 800px) { .innerspacer { padding: 56px 48px; } }
    .hero {
      min-height: 100vh;
      min-height: 100dvh;
      background-color: #0c1410;
      color: var(--white);
      position: relative;
      overflow: hidden;
      isolation: isolate;
    }
    .hero-webgl-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
      width: 100%;
      height: 100%;
      min-height: 100vh;
      min-height: 100dvh;
    }
    .hero-webgl-bg iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      min-width: 100%;
      min-height: 100%;
      border: none;
      display: block;
      pointer-events: none;
    }
    .hero-bg-scrim {
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      background:
        radial-gradient(ellipse 90% 70% at 70% 35%, rgba(233, 30, 99, 0.11), transparent 58%),
        radial-gradient(ellipse 60% 50% at 20% 80%, rgba(18, 144, 121, 0.1), transparent 52%),
        linear-gradient(180deg, rgba(0, 0, 0, 0.28) 0%, rgba(0, 0, 0, 0.06) 45%, rgba(0, 0, 0, 0.42) 100%),
        linear-gradient(90deg, rgba(0, 0, 0, 0.38) 0%, rgba(0, 0, 0, 0.08) 52%, rgba(0, 0, 0, 0.22) 100%);
    }
    @media (max-width: 959px) {
      .hero-bg-scrim {
        background:
          linear-gradient(180deg, rgba(0, 0, 0, 0.28) 0%, rgba(0, 0, 0, 0.1) 45%, rgba(0, 0, 0, 0.55) 100%),
          linear-gradient(90deg, rgba(0, 0, 0, 0.2) 0%, transparent 62%);
      }
    }
    /* Subtle fade from black when the page loads (hero field then eases in underneath). */
    .hero-fade-in {
      position: absolute;
      inset: 0;
      z-index: 2;
      pointer-events: none;
      background: #000;
      opacity: 1;
      animation: heroFadeFromBlack 1.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
    @media (prefers-reduced-motion: reduce) {
      .hero-fade-in {
        animation-duration: 0.01s;
        opacity: 0;
      }
    }
    @keyframes heroFadeFromBlack {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    .hero-layout {
      position: relative;
      z-index: 3;
      width: 100%;
      max-width: 680px;
      margin: 0 auto;
      box-sizing: border-box;
      min-height: 100vh;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding:
        calc(76px + env(safe-area-inset-top, 0px))
        max(20px, env(safe-area-inset-right, 0px))
        calc(28px + env(safe-area-inset-bottom, 0px))
        max(20px, env(safe-area-inset-left, 0px));
    }
    @media (min-width: 960px) {
      .hero-layout {
        justify-content: center;
        margin: 0;
        margin-left: max(32px, env(safe-area-inset-left, 0px));
        margin-right: auto;
        max-width: min(560px, 42vw);
        padding-top: calc(88px + env(safe-area-inset-top, 0px));
        padding-bottom: calc(48px + env(safe-area-inset-bottom, 0px));
        padding-left: 32px;
        padding-right: 24px;
      }
    }
    /* Mobile: 100dvh tracks dynamic browser chrome and reflows while scrolling (looks like zoom/parallax). Lock to svh. */
    @media (max-width: 959px) {
      .hero,
      .hero-webgl-bg,
      .hero-layout {
        min-height: 100vh;
        min-height: 100svh;
      }
      .hero-webgl-bg iframe {
        min-height: 100vh;
        min-height: 100svh;
      }
    }
    .hero-inner { width: 100%; }
    .hero-actions { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; }
    .hero h1 { text-shadow: 0 2px 24px rgba(0, 0, 0, 0.85); }
    .hero .lede { text-shadow: 0 1px 16px rgba(0, 0, 0, 0.75); }
    .hero h1 {
      font-size: clamp(36px, 5.5vw, 72px);
      font-weight: 600;
      line-height: 1.06;
      letter-spacing: -0.02em;
      margin: 0 0 18px;
    }
    .hero .lede {
      font-size: clamp(17px, 2vw, 21px);
      font-weight: 300;
      line-height: 155%;
      max-width: 560px;
      opacity: 0.93;
      margin: 0 0 28px;
    }
    .hero .mainbutton { color: rgba(255,255,255,0.94); }
    .hero .mainbutton:hover { color: #fff; }
    .mainbutton {
      display: inline-flex;
      align-items: center;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 2.4px;
      text-transform: uppercase;
      color: var(--link-grey);
      border: none;
      background: transparent;
      cursor: pointer;
      padding: 10px 0;
      font-family: inherit;
    }
    .mainbutton::after {
      content: "→";
      margin-left: 8px;
      display: inline-block;
      transition: margin-left 0.25s ease-in-out;
    }
    @media (min-width: 800px) and (hover: hover) and (prefers-reduced-motion: no-preference) {
      .mainbutton:hover::after {
        margin-left: 14px;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .mainbutton::after {
        transition: none;
      }
    }
    .mainbutton--pill {
      border: 1px solid rgba(255, 255, 255, 0.35);
      background: rgba(255, 255, 255, 0.08);
      padding: 12px 22px;
      border-radius: 999px;
      color: rgba(255, 255, 255, 0.95);
    }
    .mainbutton--pill:hover {
      background: rgba(255, 255, 255, 0.14);
      border-color: rgba(255, 255, 255, 0.5);
    }
    .mainbutton--pill::after { content: ""; margin: 0; }
    .sim-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(6px);
    }
    .sim-modal-overlay[hidden] { display: none !important; }
    .sim-modal {
      position: relative;
      width: 100%;
      max-width: 440px;
      max-height: min(90dvh, 640px);
      overflow: auto;
      background: var(--white);
      color: var(--maintext);
      border-radius: 16px;
      padding: 28px 24px 24px;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
    }
    .sim-modal h2 {
      margin: 0 0 18px;
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.02em;
      padding-right: 36px;
    }
    .sim-modal-close {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 40px;
      height: 40px;
      border: none;
      background: transparent;
      font-size: 28px;
      line-height: 1;
      cursor: pointer;
      color: var(--greytext);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sim-modal-close:hover { color: var(--maintext); background: var(--verylightgrey); }
    .sim-option-list { display: flex; flex-direction: column; gap: 12px; }
    .sim-option {
      display: block;
      padding: 16px 18px;
      border-radius: 12px;
      border: 1px solid var(--border-grey);
      text-decoration: none;
      color: inherit;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .sim-option:hover {
      border-color: rgba(18, 144, 121, 0.45);
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.06);
    }
    .sim-option--featured {
      border-color: rgba(18, 144, 121, 0.55);
      background: linear-gradient(145deg, rgba(18, 144, 121, 0.08), rgba(233, 30, 99, 0.05));
      order: -1;
    }
    .sim-option-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--accent-tertiary);
      margin-bottom: 8px;
    }
    .sim-option strong {
      display: block;
      font-size: 17px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .sim-option span.desc {
      display: block;
      font-size: 14px;
      font-weight: 300;
      color: var(--greytext);
      line-height: 1.45;
    }
    .section-title {
      font-size: clamp(26px, 2.8vw, 38px);
      font-weight: 600;
      letter-spacing: -0.02em;
      margin: 0 0 28px;
    }
    .subhead { color: var(--greytext); font-weight: 300; max-width: 680px; margin: -12px 0 36px; font-size: 17px; line-height: 155%; }
    .pillars {
      display: grid;
      gap: 32px;
      grid-template-columns: 1fr;
    }
    @media (min-width: 800px) {
      .pillars { grid-template-columns: repeat(3, 1fr); gap: 28px 24px; }
    }
    .card {
      border-top: 1px solid var(--border-grey);
      padding-top: 18px;
    }
    .card h3 { font-size: 18px; font-weight: 600; margin: 0 0 10px; }
    .card p { margin: 0; color: var(--greytext); font-size: 15px; font-weight: 300; line-height: 152%; }
    .param-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
      margin-top: 8px;
    }
    .param-table th, .param-table td {
      text-align: left;
      padding: 14px 12px;
      border-bottom: 1px solid var(--border-grey);
      vertical-align: top;
    }
    .param-table th {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--greytext);
      font-weight: 600;
      width: 22%;
    }
    .param-table td em { font-style: normal; font-weight: 600; color: var(--maintext); }
    .demo-grid {
      display: grid;
      gap: 20px;
      grid-template-columns: 1fr;
    }
    @media (min-width: 720px) {
      .demo-grid { grid-template-columns: 1fr 1fr; }
    }
    .demo-card {
      border: 1px solid var(--border-grey);
      border-radius: 12px;
      padding: 0;
      overflow: hidden;
      background: var(--white);
      transition: border-color 0.2s, box-shadow 0.2s;
      display: flex;
      flex-direction: column;
    }
    .demo-card:hover {
      border-color: rgba(18, 144, 121, 0.35);
      box-shadow: 0 8px 28px rgba(0,0,0,0.06);
    }
    .demo-card__media-link {
      display: block;
      line-height: 0;
      outline: none;
      background: var(--verylightgrey);
    }
    .demo-card__media-link:focus-visible {
      outline: 2px solid var(--accent-tertiary);
      outline-offset: -2px;
    }
    .demo-card__media {
      aspect-ratio: 71 / 48;
      overflow: hidden;
    }
    .demo-card__media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .demo-card:hover .demo-card__media img {
      transform: scale(1.03);
    }
    @media (prefers-reduced-motion: reduce) {
      .demo-card:hover .demo-card__media img { transform: none; }
    }
    .demo-card__body {
      padding: 24px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .demo-card h3 { margin: 0 0 8px; font-size: 18px; }
    .demo-card p { margin: 0 0 16px; color: var(--greytext); font-size: 14px; font-weight: 300; line-height: 150%; flex: 1; }
    .demo-card a.cta {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--accent-tertiary);
      align-self: flex-start;
    }
    .demo-card a.cta:hover { color: var(--accent-primary); }
    .steps {
      counter-reset: step;
      list-style: none;
      margin: 0;
      padding: 0;
      max-width: 640px;
    }
    .steps li {
      position: relative;
      padding-left: 52px;
      margin-bottom: 28px;
      color: var(--greytext);
      font-weight: 300;
      line-height: 155%;
    }
    .steps li::before {
      counter-increment: step;
      content: counter(step);
      position: absolute;
      left: 0;
      top: 0;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(18, 144, 121, 0.15);
      color: var(--accent-tertiary);
      font-weight: 700;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .steps strong { color: var(--maintext); font-weight: 600; }
    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 4px;
      margin-top: 12px;
    }
    .badge-mainstream { background: rgba(18, 144, 121, 0.15); color: var(--accent-tertiary); }
    .badge-interpretive { background: rgba(25, 118, 210, 0.12); color: #1976d2; }
    .evidence-strip {
      background: var(--verylightgrey);
      border-top: none;
      border-bottom: 1px solid var(--border-grey);
    }
    .evidence-strip .innerspacer { padding-top: 44px; padding-bottom: 44px; }
    .evidence-strip p { max-width: 700px; font-size: 17px; font-weight: 300; line-height: 160%; color: var(--greytext); margin: 0; }
    .muted-section { background: #fafafa; }
    #workflow {
      border-bottom: 1px solid var(--border-grey);
      margin-bottom: 48px;
    }
    footer {
      background: var(--maintext);
      color: var(--white);
      padding: 52px 24px 36px;
    }
    @media (min-width: 800px) { footer { padding: 56px 48px 40px; } }
    footer .grid {
      display: grid;
      gap: 36px;
      grid-template-columns: 1fr;
    }
    @media (min-width: 800px) {
      footer .grid { grid-template-columns: 1.2fr 1fr; }
    }
    footer h4 {
      color: var(--credits-grey);
      font-size: 13px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.35rem;
      margin: 0 0 14px;
    }
    footer p, footer a { color: var(--white); font-size: 14px; }
    footer a { opacity: 0.88; }
    .credits {
      border-top: 1px solid var(--menu-divider);
      margin-top: 40px;
      padding-top: 22px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 12px;
      font-size: 11px;
      text-transform: uppercase;
      color: var(--credits-grey);
    }
    .credits a {
      font-size: inherit;
      color: inherit;
      opacity: 0.92;
    }
    code { font-size: 0.92em; }
  </style>
  <link rel="stylesheet" href="/mobile-nav.css" />
  <style>
    /* Home page: desktop links match pre–mobile-nav bar; sit flush right next to burger */
    #site-header.site-header--home .site-header__end {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 8px 16px;
      margin-left: auto;
      min-width: 0;
    }
    @media (min-width: 800px) {
      #site-header.site-header--home .site-header__end {
        gap: 12px 24px;
        flex-wrap: nowrap;
      }
      #site-header.site-header--home .site-header__end .nav-burger {
        margin-left: 0;
        flex-shrink: 0;
      }
      #site-header.site-header--home .nav--desktop {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 8px 20px;
        row-gap: 8px;
      }
      #site-header.site-header--home .nav--desktop a {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.88);
        opacity: 1;
      }
      #site-header.site-header--home .nav--desktop a:hover {
        color: #ffffff;
      }
    }
    @media (hover: hover) and (min-width: 800px) {
      #site-header.site-header--home .nav--desktop:hover a {
        opacity: 1;
      }
      #site-header.site-header--home .nav--desktop a:hover {
        opacity: 1;
      }
    }
  </style>
</head>
<body class="page-home">
  <header id="site-header" class="site-header site-header--home">
    <a href="/" class="logo logo--home"><span>Cropsy</span></a>
    <div class="site-header__end">
      <nav class="nav--desktop" aria-label="Primary">
        <a href="/grass-crop-circle.html">Grass designer</a>
        <a href="#for-designers">For designers</a>
        <a href="#parameters">Parameters</a>
        <a href="#previews">Live previews</a>
        <a href="#honesty">Note on science</a>
      </nav>
      <button
        type="button"
        class="nav-burger"
        id="nav-burger"
        aria-expanded="false"
        aria-controls="nav-mobile-overlay"
        aria-label="Open menu"
      >
        <span class="nav-burger-icon" aria-hidden="true">
          <span class="nav-burger-line"></span>
          <span class="nav-burger-line"></span>
        </span>
        <span class="nav-burger-label">
          <span class="nav-burger-label--open">Menu</span>
          <span class="nav-burger-label--close">Close</span>
        </span>
      </button>
    </div>
  </header>

  <div
    id="nav-mobile-overlay"
    class="nav-mobile-overlay"
    hidden
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-label="Site navigation"
  >
    <nav class="nav-mobile" aria-label="Mobile and overlay navigation">
      <ul class="nav-mobile-main">
        <li><a href="/grass-crop-circle.html">Grass designer</a></li>
        <li><a href="#for-designers">For designers</a></li>
        <li><a href="#parameters">Parameters</a></li>
        <li><a href="#previews">Live previews</a></li>
        <li><a href="#honesty">Note on science</a></li>
      </ul>
      <div class="nav-mobile-divider" aria-hidden="true"></div>
      <div class="nav-mobile-credits">
        <span class="nav-mobile-credits__by">Cropsy · ${new Date().getFullYear()}</span>
        <a href="https://nocturnal.cloud" rel="noopener noreferrer" target="_blank">Nocturnal Cloud</a>
      </div>
    </nav>
  </div>

  <section class="hero" aria-label="Introduction">
    <div class="hero-webgl-bg" aria-hidden="true">
      <iframe
        src="/hero-field-embed.html"
        title="Decorative bird's-eye grass field preview"
        loading="eager"
        tabindex="-1"
      ></iframe>
      <div class="hero-bg-scrim"></div>
      <div class="hero-fade-in" aria-hidden="true"></div>
    </div>
    <div class="hero-layout">
      <div class="hero-inner">
        <h1>Plan your next formation before you walk the field.</h1>
        <p class="lede">
          <strong>Cropsy</strong> is a browser studio for crop circle designers: start from classic geometry presets,
          tune paths, scale, and how the crop lies in the grass, then compare aerial-style rings, shader fields, and cymatics-inspired previews side by side.
        </p>
        <div class="hero-actions">
          <button type="button" class="mainbutton mainbutton--pill" id="sim-picker-open" aria-haspopup="dialog" aria-controls="sim-picker-dialog">
            Choose simulation
          </button>
        </div>
      </div>
    </div>
  </section>

  <section id="for-designers" class="innerspacer" style="margin-top:var(--margin-sections)">
    <h2 class="section-title">Built for people who draw circles in crops</h2>
    <p class="subhead">
      Whether you storyboard with compass and rope or plan digitally first, these tools turn your layout into something you can orbit, resize, and stress-test visually — without claiming to predict real-world flattening or sound in a field.
    </p>
    <div class="pillars">
      <article class="card">
        <h3>Formation library</h3>
        <p>Flower of Life, Seed of Life, hexagram, Fibonacci spiral, vesica, Metatron-style graphs — swap presets instantly to explore symmetry and ring structure.</p>
      </article>
      <article class="card">
        <h3>Tweak the lay</h3>
        <p>Path width, overall pattern scale, blend speed, blade density and proportions, wind, and flatten intensity — so you can see how bold or subtle a design reads from above.</p>
      </article>
      <article class="card">
        <h3>Multiple lenses</h3>
        <p>Grass shader, metallic rings, and a square-plate nodal shader each emphasise different cues: ground truth illusion, clean geometry, and modal “fingerprint” curiosity.</p>
      </article>
    </div>
  </section>

  <section id="parameters" class="innerspacer muted-section">
    <h2 class="section-title">Parameters you can dial in</h2>
    <p class="subhead">Controls are in the right-hand panel on each preview (or below the scene on phones). This is what you are adjusting today in the live demos.</p>
    <div style="overflow-x:auto">
      <table class="param-table">
        <thead>
          <tr>
            <th>Control</th>
            <th>What it does</th>
            <th>Where</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><em>Formation preset</em></td>
            <td>Switches the entire geometric recipe — rings, polygons, arcs, and guide lines that define where “crop” is laid.</td>
            <td>Grass · Rings · Field</td>
          </tr>
          <tr>
            <td><em>Path width</em></td>
            <td>How wide the trampled or laid corridor reads relative to the blade grid — from hairline to bold avenue.</td>
            <td>Grass — Pattern sampling</td>
          </tr>
          <tr>
            <td><em>Pattern scale</em></td>
            <td>Zooms the formation in the field without changing the camera — useful for crop diameter vs headland.</td>
            <td>Grass — Pattern sampling</td>
          </tr>
          <tr>
            <td><em>Blend speed</em></td>
            <td>How quickly the field morphs when you change preset or width — slower helps compare transitions.</td>
            <td>Grass — Pattern sampling</td>
          </tr>
          <tr>
            <td><em>Blade density / height / width</em></td>
            <td>Resolution of the crop carpet and silhouette of each stem — affects how crisp circles read.</td>
            <td>Grass — Grass &amp; wind</td>
          </tr>
          <tr>
            <td><em>Wind strength &amp; frequency</em></td>
            <td>Motion in standing crop; check readability when blades move.</td>
            <td>Grass — Grass &amp; wind · Atmosphere</td>
          </tr>
          <tr>
            <td><em>Flatten intensity</em></td>
            <td>How strongly laid straw colour and bend apply along paths.</td>
            <td>Grass — Atmosphere</td>
          </tr>
          <tr>
            <td><em>Chladni modes <i>n</i>, <i>m</i></em></td>
            <td>Changes the nodal pattern on the preview plate — a separate visual metaphor, not a measurement of your formation.</td>
            <td>Cymatics 3D — Plate modes</td>
          </tr>
          <tr>
            <td><em>Readout (Hz, symmetry label)</em></td>
            <td>Creative pairing for mood-boarding only — not calibrated to a real plate or field experiment.</td>
            <td>Field — Readout panel</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section id="previews" class="innerspacer">
    <h2 class="section-title">Live simulation previews</h2>
    <p class="subhead">Each runs in your browser. Toggle focus mode from the header on any preview page to hide the panel and study the full frame.</p>
    <div class="demo-grid">
      <article class="demo-card">
        <a class="demo-card__media-link" href="/grass-crop-circle.html" aria-label="Grass field designer — open preview">
          <div class="demo-card__media">
            <img src="/grass.jpg" alt="" width="712" height="480" loading="lazy" decoding="async" />
          </div>
        </a>
        <div class="demo-card__body">
          <h3>Grass field designer</h3>
          <p>Instanced blades with flatten maps along your formation. Best for “how will this read from the air?” and tuning path weight.</p>
          <a class="cta mainbutton" href="/grass-crop-circle.html">Launch grass preview</a>
        </div>
      </article>
      <article class="demo-card">
        <a class="demo-card__media-link" href="/crop-circle-3d.html" aria-label="Aerial rings 3D — open preview">
          <div class="demo-card__media">
            <img src="/preview-rings.svg" alt="" width="712" height="480" loading="lazy" decoding="async" />
          </div>
        </a>
        <div class="demo-card__body">
          <h3>Aerial rings 3D</h3>
          <p>Clean torus-and-tube reading of the same presets — ideal for checking hierarchy of rings and nested geometry.</p>
          <a class="cta mainbutton" href="/crop-circle-3d.html">Launch rings preview</a>
        </div>
      </article>
      <article class="demo-card">
        <a class="demo-card__media-link" href="/field.html" aria-label="Shader field preview — open">
          <div class="demo-card__media">
            <img src="/feild.jpg" alt="" width="712" height="480" loading="lazy" decoding="async" />
          </div>
        </a>
        <div class="demo-card__body">
          <h3>Shader field (alt.)</h3>
          <p>Another grass implementation with pattern picker and readout panel — compare mood and default lighting.</p>
          <a class="cta mainbutton" href="/field.html">Launch field preview</a>
        </div>
      </article>
      <article class="demo-card">
        <a class="demo-card__media-link" href="/demo/" aria-label="Cymatics-style plate — open lab">
          <div class="demo-card__media">
            <img src="/preview-plate.svg" alt="" width="712" height="480" loading="lazy" decoding="async" />
          </div>
        </a>
        <div class="demo-card__body">
          <h3>Cymatics-style plate</h3>
          <p>Square-plate nodal shader plus wireframe stack — play with mode indices for a different design language.</p>
          <a class="cta mainbutton" href="/demo/">Launch plate preview</a>
        </div>
      </article>
    </div>
  </section>

  <section id="workflow" class="innerspacer muted-section">
    <h2 class="section-title">A simple workflow</h2>
    <ol class="steps">
      <li><strong>Pick a base formation</strong> that matches the symmetry story you want (six-fold, spiral, dual centre, and so on).</li>
      <li><strong>Open the grass designer</strong> and adjust path width, scale, and blade settings until the lay matches your intent.</li>
      <li><strong>Cross-check in rings 3D</strong> for pure geometry, then optionally <strong>sketch cymatics modes</strong> in the plate demo for presentation boards.</li>
    </ol>
  </section>

  <div id="honesty" class="evidence-strip">
    <div class="innerspacer">
      <h2 class="section-title" style="margin-bottom:18px">Honest limits</h2>
      <p>
        Real Chladni physics on a metal plate is <strong>solid science</strong>. Matching a crop layout to a plate mode or a frequency in these demos is <strong>creative colour</strong> for designers and storytellers — not evidence about how a formation was made.
        Treat every Hz label and mode pairing as inspiration, not instrumentation.
      </p>
      <span class="badge badge-mainstream" style="margin-top:18px">Plate physics — mainstream science</span>
      <span class="badge badge-interpretive" style="margin-top:12px;margin-left:8px">Pattern ↔ mode in-app — interpretive</span>
    </div>
  </div>

  <footer>
    <div class="grid">
      <div>
        <h4>Cropsy</h4>
        <p>Cropsy is a browser studio for crop circle designers: start from classic geometry presets, tune paths, scale, and how the crop lies in the grass, then compare aerial-style rings, shader fields, and cymatics-inspired previews side by side.</p>
      </div>
      <div>
        <h4>Quick links</h4>
        <p>
          <a href="/grass-crop-circle.html">Grass designer</a><br />
          <a href="/crop-circle-3d.html">Rings 3D</a><br />
          <a href="/field.html">Field</a><br />
          <a href="/demo/">Cymatics plate</a>
        </p>
      </div>
    </div>
    <div class="credits">
      <span>Cropsy · ${new Date().getFullYear()}</span>
      <span>Built by <a href="https://nocturnal.cloud" rel="noopener noreferrer" target="_blank">Nocturnal Cloud</a></span>
    </div>
  </footer>

  <div class="sim-modal-overlay" id="sim-picker-modal" hidden role="presentation">
    <div class="sim-modal" role="dialog" aria-modal="true" aria-labelledby="sim-picker-title" id="sim-picker-dialog">
      <button type="button" class="sim-modal-close" id="sim-picker-close" aria-label="Close dialog">×</button>
      <h2 id="sim-picker-title">Choose a simulation</h2>
      <div class="sim-option-list">
        <a class="sim-option sim-option--featured" href="/grass-crop-circle.html">
          <span class="sim-option-badge">Recommended · Grass</span>
          <strong>Grass field designer</strong>
          <span class="desc">Full grass shader studio — path width, wind, flatten maps. The main Cropsy tool.</span>
        </a>
        <a class="sim-option" href="/crop-circle-3d.html">
          <strong>Aerial rings 3D</strong>
          <span class="desc">Clean torus-and-tube geometry for nested rings.</span>
        </a>
        <a class="sim-option" href="/field.html">
          <strong>Shader field (alternate)</strong>
          <span class="desc">Different grass implementation and readout panel.</span>
        </a>
        <a class="sim-option" href="/demo/">
          <strong>Chladni-style plate</strong>
          <span class="desc">Square-plate nodal preview — creative pairing only.</span>
        </a>
      </div>
    </div>
  </div>
  <script>
(function () {
  var modal = document.getElementById("sim-picker-modal");
  var openBtn = document.getElementById("sim-picker-open");
  var closeBtn = document.getElementById("sim-picker-close");
  var dialog = document.getElementById("sim-picker-dialog");
  if (!modal || !openBtn || !closeBtn) return;
  function openModal() {
    modal.removeAttribute("hidden");
    document.documentElement.style.overflow = "hidden";
    closeBtn.focus();
  }
  function closeModal() {
    modal.setAttribute("hidden", "");
    document.documentElement.style.overflow = "";
    openBtn.focus();
  }
  openBtn.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", function (e) {
    if (e.target === modal) closeModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !modal.hasAttribute("hidden")) closeModal();
  });
  if (dialog) {
    dialog.addEventListener("click", function (e) { e.stopPropagation(); });
  }
})();
 </script>
  <script src="/nav-mobile.js" defer></script>
</body>
</html>`;
}

/**
 * Serves files under public/demo/ only (path traversal rejected).
 */
function servePublicPath(pathname, res, req) {
  if (pathname === "/demo") {
    res.writeHead(302, { Location: "/demo/" });
    res.end();
    return;
  }
  if (!pathname.startsWith("/demo/")) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }
  let sub = pathname.slice("/demo/".length).replace(/^\/+/, "");
  if (!sub) sub = "index.html";
  else if (sub.endsWith("/")) sub += "index.html";

  const demoRoot = resolve(join(PUBLIC_DIR, "demo"));
  const abs = resolve(demoRoot, sub);
  if (!abs.startsWith(demoRoot + sep) && abs !== demoRoot) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }
  const ext = extname(abs).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  let body = readFileSync(abs, "utf8");
  if (ext === ".html" && sub === "index.html" && req) {
    const injected = injectSeoIntoDemoIndex(body, getSiteOrigin(req));
    if (injected) body = injected;
  }
  res.writeHead(200, { "Content-Type": type });
  res.end(body);
}

/** Single-segment files in project public/ (e.g. /grass-crop-circle.html, /sim-theme.css). No subpaths. */
const PUBLIC_ROOT_EXT = new Set([".html", ".md", ".css", ".js", ".mjs", ".svg", ".png", ".ico"]);

function tryServePublicRoot(pathname, res, req) {
  if (!pathname.startsWith("/") || pathname === "/" || pathname.includes("..")) return false;
  const name = pathname.slice(1);
  if (!name || name.includes("/")) return false;
  const pub = resolve(PUBLIC_DIR);
  const abs = resolve(join(PUBLIC_DIR, name));
  if (!abs.startsWith(pub + sep) && abs !== pub) return false;
  if (!existsSync(abs) || !statSync(abs).isFile()) return false;
  const ext = extname(abs).toLowerCase();
  if (!PUBLIC_ROOT_EXT.has(ext)) return false;
  const type = MIME[ext] || "application/octet-stream";
  let body = readFileSync(abs, "utf8");
  if (ext === ".html" && req && SIM_HTML_SEO[name]) {
    const injected = injectSeoIntoPublicHtml(name, body, getSiteOrigin(req));
    if (injected) body = injected;
  }
  res.writeHead(200, { "Content-Type": type });
  res.end(body);
  return true;
}

function findFirstFreePort(startPort, maxAttempts) {
  return new Promise((resolve, reject) => {
    const attempt = (p, tries) => {
      if (tries > maxAttempts) {
        reject(new Error(`No free port in range ${startPort}–${startPort + maxAttempts}`));
        return;
      }
      const probe = net.createServer();
      probe.once("error", (err) => {
        if (err.code === "EADDRINUSE") attempt(p + 1, tries + 1);
        else reject(err);
      });
      probe.listen({ port: p, host: HOST }, () => {
        const addr = probe.address();
        const chosen = addr && typeof addr === "object" ? addr.port : p;
        probe.close(() => resolve(chosen));
      });
    };
    attempt(startPort, 0);
  });
}

function handleRequest(req, res) {
  const host = req.headers.host || `127.0.0.1:${boundPort}`;
  const url = new URL(req.url || "/", `http://${host}`);

  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("ok\n");
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/context.json") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify(
        {
          product: "Cropsy",
          tagline: "Browser studio for crop circle designers — formation presets, tunable field previews, and cymatics-style plates.",
          audience: "Crop circle designers and geometry artists planning formations.",
          port: process.env.VERCEL ? null : boundPort,
          home: "/grass-crop-circle.html",
          marketingPage: "/",
          previews: {
            grassFieldDesigner: "/grass-crop-circle.html",
            aerialRings3d: "/crop-circle-3d.html",
            shaderField: "/field.html",
            chladniStylePlate: "/demo/",
          },
          parameterGroups: [
            {
              name: "Formation",
              controls: ["Preset (Flower of Life, Seed, Hexagram, Fibonacci, Vesica, Metatron-style, …)"],
            },
            {
              name: "Pattern sampling (grass)",
              controls: ["Path width", "Pattern scale", "Blend speed"],
            },
            {
              name: "Grass & wind",
              controls: ["Blade density", "Blade height", "Blade width", "Rebuild field"],
            },
            {
              name: "Atmosphere",
              controls: ["Wind strength", "Wind frequency", "Flatten intensity"],
            },
            {
              name: "Cymatics plate",
              controls: ["Mode n", "Mode m"],
            },
            {
              name: "Field readout (shader field)",
              controls: ["Paired Hz / mode labels — creative only, not calibrated"],
            },
          ],
          honesty:
            "Chladni plate physics is real science; mapping a crop layout to a mode or frequency in these demos is interpretive styling for designers.",
          referenceDocs: REFERENCE_MD_FILES,
          seo: {
            defaultOgImage: OG_IMAGE_PATH,
            sitemapPath: "/sitemap.xml",
            robotsPath: "/robots.txt",
            llmsPath: "/llms.txt",
            siteOriginEnv: "SITE_ORIGIN",
          },
        },
        null,
        2
      )
    );
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/md/")) {
    const file = decodeURIComponent(url.pathname.slice("/md/".length));
    if (!MD_FILES.includes(file)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    const p = join(ROOT, file);
    if (!existsSync(p)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("File missing on disk");
      return;
    }
    const body = readFileSync(p, "utf8");
    res.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8" });
    res.end(body);
    return;
  }

  if (req.method === "GET" && url.pathname === "/sitemap.xml") {
    res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" });
    res.end(sitemapXml(getSiteOrigin(req)));
    return;
  }

  if (req.method === "GET" && url.pathname === "/robots.txt") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(robotsTxt(getSiteOrigin(req)));
    return;
  }

  if (req.method === "GET" && url.pathname === "/llms.txt") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(llmsTxt(getSiteOrigin(req)));
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/demo")) {
    servePublicPath(url.pathname, res, req);
    return;
  }

  if (req.method === "GET" && url.pathname === "/welcome") {
    res.writeHead(301, { Location: "/" });
    res.end();
    return;
  }

  if (
    req.method === "GET" &&
    (url.pathname === "/" || url.pathname === "/index.html")
  ) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(htmlPage(getSiteOrigin(req)));
    return;
  }

  if (req.method === "GET" && tryServePublicRoot(url.pathname, res, req)) return;

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
}

const server = http.createServer(handleRequest);

/** Vercel serverless invokes this export; local `npm start` uses `listen()` below. */
module.exports = handleRequest;

async function start() {
  let portToUse;
  if (USER_SET_PORT) {
    portToUse = Number(process.env.PORT);
    if (!Number.isFinite(portToUse) || portToUse < 1 || portToUse > 65535) {
      console.error("Invalid PORT: use a number 1–65535");
      process.exit(1);
    }
  } else {
    try {
      portToUse = await findFirstFreePort(3000, 40);
    } catch (e) {
      console.error(e.message || e);
      process.exit(1);
    }
  }
  boundPort = portToUse;

  server.once("error", (err) => {
    if (err && err.code === "EADDRINUSE") {
      console.error(
        `Port ${portToUse} is already in use. Try: PORT=${portToUse + 1} npm start`
      );
    } else {
      console.error(err);
    }
    process.exit(1);
  });

  server.listen(portToUse, HOST, () => {
    const addr = server.address();
    if (addr && typeof addr === "object") boundPort = addr.port;
    console.log(`Home (marketing) → http://127.0.0.1:${boundPort}/`);
    console.log(`Grass designer → http://127.0.0.1:${boundPort}/grass-crop-circle.html`);
    console.log(`Previews → rings, field, /demo/`);
    console.log(`Health → http://127.0.0.1:${boundPort}/health`);
    console.log(`context.json → http://127.0.0.1:${boundPort}/api/context.json`);
    console.log(`Listening on ${HOST}:${boundPort} — leave this terminal open while browsing.`);
    console.log(`Static pages from: ${PUBLIC_DIR}`);
    console.log("");
    console.log(
      "Chrome error -102 (ERR_CONNECTION_REFUSED) means nothing is listening: start the server first, then use the same port printed above."
    );
  });
}

if (require.main === module) {
  start();
}
