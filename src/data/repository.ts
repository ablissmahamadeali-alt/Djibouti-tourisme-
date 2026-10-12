import type { BookingRequest } from '@/domain/booking-request';
import type { BookingStatus } from '@/domain/booking-status';
import type {
  Booking,
  Departure,
  Destination,
  Experience,
  Provider,
  Route,
  SponsoredPlacement,
  Stay,
} from '@/domain/models';

/**
 * Contrats d'accès aux données. Deux implémentations :
 *  - `demo`     : données fictives embarquées, aucune requête réseau ;
 *  - `supabase` : base de production (activée dès que les variables d'environnement existent).
 * Les écrans ne dépendent que de ces interfaces.
 */

export type DepartureResult = { departure: Departure; route: Route; provider: Provider };
export type ExperienceDetail = { experience: Experience; provider: Provider; destination: Destination };
export type StayDetail = { stay: Stay; provider: Provider; destination: Destination };

export type BookingTimelineEntry = { status: BookingStatus; at: string; note: string | null };
export type BookingDetail = { booking: Booking; timeline: BookingTimelineEntry[] };

export interface CatalogRepository {
  listDestinations(): Promise<Destination[]>;
  getDestination(id: string): Promise<Destination | null>;
  searchDepartures(query: { originId: string; destinationId: string; date: string }): Promise<DepartureResult[]>;
  getDeparture(id: string): Promise<DepartureResult | null>;
  listExperiences(filter?: { destinationId?: string }): Promise<Experience[]>;
  getExperience(id: string): Promise<ExperienceDetail | null>;
  listStays(filter?: { destinationId?: string }): Promise<Stay[]>;
  getStay(id: string): Promise<StayDetail | null>;
  listSponsored(): Promise<SponsoredPlacement[]>;
}

export type BookingErrorCode =
  | 'network'
  | 'auth_required'
  | 'capacity'
  | 'unavailable'
  | 'invalid'
  | 'rate_limited'
  | 'not_found'
  | 'invalid_transition'
  | 'unknown';

export class BookingError extends Error {
  constructor(readonly code: BookingErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'BookingError';
  }
}

export interface BookingRepository {
  /** Envoie la demande. Ne renvoie une réservation que si le serveur l'a enregistrée. */
  submit(request: BookingRequest): Promise<Booking>;
  listMine(): Promise<Booking[]>;
  get(id: string): Promise<BookingDetail | null>;
  cancel(id: string): Promise<Booking>;
}

export type AuthUser = { id: string; email: string | null };

export interface AuthService {
  readonly available: boolean;
  getUser(): Promise<AuthUser | null>;
  onChange(listener: (user: AuthUser | null) => void): () => void;
  sendEmailCode(email: string): Promise<void>;
  verifyEmailCode(email: string, code: string): Promise<AuthUser>;
  signOut(): Promise<void>;
}

export type Backend = {
  mode: 'demo' | 'supabase';
  catalog: CatalogRepository;
  bookings: BookingRepository;
  auth: AuthService;
};
