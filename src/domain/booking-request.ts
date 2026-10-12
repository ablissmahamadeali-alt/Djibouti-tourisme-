import { z } from 'zod';

/**
 * Validation d'une demande de réservation.
 *
 * Les messages d'erreur sont des clés de traduction (voir src/i18n) afin que la
 * même validation serve en français, en anglais et plus tard en arabe ou en somali.
 * Le serveur revalide systématiquement : cette validation n'est qu'un confort
 * pour l'utilisateur, jamais une protection.
 */

export const MAX_PARTY_SIZE = 20;

const DJIBOUTI_LOCAL = /^(77|21)\d{6}$/;
const INTERNATIONAL = /^\+[1-9]\d{7,14}$/;

/** Normalise un numéro : +253XXXXXXXX pour Djibouti, E.164 sinon. Renvoie null si invalide. */
export function normalizePhone(input: string): string | null {
  const compact = input.replace(/[\s.\-()]/g, '');
  const withoutPrefix = compact.replace(/^(\+253|00253)/, '');
  if (DJIBOUTI_LOCAL.test(withoutPrefix)) return `+253${withoutPrefix}`;
  const international = compact.replace(/^00/, '+');
  if (INTERNATIONAL.test(international) && !international.startsWith('+253')) return international;
  return null;
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'validation.date' })
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), { error: 'validation.date' });

export const passengerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { error: 'validation.name' })
    .max(120, { error: 'validation.name' }),
  category: z.enum(['adult', 'child', 'infant']),
});

export function bookingRequestSchema(today: string) {
  return z
    .object({
      kind: z.enum(['crossing', 'experience', 'stay']),
      itemId: z.string().min(1),
      serviceDate: isoDate.refine((value) => value >= today, { error: 'validation.datePast' }),
      partySize: z
        .number()
        .int()
        .min(1, { error: 'validation.partySize' })
        .max(MAX_PARTY_SIZE, { error: 'validation.partySize' }),
      passengers: z.array(passengerSchema).max(MAX_PARTY_SIZE),
      contactName: z
        .string()
        .trim()
        .min(2, { error: 'validation.name' })
        .max(120, { error: 'validation.name' }),
      contactPhone: z
        .string()
        .transform((value, ctx) => {
          const normalized = normalizePhone(value);
          if (!normalized) {
            ctx.addIssue({ code: 'custom', message: 'validation.phone' });
            return z.NEVER;
          }
          return normalized;
        }),
      notes: z
        .string()
        .trim()
        .max(500, { error: 'validation.notes' })
        .transform((value) => (value.length === 0 ? null : value)),
      acceptsTerms: z.literal(true, { error: 'validation.terms' }),
    })
    .superRefine((value, ctx) => {
      // Les traversées exigent un manifeste nominatif complet.
      if (value.kind === 'crossing' && value.passengers.length !== value.partySize) {
        ctx.addIssue({ code: 'custom', path: ['passengers'], message: 'validation.passengers' });
      }
    });
}

export type BookingRequestInput = z.input<ReturnType<typeof bookingRequestSchema>>;
export type BookingRequest = z.output<ReturnType<typeof bookingRequestSchema>>;

export type FieldErrors = Partial<Record<string, string>>;

export function validateBookingRequest(
  input: BookingRequestInput,
  today: string,
): { ok: true; value: BookingRequest } | { ok: false; errors: FieldErrors } {
  const result = bookingRequestSchema(today).safeParse(input);
  if (result.success) return { ok: true, value: result.data };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    // Les erreurs d'un passager sont rattachées à son champ : « passengers.0 », « passengers.1 »…
    const [head, index] = issue.path;
    const key =
      head === undefined ? 'form' : head === 'passengers' && typeof index === 'number' ? `passengers.${index}` : String(head);
    errors[key] ??= issue.message;
  }
  return { ok: false, errors };
}
