import type { BookingStatus } from './booking-status';
import type { PaymentMethod } from './payment';

/**
 * Niveau de fiabilité d'une information affichée.
 * - `demo`     : donnée fictive de démonstration, ne jamais présenter comme réelle.
 * - `unverified` : information publique non confirmée par le prestataire.
 * - `verified` : confirmée par le prestataire et validée par un administrateur.
 */
export type DataReliability = 'demo' | 'unverified' | 'verified';

/** Montant en francs Djibouti (DJF). Le DJF n'a pas de subdivision utilisée. */
export type AmountDjf = number;

export type ProviderKind = 'maritime_operator' | 'hotel' | 'agency' | 'activity_organizer' | 'guide';

export type Provider = {
  id: string;
  name: string;
  kind: ProviderKind;
  description: string;
  phone: string | null;
  email: string | null;
  /** Vérification administrative des documents du prestataire. */
  verified: boolean;
  reliability: DataReliability;
};

export type Region = 'djibouti' | 'tadjourah' | 'obock' | 'arta' | 'dikhil' | 'ali_sabieh';

export type Destination = {
  id: string;
  name: string;
  region: Region;
  summary: string;
  description: string;
  highlights: string[];
  practicalInfo: string[];
  /** Point de départ ou d'arrivée de traversées (sans préjuger d'une liaison active). */
  isPort: boolean;
  imageUrl: string | null;
  reliability: DataReliability;
};

export type Route = {
  id: string;
  originId: string;
  destinationId: string;
  providerId: string;
  durationMinutes: number | null;
  /** Tarif adulte aller simple, null si inconnu. */
  adultFareDjf: AmountDjf | null;
  conditions: string[];
  reliability: DataReliability;
};

export type Departure = {
  id: string;
  routeId: string;
  /** ISO 8601 avec fuseau (Djibouti = UTC+3, sans heure d'été). */
  departsAt: string;
  capacity: number;
  /** Places encore disponibles, calculées par le serveur. */
  seatsAvailable: number;
  reliability: DataReliability;
};

export type ExperienceKind = 'excursion' | 'circuit' | 'activity' | 'guide';

export type Experience = {
  id: string;
  title: string;
  kind: ExperienceKind;
  destinationId: string;
  providerId: string;
  summary: string;
  description: string;
  durationLabel: string | null;
  priceFromDjf: AmountDjf | null;
  included: string[];
  imageUrl: string | null;
  reliability: DataReliability;
};

export type Stay = {
  id: string;
  name: string;
  destinationId: string;
  providerId: string;
  category: 'hotel' | 'lodge' | 'camp' | 'guesthouse';
  summary: string;
  address: string | null;
  amenities: string[];
  nightlyFromDjf: AmountDjf | null;
  imageUrl: string | null;
  reliability: DataReliability;
};

export type SponsoredPlacement = {
  id: string;
  providerId: string;
  title: string;
  body: string;
  /** Cible interne (fiche prestataire / offre) — jamais un lien externe non contrôlé. */
  target: { kind: 'experience' | 'stay' | 'route'; id: string };
  reliability: DataReliability;
};

export type BookableKind = 'crossing' | 'experience' | 'stay';

export type Passenger = {
  fullName: string;
  category: 'adult' | 'child' | 'infant';
};

export type Booking = {
  id: string;
  reference: string;
  kind: BookableKind;
  /** Identifiant du départ, de l'expérience ou de l'hébergement. */
  itemId: string;
  itemLabel: string;
  status: BookingStatus;
  serviceDate: string;
  partySize: number;
  passengers: Passenger[];
  contactName: string;
  contactPhone: string;
  notes: string | null;
  /** Mode de paiement choisi ; le règlement se fait auprès du prestataire après confirmation. */
  paymentMethod: PaymentMethod | null;
  createdAt: string;
  updatedAt: string;
  isDemo: boolean;
};
