import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { BookingRow } from '@/components/cards';
import { AppText, Button, Card, EmptyState, ErrorState, LoadingState, Notice, Screen, Section } from '@/components/ui';
import { useBackend } from '@/data/BackendProvider';
import { useResource } from '@/data/use-resource';
import { t } from '@/i18n';

export default function AccountScreen() {
  const { mode, auth, user, bookings } = useBackend();
  const canListBookings = mode === 'demo' || user !== null;
  const mine = useResource(canListBookings ? `bookings:${user?.id ?? 'demo'}` : null, () => bookings.listMine(), {
    cache: false,
  });

  // Rafraîchit la liste au retour sur l'onglet (après une nouvelle demande, par exemple).
  const { reload } = mine;
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return (
    <Screen topInset>
      <AppText variant="title">{t('account.title')}</AppText>

      {mode === 'demo' ? (
        <Notice tone="demo" body={t('account.demoAuth')} />
      ) : user ? (
        <Card>
          <AppText>{t('account.signedInAs', { email: user.email ?? '—' })}</AppText>
          <Button label={t('account.signOut')} variant="secondary" icon="log-out" onPress={() => auth.signOut()} />
        </Card>
      ) : (
        <Button label={t('account.signIn')} icon="log-in" onPress={() => router.push('/sign-in')} />
      )}

      {canListBookings && (
        <Section title={t('account.myBookings')}>
          {mine.loading && <LoadingState rows={2} />}
          {mine.error && <ErrorState onRetry={mine.reload} />}
          {mine.data?.length === 0 && <EmptyState icon="inbox" title={t('account.noBookings')} />}
          {mine.data?.map((b) => (
            <BookingRow key={b.id} booking={b} />
          ))}
        </Section>
      )}

      <Section title={t('account.privacy')}>
        <AppText variant="small" tone="muted">
          {t('account.privacyBody')}
        </AppText>
      </Section>

      <Section title={t('account.providerSpace')}>
        <AppText variant="small" tone="muted">
          {t('account.providerSpaceBody')}
        </AppText>
      </Section>

      <Button label={t('account.about')} variant="ghost" icon="info" onPress={() => router.push('/about')} />
    </Screen>
  );
}
