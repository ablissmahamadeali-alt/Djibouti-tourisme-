import { useBackend } from '@/data/BackendProvider';
import { t } from '@/i18n';

import { Notice } from './ui';

/** Rappel permanent, en mode démonstration, que rien n'est réel. */
export function DemoBanner() {
  const { mode } = useBackend();
  if (mode !== 'demo') return null;
  return <Notice tone="demo" body={t('reliability.demoBanner')} />;
}
