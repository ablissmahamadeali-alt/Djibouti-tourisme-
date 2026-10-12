import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '..', 'migrations');

export const ids = {
  admin: '00000000-0000-4000-8000-000000000001',
  alice: '00000000-0000-4000-8000-000000000002',
  bob: '00000000-0000-4000-8000-000000000003',
  operator: '00000000-0000-4000-8000-000000000004',
  otherOperator: '00000000-0000-4000-8000-000000000005',
  providerA: '10000000-0000-4000-8000-000000000001',
  providerB: '10000000-0000-4000-8000-000000000002',
  pendingProvider: '10000000-0000-4000-8000-000000000003',
  djibouti: '20000000-0000-4000-8000-000000000001',
  tadjourah: '20000000-0000-4000-8000-000000000002',
  route: '30000000-0000-4000-8000-000000000001',
  departure: '40000000-0000-4000-8000-000000000001',
  pastDeparture: '40000000-0000-4000-8000-000000000002',
  experience: '50000000-0000-4000-8000-000000000001',
  hiddenExperience: '50000000-0000-4000-8000-000000000002',
};

/** Base neuve : simulation Supabase + migrations dans l'ordre + jeu de test. */
export async function freshDatabase() {
  const db = new PGlite();
  await db.exec(readFileSync(join(here, 'auth-stub.sql'), 'utf8'));
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(migrationsDir, file), 'utf8'));
  }
  await db.exec(`
    insert into auth.users (id, email) values
      ('${ids.admin}', 'admin@example.test'), ('${ids.alice}', 'alice@example.test'),
      ('${ids.bob}', 'bob@example.test'), ('${ids.operator}', 'op@example.test'),
      ('${ids.otherOperator}', 'op2@example.test');
    insert into public.user_roles (user_id, role) values ('${ids.admin}', 'admin');
    insert into public.providers (id, name, kind, status, reliability) values
      ('${ids.providerA}', 'Opérateur A (test)', 'maritime_operator', 'verified', 'demo'),
      ('${ids.providerB}', 'Opérateur B (test)', 'agency', 'verified', 'demo'),
      ('${ids.pendingProvider}', 'Candidat (test)', 'agency', 'pending', 'unverified');
    insert into public.provider_members (provider_id, user_id, member_role) values
      ('${ids.providerA}', '${ids.operator}', 'owner'),
      ('${ids.providerB}', '${ids.otherOperator}', 'owner');
    insert into public.destinations (id, slug, name, region, is_port, published) values
      ('${ids.djibouti}', 'djibouti', 'Djibouti', 'djibouti', true, true),
      ('${ids.tadjourah}', 'tadjourah', 'Tadjourah', 'tadjourah', true, true);
    insert into public.routes (id, origin_id, destination_id, provider_id, adult_fare_djf, active, reliability)
      values ('${ids.route}', '${ids.djibouti}', '${ids.tadjourah}', '${ids.providerA}', 1000, true, 'demo');
    insert into public.departures (id, route_id, departs_at, capacity, reliability) values
      ('${ids.departure}', '${ids.route}', now() + interval '3 days', 5, 'demo'),
      ('${ids.pastDeparture}', '${ids.route}', now() - interval '1 day', 5, 'demo');
    insert into public.experiences (id, title, kind, destination_id, provider_id, published, price_from_djf) values
      ('${ids.experience}', 'Excursion test', 'excursion', '${ids.tadjourah}', '${ids.providerB}', true, 5000),
      ('${ids.hiddenExperience}', 'Brouillon', 'excursion', '${ids.tadjourah}', '${ids.providerB}', false, null);
  `);
  return db;
}

/** Exécute `fn` comme le ferait l'API Supabase pour cet utilisateur (null = visiteur anonyme). */
export async function as(db, userId, fn) {
  await db.exec(`set role ${userId ? 'authenticated' : 'anon'}`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? '']);
  try {
    return await fn(db);
  } finally {
    await db.exec('reset role');
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}

export function inDays(days) {
  const d = new Date(Date.now() + 3 * 3600_000 + days * 86400_000);
  return d.toISOString().slice(0, 10);
}

export async function requestCrossing(db, userId, partySize, overrides = {}) {
  const passengers = Array.from({ length: partySize }, (_, i) => ({ fullName: `Passager ${i + 1}`, category: 'adult' }));
  return as(db, userId, (c) =>
    c.query(
      `select * from public.request_booking($1, $2, $3, $4, $5::jsonb, $6, $7, $8)`,
      [
        overrides.kind ?? 'crossing',
        overrides.itemId ?? ids.departure,
        overrides.serviceDate ?? inDays(3),
        partySize,
        JSON.stringify(overrides.passengers ?? passengers),
        'Client Test',
        overrides.phone ?? '+25377123456',
        null,
      ],
    ),
  );
}
