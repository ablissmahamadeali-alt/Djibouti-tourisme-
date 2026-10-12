import { getLocales } from 'expo-localization';

import { en } from './en';
import { fr, type Dictionary } from './fr';

/**
 * Traductions minimalistes et typées. Pour ajouter une langue (ar, so, aa) :
 * créer un fichier `xx.ts` de type `Dictionary`, l'ajouter à `dictionaries`.
 * L'arabe nécessitera en plus la gestion RTL (I18nManager).
 */
const dictionaries = { fr, en } satisfies Record<string, Dictionary>;
export type Locale = keyof typeof dictionaries;

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
type Leaves<T> = T extends string
  ? never
  : T extends readonly unknown[]
    ? never
    : { [K in keyof T]: T[K] extends string ? K : Join<K, Leaves<T[K]>> }[keyof T];
export type TranslationKey = Leaves<Dictionary>;

export function detectLocale(): Locale {
  const code = getLocales()[0]?.languageCode;
  return code === 'en' ? 'en' : 'fr';
}

let current: Locale = detectLocale();

export function setLocale(locale: Locale): void {
  current = locale;
}

export function getLocale(): Locale {
  return current;
}

export function dictionary(locale: Locale = current): Dictionary {
  return dictionaries[locale];
}

function lookup(dict: Dictionary, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/** Traduit une clé ; `{param}` est remplacé par la valeur fournie. Clé inconnue → la clé elle-même. */
export function t(key: TranslationKey | string, params?: Record<string, string | number>): string {
  const text = lookup(dictionaries[current], key) ?? lookup(fr, key) ?? key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
