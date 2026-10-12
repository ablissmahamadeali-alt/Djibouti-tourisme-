/** Djibouti est à UTC+3 toute l'année (pas d'heure d'été). */
const DJIBOUTI_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Date du jour à Djibouti, au format AAAA-MM-JJ, quel que soit le fuseau du téléphone. */
export function djiboutiToday(now: Date = new Date()): string {
  return new Date(now.getTime() + DJIBOUTI_OFFSET_MS).toISOString().slice(0, 10);
}

/** Ajoute des jours à une date AAAA-MM-JJ. */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Heure locale de Djibouti (HH:MM) pour un instant ISO. */
export function djiboutiTime(isoInstant: string): string {
  return new Date(Date.parse(isoInstant) + DJIBOUTI_OFFSET_MS).toISOString().slice(11, 16);
}

/** Date locale de Djibouti (AAAA-MM-JJ) pour un instant ISO. */
export function djiboutiDate(isoInstant: string): string {
  return new Date(Date.parse(isoInstant) + DJIBOUTI_OFFSET_MS).toISOString().slice(0, 10);
}
