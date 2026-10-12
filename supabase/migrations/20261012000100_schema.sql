-- =============================================================================
-- Bahri — schéma principal
-- Conventions :
--   * identifiants uuid, horodatages timestamptz (stockés en UTC, affichés en heure de Djibouti)
--   * montants en entiers DJF
--   * valeurs énumérées en text + CHECK (plus simple à faire évoluer qu'un type ENUM)
--   * `reliability` distingue données fictives (demo), non vérifiées et vérifiées
-- =============================================================================

-- gen_random_uuid() est natif depuis PostgreSQL 13 : aucune extension requise.

-- -----------------------------------------------------------------------------
-- Utilitaires
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Comptes, rôles
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  phone text check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  locale text not null default 'fr' check (locale in ('fr', 'en', 'ar', 'so', 'aa')),
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Rôles de plateforme. Un utilisateur sans ligne ici est un client ordinaire.
-- Aucune politique ne permet de s'attribuer un rôle soi-même (voir migration sécurité).
create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'support')),
  granted_by uuid references auth.users (id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- -----------------------------------------------------------------------------
-- Prestataires
-- -----------------------------------------------------------------------------
create table public.providers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  kind text not null check (kind in ('maritime_operator', 'hotel', 'agency', 'activity_organizer', 'guide')),
  description text not null default '' check (char_length(description) <= 4000),
  phone text,
  email text,
  -- pending : inscrit, documents en cours d'examen ; verified : publiable ; suspended : masqué
  status text not null default 'pending' check (status in ('pending', 'verified', 'suspended')),
  reliability text not null default 'unverified' check (reliability in ('demo', 'unverified', 'verified')),
  -- Taux de commission convenu (points de base : 1000 = 10 %). Null tant qu'aucun contrat.
  commission_bps integer check (commission_bps between 0 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger providers_updated_at before update on public.providers
  for each row execute function public.set_updated_at();

create table public.provider_members (
  provider_id uuid not null references public.providers (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  member_role text not null default 'staff' check (member_role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  primary key (provider_id, user_id)
);
create index provider_members_user_idx on public.provider_members (user_id);

-- Les fichiers sont dans un bucket Storage privé ; seule la référence est ici.
create table public.provider_documents (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers (id) on delete cascade,
  doc_type text not null check (doc_type in (
    'business_registration', 'tax_id', 'tourism_license', 'maritime_license',
    'vessel_certificate', 'insurance', 'identity', 'other')),
  storage_path text not null,
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected', 'expired')),
  expires_on date,
  reviewer_id uuid references auth.users (id),
  reviewed_at timestamptz,
  review_note text check (char_length(review_note) <= 1000),
  created_at timestamptz not null default now()
);
create index provider_documents_provider_idx on public.provider_documents (provider_id);

-- -----------------------------------------------------------------------------
-- Catalogue
-- -----------------------------------------------------------------------------
create table public.destinations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  region text not null check (region in ('djibouti', 'tadjourah', 'obock', 'arta', 'dikhil', 'ali_sabieh')),
  summary text not null default '',
  description text not null default '',
  highlights text[] not null default '{}',
  practical_info text[] not null default '{}',
  is_port boolean not null default false,
  image_url text,
  reliability text not null default 'unverified' check (reliability in ('demo', 'unverified', 'verified')),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger destinations_updated_at before update on public.destinations
  for each row execute function public.set_updated_at();

create table public.routes (
  id uuid primary key default gen_random_uuid(),
  origin_id uuid not null references public.destinations (id),
  destination_id uuid not null references public.destinations (id),
  provider_id uuid not null references public.providers (id),
  duration_minutes integer check (duration_minutes between 5 and 2880),
  adult_fare_djf integer check (adult_fare_djf >= 0),
  conditions text[] not null default '{}',
  reliability text not null default 'unverified' check (reliability in ('demo', 'unverified', 'verified')),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (origin_id <> destination_id)
);
create index routes_search_idx on public.routes (origin_id, destination_id) where active;
create trigger routes_updated_at before update on public.routes
  for each row execute function public.set_updated_at();

create table public.departures (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes (id) on delete cascade,
  departs_at timestamptz not null,
  capacity integer not null check (capacity between 1 and 2000),
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  reliability text not null default 'unverified' check (reliability in ('demo', 'unverified', 'verified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (route_id, departs_at)
);
create index departures_time_idx on public.departures (route_id, departs_at);
create trigger departures_updated_at before update on public.departures
  for each row execute function public.set_updated_at();

create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 160),
  kind text not null check (kind in ('excursion', 'circuit', 'activity', 'guide')),
  destination_id uuid not null references public.destinations (id),
  provider_id uuid not null references public.providers (id),
  summary text not null default '',
  description text not null default '',
  duration_label text,
  price_from_djf integer check (price_from_djf >= 0),
  included text[] not null default '{}',
  image_url text,
  reliability text not null default 'unverified' check (reliability in ('demo', 'unverified', 'verified')),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index experiences_destination_idx on public.experiences (destination_id) where published;
create trigger experiences_updated_at before update on public.experiences
  for each row execute function public.set_updated_at();

create table public.stays (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  destination_id uuid not null references public.destinations (id),
  provider_id uuid not null references public.providers (id),
  category text not null check (category in ('hotel', 'lodge', 'camp', 'guesthouse')),
  summary text not null default '',
  address text,
  amenities text[] not null default '{}',
  nightly_from_djf integer check (nightly_from_djf >= 0),
  image_url text,
  reliability text not null default 'unverified' check (reliability in ('demo', 'unverified', 'verified')),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger stays_updated_at before update on public.stays
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Réservations
-- -----------------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^BH-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$'),
  customer_id uuid not null references auth.users (id) on delete restrict,
  kind text not null check (kind in ('crossing', 'experience', 'stay')),
  departure_id uuid references public.departures (id),
  experience_id uuid references public.experiences (id),
  stay_id uuid references public.stays (id),
  -- Copié depuis l'élément réservé par la fonction serveur, jamais fourni par le client.
  provider_id uuid not null references public.providers (id),
  item_label text not null,
  service_date date not null,
  party_size integer not null check (party_size between 1 and 20),
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  contact_phone text not null check (contact_phone ~ '^\+[1-9][0-9]{7,14}$'),
  notes text check (char_length(notes) <= 500),
  status text not null default 'submitted' check (status in (
    'draft', 'submitted', 'pending_confirmation', 'confirmed', 'rejected', 'cancelled', 'completed')),
  -- Montant indicatif au moment de la demande (null si tarif inconnu). Le prix ferme est celui confirmé.
  quoted_total_djf integer check (quoted_total_djf >= 0),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (kind = 'crossing' and departure_id is not null and experience_id is null and stay_id is null) or
    (kind = 'experience' and experience_id is not null and departure_id is null and stay_id is null) or
    (kind = 'stay' and stay_id is not null and departure_id is null and experience_id is null)
  )
);
create index bookings_customer_idx on public.bookings (customer_id, created_at desc);
create index bookings_provider_idx on public.bookings (provider_id, status);
create index bookings_departure_idx on public.bookings (departure_id) where departure_id is not null;
create trigger bookings_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

create table public.booking_passengers (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  category text not null check (category in ('adult', 'child', 'infant')),
  position smallint not null,
  unique (booking_id, position)
);

-- Historique des statuts : sert de chronologie pour l'utilisateur et de piste d'audit.
create table public.booking_events (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_id uuid references auth.users (id),
  actor_role text not null check (actor_role in ('customer', 'provider', 'admin', 'system')),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index booking_events_booking_idx on public.booking_events (booking_id, created_at);

-- -----------------------------------------------------------------------------
-- Paiements (désactivés tant que le prestataire de paiement n'est pas contractualisé)
-- Aucune donnée de carte n'est stockée : uniquement la référence du prestataire.
-- Écriture réservée aux fonctions serveur (webhook vérifié) via la clé service.
-- -----------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id),
  gateway text not null check (gateway in ('dmoney', 'waafi', 'cac_pay', 'card_gateway', 'bank_transfer', 'cash_on_site')),
  gateway_reference text,
  amount_djf integer not null check (amount_djf > 0),
  commission_djf integer check (commission_djf >= 0),
  status text not null default 'initiated' check (status in ('initiated', 'succeeded', 'failed', 'cancelled')),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (gateway, gateway_reference)
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id),
  amount_djf integer not null check (amount_djf > 0),
  reason text,
  status text not null default 'requested' check (status in ('requested', 'succeeded', 'failed')),
  gateway_reference text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Visibilité payante / annonces sponsorisées
-- -----------------------------------------------------------------------------
create table public.sponsored_campaigns (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  body text not null check (char_length(body) <= 240),
  target_kind text not null check (target_kind in ('experience', 'stay', 'route')),
  target_id uuid not null,
  placement text not null default 'home' check (placement in ('home', 'explore', 'stays', 'crossings')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft', 'pending_review', 'active', 'paused', 'ended', 'rejected')),
  budget_djf integer check (budget_djf >= 0),
  reliability text not null default 'unverified' check (reliability in ('demo', 'unverified', 'verified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create trigger sponsored_campaigns_updated_at before update on public.sponsored_campaigns
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Notifications et journal d'audit
-- -----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('booking_status', 'provider_review', 'system')),
  title text not null,
  body text not null,
  booking_id uuid references public.bookings (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);

-- Création automatique du profil à l'inscription.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
