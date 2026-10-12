import { createDemoBackend } from './demo/demo-backend';
import type { Backend } from './repository';
import { createSupabaseBackend } from './supabase/supabase-backend';

/**
 * Choix du backend au démarrage :
 *  - variables EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY présentes → Supabase ;
 *  - sinon → mode démonstration (données fictives, rien n'est transmis).
 *
 * Seule la clé PUBLIQUE (publishable / anon) peut figurer ici : elle est conçue pour être
 * embarquée dans l'application, la sécurité reposant sur les politiques RLS.
 * La clé `service_role` / secrète ne doit JAMAIS être utilisée dans l'application.
 */
export function createBackend(): Backend {
  // Accès direct obligatoire : Expo remplace ces expressions au moment de la compilation.
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) return createSupabaseBackend(url, key);
  return createDemoBackend({ delayMs: 250 });
}
