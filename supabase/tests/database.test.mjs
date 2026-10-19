// Tests de la base : politiques RLS, garde-fous et fonctions de réservation.
// Exécution : npm run test:db  (PostgreSQL embarqué via PGlite, aucun serveur requis)
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

import { as, freshDatabase, ids, inDays, requestCrossing } from './helpers.mjs';

async function rejects(promise, pattern) {
  await assert.rejects(promise, (error) => {
    assert.match(String(error.message), pattern);
    return true;
  });
}

describe('catalogue public (visiteur anonyme)', () => {
  let db;
  before(async () => (db = await freshDatabase()));

  it('voit les destinations publiées et les offres des prestataires vérifiés uniquement', async () => {
    await as(db, null, async (c) => {
      const exps = await c.query('select id from public.experiences');
      assert.deepEqual(exps.rows.map((r) => r.id), [ids.experience]);
      const providers = await c.query('select id from public.providers order by id');
      assert.equal(providers.rows.some((r) => r.id === ids.pendingProvider), false);
    });
  });

  it('ne lit ni réservations, ni profils, ni journal d’audit', async () => {
    await as(db, null, async (c) => {
      await rejects(c.query('select * from public.bookings'), /permission denied/);
      await rejects(c.query('select * from public.profiles'), /permission denied/);
      await rejects(c.query('select * from public.audit_log'), /permission denied/);
    });
  });

  it('ne peut pas réserver sans être connecté', async () => {
    await rejects(requestCrossing(db, null, 1), /permission denied/);
  });

  it('obtient les places restantes via la recherche publique', async () => {
    const res = await as(db, null, (c) =>
      c.query('select * from public.search_departures($1, $2, $3)', [ids.djibouti, ids.tadjourah, inDays(3)]),
    );
    assert.equal(res.rows.length, 1);
    assert.equal(res.rows[0].seats_available, 5);
  });
});

describe('demandes de réservation', () => {
  let db;
  before(async () => (db = await freshDatabase()));

  it('crée une demande « envoyée » avec référence unique, passagers et historique', async () => {
    const res = await requestCrossing(db, ids.alice, 2);
    const booking = res.rows[0];
    assert.equal(booking.status, 'submitted');
    assert.match(booking.reference, /^DS-[A-HJKMNP-Z2-9]{8}$/);
    assert.equal(booking.provider_id, ids.providerA);
    assert.equal(booking.quoted_total_djf, 2000);
    await as(db, ids.alice, async (c) => {
      const pax = await c.query('select count(*)::int n from public.booking_passengers where booking_id = $1', [booking.id]);
      assert.equal(pax.rows[0].n, 2);
      const events = await c.query('select to_status from public.booking_events where booking_id = $1', [booking.id]);
      assert.deepEqual(events.rows.map((e) => e.to_status), ['submitted']);
    });
  });

  it('refuse la surréservation : la capacité est contrôlée par le serveur', async () => {
    await requestCrossing(db, ids.bob, 3); // 2 + 3 = 5 places sur 5
    await rejects(requestCrossing(db, ids.bob, 1), /CAPACITY_EXCEEDED/);
    const res = await as(db, null, (c) => c.query('select public.departure_seats_available($1) n', [ids.departure]));
    assert.equal(res.rows[0].n, 0);
  });

  it('libère les places quand une demande est annulée', async () => {
    const mine = await as(db, ids.bob, (c) => c.query('select id from public.bookings where customer_id = $1', [ids.bob]));
    await as(db, ids.bob, (c) => c.query(`select * from public.transition_booking($1, 'cancelled')`, [mine.rows[0].id]));
    const res = await as(db, null, (c) => c.query('select public.departure_seats_available($1) n', [ids.departure]));
    assert.equal(res.rows[0].n, 3);
  });

  it('exige un passager nommé par place pour une traversée', async () => {
    await rejects(requestCrossing(db, ids.alice, 2, { passengers: [{ fullName: 'Seul', category: 'adult' }] }), /INVALID_INPUT/);
  });

  it('enregistre le mode de paiement choisi et refuse un mode inconnu ou absent', async () => {
    const res = await requestCrossing(db, ids.alice, 1, { kind: 'experience', itemId: ids.experience, passengers: [], serviceDate: inDays(5), paymentMethod: 'cash_on_site' });
    assert.equal(res.rows[0].payment_method, 'cash_on_site');
    await rejects(requestCrossing(db, ids.alice, 1, { paymentMethod: 'carte_bancaire' }), /INVALID_INPUT/);
    await rejects(requestCrossing(db, ids.alice, 1, { paymentMethod: null }), /INVALID_INPUT/);
  });

  it('refuse un numéro de téléphone non normalisé', async () => {
    await rejects(requestCrossing(db, ids.alice, 1, { phone: '77123456' }), /INVALID_INPUT/);
  });

  it('refuse un départ passé ou une offre non publiée', async () => {
    await rejects(requestCrossing(db, ids.alice, 1, { itemId: ids.pastDeparture }), /ITEM_UNAVAILABLE/);
    await rejects(
      requestCrossing(db, ids.alice, 1, { kind: 'experience', itemId: ids.hiddenExperience, passengers: [] }),
      /ITEM_UNAVAILABLE/,
    );
  });

  it('accepte une excursion sans manifeste nominatif', async () => {
    const res = await requestCrossing(db, ids.alice, 4, { kind: 'experience', itemId: ids.experience, passengers: [], serviceDate: inDays(5) });
    assert.equal(res.rows[0].provider_id, ids.providerB);
    assert.equal(res.rows[0].service_date instanceof Date || typeof res.rows[0].service_date === 'string', true);
  });

  it('interdit toute écriture directe dans la table des réservations', async () => {
    await as(db, ids.alice, async (c) => {
      await rejects(c.query(`update public.bookings set status = 'confirmed'`), /permission denied/);
      await rejects(c.query(`delete from public.bookings`), /permission denied/);
    });
  });

  it('limite le nombre de demandes par heure', async () => {
    const fresh = await freshDatabase();
    for (let i = 0; i < 10; i++) {
      await requestCrossing(fresh, ids.alice, 1, { kind: 'experience', itemId: ids.experience, passengers: [], serviceDate: inDays(5) });
    }
    await rejects(
      requestCrossing(fresh, ids.alice, 1, { kind: 'experience', itemId: ids.experience, passengers: [], serviceDate: inDays(5) }),
      /RATE_LIMITED/,
    );
  });
});

