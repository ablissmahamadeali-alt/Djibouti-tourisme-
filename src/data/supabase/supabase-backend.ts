import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import type { BookingStatus } from '@/domain/booking-status';
import { isPaymentMethod } from '@/domain/payment';
import type {
  Booking,
  DataReliability,
  Departure,
  Destination,
  Experience,
  Provider,
  Route,
  SponsoredPlacement,
  Stay,
} from '@/domain/models';

import {
  BookingError,
  type AuthService,
  type AuthUser,
  type Backend,
  type BookingErrorCode,
  type BookingRepository,
  type CatalogRepository,
  type DepartureResult,
} from '../repository';
import { secureSessionStorage } from './secure-storage';

/* ----------------------------------------------------------------------------
 * Lignes telles que renvoyées par l'API (snake_case), puis converties.
 * À terme : générer ces types avec `supabase gen types typescript`.
 * ------------------------------------------------------------------------- */
type Row = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const strOrNull = (v: unknown) => (typeof v === 'string' ? v : null);
const num = (v: unknown) => (typeof v === 'number' ? v : 0);
const numOrNull = (v: unknown) => (typeof v === 'number' ? v : null);
const strArray = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const reliability = (v: unknown): DataReliability => (v === 'verified' || v === 'demo' ? v : 'unverified');

const toProvider = (r: Row): Provider => ({
  id: str(r.id),
  name: str(r.name),
  kind: str(r.kind) as Provider['kind'],
  description: str(r.description),
  phone: strOrNull(r.phone),
  email: strOrNull(r.email),
  verified: r.status === 'verified',
  reliability: reliability(r.reliability),
});

const toDestination = (r: Row): Destination => ({
  id: str(r.id),
  name: str(r.name),
  region: str(r.region) as Destination['region'],
  summary: str(r.summary),
  description: str(r.description),
  highlights: strArray(r.highlights),
  practicalInfo: strArray(r.practical_info),
  isPort: r.is_port === true,
  imageUrl: strOrNull(r.image_url),
  reliability: reliability(r.reliability),
});

const toRoute = (r: Row): Route => ({
  id: str(r.id),
  originId: str(r.origin_id),
  destinationId: str(r.destination_id),
  providerId: str(r.provider_id),
  durationMinutes: numOrNull(r.duration_minutes),
  adultFareDjf: numOrNull(r.adult_fare_djf),
  conditions: strArray(r.conditions),
  reliability: reliability(r.reliability),
});

const toExperience = (r: Row): Experience => ({
  id: str(r.id),
  title: str(r.title),
  kind: str(r.kind) as Experience['kind'],
  destinationId: str(r.destination_id),
  providerId: str(r.provider_id),
  summary: str(r.summary),
  description: str(r.description),
  durationLabel: strOrNull(r.duration_label),
  priceFromDjf: numOrNull(r.price_from_djf),
  included: strArray(r.included),
  imageUrl: strOrNull(r.image_url),
  reliability: reliability(r.reliability),
});

const toStay = (r: Row): Stay => ({
  id: str(r.id),
  name: str(r.name),
  destinationId: str(r.destination_id),
  providerId: str(r.provider_id),
  category: str(r.category) as Stay['category'],
  summary: str(r.summary),
  address: strOrNull(r.address),
  amenities: strArray(r.amenities),
  nightlyFromDjf: numOrNull(r.nightly_from_djf),
  imageUrl: strOrNull(r.image_url),
  reliability: reliability(r.reliability),
});

const toBooking = (r: Row): Booking => {
  const passengers = Array.isArray(r.booking_passengers) ? (r.booking_passengers as Row[]) : [];
  return {
    id: str(r.id),
    reference: str(r.reference),
    kind: str(r.kind) as Booking['kind'],
    itemId: str(r.departure_id ?? r.experience_id ?? r.stay_id),
    itemLabel: str(r.item_label),
    status: str(r.status) as BookingStatus,
    serviceDate: str(r.service_date),
    partySize: num(r.party_size),
    passengers: passengers
      .sort((a, b) => num(a.position) - num(b.position))
      .map((p) => ({ fullName: str(p.full_name), category: str(p.category) as 'adult' | 'child' | 'infant' })),
    contactName: str(r.contact_name),
    contactPhone: str(r.contact_phone),
    notes: strOrNull(r.notes),
    paymentMethod: isPaymentMethod(r.payment_method) ? r.payment_method : null,
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
    isDemo: r.is_demo === true,
  };
};

