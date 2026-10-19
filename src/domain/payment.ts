/**
 * Modes de paiement proposés au client lors d'une demande de réservation.
 *
 * Aucun paiement n'est effectué dans l'application à ce stade : le client indique
 * comment il compte payer, et règle le prestataire APRÈS confirmation de sa demande.
 * Les identifiants correspondent à la colonne `payments.gateway` de la base, pour une
 * future intégration (voir docs/paiements.md).
 */
export const PAYMENT_METHODS = ['cac_pay', 'waafi', 'dmoney', 'cash_on_site'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === 'string' && (PAYMENT_METHODS as readonly string[]).includes(value);
}
