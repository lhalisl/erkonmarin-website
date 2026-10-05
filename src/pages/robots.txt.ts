import type { APIRoute } from 'astro';

const FALLBACK = 'https://erkonmarin.com';

export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('/sitemap.xml', site ?? FALLBACK).href;
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
