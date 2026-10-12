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
