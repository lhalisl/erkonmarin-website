import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Turkish letters the accent serif (Rumelaz Gekinsa) does not have. */
export const serifMissing = /[İŞşĞğ]/;

/**
 * Class for an accent set in the serif: "sans" (Montserrat Italic, see global.css)
 * when the text needs a letter Rumelaz Gekinsa lacks, so a word is never
 * split across two typefaces.
 */
export function accent(text: string | undefined | null, base?: string) {
  const sans = text && serifMissing.test(text) ? 'sans' : '';
  return [base, sans].filter(Boolean).join(' ') || undefined;
}
