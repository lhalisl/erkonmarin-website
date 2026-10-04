// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// Public address, used for canonical and Open Graph URLs. Set SITE_URL once the
// custom domain is live; on Vercel it otherwise falls back to the production domain.
const site =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined);

export default defineConfig({
  site,
  integrations: [react()],
  build: { inlineStylesheets: 'auto' },
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
    build: { chunkSizeWarningLimit: 900 },
  },
});
