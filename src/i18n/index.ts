// Two languages: Turkish at the site root, English under /en/. Components read
// the page language from Astro.currentLocale (see astro.config.mjs → i18n).

export type Lang = 'tr' | 'en';
export const LANGS: Lang[] = ['tr', 'en'];
export const langOf = (locale: string | undefined): Lang => (locale === 'en' ? 'en' : 'tr');
export const otherLang = (lang: Lang): Lang => (lang === 'tr' ? 'en' : 'tr');

/** Equivalent pages in each language. */
export const routes = {
  home: { tr: '/', en: '/en/' },
  services: { tr: '/hizmetler/', en: '/en/services/' },
  about: { tr: '/hakkimizda/', en: '/en/about/' },
  contact: { tr: '/iletisim/', en: '/en/contact/' },
  privacy: { tr: '/gizlilik/', en: '/en/privacy/' },
} as const;
export type RouteKey = keyof typeof routes;
export type Alternates = Record<Lang, string>;
export const alternatesOf = (key: RouteKey): Alternates => ({ ...routes[key] });

/** Section ids on the home page (and the request form on the contact page). */
export const anchors = {
  intro: { tr: 'giris', en: 'intro' },
  systems: { tr: 'sistemler', en: 'systems' },
  services: { tr: 'hizmetler', en: 'services' },
  scope: { tr: 'kapsam', en: 'scope' },
  field: { tr: 'sahadan', en: 'from-the-field' },
  audience: { tr: 'kimler', en: 'who-we-serve' },
  about: { tr: 'hakkimizda', en: 'about' },
  request: { tr: 'talep', en: 'request' },
} as const;
export const anchor = (key: keyof typeof anchors, lang: Lang) => anchors[key][lang];

export const nav = (lang: Lang) =>
  lang === 'tr'
    ? [
        { label: 'Sistemler', href: `/#${anchors.systems.tr}` },
        { label: 'Hizmetler', href: routes.services.tr },
        { label: 'Kimler için', href: `/#${anchors.audience.tr}` },
        { label: 'Hakkımızda', href: routes.about.tr },
        { label: 'İletişim', href: routes.contact.tr },
      ]
    : [
        { label: 'Systems', href: `/en/#${anchors.systems.en}` },
        { label: 'Services', href: routes.services.en },
        { label: 'Who we serve', href: `/en/#${anchors.audience.en}` },
        { label: 'About', href: routes.about.en },
        { label: 'Contact', href: routes.contact.en },
      ];

/**
 * The request form lives on the home page and on the contact page; link to the
 * copy on the current page when there is one, otherwise to the contact page.
 */
export const requestHref = (pathname: string, lang: Lang) => {
  const path = pathname.replace(/\/+$/, '') || '/';
  const id = anchors.request[lang];
  const here = [routes.home[lang], routes.contact[lang]].map((p) => p.replace(/\/+$/, '') || '/');
  return here.includes(path) ? `#${id}` : `${routes.contact[lang]}#${id}`;
};

/** Interface text shared by the header, footer, dock and layout. */
export const ui = {
  tr: {
    skip: 'İçeriğe geç',
    homeLabel: 'Erkon Marin, ana sayfa',
    mainNav: 'Ana menü',
    mobileNav: 'Mobil menü',
    menuOpen: 'Menüyü aç',
    menuClose: 'Menüyü kapat',
    request: 'Servis talebi',
    requestLong: 'Servis talebi oluşturun',
    whatsappWrite: 'WhatsApp’tan yazın',
    switchTo: { label: 'English', short: 'EN', note: 'Sayfanın İngilizcesi' },
    footer: {
      pitch: 'Gemi elektrik ve otomasyon sistemlerinde arıza tespiti, bakım, montaj ve demontaj.',
      phone: 'Telefon',
      office: 'Ofis',
      hours: ['Pazartesi – Cuma', '10:00 – 18:00'],
      message: 'Mesaj',
      services: 'Hizmetler',
      pages: 'Sayfa',
      pagesNav: 'Alt menü',
      tagline: 'Gemi elektrik ve otomasyon servisi',
      privacy: 'Gizlilik',
      top: 'Başa dön',
    },
    dock: { label: 'Hızlı iletişim', call: 'Ara', request: 'Servis talebi' },
    rail: { label: 'Telefon, e-posta ve Instagram', phone: 'Telefon', email: 'E-posta', instagram: 'Instagram' },
  },
  en: {
    skip: 'Skip to content',
    homeLabel: 'Erkon Marin, home',
    mainNav: 'Main menu',
    mobileNav: 'Mobile menu',
    menuOpen: 'Open menu',
    menuClose: 'Close menu',
    request: 'Service request',
    requestLong: 'Request a service',
    whatsappWrite: 'Message us on WhatsApp',
    switchTo: { label: 'Türkçe', short: 'TR', note: 'Turkish version of this page' },
    footer: {
      pitch: 'Fault diagnosis, maintenance, installation and removal on ship electrical and automation systems.',
      phone: 'Phone',
      office: 'Office',
      hours: ['Monday – Friday', '10:00 – 18:00'],
      message: 'Message',
      services: 'Services',
      pages: 'Pages',
      pagesNav: 'Footer menu',
      tagline: 'Marine electrical and automation service',
      privacy: 'Privacy',
      top: 'Back to top',
    },
    dock: { label: 'Quick contact', call: 'Call', request: 'Request' },
    rail: { label: 'Phone, e-mail and Instagram', phone: 'Phone', email: 'E-mail', instagram: 'Instagram' },
  },
} as const;
