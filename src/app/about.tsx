import { AppText, Screen } from '@/components/ui';
import { dictionary } from '@/i18n';

export default function AboutScreen() {
  return (
    <Screen>
      {dictionary().about.body.map((paragraph) => (
        <AppText key={paragraph}>{paragraph}</AppText>
      ))}
    </Screen>
  );
}
