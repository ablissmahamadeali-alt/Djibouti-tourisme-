import AsyncStorage from '@react-native-async-storage/async-storage';

import type { BookingRequest } from '@/domain/booking-request';
import { generateBookingReference } from '@/domain/booking-reference';
import { assertTransition, holdsCapacity, InvalidTransitionError } from '@/domain/booking-status';
import type { Booking, Departure } from '@/domain/models';
import { djiboutiDate, djiboutiToday } from '@/domain/time';

import {
  BookingError,
  type AuthService,
  type Backend,
  type BookingDetail,
  type BookingRepository,
  type CatalogRepository,
} from '../repository';
import {
  buildDemoDepartures,
  demoDestinations,
  demoExperiences,
  demoProviders,
  demoRoutes,
  demoSponsored,
  demoStays,
} from './demo-data';

const STORAGE_KEY = 'bahri.demo.bookings.v1';

type StoredBooking = { booking: Booking; timeline: BookingDetail['timeline'] };

function byId<T extends { id: string }>(items: T[], id: string): T | null {
  return items.find((item) => item.id === id) ?? null;
}

/** Catalogue de démonstration, sans réseau. `delayMs` simule une latence pour montrer les états de chargement. */
export function createDemoCatalog(options: { delayMs?: number; now?: () => Date } = {}): CatalogRepository & {
  holdSeats(departureId: string, delta: number): void;
  departures(): Departure[];
} {
  const now = options.now ?? (() => new Date());
  const departures = buildDemoDepartures(djiboutiToday(now()));
  const wait = <T>(value: T) =>
    new Promise<T>((resolve) => setTimeout(() => resolve(value), options.delayMs ?? 0));

  const provider = (id: string) => {
    const p = byId(demoProviders, id);
    if (!p) throw new Error(`Prestataire de démo manquant : ${id}`);
    return p;
  };
  const destination = (id: string) => {
    const d = byId(demoDestinations, id);
    if (!d) throw new Error(`Destination de démo manquante : ${id}`);
    return d;
  };
  const departureResult = (dep: Departure) => {
    const route = byId(demoRoutes, dep.routeId);
    if (!route) throw new Error(`Trajet de démo manquant : ${dep.routeId}`);
    return { departure: { ...dep }, route, provider: provider(route.providerId) };
  };

  return {
    departures: () => departures,
    holdSeats(departureId, delta) {
      const dep = departures.find((d) => d.id === departureId);
      if (dep) dep.seatsAvailable = Math.min(dep.capacity, Math.max(0, dep.seatsAvailable - delta));
    },
    listDestinations: () => wait(demoDestinations),
    getDestination: (id) => wait(byId(demoDestinations, id)),
    searchDepartures: ({ originId, destinationId, date }) => {
      const routeIds = demoRoutes
        .filter((r) => r.originId === originId && r.destinationId === destinationId)
        .map((r) => r.id);
      const nowMs = now().getTime();
      return wait(
        departures
          .filter((d) => routeIds.includes(d.routeId) && djiboutiDate(d.departsAt) === date && Date.parse(d.departsAt) > nowMs)
          .sort((a, b) => a.departsAt.localeCompare(b.departsAt))
          .map(departureResult),
      );
    },
    getDeparture: (id) => {
      const dep = departures.find((d) => d.id === id);
      return wait(dep ? departureResult(dep) : null);
    },
    listExperiences: (filter) =>
      wait(demoExperiences.filter((e) => !filter?.destinationId || e.destinationId === filter.destinationId)),
    getExperience: (id) => {
      const experience = byId(demoExperiences, id);
      return wait(
        experience
          ? { experience, provider: provider(experience.providerId), destination: destination(experience.destinationId) }
          : null,
      );
    },
    listStays: (filter) => wait(demoStays.filter((s) => !filter?.destinationId || s.destinationId === filter.destinationId)),
    getStay: (id) => {
      const stay = byId(demoStays, id);
      return wait(stay ? { stay, provider: provider(stay.providerId), destination: destination(stay.destinationId) } : null);
    },
    listSponsored: () => wait(demoSponsored),
  };
}

