import { useCallback, useEffect, useEffectEvent, useState } from 'react';

/**
 * Chargement asynchrone avec états explicites et cache mémoire.
 * Stratégie « afficher le cache puis rafraîchir » : utile sur réseau instable.
 * Le cache est réservé aux données publiques (catalogue) : passer `cache: false`
 * pour les données personnelles.
 */
const memoryCache = new Map<string, unknown>();

export type Resource<T> = {
  data: T | undefined;
  error: Error | null;
  loading: boolean;
  refreshing: boolean;
  reload: () => void;
};

type Settled<T> = { requestId: string; key: string; data: T | undefined; error: Error | null };

export function useResource<T>(key: string | null, load: () => Promise<T>, options: { cache?: boolean } = {}): Resource<T> {
  const useCache = options.cache ?? true;
  const [nonce, setNonce] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const requestId = key === null ? null : `${key}#${nonce}`;

  const runLoad = useEffectEvent(() => load());

  useEffect(() => {
    if (key === null || requestId === null) return;
    let active = true;
    runLoad()
      .then((value) => {
        if (!active) return;
        if (useCache) memoryCache.set(key, value);
        setSettled({ requestId, key, data: value, error: null });
      })
      .catch((e: unknown) => {
        if (!active) return;
        setSettled((previous) => ({
          requestId,
          key,
          data: previous?.key === key ? previous.data : undefined,
          error: e instanceof Error ? e : new Error(String(e)),
        }));
      });
    return () => {
      active = false;
    };
  }, [key, requestId, useCache]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  // État dérivé : aucune mise à jour d'état synchrone dans l'effet.
  const pending = requestId !== null && settled?.requestId !== requestId;
  const data =
    key === null
      ? undefined
      : settled?.key === key && settled.data !== undefined
        ? settled.data
        : useCache
          ? (memoryCache.get(key) as T | undefined)
          : undefined;
  const error = !pending && settled?.requestId === requestId ? settled.error : null;

  return { data, error, loading: pending && data === undefined, refreshing: pending && data !== undefined, reload };
}

export function clearResourceCache() {
  memoryCache.clear();
}
