-- =============================================================================
-- DONNÉES DE DÉMONSTRATION — base locale ou de recette UNIQUEMENT.
-- Appliqué par `supabase db reset`. NE JAMAIS exécuter sur la base de production.
--
-- * Destinations : lieux réels, descriptions générales NON vérifiées (reliability = 'unverified').
-- * Prestataires, trajets, départs, tarifs, offres : FICTIFS (reliability = 'demo', « Exemple … (fictif) »).
--   Ils ont le statut 'verified' uniquement pour être visibles dans l'application de test.
-- =============================================================================

insert into public.destinations (id, slug, name, region, summary, description, highlights, practical_info, is_port, reliability, published) values
  ('20000000-0000-4000-8000-000000000001', 'djibouti-ville', 'Djibouti-ville', 'djibouti',
   'La capitale, son port et ses quartiers historiques.',
   'Capitale et principal port du pays, au sud du golfe de Tadjourah.',
   '{"Quartiers historiques du centre","Marchés","Front de mer"}',
   '{"Chaleur intense de mai à septembre : privilégier les sorties tôt le matin."}', true, 'unverified', true),
  ('20000000-0000-4000-8000-000000000002', 'tadjourah', 'Tadjourah', 'tadjourah',
   'L’une des plus anciennes villes de la région, sur la rive nord du golfe.',
   'Surnommée « la ville blanche », Tadjourah fait face à Djibouti-ville de l’autre côté du golfe.',
   '{"Vieille ville et mosquées","Plages de la rive nord"}',
   '{"Les liaisons maritimes et leurs horaires doivent être confirmés auprès des opérateurs."}', true, 'unverified', true),
  ('20000000-0000-4000-8000-000000000003', 'obock', 'Obock', 'obock',
   'Ville historique à l’entrée du golfe, porte du nord du pays.',
   'Située à l’entrée du golfe de Tadjourah, Obock donne accès aux côtes peu fréquentées du nord.',
   '{"Patrimoine historique","Côtes sauvages"}',
   '{"Hébergements limités : réserver et confirmer à l’avance."}', true, 'unverified', true),
  ('20000000-0000-4000-8000-000000000004', 'lac-assal', 'Lac Assal', 'tadjourah',
   'Lac salé situé sous le niveau de la mer, banquise de sel.',
   'Souvent présenté comme le point le plus bas d’Afrique.',
   '{"Banquise de sel","Paysages volcaniques"}',
   '{"Prévoir beaucoup d’eau et une protection solaire."}', false, 'unverified', true);

insert into public.providers (id, name, kind, description, status, reliability) values
  ('10000000-0000-4000-8000-000000000001', 'Navettes Exemple du Golfe (fictif)', 'maritime_operator',
   'Opérateur maritime fictif servant à illustrer la recherche de traversées.', 'verified', 'demo'),
  ('10000000-0000-4000-8000-000000000002', 'Agence Exemple Découverte (fictif)', 'agency',
   'Agence fictive proposant des excursions de démonstration.', 'verified', 'demo');

insert into public.routes (id, origin_id, destination_id, provider_id, duration_minutes, adult_fare_djf, conditions, reliability, active) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002',
   '10000000-0000-4000-8000-000000000001', 150, 2000, '{"Exemple fictif : présentation 30 min avant le départ."}', 'demo', true),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001', 150, 2000, '{}', 'demo', true);

-- Départs fictifs sur les 21 prochains jours (lundi, mercredi, samedi), 09:00 et 15:00 heure de Djibouti.
insert into public.departures (route_id, departs_at, capacity, reliability)
select r.route_id, (d::date + r.local_time) - interval '3 hours', 40, 'demo'
from generate_series(current_date, current_date + 20, interval '1 day') d
cross join (values
  ('30000000-0000-4000-8000-000000000001'::uuid, time '09:00'),
  ('30000000-0000-4000-8000-000000000002'::uuid, time '15:00')
) as r(route_id, local_time)
where extract(isodow from d) in (1, 3, 6);

insert into public.experiences (title, kind, destination_id, provider_id, summary, description, duration_label, price_from_djf, reliability, published) values
  ('Lac Assal et Ghoubbet (exemple)', 'excursion', '20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002',
   'Excursion à la journée vers le lac salé.', 'Offre fictive de démonstration.', 'Journée', 15000, 'demo', true);
