-- =============================================================================
-- DjiSea — sécurité : privilèges, Row Level Security, garde-fous, audit
--
-- Principe : tout est interdit par défaut, puis ouvert explicitement.
--   anon          : lecture du catalogue publié uniquement
--   authenticated : son profil, ses réservations (via fonctions RPC), son espace prestataire
--   admin         : rôle applicatif (table user_roles), jamais attribué automatiquement
-- La clé `service_role` (contourne RLS) ne doit exister que côté serveur.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Fonctions d'autorisation (SECURITY DEFINER pour éviter la récursion RLS)
-- -----------------------------------------------------------------------------
create or replace function public.has_role(p_role text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles where user_id = auth.uid() and role = p_role
  );
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.has_role('admin');
$$;

-- Personnel de la plateforme : administrateurs et support (lecture élargie).
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles where user_id = auth.uid() and role in ('admin', 'support')
  );
$$;

create or replace function public.is_provider_member(p_provider_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.provider_members where provider_id = p_provider_id and user_id = auth.uid()
  );
$$;

-- Vrai lorsque l'opération vient d'un client (API publique) plutôt que du serveur
-- ou d'une fonction SECURITY DEFINER de confiance.
create or replace function public.is_client_request() returns boolean
language sql stable set search_path = '' as $$
  select current_user in ('anon', 'authenticated');
$$;

-- -----------------------------------------------------------------------------
-- Journal d'audit générique
-- -----------------------------------------------------------------------------
create or replace function public.audit_row_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
begin
  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(v_row ->> 'id', v_row ->> 'user_id'),
    jsonb_build_object(
      'old', case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
      'new', case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
      'db_user', current_user
    )
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_user_roles after insert or update or delete on public.user_roles
  for each row execute function public.audit_row_change();
create trigger audit_providers after insert or update or delete on public.providers
  for each row execute function public.audit_row_change();
create trigger audit_provider_members after insert or update or delete on public.provider_members
  for each row execute function public.audit_row_change();
create trigger audit_provider_documents after insert or update or delete on public.provider_documents
  for each row execute function public.audit_row_change();
create trigger audit_routes after insert or update or delete on public.routes
  for each row execute function public.audit_row_change();
create trigger audit_departures after insert or update or delete on public.departures
  for each row execute function public.audit_row_change();
create trigger audit_payments after insert or update or delete on public.payments
  for each row execute function public.audit_row_change();
create trigger audit_refunds after insert or update or delete on public.refunds
  for each row execute function public.audit_row_change();
create trigger audit_sponsored after insert or update or delete on public.sponsored_campaigns
  for each row execute function public.audit_row_change();

-- -----------------------------------------------------------------------------
-- Garde-fous : un prestataire gère ses offres mais ne peut ni se « vérifier »
-- lui-même, ni publier sans modération, ni changer son statut ou sa commission.
-- -----------------------------------------------------------------------------
create or replace function public.guard_moderated_fields() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_new jsonb := to_jsonb(new);
  v_old jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  v_field text;
begin
  if not public.is_client_request() or public.is_admin() then
    return new;
  end if;

  foreach v_field in array tg_argv loop
    if tg_op = 'INSERT' then
      -- À la création, les champs modérés doivent garder leur valeur sûre.
      if (v_field = 'reliability' and v_new ->> 'reliability' <> 'unverified')
         or (v_field in ('published', 'active') and (v_new ->> v_field)::boolean)
         or (v_field in ('reviewer_id', 'reviewed_at', 'review_note', 'commission_bps') and v_new ->> v_field is not null)
         or (v_field = 'status' and not (
               (tg_table_name = 'sponsored_campaigns' and v_new ->> 'status' in ('draft', 'pending_review'))
            or (tg_table_name = 'provider_documents' and v_new ->> 'status' = 'submitted')
            or (tg_table_name = 'providers' and v_new ->> 'status' = 'pending')))
      then
        raise exception 'FORBIDDEN_FIELD: %', v_field using errcode = '42501';
      end if;
    elsif (v_new -> v_field) is distinct from (v_old -> v_field) then
      if tg_table_name = 'sponsored_campaigns' and v_field = 'status'
         and v_new ->> 'status' in ('draft', 'pending_review', 'paused') then
        continue;
      end if;
      raise exception 'FORBIDDEN_FIELD: %', v_field using errcode = '42501';
    end if;
  end loop;

  -- Toute modification par le prestataire repasse l'élément en « non vérifié ».
  if tg_op = 'UPDATE' and v_new ? 'reliability' and v_old ->> 'reliability' = 'verified' then
    new := jsonb_populate_record(new, jsonb_build_object('reliability', 'unverified'));
  end if;
  return new;
