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

## Structure

```
src/
  data/site.ts              company facts: phones, hours, WhatsApp, social links, nav
  layouts/Base.astro        <head>, fonts, JSON-LD, logo sprite, reveal-on-scroll
  styles/global.css         design tokens, type system (display + serif accent), buttons
  styles/fonts.css          @font-face slots for the licensed Grift and Commune files
  components/
    LogoSprite.astro        vector logo mark (traced from the supplied PNG)
    Header.astro            nav bar (floats as a rounded pill on scroll) + mobile menu
    Stage.astro             hero + four scroll chapters over the 3D scene
    Services.astro          services drawn as a single-line diagram (breakers close on scroll)
    Statement.astro         "why it matters" band on an oscilloscope trace
    Process.astro           the four service steps, numbered
    Audience.astro          who the service is for
    Request.astro           service request form → pre-filled WhatsApp message
    Footer.astro, MobileDock.astro
  scripts/stage/
    ui.ts                   scroll → chapter progress, lazy-loads the engine
    engine.ts               renderer, bloom, camera path, annotations, HUD, adaptive quality
    scene.ts                procedural switchboard / console / automation cabinets
    textures.ts             canvas painters for panel fronts, meters, screens
public/media/
  stage-poster.webp         still of the 3D scene (shown while loading and without WebGL)
  og.jpg                    social share image
```

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

- All marketing copy (hero, chapters, services, process, audience). It describes the stated
  service scope and promises a report at the end of each job; nothing claims years in business,
  vessel counts, certifications, class approvals or client names.
- Which number answers WhatsApp (`src/data/site.ts`, currently +90 549 574 24 24).
- Instagram / Facebook URLs (empty entries are hidden).
- Domain, for canonical and absolute Open Graph URLs.
- An English version, if international ship managers are a target.
- Real project photography for the coming Galeri page.
- Licensed Grift and Commune webfont files (see Typography).

The wordmark is set in Archivo Expanded rather than traced, so it stays sharp at every size;
the mark itself is a vector trace of the supplied logo.
