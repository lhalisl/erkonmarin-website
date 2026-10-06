// Single source for company facts. Anything marked "confirm" still needs
// sign-off from Erkon Marin before launch.

export const site = {
  name: 'Erkon Marin',
  description: {
    tr: 'Kontrol odası, MSB ve tüm otomasyon panolarında arıza tespiti, bakım, montaj ve demontaj. Erkon Marin, gemi elektrik ve otomasyon servisi.',
    en: 'Fault diagnosis, maintenance, installation and removal for engine control rooms, main switchboards and all automation panels. Erkon Marin, marine electrical and automation service.',
  },
  phones: [
    { display: '+90 549 574 24 24', href: 'tel:+905495742424', e164: '+905495742424' },
    { display: '+90 516 161 24 34', href: 'tel:+905161612434', e164: '+905161612434' },
  ],
  // confirm: which line answers WhatsApp
  whatsapp: '905495742424',
  email: 'info@erkonmarin.com',
  // From the old site's contact page; "Residance" there is taken as Skyport Residence
  address: {
    lines: {
      tr: ['Yakuplu Mahallesi, Hürriyet Bulvarı', 'Skyport Residence No:1, İç Kapı No:151', 'Beylikdüzü / İstanbul'],
      en: ['Yakuplu Mahallesi, Hürriyet Bulvarı', 'Skyport Residence No:1, İç Kapı No:151', 'Beylikdüzü, Istanbul, Türkiye'],
    },
    street: 'Yakuplu Mahallesi, Hürriyet Bulvarı, Skyport Residence No:1, İç Kapı No:151',
    district: 'Beylikdüzü',
    city: 'İstanbul',
    country: 'TR',
    short: { tr: 'Beylikdüzü / İstanbul', en: 'Beylikdüzü, Istanbul' },
  },
  hours: {
    tr: 'Pazartesi – Cuma, 10:00 – 18:00',
    en: 'Monday – Friday, 10:00 – 18:00',
  },
  // empty entries are not rendered; confirm: Facebook URL
  social: {
    instagram: 'https://www.instagram.com/erkon_marin/',
    facebook: '',
  },
} as const;

export const whatsappLink = (text?: string) =>
  `https://wa.me/${site.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `Skyport Residence, Hürriyet Bulvarı No:1, Yakuplu, Beylikdüzü, İstanbul`,
)}`;