end;
$$;

create trigger guard_providers before insert or update on public.providers
  for each row execute function public.guard_moderated_fields('status', 'reliability', 'commission_bps');
create trigger guard_routes before insert or update on public.routes
  for each row execute function public.guard_moderated_fields('reliability', 'active', 'provider_id');
create trigger guard_departures before insert or update on public.departures
  for each row execute function public.guard_moderated_fields('reliability', 'route_id');
create trigger guard_experiences before insert or update on public.experiences
  for each row execute function public.guard_moderated_fields('reliability', 'published', 'provider_id');
create trigger guard_stays before insert or update on public.stays
  for each row execute function public.guard_moderated_fields('reliability', 'published', 'provider_id');
create trigger guard_sponsored before insert or update on public.sponsored_campaigns
  for each row execute function public.guard_moderated_fields('status', 'reliability', 'provider_id', 'budget_djf');
create trigger guard_provider_documents before insert or update on public.provider_documents
  for each row execute function public.guard_moderated_fields('status', 'reviewer_id', 'reviewed_at', 'review_note');

-- -----------------------------------------------------------------------------
-- Privilèges : on retire tout, puis on accorde le strict nécessaire.
-- -----------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated;

-- Fonctions utilisées dans les politiques : appelables par les rôles API.
grant execute on function public.has_role(text), public.is_admin(), public.is_staff(),
  public.is_provider_member(uuid), public.is_client_request() to anon, authenticated;

-- Catalogue public
grant select on public.destinations, public.routes, public.departures, public.experiences,
  public.stays, public.providers, public.sponsored_campaigns to anon, authenticated;

-- Gestion du catalogue (filtrée par RLS : administrateurs ou membres du prestataire)
grant insert, update, delete on public.destinations, public.routes, public.departures,
  public.experiences, public.stays, public.sponsored_campaigns to authenticated;
grant update on public.providers to authenticated;
grant insert, delete on public.providers to authenticated;

-- Comptes
grant select on public.profiles to authenticated;
grant update (full_name, phone, locale, marketing_consent, marketing_consent_at) on public.profiles to authenticated;
grant select, insert, delete on public.user_roles to authenticated;
grant select, insert, delete on public.provider_members to authenticated;
grant select, insert, update, delete on public.provider_documents to authenticated;

-- Réservations : lecture seule, toute écriture passe par les fonctions RPC.
grant select on public.bookings, public.booking_passengers, public.booking_events,
  public.payments, public.refunds to authenticated;

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant select on public.audit_log to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.providers enable row level security;
alter table public.provider_members enable row level security;
alter table public.provider_documents enable row level security;
alter table public.destinations enable row level security;
alter table public.routes enable row level security;
alter table public.departures enable row level security;
alter table public.experiences enable row level security;
alter table public.stays enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_passengers enable row level security;
alter table public.booking_events enable row level security;
alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.sponsored_campaigns enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

-- Profils
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Rôles : lecture de ses propres rôles ; attribution par un administrateur uniquement.
create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy user_roles_insert on public.user_roles for insert to authenticated
  with check (public.is_admin() and granted_by = auth.uid());
create policy user_roles_delete on public.user_roles for delete to authenticated
  using (public.is_admin());

-- Prestataires
create policy providers_select on public.providers for select to anon, authenticated
  using (status = 'verified' or public.is_provider_member(id) or public.is_staff());
create policy providers_insert on public.providers for insert to authenticated
  with check (public.is_admin());
create policy providers_update on public.providers for update to authenticated
  using (public.is_admin() or public.is_provider_member(id))
  with check (public.is_admin() or public.is_provider_member(id));
create policy providers_delete on public.providers for delete to authenticated
  using (public.is_admin());

