import { router } from 'expo-router';
import { useState } from 'react';
import { z } from 'zod';

import { AppText, Button, Notice, Screen, TextField } from '@/components/ui';
import { useBackend } from '@/data/BackendProvider';
import { t } from '@/i18n';

/**
 * Connexion sans mot de passe par code envoyé par e-mail (OTP).
 * Choix économique : pas de frais SMS. La connexion par SMS pourra être ajoutée
 * (fournisseur SMS à contractualiser, coût par message).
 */
export default function SignInScreen() {
  const { auth } = useBackend();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!auth.available) {
    return (
      <Screen>
        <Notice tone="demo" body={t('auth.unavailable')} />
      </Screen>
    );
  }

  const sendCode = async () => {
    const parsed = z.email().safeParse(email.trim());
    if (!parsed.success) {
      setError(t('auth.invalidEmail'));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await auth.sendEmailCode(parsed.data);
      setStep('code');
    } catch {
      setError(t('booking.errorNetwork'));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setError(null);
    setBusy(true);
    try {
      await auth.verifyEmailCode(email.trim(), code.trim());
      router.back();
    } catch {
      setError(t('auth.invalidCode'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      {step === 'email' ? (
        <>
          <TextField
            label={t('auth.emailLabel')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            error={error ?? undefined}
          />
          <Button label={t('auth.sendCode')} icon="mail" loading={busy} onPress={sendCode} />
        </>
      ) : (
        <>
          <AppText tone="muted">{t('auth.codeSent', { email: email.trim() })}</AppText>
          <TextField
            label={t('auth.codeLabel')}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={10}
            error={error ?? undefined}
          />
          <Button label={t('auth.verify')} icon="check" loading={busy} onPress={verify} />
        </>
      )}
    </Screen>
  );
}