/**
 * Réservations de démonstration : stockées uniquement sur l'appareil, marquées `isDemo`.
 * Respecte les mêmes règles que le serveur (capacité, transitions) pour un comportement réaliste.
 */
export function createDemoBookings(
  catalog: ReturnType<typeof createDemoCatalog>,
  options: { now?: () => Date } = {},
): BookingRepository {
  const now = options.now ?? (() => new Date());
  let cache: StoredBooking[] | null = null;

  async function load(): Promise<StoredBooking[]> {
    if (cache) return cache;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      cache = raw ? (JSON.parse(raw) as StoredBooking[]) : [];
    } catch {
      cache = [];
    }
    for (const { booking } of cache) {
      if (booking.kind === 'crossing' && holdsCapacity(booking.status)) catalog.holdSeats(booking.itemId, booking.partySize);
    }
    return cache;
  }

  async function save(items: StoredBooking[]) {
    cache = items;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  async function labelFor(request: BookingRequest): Promise<string> {
    if (request.kind === 'crossing') {
      const result = await catalog.getDeparture(request.itemId);
      if (!result) throw new BookingError('unavailable');
      const from = demoDestinations.find((d) => d.id === result.route.originId)?.name ?? '';
      const to = demoDestinations.find((d) => d.id === result.route.destinationId)?.name ?? '';
      if (result.departure.seatsAvailable < request.partySize) throw new BookingError('capacity');
      return `${from} → ${to}`;
    }
    if (request.kind === 'experience') {
      const result = await catalog.getExperience(request.itemId);
      if (!result) throw new BookingError('unavailable');
      return result.experience.title;
    }
    const result = await catalog.getStay(request.itemId);
    if (!result) throw new BookingError('unavailable');
    return result.stay.name;
  }

  return {
    async submit(request) {
      const items = await load();
      const itemLabel = await labelFor(request);
      const at = now().toISOString();
      const booking: Booking = {
        id: `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        reference: generateBookingReference(),
        kind: request.kind,
        itemId: request.itemId,
        itemLabel,
        status: 'submitted',
        serviceDate: request.serviceDate,
        partySize: request.partySize,
        passengers: request.passengers,
        contactName: request.contactName,
        contactPhone: request.contactPhone,
        notes: request.notes,
        createdAt: at,
        updatedAt: at,
        isDemo: true,
      };
      if (booking.kind === 'crossing') catalog.holdSeats(booking.itemId, booking.partySize);
      await save([{ booking, timeline: [{ status: 'submitted', at, note: null }] }, ...items]);
      return booking;
    },
    async listMine() {
      return (await load()).map((item) => item.booking);
    },
    async get(id) {
      const found = (await load()).find((item) => item.booking.id === id);
      return found ? { booking: found.booking, timeline: found.timeline } : null;
    },
    async cancel(id) {
      const items = await load();
      const index = items.findIndex((item) => item.booking.id === id);
      if (index < 0) throw new BookingError('not_found');
      const current = items[index];
      try {
        assertTransition(current.booking.status, 'cancelled', 'customer');
      } catch (error) {
        if (error instanceof InvalidTransitionError) throw new BookingError('invalid_transition');
        throw error;
      }
      const at = now().toISOString();
      const booking: Booking = { ...current.booking, status: 'cancelled', updatedAt: at };
      if (booking.kind === 'crossing' && holdsCapacity(current.booking.status)) {
        catalog.holdSeats(booking.itemId, -booking.partySize);
      }
      const next = [...items];
      next[index] = { booking, timeline: [...current.timeline, { status: 'cancelled', at, note: null }] };
      await save(next);
      return booking;
    },
  };
}

const unavailableAuth: AuthService = {
  available: false,
  getUser: async () => null,
  onChange: () => () => undefined,
  sendEmailCode: async () => {
    throw new BookingError('auth_required');
  },
  verifyEmailCode: async () => {
    throw new BookingError('auth_required');
  },
  signOut: async () => undefined,
};

export function createDemoBackend(options: { delayMs?: number; now?: () => Date } = {}): Backend {
  const catalog = createDemoCatalog(options);
  return { mode: 'demo', catalog, bookings: createDemoBookings(catalog, options), auth: unavailableAuth };
}
