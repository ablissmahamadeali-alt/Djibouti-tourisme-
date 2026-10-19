import { createDemoBackend } from '../demo/demo-backend';
import { demoDestinations, demoExperiences, demoProviders, demoRoutes, demoStays } from '../demo/demo-data';
import { BookingError } from '../repository';
import { toBookingErrorCode } from '../supabase/supabase-backend';

const NOW = new Date('2026-10-12T05:00:00Z'); // lundi 12 octobre, 08:00 à Djibouti
const now = () => NOW;

describe('données de démonstration', () => {
  it('tout élément commercial est marqué comme fictif', () => {
    for (const item of [...demoProviders, ...demoRoutes, ...demoExperiences, ...demoStays]) {
      expect(item.reliability).toBe('demo');
    }
    for (const p of demoProviders) expect(p.name).toMatch(/Exemple.*\(fictif\)/);
  });

  it('les destinations réelles ne sont jamais présentées comme vérifiées', () => {
    for (const d of demoDestinations) expect(d.reliability).not.toBe('verified');
  });
});

describe('backend de démonstration', () => {
  it('ne propose que les départs futurs du trajet demandé', async () => {
    const backend = createDemoBackend({ now });
    const results = await backend.catalog.searchDepartures({ originId: 'dst-djibouti', destinationId: 'dst-tadjourah', date: '2026-10-12' });
    expect(results).toHaveLength(1);
    expect(results[0].departure.departsAt).toBe('2026-10-12T06:00:00Z');
    expect(results[0].route.reliability).toBe('demo');
    const sunday = await backend.catalog.searchDepartures({ originId: 'dst-djibouti', destinationId: 'dst-tadjourah', date: '2026-10-18' });
    expect(sunday).toHaveLength(0);
  });

  it('enregistre une demande fictive, décompte les places puis les libère à l’annulation', async () => {
    const backend = createDemoBackend({ now });
    const [result] = await backend.catalog.searchDepartures({ originId: 'dst-djibouti', destinationId: 'dst-tadjourah', date: '2026-10-14' });
    const before = result.departure.seatsAvailable;
    const booking = await backend.bookings.submit({
      kind: 'crossing',
      itemId: result.departure.id,
      serviceDate: '2026-10-14',
      partySize: 2,
      passengers: [
        { fullName: 'A B', category: 'adult' },
        { fullName: 'C D', category: 'adult' },
      ],
      contactName: 'A B',
      contactPhone: '+25377123456',
      notes: null,
      paymentMethod: 'dmoney',
      acceptsTerms: true,
    });
    expect(booking.isDemo).toBe(true);
    expect(booking.paymentMethod).toBe('dmoney');
    expect(booking.status).toBe('submitted');
    expect((await backend.catalog.getDeparture(result.departure.id))?.departure.seatsAvailable).toBe(before - 2);

    await backend.bookings.cancel(booking.id);
    expect((await backend.catalog.getDeparture(result.departure.id))?.departure.seatsAvailable).toBe(before);
    const detail = await backend.bookings.get(booking.id);
    expect(detail?.timeline.map((t) => t.status)).toEqual(['submitted', 'cancelled']);
    await expect(backend.bookings.cancel(booking.id)).rejects.toEqual(new BookingError('invalid_transition'));
  });

  it('refuse une demande dépassant les places restantes', async () => {
    const backend = createDemoBackend({ now });
    const [result] = await backend.catalog.searchDepartures({ originId: 'dst-djibouti', destinationId: 'dst-tadjourah', date: '2026-10-14' });
    const tooMany = result.departure.seatsAvailable + 1;
    await expect(
      backend.bookings.submit({
        kind: 'crossing',
        itemId: result.departure.id,
        serviceDate: '2026-10-14',
        partySize: tooMany,
        passengers: [],
        contactName: 'A B',
        contactPhone: '+25377123456',
        notes: null,
        paymentMethod: 'cash_on_site',
        acceptsTerms: true,
      }),
    ).rejects.toMatchObject({ code: 'capacity' });
  });
});

describe('traduction des erreurs serveur', () => {
  it.each([
    ['CAPACITY_EXCEEDED', 'capacity'],
    ['RATE_LIMITED', 'rate_limited'],
    ['TypeError: Network request failed', 'network'],
    ['quelque chose d’inattendu', 'unknown'],
  ])('%s → %s', (message, code) => {
    expect(toBookingErrorCode({ message })).toBe(code);
  });
});
