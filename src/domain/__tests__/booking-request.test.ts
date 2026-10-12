import { normalizePhone, validateBookingRequest, type BookingRequestInput } from '../booking-request';
import { generateBookingReference, isBookingReference } from '../booking-reference';
import { formatDate, formatDjf, formatDuration, formatPhone } from '../format';
import { addDays, djiboutiDate, djiboutiTime, djiboutiToday } from '../time';

const TODAY = '2026-10-12';

function crossing(overrides: Partial<BookingRequestInput> = {}): BookingRequestInput {
  return {
    kind: 'crossing',
    itemId: 'dep-1',
    serviceDate: '2026-10-20',
    partySize: 2,
    passengers: [
      { fullName: 'Amina Hassan', category: 'adult' },
      { fullName: 'Omar Hassan', category: 'child' },
    ],
    contactName: 'Amina Hassan',
    contactPhone: '77 12 34 56',
    notes: '',
    acceptsTerms: true,
    ...overrides,
  };
}

describe('normalizePhone', () => {
  it.each([
    ['77 12 34 56', '+25377123456'],
    ['+253 77 12 34 56', '+25377123456'],
    ['0025321123456', '+25321123456'],
    ['+33 6 12 34 56 78', '+33612345678'],
  ])('%s → %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(['12345', '+253 12 34 56 78', 'abc', ''])('rejette %s', (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe('validateBookingRequest', () => {
  it('accepte une demande complète et normalise les champs', () => {
    const result = validateBookingRequest(crossing(), TODAY);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.contactPhone).toBe('+25377123456');
      expect(result.value.notes).toBeNull();
    }
  });

  it('refuse une date passée', () => {
    const result = validateBookingRequest(crossing({ serviceDate: '2026-10-11' }), TODAY);
    expect(result).toEqual({ ok: false, errors: expect.objectContaining({ serviceDate: 'validation.datePast' }) });
  });

  it('exige un passager nommé par place pour une traversée', () => {
    const result = validateBookingRequest(crossing({ partySize: 3 }), TODAY);
    expect(result).toEqual({ ok: false, errors: expect.objectContaining({ passengers: 'validation.passengers' }) });
  });

  it('rattache l’erreur au passager concerné', () => {
    const result = validateBookingRequest(
      crossing({ passengers: [{ fullName: 'Amina Hassan', category: 'adult' }, { fullName: ' ', category: 'child' }] }),
      TODAY,
    );
    expect(result).toEqual({ ok: false, errors: { 'passengers.1': 'validation.name' } });
  });

  it('n’exige pas de manifeste pour une excursion', () => {
    const result = validateBookingRequest(crossing({ kind: 'experience', partySize: 4, passengers: [] }), TODAY);
    expect(result.ok).toBe(true);
  });

  it('refuse sans acceptation des conditions', () => {
    const result = validateBookingRequest(
      crossing({ acceptsTerms: false as unknown as true }),
      TODAY,
    );
    expect(result).toEqual({ ok: false, errors: expect.objectContaining({ acceptsTerms: 'validation.terms' }) });
  });

  it('borne le nombre de voyageurs', () => {
    const result = validateBookingRequest(crossing({ kind: 'stay', partySize: 0, passengers: [] }), TODAY);
    expect(result).toEqual({ ok: false, errors: expect.objectContaining({ partySize: 'validation.partySize' }) });
  });

  it('signale un téléphone invalide', () => {
    const result = validateBookingRequest(crossing({ contactPhone: '123' }), TODAY);
    expect(result).toEqual({ ok: false, errors: expect.objectContaining({ contactPhone: 'validation.phone' }) });
  });
});

describe('références de réservation', () => {
  it('génère des références au bon format, sans caractères ambigus', () => {
    for (let i = 0; i < 200; i++) {
      const ref = generateBookingReference();
      expect(isBookingReference(ref)).toBe(true);
      expect(ref.slice(3)).not.toMatch(/[01OIL]/);
    }
  });
});

describe('heure de Djibouti et formats', () => {
  it('calcule la date locale même quand il est encore la veille en UTC', () => {
    expect(djiboutiToday(new Date('2026-10-12T22:30:00Z'))).toBe('2026-10-13');
    expect(djiboutiTime('2026-10-12T05:00:00Z')).toBe('08:00');
    expect(djiboutiDate('2026-10-12T22:00:00Z')).toBe('2026-10-13');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('formate les montants et durées', () => {
    expect(formatDjf(12500)).toBe('12 500 DJF');
    expect(formatDuration(150)).toBe('2 h 30');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDate('2026-10-14')).toBe('mer. 14 oct. 2026');
    expect(formatDate('2026-10-14', 'en')).toBe('Wed 14 Oct 2026');
    expect(formatPhone('+25377123456')).toBe('+253 77 12 34 56');
    expect(formatPhone('+33612345678')).toBe('+33612345678');
  });
});
