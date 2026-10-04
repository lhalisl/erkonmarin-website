import type { ImageMetadata } from 'astro';
import msb from '../assets/sahadan/msb-ana-dagitim-panosu.jpg';
import sevk from '../assets/sahadan/sevk-ve-itici-kontrol-paneli.jpg';
import koprustu from '../assets/sahadan/koprustu-konsollari.jpg';
import gmdss from '../assets/sahadan/gmdss-haberlesme-istasyonu.jpg';
import gemi from '../assets/sahadan/seyirde-gemi.jpg';

// Real photos supplied by Erkon Marin. Originals live in src/assets/sahadan/
// (metadata stripped); astro:assets serves them as responsive WebP.

export interface Photo {
  src: ImageMetadata;
  alt: string;
  caption?: string;
}

export const photos = {
  msb: {
    src: msb,
    alt: 'Gemi ana dağıtım panosu: hava devre kesicili hücreler, ölçü aletleri ve sinyal lambaları',
    caption: 'Ana dağıtım panosu (MSB)',
  },
  sevk: {
    src: sevk,
    alt: 'Köprüüstü sevk ve itici kontrol paneli: kumanda kolları, itici kontrolleri ve dijital göstergeler',
    caption: 'Sevk ve itici kontrol paneli',
  },
  koprustu: {
    src: koprustu,
    alt: 'Gemi köprüüstü: seyir ve kumanda konsolları, pencerelerin ardında deniz',
    caption: 'Köprüüstü konsolları',
  },
  gmdss: {
    src: gmdss,
    alt: 'Köprüüstünde GMDSS haberleşme istasyonu: telsiz cihazları, mesaj terminalleri ve ahize',
    caption: 'GMDSS haberleşme istasyonu',
  },
  gemi: {
    src: gemi,
    alt: 'Denizde seyir halindeki kırmızı-beyaz arama kurtarma gemisi',
  },
} satisfies Record<string, Photo>;

/** "Sahadan" gallery, as justified rows: photos in a row share one height. */
export const galleryRows: Photo[][] = [
  [photos.msb, photos.sevk],
  [photos.koprustu, photos.gmdss],
];
