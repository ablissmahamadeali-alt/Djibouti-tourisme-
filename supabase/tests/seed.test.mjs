// Vérifie que le jeu de démonstration s'applique sur le schéma et respecte les contraintes.
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

test('seed.sql s’applique et tout le contenu commercial est marqué « demo »', async () => {
  const db = new PGlite();
  await db.exec(readFileSync(join(here, 'auth-stub.sql'), 'utf8'));
  const dir = join(here, '..', 'migrations');
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) await db.exec(readFileSync(join(dir, f), 'utf8'));
  await db.exec(readFileSync(join(here, '..', 'seed.sql'), 'utf8'));

  const deps = await db.query(`select count(*)::int n from public.departures`);
  assert.ok(deps.rows[0].n >= 12);
  for (const table of ['providers', 'routes', 'departures', 'experiences']) {
    const res = await db.query(`select count(*)::int n from public.${table} where reliability <> 'demo'`);
    assert.equal(res.rows[0].n, 0, `${table} contient des données non marquées « demo »`);
  }
  const verified = await db.query(`select count(*)::int n from public.destinations where reliability = 'verified'`);
  assert.equal(verified.rows[0].n, 0);
});
