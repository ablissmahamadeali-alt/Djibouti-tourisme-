/**
 * Références de réservation lisibles au téléphone : préfixe + 8 caractères
 * sans caractères ambigus (0/O, 1/I/L). En production, la référence est
 * attribuée par la base de données (contrainte UNIQUE) ; cette fonction sert au
 * mode démonstration et à la validation de format.
 */

export const REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const REFERENCE_BODY_LENGTH = 8;
export const REFERENCE_PATTERN = /^DS-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/;

export function generateBookingReference(random: () => number = Math.random): string {
  let body = '';
  for (let i = 0; i < REFERENCE_BODY_LENGTH; i++) {
    body += REFERENCE_ALPHABET[Math.floor(random() * REFERENCE_ALPHABET.length)];
  }
  return `DS-${body}`;
}

export function isBookingReference(value: string): boolean {
  return REFERENCE_PATTERN.test(value);
}
