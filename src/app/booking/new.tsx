import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  Checkbox,
  ChoiceChips,
  DateStrip,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
  Screen,
  Section,
  StatusBadge,
  Stepper,
  TextField,
} from '@/components/ui';
import { useBackend } from '@/data/BackendProvider';
import { BookingError, type BookingErrorCode } from '@/data/repository';
import { useResource } from '@/data/use-resource';
import { MAX_PARTY_SIZE, validateBookingRequest, type FieldErrors } from '@/domain/booking-request';
import type { BookableKind, Booking, Passenger } from '@/domain/models';
import { PAYMENT_METHODS, type PaymentMethod } from '@/domain/payment';
import { formatDate } from '@/domain/format';
import { djiboutiDate, djiboutiToday } from '@/domain/time';
import { spacing } from '@/design/tokens';
import { getLocale, t } from '@/i18n';

const errorMessage: Partial<Record<BookingErrorCode, string>> = {
  network: 'booking.errorNetwork',
  capacity: 'booking.errorCapacity',
  auth_required: 'booking.signInRequired',
};

function isKind(value: string | undefined): value is BookableKind {
  return value === 'crossing' || value === 'experience' || value === 'stay';
}

export default function NewBookingScreen() {
  const params = useLocalSearchParams<{ kind?: string; itemId?: string; date?: string }>();
  const { catalog, bookings, mode, user } = useBackend();
  const kind = isKind(params.kind) ? params.kind : null;
  const itemId = params.itemId ?? null;
  const today = djiboutiToday();

  const item = useResource(kind && itemId ? `booking-item:${kind}:${itemId}` : null, async () => {
    if (kind === 'crossing') {
      const r = itemId ? await catalog.getDeparture(itemId) : null;
      if (!r) return null;
      const destinations = await catalog.listDestinations();
      const name = (id: string) => destinations.find((d) => d.id === id)?.name ?? '';
      return { label: `${name(r.route.originId)} → ${name(r.route.destinationId)}`, fixedDate: djiboutiDate(r.departure.departsAt), maxParty: r.departure.seatsAvailable };
    }
    if (kind === 'experience') {
      const r = itemId ? await catalog.getExperience(itemId) : null;
      return r ? { label: r.experience.title, fixedDate: null, maxParty: MAX_PARTY_SIZE } : null;
    }
    const r = itemId ? await catalog.getStay(itemId) : null;
    return r ? { label: r.stay.name, fixedDate: null, maxParty: MAX_PARTY_SIZE } : null;
  }, { cache: false });

  const [serviceDate, setServiceDate] = useState(params.date && params.date >= today ? params.date : today);
  const [partySize, setPartySize] = useState(1);
  const [passengers, setPassengers] = useState<Passenger[]>([{ fullName: '', category: 'adult' }]);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [acceptsTerms, setAcceptsTerms] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Booking | null>(null);

  if (!kind || !itemId) return <Screen><EmptyState icon="alert-circle" title={t('common.notFound')} /></Screen>;
  if (item.loading) return <Screen><LoadingState rows={4} /></Screen>;
  if (item.error) return <Screen><ErrorState onRetry={item.reload} /></Screen>;
  if (!item.data) return <Screen><EmptyState icon="alert-circle" title={t('common.notFound')} /></Screen>;

  const needsSignIn = mode === 'supabase' && !user;
  const isCrossing = kind === 'crossing';
  const effectiveDate = item.data.fixedDate ?? serviceDate;
  const maxParty = Math.max(1, Math.min(MAX_PARTY_SIZE, item.data.maxParty));

  if (created) {
    return (
      <Screen>
        <Notice tone="success" title={t('booking.sentTitle')} body={created.isDemo ? t('booking.sentDemoBody') : t('booking.sentBody')} />
        <Card>
          <AppText variant="small" tone="muted">
            {t('booking.reference')}
          </AppText>
          <AppText variant="title" selectable>
            {created.reference}
          </AppText>
          <AppText variant="bodyStrong">{created.itemLabel}</AppText>
          <StatusBadge status={created.status} />
          <AppText variant="small" tone="muted">
            {t('booking.notGuaranteed')}
          </AppText>
        </Card>
        <Button
          label={t('booking.viewStatus')}
          icon="arrow-right"
          onPress={() => router.replace({ pathname: '/booking/[id]', params: { id: created.id } })}
        />
      </Screen>
    );
  }

  const updatePartySize = (size: number) => {
    setPartySize(size);
    setPassengers((current) =>
      Array.from({ length: size }, (_, i) => current[i] ?? { fullName: '', category: 'adult' as const }),
    );
  };

  const submit = async () => {
    setSubmitError(null);
    const result = validateBookingRequest(
      {
        kind,
        itemId,
        serviceDate: effectiveDate,
        partySize,
        passengers: isCrossing ? passengers : [],
        contactName,
        contactPhone,
        notes,
        // Valeur vide si rien n'est choisi : la validation affichera le message adéquat.
        paymentMethod: (paymentMethod ?? '') as PaymentMethod,
        acceptsTerms: acceptsTerms as true,
      },
      today,
    );
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      // Aucune confirmation n'est affichée tant que le serveur n'a pas répondu positivement.
      setCreated(await bookings.submit(result.value));
    } catch (error) {
      const code = error instanceof BookingError ? error.code : 'network';
      setSubmitError(t(errorMessage[code] ?? 'booking.errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (key: string) => (errors[key] ? t(errors[key] as string) : undefined);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Card>
          <AppText variant="small" tone="muted">
            {t('booking.summary')}
          </AppText>
          <AppText variant="heading">{item.data.label}</AppText>
          {item.data.fixedDate && <AppText tone="muted">{formatDate(item.data.fixedDate, getLocale())}</AppText>}
        </Card>

        {mode === 'demo' && <Notice tone="demo" body={t('reliability.demoBanner')} />}
        {needsSignIn && (
          <View style={styles.gap}>
            <Notice tone="info" body={t('booking.signInRequired')} />
            <Button label={t('account.signIn')} icon="log-in" onPress={() => router.push('/sign-in')} />
          </View>
        )}

        {!item.data.fixedDate && (
          <DateStrip label={t('booking.date')} start={today} days={60} value={serviceDate} onChange={setServiceDate} />
        )}
        {fieldError('serviceDate') && <AppText variant="small" tone="danger">{fieldError('serviceDate')}</AppText>}

        <Stepper label={t('booking.partySize')} value={partySize} max={maxParty} onChange={updatePartySize} />

        {isCrossing && (
          <Section title={t('booking.passengers')}>
            {passengers.map((p, index) => (
              <View key={index} style={styles.gap}>
                <TextField
                  label={t('booking.passengerName', { index: index + 1 })}
                  value={p.fullName}
                  autoComplete={index === 0 ? 'name' : 'off'}
                  error={fieldError(`passengers.${index}`)}
                  onChangeText={(fullName) =>
                    setPassengers((list) => list.map((x, i) => (i === index ? { ...x, fullName } : x)))
                  }
                />
                <ChoiceChips
                  hideLabel
                  label={t('booking.passengerCategory', { index: index + 1 })}
                  value={p.category}
                  options={(['adult', 'child', 'infant'] as const).map((c) => ({ value: c, label: t(`booking.category.${c}`) }))}
                  onChange={(category) => setPassengers((list) => list.map((x, i) => (i === index ? { ...x, category } : x)))}
                />
              </View>
            ))}
            {fieldError('passengers') && <AppText variant="small" tone="danger">{fieldError('passengers')}</AppText>}
          </Section>
        )}

        <TextField
          label={t('booking.contactName')}
          value={contactName}
          onChangeText={setContactName}
          autoComplete="name"
          textContentType="name"
          error={fieldError('contactName')}
        />
        <TextField
          label={t('booking.contactPhone')}
          value={contactPhone}
          onChangeText={setContactPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          hint={t('booking.contactPhoneHint')}
          error={fieldError('contactPhone')}
        />
        <View style={styles.gap}>
          <ChoiceChips
            label={t('booking.paymentMethod')}
            value={paymentMethod}
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: t(`booking.payment.${m}`) }))}
            onChange={setPaymentMethod}
          />
          {fieldError('paymentMethod') && <AppText variant="small" tone="danger">{fieldError('paymentMethod')}</AppText>}
          <Notice tone="info" body={t('booking.paymentNotice')} />
        </View>
        <TextField
          label={t('booking.notes')}
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={500}
          error={fieldError('notes')}
        />
        <Checkbox label={t('booking.terms')} checked={acceptsTerms} onChange={setAcceptsTerms} error={fieldError('acceptsTerms')} />

        {submitError && <Notice tone="danger" title={t('booking.errorTitle')} body={submitError} />}

        <Button
          label={submitting ? t('booking.submitting') : t('booking.submit')}
          icon="send"
          loading={submitting}
          disabled={needsSignIn}
          onPress={submit}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.sm },
});
