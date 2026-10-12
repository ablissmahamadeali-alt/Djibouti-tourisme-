import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { BOOKING_STATUSES, allowedTransitions, type BookingActor } from '../booking-status';

/** La machine à états est dupliquée en SQL (contrôle serveur) : ce test garantit qu'elles restent identiques. */
describe('parité TypeScript / SQL de la machine à états', () => {
  it('autorise exactement les mêmes transitions', () => {
    const dir = join(__dirname, '..', '..', '..', 'supabase', 'migrations');
    const sql = readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => readFileSync(join(dir, f), 'utf8'))
      .join('\n');
    const body = sql.match(/function public\.booking_transition_allowed[\s\S]*?\$\$([\s\S]*?)\$\$/)?.[1] ?? '';
    const fromSql = [...body.matchAll(/\('(\w+)', '(\w+)', '(\w+)'\)/g)].map((m) => `${m[1]}>${m[2]}:${m[3]}`).sort();

    const actors: BookingActor[] = ['customer', 'provider', 'admin'];
    const fromTs = BOOKING_STATUSES.flatMap((from) =>
      actors.flatMap((actor) => allowedTransitions(from, actor).map((to) => `${from}>${to}:${actor}`)),
    ).sort();

    expect(fromSql.length).toBeGreaterThan(0);
    expect(fromSql).toEqual(fromTs);
  });
});
