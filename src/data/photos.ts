import type { ImageMetadata } from 'astro';
import type { Lang } from '../i18n';
import msb from '../assets/sahadan/msb-ana-dagitim-panosu.jpg';
import sevk from '../assets/sahadan/sevk-ve-itici-kontrol-paneli.jpg';
import koprustu from '../assets/sahadan/koprustu-konsollari.jpg';
import gmdss from '../assets/sahadan/gmdss-haberlesme-istasyonu.jpg';
import gemi from '../assets/sahadan/seyirde-gemi.jpg';
import kontrolOdasi from '../assets/sahadan/makine-kontrol-odasi-konsolu.jpg';
import jenerator from '../assets/sahadan/jenerator-dairesi.jpg';

// Real photos supplied by Erkon Marin. Originals live in src/assets/sahadan/
// (metadata stripped); astro:assets serves them as responsive WebP.

export interface Photo {
  src: ImageMetadata;
  alt: Record<Lang, string>;
  caption?: Record<Lang, string>;
}

export const photos = {
  msb: {
    src: msb,
    alt: {
      tr: 'Gemi ana dağıtım panosu: hava devre kesicili hücreler, ölçü aletleri ve sinyal lambaları',
      en: 'Ship’s main switchboard: air circuit breaker sections, meters and indicator lamps',
    },
    caption: {
      tr: 'Ana dağıtım panosu (MSB)',
      en: 'Main switchboard (MSB)',
    },
  },
  sevk: {
    src: sevk,
    alt: {
      tr: 'Köprüüstü sevk ve itici kontrol paneli: kumanda kolları, itici kontrolleri ve dijital göstergeler',
      en: 'Bridge propulsion and thruster control panel: control levers, thruster controls and digital displays',
    },
    caption: {
      tr: 'Sevk ve itici kontrol paneli',
      en: 'Propulsion and thruster control panel',
    },
  },
  koprustu: {
    src: koprustu,
    alt: {
      tr: 'Gemi köprüüstü: seyir ve kumanda konsolları, pencerelerin ardında deniz',
      en: 'Ship’s bridge: navigation and control consoles, with the sea beyond the windows',
    },
    caption: {
      tr: 'Köprüüstü konsolları',
      en: 'Bridge consoles',
    },
  },
  gmdss: {
    src: gmdss,
    alt: {
      tr: 'Köprüüstünde GMDSS haberleşme istasyonu: telsiz cihazları, mesaj terminalleri ve ahize',
      en: 'GMDSS communication station on the bridge: radio sets, message terminals and handset',
    },
    caption: {
      tr: 'GMDSS haberleşme istasyonu',
      en: 'GMDSS communication station',
    },
  },
  kontrolOdasi: {
    src: kontrolOdasi,
    alt: {
      tr: 'Makine kontrol odası konsolu: yanan sinyal butonları, alarm ekranları ve acil durum telefonu',
      en: 'Engine control room console: lit signal buttons, alarm screens and emergency telephone',
    },
    caption: {
      tr: 'Makine kontrol odası konsolu',
      en: 'Engine control room console',
    },
  },
  jenerator: {
    src: jenerator,
    alt: {
      tr: 'Jeneratör dairesinde iki dizel jeneratör ve yerel kontrol panosu',
      en: 'Two diesel generators and their local control panel in the generator room',
    },
    caption: {
      tr: 'Jeneratör dairesi',
      en: 'Generator room',
    },
  },
  gemi: {
    src: gemi,
    alt: {
      tr: 'Denizde seyir halindeki kırmızı-beyaz arama kurtarma gemisi',
      en: 'Red and white search and rescue vessel under way at sea',
    },
  },
} satisfies Record<string, Photo>;

/** "Sahadan" gallery, as justified rows: photos in a row share one height. */
export const galleryRows: Photo[][] = [
  [photos.msb, photos.sevk],
  [photos.kontrolOdasi, photos.jenerator],
  [photos.koprustu, photos.gmdss],
];
