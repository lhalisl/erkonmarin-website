import type { APIRoute } from 'astro';
import { LANGS, routes } from '../i18n';
import { services, serviceHref } from '../data/services';

// Every page in both languages, each entry naming its translations (hreflang).
// The site URL comes from astro.config (SITE_URL, or Vercel's production domain).
const FALLBACK = 'https://erkonmarin.com';

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL(FALLBACK);
  const abs = (path: string) => new URL(path, base).href;
  const pairs = [
    ...Object.values(routes).map((r) => ({ tr: r.tr, en: r.en })),
    ...services.map((s) => ({ tr: serviceHref(s, 'tr'), en: serviceHref(s, 'en') })),
  ];
  const entries = pairs.flatMap((pair) =>
    LANGS.map(
      (lang) => `  <url>
    <loc>${abs(pair[lang])}</loc>
    <xhtml:link rel="alternate" hreflang="tr" href="${abs(pair.tr)}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${abs(pair.en)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(pair.tr)}"/>
  </url>`,
    ),
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
