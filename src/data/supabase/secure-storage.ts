import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Stockage de session pour Supabase.
 * - iOS / Android : Keychain / Keystore via expo-secure-store (chiffré par le système).
 *   SecureStore limite la taille d'une valeur : on découpe donc le jeton en morceaux.
 * - Web : localStorage (le tableau de bord d'administration web devra utiliser des cookies httpOnly).
 */
const CHUNK_SIZE = 1800;

function chunkKey(key: string, index: number) {
  return `${key}.${index}`;
}

async function readChunked(key: string): Promise<string | null> {
  const count = await SecureStore.getItemAsync(`${key}.count`);
  if (!count) return null;
  const parts: string[] = [];
  for (let i = 0; i < Number(count); i++) {
    const part = await SecureStore.getItemAsync(chunkKey(key, i));
    if (part === null) return null;
    parts.push(part);
  }
  return parts.join('');
}

async function removeChunked(key: string): Promise<void> {
  const count = Number((await SecureStore.getItemAsync(`${key}.count`)) ?? 0);
  for (let i = 0; i < count; i++) await SecureStore.deleteItemAsync(chunkKey(key, i));
  await SecureStore.deleteItemAsync(`${key}.count`);
}

async function writeChunked(key: string, value: string): Promise<void> {
  await removeChunked(key);
  const count = Math.ceil(value.length / CHUNK_SIZE);
  for (let i = 0; i < count; i++) {
    await SecureStore.setItemAsync(chunkKey(key, i), value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
  }
  await SecureStore.setItemAsync(`${key}.count`, String(count));
}

export const secureSessionStorage = {
  getItem: (key: string) =>
    Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.getItem(key) ?? null) : readChunked(key),
  setItem: (key: string, value: string) =>
    Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.setItem(key, value)) : writeChunked(key, value),
  removeItem: (key: string) =>
    Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.removeItem(key)) : removeChunked(key),
};
