import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { createBackend } from './backend';
import type { AuthUser, Backend } from './repository';

type BackendContextValue = Backend & { user: AuthUser | null; authReady: boolean };

const BackendContext = createContext<BackendContextValue | null>(null);

export function BackendProvider({ backend: injected, children }: { backend?: Backend; children: ReactNode }) {
  const [backend] = useState(() => injected ?? createBackend());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;
    backend.auth
      .getUser()
      .then((u) => active && setUser(u))
      .finally(() => active && setAuthReady(true));
    const unsubscribe = backend.auth.onChange(setUser);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [backend]);

  const value = useMemo(() => ({ ...backend, user, authReady }), [backend, user, authReady]);
  return <BackendContext.Provider value={value}>{children}</BackendContext.Provider>;
}

export function useBackend(): BackendContextValue {
  const value = useContext(BackendContext);
  if (!value) throw new Error('useBackend doit être utilisé dans <BackendProvider>');
  return value;
}
