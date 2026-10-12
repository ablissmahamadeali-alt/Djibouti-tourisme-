import {
  BOOKING_STATUSES,
  InvalidTransitionError,
  allowedTransitions,
  assertTransition,
  canTransition,
  holdsCapacity,
  isGuaranteed,
  isTerminal,
} from '../booking-status';

describe('machine à états des réservations', () => {
  it('le client envoie un brouillon, mais ne peut pas se confirmer lui-même', () => {
    expect(canTransition('draft', 'submitted', 'customer')).toBe(true);
    expect(canTransition('submitted', 'confirmed', 'customer')).toBe(false);
    expect(canTransition('pending_confirmation', 'confirmed', 'customer')).toBe(false);
  });

  it('le prestataire et l’administrateur confirment ou refusent', () => {
    for (const actor of ['provider', 'admin'] as const) {
      expect(canTransition('submitted', 'pending_confirmation', actor)).toBe(true);
      expect(canTransition('pending_confirmation', 'confirmed', actor)).toBe(true);
      expect(canTransition('pending_confirmation', 'rejected', actor)).toBe(true);
    }
  });

  it('le prestataire ne peut pas annuler une demande non confirmée à la place du client', () => {
    expect(canTransition('submitted', 'cancelled', 'provider')).toBe(false);
    expect(canTransition('submitted', 'rejected', 'provider')).toBe(true);
  });

  it('les statuts finaux sont bloqués pour tout le monde', () => {
    for (const status of ['rejected', 'cancelled', 'completed'] as const) {
      expect(isTerminal(status)).toBe(true);
      for (const actor of ['customer', 'provider', 'admin'] as const) {
        expect(allowedTransitions(status, actor)).toEqual([]);
      }
    }
  });

  it('aucune transition ne revient au brouillon', () => {
    for (const from of BOOKING_STATUSES) {
      for (const actor of ['customer', 'provider', 'admin'] as const) {
        expect(allowedTransitions(from, actor)).not.toContain('draft');
      }
    }
  });

  it('seule une confirmation vaut garantie', () => {
    expect(isGuaranteed('submitted')).toBe(false);
    expect(isGuaranteed('pending_confirmation')).toBe(false);
    expect(isGuaranteed('confirmed')).toBe(true);
  });

  it('les demandes actives retiennent des places, pas les demandes closes', () => {
    expect(holdsCapacity('draft')).toBe(false);
    expect(holdsCapacity('submitted')).toBe(true);
    expect(holdsCapacity('confirmed')).toBe(true);
    expect(holdsCapacity('cancelled')).toBe(false);
    expect(holdsCapacity('rejected')).toBe(false);
  });

  it('assertTransition lève une erreur explicite', () => {
    expect(() => assertTransition('completed', 'cancelled', 'admin')).toThrow(InvalidTransitionError);
  });
});
