# Erkon Marin — website

Marketing site for Erkon Marin, a marine electrical and automation service company
(control room, MSB and automation panels: fault finding, maintenance, installation, removal).

Built with [Astro](https://astro.build) as a static site. The hero is a real-time 3D engine
control room (main switchboard, ECR console, automation cabinets) drawn in
[three.js](https://threejs.org). It ships no 3D model files: every panel, meter face and screen
is generated in code.

## Commands

| Command           | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm install`     | Install dependencies                          |
| `npm run dev`     | Dev server at `localhost:4321`                |
| `npm run build`   | Static build into `dist/`                     |
| `npm run preview` | Serve the built site locally                  |
| `npm run check`   | Type-check `.astro` and `.ts` files           |

## Languages

Turkish lives at the site root and English under `/en/` (Astro i18n, `astro.config.mjs`).
Each page is a view in `src/views/` rendered by a thin route file per language
(`src/pages/…` and `src/pages/en/…`). Components read the page language from
`Astro.currentLocale`; shared interface text, routes, section ids and the nav are in
`src/i18n/index.ts`, content in `src/data/` carries both languages. Every page links its
counterpart with `hreflang`, and the header's TR / EN switch goes to the same page in the
other language.

| Turkish | English |
| --- | --- |
| `/` | `/en/` |
| `/hizmetler/` and `/hizmetler/<slug>/` | `/en/services/` and `/en/services/<slug>/` |
| `/hakkimizda/` | `/en/about/` |
| `/iletisim/` | `/en/contact/` |
| `/gizlilik/` | `/en/privacy/` |

The Turkish service and About copy is Erkon Marin's own and is used verbatim; the English is a
translation of it.

## Structure

```
src/
  i18n/index.ts             languages, routes, section ids, nav, shared interface text
  data/                     site facts (phones, e-mail, address, hours), services, about, photos
  views/                    page bodies shared by both languages
  pages/                    route files (Turkish), pages/en/ (English), sitemap.xml, robots.txt
  layouts/Base.astro        <head>, fonts, hreflang, JSON-LD, logo sprite, reveal-on-scroll
  styles/global.css         design tokens, type system (display + serif accent), buttons
  styles/tailwind.css       Tailwind v4 for the React islands (no preflight, scoped scan)
  styles/fonts.css          @font-face slots for the licensed Grift and Commune files
  scripts/inline.mjs        pre-paint inline scripts (hashed into the CSP)
  components/
    LogoSprite.astro        vector logo mark (traced from the supplied PNG)
    Header.astro            nav bar, language switch, mobile menu
    Stage.astro             hero + four scroll chapters over the 3D scene
    WhatWeDo.astro          the four service areas on a horizontal scroll timeline
    Services.astro          types of work drawn as a single-line diagram
    FieldPhotos.astro       justified gallery of the supplied photos
    Statement.astro         "why it matters" band on an oscilloscope trace
    Journey.astro           career rail (About page; home page with the About lead)
    TeamPhoto.astro         team photo with the 35+ badge
    Audience.astro          who the service is for
    Contact.astro           request section: globe, contact list, WhatsApp / e-mail form
    SocialRail.astro        phone, e-mail and Instagram bar fixed to the middle of the right edge
    Footer.astro, MobileDock.astro
    ui/                     shadcn-style React components (timeline, contact-with-globe, button)
  scripts/stage/
    ui.ts                   scroll → chapter progress, lazy-loads the engine
    engine.ts               renderer, bloom, camera path, annotations, HUD, adaptive quality
    scene.ts                procedural switchboard / console / automation cabinets
    textures.ts             canvas painters for panel fronts, meters, screens
public/
  media/stage-poster.webp   still of the 3D scene (shown while loading and without WebGL)
  media/og.jpg, og-en.jpg   social share images (Turkish, English)
  favicon.svg, favicon.ico, apple-touch-icon.png, icon-192/512.png, site.webmanifest
```

## Security

- Content Security Policy from Astro (`security.csp` in `astro.config.mjs`): every script and
  style Astro emits is hashed, the two hand-written pre-paint scripts are hashed from
  `src/scripts/inline.mjs`, and nothing is loaded from another origin (the globe's map data is
  bundled). Inline style attributes stay allowed.
- Headers in `vercel.json`: `frame-ancestors 'none'` / `X-Frame-Options`, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`. Vercel adds HSTS.
- No backend, no cookies, no analytics: the request form builds a message in the browser and
  hands it to WhatsApp or the visitor's e-mail app.

## Deploying (Vercel)

- Framework preset: Astro. Build `npm run build`, output `dist`. Node 22.
- Set `SITE_URL` (e.g. `https://erkonmarin.com`) once the domain is attached; until then the
  production `*.vercel.app` domain is used for canonical, `hreflang`, Open Graph and the sitemap.
- `trailingSlash: true` in `vercel.json` keeps one URL per page.

## Typography

Headlines pair a bold geometric sans (**Grift**) with an italic serif accent word
(**Commune**). In markup, the accent is an `<em>` inside `.display`, `.h2` or `.h3`.
Body copy is Archivo; IBM Plex Mono is kept only for the 3D scene's instrument faces.

Grift and Commune are licensed fonts and are not in the repo yet. Until they are, the stacks
fall back to Urbanist (for Grift) and Fraunces (for Commune). To switch over:

1. Add the webfont files (`.woff2`, with a web licence) to `public/fonts/`.
2. Uncomment the `@font-face` blocks in `src/styles/fonts.css` and match the file names.
3. Check Turkish glyphs (ğ ş ı İ ç ö ü) render in both faces.

## 3D behaviour

- Loads after the page is idle; the poster image covers the gap.
- Falls back to the poster when WebGL2 is unavailable, the browser is rendering in software
  (SwiftShader / llvmpipe, e.g. a blocklisted GPU), or the visitor has Data Saver on.
- Shuts itself down and returns to the poster if frames stay slower than ~11 fps after warm-up.
- Pauses when off-screen or in a background tab.
- Drops pixel ratio, then bloom, if the first two seconds run slowly.
- `prefers-reduced-motion`: no idle drift, blinking or flowing current; the camera still follows scroll.
- URL flags for testing: `?force3d` runs the scene even on a software renderer, `?snap` disables camera easing.

## Content still to confirm with Erkon Marin

The brief supplied only the name, the logo, the service line and the contact details from the
old site. Everything below was written for this build and needs sign-off:

- Marketing copy written for this build (hero, chapters, work types, statement, audience),
  in both languages. The service and About texts are Erkon Marin's own.
- The English translation as a whole, ideally read by someone at Erkon Marin.
- The privacy page (`src/views/PrivacyPage.astro`) against KVKK requirements.
- Which number answers WhatsApp (`src/data/site.ts`, currently +90 549 574 24 24).
- Facebook URL (empty entries are hidden; Instagram is @erkon_marin).
- Domain, for canonical and absolute Open Graph URLs (`SITE_URL`).
- Real project photography for the coming Galeri page.
- Licensed Grift and Commune webfont files (see Typography).

The wordmark is set in Archivo Expanded rather than traced, so it stays sharp at every size;
the mark itself is a vector trace of the supplied logo.