/** Traduit une erreur Supabase/PostgREST en code métier compréhensible par l'interface. */
export function toBookingErrorCode(error: { message?: string; code?: string } | null): BookingErrorCode {
  const message = error?.message ?? '';
  const known: [string, BookingErrorCode][] = [
    ['CAPACITY_EXCEEDED', 'capacity'],
    ['ITEM_UNAVAILABLE', 'unavailable'],
    ['ITEM_NOT_FOUND', 'unavailable'],
    ['INVALID_INPUT', 'invalid'],
    ['RATE_LIMITED', 'rate_limited'],
    ['AUTH_REQUIRED', 'auth_required'],
    ['INVALID_TRANSITION', 'invalid_transition'],
    ['NOT_FOUND', 'not_found'],
  ];
  for (const [needle, code] of known) if (message.includes(needle)) return code;
  if (/network|fetch|timeout|connection/i.test(message)) return 'network';
  return 'unknown';
}

async function run<T>(promise: PromiseLike<{ data: T | null; error: { message?: string; code?: string } | null }>): Promise<T> {
  let result: { data: T | null; error: { message?: string; code?: string } | null };
  try {
    result = await promise;
  } catch (error) {
    throw new BookingError('network', error instanceof Error ? error.message : undefined);
  }
  if (result.error) throw new BookingError(toBookingErrorCode(result.error), result.error.message);
  if (result.data === null) throw new BookingError('not_found');
  return result.data;
}

function createCatalog(db: SupabaseClient): CatalogRepository {
  const departureResults = async (rows: { departure: Departure }[]): Promise<DepartureResult[]> => {
    if (rows.length === 0) return [];
    const routeIds = [...new Set(rows.map((r) => r.departure.routeId))];
    const routes = (await run(db.from('routes').select('*').in('id', routeIds))).map(toRoute);
    const providerIds = [...new Set(routes.map((r) => r.providerId))];
    const providers = (await run(db.from('providers').select('*').in('id', providerIds))).map(toProvider);
    return rows.flatMap(({ departure }) => {
      const route = routes.find((r) => r.id === departure.routeId);
      const provider = route && providers.find((p) => p.id === route.providerId);
      return route && provider ? [{ departure, route, provider }] : [];
    });
  };

  return {
    async listDestinations() {
      return (await run(db.from('destinations').select('*').order('name'))).map(toDestination);
    },
    async getDestination(id) {
      const rows = await run(db.from('destinations').select('*').eq('id', id).limit(1));
      return rows[0] ? toDestination(rows[0]) : null;
    },
    async searchDepartures({ originId, destinationId, date }) {
      const rows = await run<Row[]>(
        db.rpc('search_departures', { p_origin_id: originId, p_destination_id: destinationId, p_date: date }),
      );
      return departureResults(
        rows
          .filter((r) => r.status === 'scheduled')
          .map((r) => ({
            departure: {
              id: str(r.departure_id),
              routeId: str(r.route_id),
              departsAt: str(r.departs_at),
              capacity: num(r.capacity),
              seatsAvailable: num(r.seats_available),
              reliability: reliability(r.reliability),
            },
          })),
      );
    },
    async getDeparture(id) {
      const rows = await run(db.from('departures').select('*').eq('id', id).limit(1));
      const row = rows[0];
      if (!row) return null;
      const seats = await run<number>(db.rpc('departure_seats_available', { p_departure_id: id }));
      const [result] = await departureResults([
        {
          departure: {
            id: str(row.id),
            routeId: str(row.route_id),
            departsAt: str(row.departs_at),
            capacity: num(row.capacity),
            seatsAvailable: Math.max(0, seats),
            reliability: reliability(row.reliability),
          },
        },
      ]);
      return result ?? null;
    },
    async listExperiences(filter) {
      let query = db.from('experiences').select('*').order('title');
      if (filter?.destinationId) query = query.eq('destination_id', filter.destinationId);
      return (await run(query)).map(toExperience);
    },
    async getExperience(id) {
      const rows = await run(db.from('experiences').select('*, provider:providers(*), destination:destinations(*)').eq('id', id).limit(1));
      const row = rows[0];
      if (!row || !row.provider || !row.destination) return null;
      return { experience: toExperience(row), provider: toProvider(row.provider as Row), destination: toDestination(row.destination as Row) };
    },
    async listStays(filter) {
      let query = db.from('stays').select('*').order('name');
      if (filter?.destinationId) query = query.eq('destination_id', filter.destinationId);
      return (await run(query)).map(toStay);
    },
    async getStay(id) {
      const rows = await run(db.from('stays').select('*, provider:providers(*), destination:destinations(*)').eq('id', id).limit(1));
      const row = rows[0];
      if (!row || !row.provider || !row.destination) return null;
      return { stay: toStay(row), provider: toProvider(row.provider as Row), destination: toDestination(row.destination as Row) };
    },
    async listSponsored(): Promise<SponsoredPlacement[]> {
      const rows = await run(db.from('sponsored_campaigns').select('*').eq('status', 'active'));
      return rows.map((r) => ({
        id: str(r.id),
        providerId: str(r.provider_id),
        title: str(r.title),
        body: str(r.body),
        target: { kind: str(r.target_kind) as SponsoredPlacement['target']['kind'], id: str(r.target_id) },
        reliability: reliability(r.reliability),
      }));
    },
  };
}