describe('cloisonnement des données entre clients et prestataires', () => {
  let db;
  let aliceBooking;
  before(async () => {
    db = await freshDatabase();
    aliceBooking = (await requestCrossing(db, ids.alice, 1)).rows[0];
  });

  it('un client ne voit pas les réservations d’un autre client', async () => {
    const res = await as(db, ids.bob, (c) => c.query('select id from public.bookings'));
    assert.equal(res.rows.length, 0);
    const pax = await as(db, ids.bob, (c) => c.query('select id from public.booking_passengers'));
    assert.equal(pax.rows.length, 0);
  });

  it('un tiers ne peut pas modifier une réservation (et n’apprend pas qu’elle existe)', async () => {
    await rejects(
      as(db, ids.bob, (c) => c.query(`select * from public.transition_booking($1, 'cancelled')`, [aliceBooking.id])),
      /NOT_FOUND/,
    );
  });

  it('le prestataire concerné voit la demande, un autre prestataire non', async () => {
    const mine = await as(db, ids.operator, (c) => c.query('select id from public.bookings'));
    assert.deepEqual(mine.rows.map((r) => r.id), [aliceBooking.id]);
    const other = await as(db, ids.otherOperator, (c) => c.query('select id from public.bookings'));
    assert.equal(other.rows.length, 0);
  });

  it('le client ne peut pas confirmer sa propre demande', async () => {
    await rejects(
      as(db, ids.alice, (c) => c.query(`select * from public.transition_booking($1, 'confirmed')`, [aliceBooking.id])),
      /INVALID_TRANSITION/,
    );
  });

  it('le prestataire prend en charge puis confirme ; le client est notifié', async () => {
    await as(db, ids.operator, (c) => c.query(`select * from public.transition_booking($1, 'pending_confirmation')`, [aliceBooking.id]));
    const res = await as(db, ids.operator, (c) => c.query(`select * from public.transition_booking($1, 'confirmed', 'Embarquement 30 min avant')`, [aliceBooking.id]));
    assert.equal(res.rows[0].status, 'confirmed');
    const notes = await as(db, ids.alice, (c) => c.query('select title from public.notifications'));
    assert.equal(notes.rows.length, 2);
  });

  it('une prestation future ne peut pas être marquée « terminée »', async () => {
    await rejects(
      as(db, ids.operator, (c) => c.query(`select * from public.transition_booking($1, 'completed')`, [aliceBooking.id])),
      /INVALID_TRANSITION/,
    );
  });

  it('chaque transition est tracée dans le journal d’audit, lisible par l’admin seulement', async () => {
    const admin = await as(db, ids.admin, (c) => c.query(`select count(*)::int n from public.audit_log where action = 'booking_transition'`));
    assert.equal(admin.rows[0].n, 2);
    const op = await as(db, ids.operator, (c) => c.query('select count(*)::int n from public.audit_log'));
    assert.equal(op.rows[0].n, 0);
  });
});

