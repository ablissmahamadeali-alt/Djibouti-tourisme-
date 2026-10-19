import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import NewBookingScreen from '@/app/booking/new';
import { BackendProvider } from '@/data/BackendProvider';
import { createDemoBackend } from '@/data/demo/demo-backend';
import { BookingError, type Backend } from '@/data/repository';
import { setLocale } from '@/i18n';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ kind: 'experience', itemId: 'exp-assal-day' }),
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

function backendWith(submit: Backend['bookings']['submit']): Backend {
  const demo = createDemoBackend();
  return { ...demo, bookings: { ...demo.bookings, submit } };
}

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderWith(backend: Backend) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <SafeAreaProvider initialMetrics={metrics}>
      <BackendProvider backend={backend}>{children}</BackendProvider>
    </SafeAreaProvider>
  );
  return await render(<NewBookingScreen />, { wrapper: Wrapper });
}

async function fillAndSubmit() {
  await screen.findByText('Lac Assal et Ghoubbet (exemple)');
  await fireEvent.changeText(screen.getByLabelText('Votre nom'), 'Amina Hassan');
  await fireEvent.changeText(screen.getByLabelText('Téléphone'), '77 12 34 56');
  await fireEvent.press(screen.getByRole('radio', { name: 'D-Money' }));
  await fireEvent.press(screen.getByRole('checkbox'));
  await fireEvent.press(screen.getByRole('button', { name: 'Envoyer la demande' }));
}

beforeAll(() => setLocale('fr'));

describe('demande de réservation', () => {
  it('n’affiche aucune confirmation si le réseau échoue', async () => {
    const submit = jest.fn().mockRejectedValue(new BookingError('network'));
    await renderWith(backendWith(submit));
    await fillAndSubmit();
    expect(await screen.findByText(/Connexion impossible\. Rien n’a été réservé/)).toBeTruthy();
    expect(screen.queryByText('Demande envoyée')).toBeNull();
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ contactPhone: '+25377123456', kind: 'experience', paymentMethod: 'dmoney' }));
  });

  it('signale clairement le manque de places', async () => {
    const submit = jest.fn().mockRejectedValue(new BookingError('capacity'));
    await renderWith(backendWith(submit));
    await fillAndSubmit();
    expect(await screen.findByText('Il ne reste plus assez de places sur ce départ.')).toBeTruthy();
  });

  it('n’envoie rien tant que le formulaire est invalide', async () => {
    const submit = jest.fn();
    await renderWith(backendWith(submit));
    await screen.findByText('Lac Assal et Ghoubbet (exemple)');
    await fireEvent.press(screen.getByRole('button', { name: 'Envoyer la demande' }));
    expect(await screen.findByText('Vous devez accepter ce point pour continuer.')).toBeTruthy();
    expect(submit).not.toHaveBeenCalled();
  });

  it('affiche la référence une fois la demande enregistrée (mode démo)', async () => {
    const demo = createDemoBackend();
    await renderWith(demo);
    await fillAndSubmit();
    await waitFor(() => expect(screen.getByText('Demande envoyée')).toBeTruthy());
    expect(screen.getByText(/^DS-[A-Z2-9]{8}$/)).toBeTruthy();
    expect(screen.getByText(/Aucun prestataire n’a été contacté/)).toBeTruthy();
  });
});