function createBookings(db: SupabaseClient): BookingRepository {
  const bookingSelect = '*, booking_passengers(full_name, category, position)';
  return {
    async submit(request) {
      const created = await run<Row>(
        db.rpc('request_booking', {
          p_kind: request.kind,
          p_item_id: request.itemId,
          p_service_date: request.serviceDate,
          p_party_size: request.partySize,
          p_passengers: request.passengers,
          p_contact_name: request.contactName,
          p_contact_phone: request.contactPhone,
          p_notes: request.notes,
          p_payment_method: request.paymentMethod,
        }),
      );
      return toBooking({ ...created, booking_passengers: [] });
    },
    async listMine() {
      const { data: auth } = await db.auth.getUser();
      if (!auth.user) return [];
      return (await run(db.from('bookings').select(bookingSelect).eq('customer_id', auth.user.id).order('created_at', { ascending: false }))).map(toBooking);
    },
    async get(id) {
      const rows = await run(db.from('bookings').select(bookingSelect).eq('id', id).limit(1));
      if (!rows[0]) return null;
      const events = await run(db.from('booking_events').select('to_status, note, created_at').eq('booking_id', id).order('created_at'));
      return {
        booking: toBooking(rows[0]),
        timeline: events.map((e) => ({ status: str(e.to_status) as BookingStatus, at: str(e.created_at), note: strOrNull(e.note) })),
      };
    },
    async cancel(id) {
      return toBooking(await run<Row>(db.rpc('transition_booking', { p_booking_id: id, p_to: 'cancelled' })));
    },
  };
}

function createAuth(db: SupabaseClient): AuthService {
  const toUser = (u: { id: string; email?: string | null } | null): AuthUser | null =>
    u ? { id: u.id, email: u.email ?? null } : null;
  return {
    available: true,
    async getUser() {
      const { data } = await db.auth.getSession();
      return toUser(data.session?.user ?? null);
    },
    onChange(listener) {
      const { data } = db.auth.onAuthStateChange((_event, session) => listener(toUser(session?.user ?? null)));
      return () => data.subscription.unsubscribe();
    },
    async sendEmailCode(email) {
      const { error } = await db.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) throw new BookingError(toBookingErrorCode(error), error.message);
    },
    async verifyEmailCode(email, code) {
      const { data, error } = await db.auth.verifyOtp({ email, token: code, type: 'email' });
      if (error || !data.user) throw new BookingError('auth_required', error?.message);
      return { id: data.user.id, email: data.user.email ?? null };
    },
    async signOut() {
      await db.auth.signOut();
    },
  };
}

export function createSupabaseBackend(url: string, publishableKey: string): Backend {
  const db = createClient(url, publishableKey, {
    auth: {
      storage: secureSessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  // Rafraîchissement du jeton uniquement quand l'application est au premier plan.
  AppState.addEventListener('change', (state) => {
    if (state === 'active') db.auth.startAutoRefresh();
    else db.auth.stopAutoRefresh();
  });
  return { mode: 'supabase', catalog: createCatalog(db), bookings: createBookings(db), auth: createAuth(db) };
}