create policy provider_members_select on public.provider_members for select to authenticated
  using (user_id = auth.uid() or public.is_provider_member(provider_id) or public.is_staff());
create policy provider_members_insert on public.provider_members for insert to authenticated
  with check (public.is_admin());
create policy provider_members_delete on public.provider_members for delete to authenticated
  using (public.is_admin());

create policy provider_documents_select on public.provider_documents for select to authenticated
  using (public.is_provider_member(provider_id) or public.is_staff());
create policy provider_documents_insert on public.provider_documents for insert to authenticated
  with check (public.is_provider_member(provider_id) or public.is_admin());
create policy provider_documents_update on public.provider_documents for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy provider_documents_delete on public.provider_documents for delete to authenticated
  using (public.is_admin());

-- Destinations (éditées par la plateforme uniquement)
create policy destinations_select on public.destinations for select to anon, authenticated
  using (published or public.is_staff());
create policy destinations_write on public.destinations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Trajets et départs
create policy routes_select on public.routes for select to anon, authenticated
  using (
    (active and exists (select 1 from public.providers p where p.id = provider_id and p.status = 'verified'))
    or public.is_provider_member(provider_id) or public.is_staff()
  );
create policy routes_write on public.routes for all to authenticated
  using (public.is_admin() or public.is_provider_member(provider_id))
  with check (public.is_admin() or public.is_provider_member(provider_id));

create policy departures_select on public.departures for select to anon, authenticated
  using (exists (select 1 from public.routes r where r.id = route_id));
create policy departures_write on public.departures for all to authenticated
  using (public.is_admin() or exists (
    select 1 from public.routes r where r.id = route_id and public.is_provider_member(r.provider_id)))
  with check (public.is_admin() or exists (
    select 1 from public.routes r where r.id = route_id and public.is_provider_member(r.provider_id)));

-- Expériences et hébergements
create policy experiences_select on public.experiences for select to anon, authenticated
  using (
    (published and exists (select 1 from public.providers p where p.id = provider_id and p.status = 'verified'))
    or public.is_provider_member(provider_id) or public.is_staff()
  );
create policy experiences_write on public.experiences for all to authenticated
  using (public.is_admin() or public.is_provider_member(provider_id))
  with check (public.is_admin() or public.is_provider_member(provider_id));

create policy stays_select on public.stays for select to anon, authenticated
  using (
    (published and exists (select 1 from public.providers p where p.id = provider_id and p.status = 'verified'))
    or public.is_provider_member(provider_id) or public.is_staff()
  );
create policy stays_write on public.stays for all to authenticated
  using (public.is_admin() or public.is_provider_member(provider_id))
  with check (public.is_admin() or public.is_provider_member(provider_id));

-- Réservations : visibles par le client, le prestataire concerné et le personnel.
-- Aucune politique d'écriture : les modifications passent par request_booking / transition_booking.
create policy bookings_select on public.bookings for select to authenticated
  using (customer_id = auth.uid() or public.is_provider_member(provider_id) or public.is_staff());
create policy booking_passengers_select on public.booking_passengers for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id));
create policy booking_events_select on public.booking_events for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id));

-- Paiements : lecture seule pour les parties concernées, écriture serveur uniquement.
create policy payments_select on public.payments for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id));
create policy refunds_select on public.refunds for select to authenticated
  using (exists (
    select 1 from public.payments p join public.bookings b on b.id = p.booking_id where p.id = payment_id));

-- Campagnes sponsorisées
create policy sponsored_select on public.sponsored_campaigns for select to anon, authenticated
  using (
    (status = 'active' and now() between starts_at and ends_at)
    or public.is_provider_member(provider_id) or public.is_staff()
  );
create policy sponsored_insert on public.sponsored_campaigns for insert to authenticated
  with check (public.is_admin() or public.is_provider_member(provider_id));
create policy sponsored_update on public.sponsored_campaigns for update to authenticated
  using (public.is_admin() or public.is_provider_member(provider_id))
  with check (public.is_admin() or public.is_provider_member(provider_id));
create policy sponsored_delete on public.sponsored_campaigns for delete to authenticated
  using (public.is_admin());

-- Notifications
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Audit : administrateurs uniquement, en lecture.
create policy audit_log_select on public.audit_log for select to authenticated
  using (public.is_admin());
