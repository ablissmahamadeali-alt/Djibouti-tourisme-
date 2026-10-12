import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/ui';
import { colors, fontFamilies } from '@/design/tokens';
import { t } from '@/i18n';

function tabIcon(name: IconName) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <Icon name={name} size={22} color={color} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fontFamilies.medium, fontSize: 11 },
      }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="crossings" options={{ title: t('tabs.crossings'), tabBarIcon: tabIcon('anchor') }} />
      <Tabs.Screen name="explore" options={{ title: t('tabs.explore'), tabBarIcon: tabIcon('compass') }} />
      <Tabs.Screen name="stays" options={{ title: t('tabs.stays'), tabBarIcon: tabIcon('key') }} />
      <Tabs.Screen name="account" options={{ title: t('tabs.account'), tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}
