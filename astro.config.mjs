// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { createHash } from 'node:crypto';
import { INLINE_SCRIPTS } from './src/scripts/inline.mjs';

/** @param {string} code @returns {`sha256-${string}`} */
const sha256 = (code) => `sha256-${createHash('sha256').update(code).digest('base64')}`;

// Public address, used for canonical and Open Graph URLs. Set SITE_URL once the
// custom domain is live; on Vercel it otherwise falls back to the production domain.
const site =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined);

export default defineConfig({
  site,
  // Turkish at the root, English under /en/ (src/i18n)
  i18n: {
    locales: ['tr', 'en'],
    defaultLocale: 'tr',
    routing: { prefixDefaultLocale: false },
  },
  integrations: [react()],
  // Content Security Policy: Astro hashes every script and style it emits and
  // writes the policy into each page's <head>. Inline style attributes stay
  // allowed (component CSS variables, island markup); nothing loads from
  // another origin. frame-ancestors can't live in a meta tag, so it is sent as
  // a header from vercel.json.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "media-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-src 'none'",
        "manifest-src 'self'",
        "worker-src 'self'",
        'upgrade-insecure-requests',
      ],
      styleDirective: {
        resources: [{ resource: "'self'", kind: 'element' }, { resource: "'unsafe-inline'", kind: 'attribute' }],
      },
      // Astro hashes its own scripts; the hand-written pre-paint ones are added here
      scriptDirective: { resources: ["'self'"], hashes: INLINE_SCRIPTS.map(sha256) },
    },
  },
  build: { inlineStylesheets: 'auto' },
  devToolbar: { enabled: false },
  // no Markdown here; Shiki's inline styles would also clash with the CSP
  markdown: { syntaxHighlight: false },
  vite: {
    plugins: [tailwindcss()],
    build: { chunkSizeWarningLimit: 900 },
  },
});
