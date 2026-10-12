import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BackendProvider } from '@/data/BackendProvider';
import { colors, fontFamilies } from '@/design/tokens';
import { t } from '@/i18n';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  // En cas d'échec de chargement des polices, on continue avec les polices système.
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <BackendProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.brand,
            headerTitleStyle: { fontFamily: fontFamilies.semibold, fontSize: 17, color: colors.text },
            headerShadowVisible: false,
            headerBackButtonDisplayMode: 'minimal',
            contentStyle: { backgroundColor: colors.background },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="destination/[id]" options={{ title: '' }} />
          <Stack.Screen name="experience/[id]" options={{ title: '' }} />
          <Stack.Screen name="stay/[id]" options={{ title: '' }} />
          <Stack.Screen name="departure/[id]" options={{ title: t('crossings.detailTitle') }} />
          <Stack.Screen name="booking/new" options={{ title: t('booking.title'), presentation: 'modal' }} />
          <Stack.Screen name="booking/[id]" options={{ title: t('booking.statusTitle') }} />
          <Stack.Screen name="sign-in" options={{ title: t('auth.title'), presentation: 'modal' }} />
          <Stack.Screen name="about" options={{ title: t('about.title') }} />
        </Stack>
      </BackendProvider>
    </SafeAreaProvider>
  );
}
