// @ts-check
import { defineConfig } from 'astro/config';

// Public address, used for canonical and Open Graph URLs. Set SITE_URL once the
// custom domain is live; on Vercel it otherwise falls back to the production domain.
const site =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined);

export default defineConfig({
  site,
  build: { inlineStylesheets: 'auto' },
  devToolbar: { enabled: false },
  vite: {
    build: { chunkSizeWarningLimit: 900 },
  },
});