describe('rôles et modération', () => {
  let db;
  before(async () => (db = await freshDatabase()));

  it('un utilisateur ordinaire ne peut pas se donner le rôle administrateur', async () => {
    await rejects(
      as(db, ids.alice, (c) => c.query(`insert into public.user_roles (user_id, role, granted_by) values ($1, 'admin', $1)`, [ids.alice])),
      /row-level security/,
    );
  });

  it('un administrateur peut attribuer un rôle, et c’est journalisé', async () => {
    await as(db, ids.admin, (c) =>
      c.query(`insert into public.user_roles (user_id, role, granted_by) values ($1, 'support', $2)`, [ids.bob, ids.admin]),
    );
    const log = await as(db, ids.admin, (c) => c.query(`select actor_id from public.audit_log where entity = 'user_roles' and action = 'insert' and actor_id is not null`));
    assert.equal(log.rows[0].actor_id, ids.admin);
  });

  it('un prestataire modifie son offre mais ne peut pas la déclarer « vérifiée » ni la publier', async () => {
    await as(db, ids.otherOperator, async (c) => {
      await c.query(`update public.experiences set summary = 'Nouveau résumé' where id = $1`, [ids.experience]);
      await rejects(c.query(`update public.experiences set reliability = 'verified' where id = $1`, [ids.experience]), /FORBIDDEN_FIELD/);
      await rejects(c.query(`update public.experiences set published = true where id = $1`, [ids.hiddenExperience]), /FORBIDDEN_FIELD/);
    });
  });

  it('une offre vérifiée modifiée par le prestataire repasse « non vérifiée »', async () => {
    await as(db, ids.admin, (c) => c.query(`update public.experiences set reliability = 'verified' where id = $1`, [ids.experience]));
    await as(db, ids.otherOperator, (c) => c.query(`update public.experiences set price_from_djf = 9000 where id = $1`, [ids.experience]));
    const res = await db.query('select reliability from public.experiences where id = $1', [ids.experience]);
    assert.equal(res.rows[0].reliability, 'unverified');
  });

  it('un prestataire ne peut pas modifier les offres d’un concurrent', async () => {
    const res = await as(db, ids.operator, (c) => c.query(`update public.experiences set title = 'Piraté' where id = $1 returning id`, [ids.experience]));
    assert.equal(res.rows.length, 0);
  });

  it('un prestataire ne peut ni changer son statut ni sa commission', async () => {
    await as(db, ids.operator, async (c) => {
      await rejects(c.query(`update public.providers set status = 'suspended' where id = $1`, [ids.providerA]), /FORBIDDEN_FIELD/);
      await rejects(c.query(`update public.providers set commission_bps = 0 where id = $1`, [ids.providerA]), /FORBIDDEN_FIELD/);
    });
  });

  it('un document déposé par un prestataire reste « soumis » jusqu’à revue par l’admin', async () => {
    await as(db, ids.operator, async (c) => {
      await rejects(
        c.query(`insert into public.provider_documents (provider_id, doc_type, storage_path, status) values ($1, 'insurance', 'a/b.pdf', 'approved')`, [ids.providerA]),
        /FORBIDDEN_FIELD/,
      );
      await c.query(`insert into public.provider_documents (provider_id, doc_type, storage_path) values ($1, 'insurance', 'a/b.pdf')`, [ids.providerA]);
      const upd = await c.query(`update public.provider_documents set status = 'approved' returning id`);
      assert.equal(upd.rows.length, 0);
    });
  });

  it('une candidature prestataire est créée « en attente » et invisible du public', async () => {
    const res = await as(db, ids.bob, (c) =>
      c.query(`select public.register_provider('Nouvelle agence', 'agency', '', null, null) id`),
    );
    const id = res.rows[0].id;
    const pub = await as(db, null, (c) => c.query('select id from public.providers where id = $1', [id]));
    assert.equal(pub.rows.length, 0);
    const own = await as(db, ids.bob, (c) => c.query('select status from public.providers where id = $1', [id]));
    assert.equal(own.rows[0].status, 'pending');
  });

  it('les paiements ne sont pas modifiables depuis l’application', async () => {
    await as(db, ids.alice, async (c) => {
      await rejects(c.query(`insert into public.payments (booking_id, gateway, amount_djf) values (gen_random_uuid(), 'dmoney', 100)`), /permission denied/);
    });
  });
});
