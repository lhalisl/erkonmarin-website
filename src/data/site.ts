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
  email: 'info@erkonmarin.com',
  // From the old site's contact page; "Residance" there is taken as Skyport Residence
  address: {
    lines: ['Yakuplu Mahallesi, Hürriyet Bulvarı', 'Skyport Residence No:1, İç Kapı No:151', 'Beylikdüzü / İstanbul'],
    street: 'Yakuplu Mahallesi, Hürriyet Bulvarı, Skyport Residence No:1, İç Kapı No:151',
    district: 'Beylikdüzü',
    city: 'İstanbul',
    country: 'TR',
  },
  hours: {
    label: 'Pazartesi – Cuma, 10:00 – 18:00',
  },
  // confirm: profile URLs; empty entries are not rendered
  social: {
    instagram: '',
    facebook: '',
  },
} as const;

export const whatsappLink = (text?: string) =>
  `https://wa.me/${site.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `Skyport Residence, Hürriyet Bulvarı No:1, Yakuplu, Beylikdüzü, İstanbul`,
)}`;

// The request form lives on the home page and on /iletisim/; link to the copy on
// the current page when there is one, otherwise to the contact page.
export const requestHref = (pathname: string) => {
  const path = pathname.replace(/\/+$/, '') || '/';
  return path === '/' || path === '/iletisim' ? '#talep' : '/iletisim/#talep';
};

export const nav = [
  { label: 'Sistemler', href: '/#sistemler' },
  { label: 'Hizmetler', href: '/hizmetler/' },
  { label: 'Süreç', href: '/#surec' },
  { label: 'Kimler için', href: '/#kimler' },
  { label: 'Hakkımızda', href: '/hakkimizda/' },
  { label: 'İletişim', href: '/iletisim/' },
];
