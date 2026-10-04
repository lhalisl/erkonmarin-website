// Single source for company facts. Anything marked "confirm" still needs
// sign-off from Erkon Marin before launch.

export const site = {
  name: 'Erkon Marin',
  tagline: 'Gemi elektrik ve otomasyon servisi',
  description:
    'Kontrol odası, MSB ve tüm otomasyon panolarında arıza tespiti, bakım, montaj ve demontaj. Erkon Marin, gemi elektrik ve otomasyon servisi.',
  phones: [
    { display: '+90 549 574 24 24', href: 'tel:+905495742424', e164: '+905495742424' },
    { display: '+90 516 161 24 34', href: 'tel:+905161612434', e164: '+905161612434' },
  ],
  // confirm: which line answers WhatsApp
  whatsapp: '905495742424',
  hours: {
    label: 'Pzt – Cum · 10:00 – 18:00',
    days: [1, 2, 3, 4, 5],
    open: 10,
    close: 18,
    timeZone: 'Europe/Istanbul',
  },
  // confirm: profile URLs; empty entries are not rendered
  social: {
    instagram: '',
    facebook: '',
  },
} as const;

export const whatsappLink = (text?: string) =>
  `https://wa.me/${site.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export const nav = [
  { label: 'Sistemler', href: '/#sistemler' },
  { label: 'Hizmetler', href: '/#hizmetler' },
  { label: 'Süreç', href: '/#surec' },
  { label: 'Kimler için', href: '/#kimler' },
  { label: 'İletişim', href: '/#talep' },
];
