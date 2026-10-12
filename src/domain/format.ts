import type { AmountDjf } from './models';

/** 12500 → « 12 500 DJF ». Formatage manuel : indépendant du support Intl du moteur JS. */
export function formatDjf(amount: AmountDjf): string {
  const rounded = Math.round(amount);
  const digits = Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${rounded < 0 ? '-' : ''}${digits} DJF`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m.toString().padStart(2, '0')}`;
}

const MONTHS: Record<string, string[]> = {
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
const DAYS: Record<string, string[]> = {
  fr: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

/** « 2026-10-14 » → « mer. 14 oct. 2026 » (fr) ou « Wed 14 Oct 2026 » (en). */
export function formatDate(isoDate: string, locale: string = 'fr'): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  const months = MONTHS[locale] ?? MONTHS.fr;
  const days = DAYS[locale] ?? DAYS.fr;
  return `${days[date.getUTCDay()]} ${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/** « +25377123456 » → « +253 77 12 34 56 » ; les autres numéros restent inchangés. */
export function formatPhone(e164: string): string {
  const match = /^\+253(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(e164);
  return match ? `+253 ${match.slice(1).join(' ')}` : e164;
}
