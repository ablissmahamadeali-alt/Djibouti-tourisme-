/**
 * Cycle de vie d'une demande de réservation.
 *
 * Source de vérité côté client. La même machine à états est appliquée côté
 * serveur (voir supabase/migrations/*_booking_rpc.sql) : toute modification ici
 * doit être répercutée dans le SQL et inversement.
 */

export const BOOKING_STATUSES = [
  'draft',
  'submitted',
  'pending_confirmation',
  'confirmed',
  'rejected',
  'cancelled',
  'completed',
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Qui agit sur la réservation. Les droits réels sont vérifiés par le serveur. */
export type BookingActor = 'customer' | 'provider' | 'admin';

type Transition = { to: BookingStatus; actors: readonly BookingActor[] };

const TRANSITIONS: Record<BookingStatus, readonly Transition[]> = {
  draft: [
    { to: 'submitted', actors: ['customer'] },
    { to: 'cancelled', actors: ['customer'] },
  ],
  submitted: [
    { to: 'pending_confirmation', actors: ['provider', 'admin'] },
    { to: 'confirmed', actors: ['provider', 'admin'] },
    { to: 'rejected', actors: ['provider', 'admin'] },
    { to: 'cancelled', actors: ['customer', 'admin'] },
  ],
  pending_confirmation: [
    { to: 'confirmed', actors: ['provider', 'admin'] },
    { to: 'rejected', actors: ['provider', 'admin'] },
    { to: 'cancelled', actors: ['customer', 'admin'] },
  ],
  confirmed: [
    { to: 'completed', actors: ['provider', 'admin'] },
    { to: 'cancelled', actors: ['customer', 'provider', 'admin'] },
  ],
  rejected: [],
  cancelled: [],
  completed: [],
};

export function allowedTransitions(from: BookingStatus, actor: BookingActor): BookingStatus[] {
  return TRANSITIONS[from].filter((t) => t.actors.includes(actor)).map((t) => t.to);
}

export function canTransition(from: BookingStatus, to: BookingStatus, actor: BookingActor): boolean {
  return allowedTransitions(from, actor).includes(to);
}

export function isTerminal(status: BookingStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

/**
 * Statuts qui retiennent des places sur un départ à capacité limitée.
 * Une demande envoyée bloque déjà les places pour éviter la surréservation
 * pendant que le prestataire confirme manuellement.
 */
export function holdsCapacity(status: BookingStatus): boolean {
  return status === 'submitted' || status === 'pending_confirmation' || status === 'confirmed';
}

/** Seule une confirmation explicite du prestataire vaut réservation ferme. */
export function isGuaranteed(status: BookingStatus): boolean {
  return status === 'confirmed' || status === 'completed';
}

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: BookingStatus,
    readonly to: BookingStatus,
    readonly actor: BookingActor,
  ) {
    super(`Transition interdite : ${from} → ${to} (${actor})`);
    this.name = 'InvalidTransitionError';
  }
}

export function assertTransition(from: BookingStatus, to: BookingStatus, actor: BookingActor): void {
  if (!canTransition(from, to, actor)) throw new InvalidTransitionError(from, to, actor);
}
