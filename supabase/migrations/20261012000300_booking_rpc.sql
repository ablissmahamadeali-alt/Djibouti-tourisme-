-- =============================================================================
-- DjiSea — fonctions serveur de réservation
--
-- Les clients ne peuvent ni insérer ni modifier directement une réservation.
-- Tout passe par ces fonctions, qui :
--   * vérifient l'identité et les droits de l'appelant ;
--   * revalident les données (le client n'est jamais cru sur parole) ;
--   * verrouillent le départ (SELECT … FOR UPDATE) pour empêcher la surréservation
--     lorsque deux demandes arrivent simultanément ;
--   * appliquent la machine à états (miroir de src/domain/booking-status.ts) ;
--   * journalisent chaque changement.
-- Codes d'erreur renvoyés dans le message : AUTH_REQUIRED, RATE_LIMITED, INVALID_INPUT,
-- ITEM_NOT_FOUND, ITEM_UNAVAILABLE, CAPACITY_EXCEEDED, NOT_FOUND, INVALID_TRANSITION.
-- =============================================================================

-- Date du jour à Djibouti (UTC+3, sans heure d'été).
create or replace function public.djibouti_today() returns date
language sql stable set search_path = '' as $$
  select ((now() at time zone 'UTC') + interval '3 hours')::date;
$$;

create or replace function public.to_djibouti_date(p_ts timestamptz) returns date
language sql immutable set search_path = '' as $$
  select ((p_ts at time zone 'UTC') + interval '3 hours')::date;
$$;

-- Machine à états — doit rester identique à src/domain/booking-status.ts.
create or replace function public.booking_transition_allowed(p_from text, p_to text, p_actor text)
returns boolean language sql immutable set search_path = '' as $$
  select (p_from, p_to, p_actor) in (
    ('draft', 'submitted', 'customer'),
    ('draft', 'cancelled', 'customer'),
    ('submitted', 'pending_confirmation', 'provider'), ('submitted', 'pending_confirmation', 'admin'),
    ('submitted', 'confirmed', 'provider'), ('submitted', 'confirmed', 'admin'),
    ('submitted', 'rejected', 'provider'), ('submitted', 'rejected', 'admin'),
    ('submitted', 'cancelled', 'customer'), ('submitted', 'cancelled', 'admin'),
    ('pending_confirmation', 'confirmed', 'provider'), ('pending_confirmation', 'confirmed', 'admin'),
    ('pending_confirmation', 'rejected', 'provider'), ('pending_confirmation', 'rejected', 'admin'),
    ('pending_confirmation', 'cancelled', 'customer'), ('pending_confirmation', 'cancelled', 'admin'),
    ('confirmed', 'completed', 'provider'), ('confirmed', 'completed', 'admin'),
    ('confirmed', 'cancelled', 'customer'), ('confirmed', 'cancelled', 'provider'), ('confirmed', 'cancelled', 'admin')
  );
$$;

create or replace function public.generate_booking_reference() returns text
language plpgsql volatile set search_path = '' as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_ref text := 'DS-';
begin
  for i in 1..8 loop
    v_ref := v_ref || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
  end loop;
  return v_ref;
end;
$$;

-- Places restantes sur un départ (somme des demandes actives).
create or replace function public.departure_seats_available(p_departure_id uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select d.capacity - coalesce((
    select sum(b.party_size)::int from public.bookings b
    where b.departure_id = d.id and b.status in ('submitted', 'pending_confirmation', 'confirmed')
  ), 0)
  from public.departures d where d.id = p_departure_id;
$$;

-- Recherche publique des départs : ne révèle que les places restantes, jamais les réservations.
create or replace function public.search_departures(p_origin_id uuid, p_destination_id uuid, p_date date)
returns table (
  departure_id uuid, route_id uuid, provider_id uuid, departs_at timestamptz,
  capacity integer, seats_available integer, status text, reliability text
)
language sql stable security definer set search_path = '' as $$
  select d.id, r.id, r.provider_id, d.departs_at, d.capacity,
         greatest(public.departure_seats_available(d.id), 0), d.status, d.reliability
  from public.departures d
  join public.routes r on r.id = d.route_id
  join public.providers p on p.id = r.provider_id
  where r.origin_id = p_origin_id and r.destination_id = p_destination_id
    and r.active and p.status = 'verified'
    and public.to_djibouti_date(d.departs_at) = p_date
    and d.departs_at > now()
  order by d.departs_at;
$$;

create or replace function public.request_booking(
  p_kind text,
  p_item_id uuid,
  p_service_date date,
  p_party_size integer,
  p_passengers jsonb,
  p_contact_name text,
  p_contact_phone text,
  p_notes text default null
) returns public.bookings
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_provider_id uuid;
  v_label text;
  v_service_date date := p_service_date;
  v_unit_price integer;
  v_capacity integer;
  v_held integer;
  v_departure_id uuid;
  v_experience_id uuid;
  v_stay_id uuid;
  v_booking public.bookings;
  v_attempt integer := 0;
  v_passenger jsonb;
  v_position integer := 0;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  -- Limitation des abus : 10 demandes par heure et par compte.
  if (select count(*) from public.bookings
      where customer_id = v_uid and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  if p_party_size is null or p_party_size not between 1 and 20
     or p_contact_phone is null or p_contact_phone !~ '^\+[1-9][0-9]{7,14}$'
     or char_length(coalesce(trim(p_contact_name), '')) not between 2 and 120
     or char_length(coalesce(p_notes, '')) > 500
     or jsonb_typeof(coalesce(p_passengers, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_passengers, '[]'::jsonb)) > p_party_size then
    raise exception 'INVALID_INPUT' using errcode = '22023';
  end if;

  if p_kind = 'crossing' then
    -- Verrou sur le départ : les demandes concurrentes sur ce départ sont sérialisées.
    select d.id, d.capacity, r.provider_id, r.adult_fare_djf,
           o.name || ' → ' || t.name, public.to_djibouti_date(d.departs_at)
      into v_departure_id, v_capacity, v_provider_id, v_unit_price, v_label, v_service_date
    from public.departures d
    join public.routes r on r.id = d.route_id
    join public.providers p on p.id = r.provider_id
    join public.destinations o on o.id = r.origin_id
    join public.destinations t on t.id = r.destination_id
    where d.id = p_item_id
      and d.status = 'scheduled' and r.active and p.status = 'verified'
      and d.departs_at > now()
    for update of d;

    if v_departure_id is null then
      raise exception 'ITEM_UNAVAILABLE' using errcode = 'P0001';
    end if;
    if jsonb_array_length(coalesce(p_passengers, '[]'::jsonb)) <> p_party_size then
      raise exception 'INVALID_INPUT' using errcode = '22023';
    end if;

    select coalesce(sum(party_size), 0) into v_held from public.bookings
    where departure_id = v_departure_id and status in ('submitted', 'pending_confirmation', 'confirmed');
    if v_held + p_party_size > v_capacity then
      raise exception 'CAPACITY_EXCEEDED' using errcode = 'P0001';
    end if;

  elsif p_kind = 'experience' then
    select e.id, e.provider_id, e.title, e.price_from_djf
      into v_experience_id, v_provider_id, v_label, v_unit_price
    from public.experiences e join public.providers p on p.id = e.provider_id
    where e.id = p_item_id and e.published and p.status = 'verified';
    if v_experience_id is null then
      raise exception 'ITEM_UNAVAILABLE' using errcode = 'P0001';
    end if;

  elsif p_kind = 'stay' then
    select s.id, s.provider_id, s.name
      into v_stay_id, v_provider_id, v_label
    from public.stays s join public.providers p on p.id = s.provider_id
    where s.id = p_item_id and s.published and p.status = 'verified';
    if v_stay_id is null then
      raise exception 'ITEM_UNAVAILABLE' using errcode = 'P0001';
    end if;
    v_unit_price := null; -- le prix dépend du nombre de nuits : fixé par l'établissement
  else
    raise exception 'INVALID_INPUT' using errcode = '22023';
  end if;

  if v_service_date is null or v_service_date < public.djibouti_today() then
    raise exception 'INVALID_INPUT' using errcode = '22023';
  end if;

  loop
    v_attempt := v_attempt + 1;
    begin
      insert into public.bookings (
        reference, customer_id, kind, departure_id, experience_id, stay_id, provider_id,
        item_label, service_date, party_size, contact_name, contact_phone, notes, status, quoted_total_djf
      ) values (
        public.generate_booking_reference(), v_uid, p_kind, v_departure_id, v_experience_id, v_stay_id,
        v_provider_id, v_label, v_service_date, p_party_size, trim(p_contact_name), p_contact_phone,
        nullif(trim(p_notes), ''), 'submitted', v_unit_price * p_party_size
      ) returning * into v_booking;
      exit;
    exception when unique_violation then
      if v_attempt >= 5 then raise; end if;
    end;
  end loop;

  for v_passenger in select * from jsonb_array_elements(coalesce(p_passengers, '[]'::jsonb)) loop
    v_position := v_position + 1;
    insert into public.booking_passengers (booking_id, full_name, category, position)
    values (v_booking.id, trim(v_passenger ->> 'fullName'), v_passenger ->> 'category', v_position);
  end loop;

  insert into public.booking_events (booking_id, from_status, to_status, actor_id, actor_role)
  values (v_booking.id, null, 'submitted', v_uid, 'customer');

  insert into public.notifications (user_id, kind, title, body, booking_id)
  select m.user_id, 'booking_status', 'Nouvelle demande ' || v_booking.reference,
         v_label || ' — ' || p_party_size || ' pers. le ' || to_char(v_service_date, 'DD/MM/YYYY'), v_booking.id
  from public.provider_members m where m.provider_id = v_provider_id;

  return v_booking;
end;
$$;

create or replace function public.transition_booking(p_booking_id uuid, p_to text, p_note text default null)
returns public.bookings
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.bookings;
  v_actor text;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if v_booking.id is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  v_actor := case
    when public.is_admin() then 'admin'
    when public.is_provider_member(v_booking.provider_id) then 'provider'
    when v_booking.customer_id = v_uid then 'customer'
  end;
  -- Ne pas révéler l'existence d'une réservation à un tiers.
  if v_actor is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  if not public.booking_transition_allowed(v_booking.status, p_to, v_actor) then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001';
  end if;
  if p_to = 'completed' and v_booking.service_date > public.djibouti_today() then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001';
  end if;
  if char_length(coalesce(p_note, '')) > 500 then
    raise exception 'INVALID_INPUT' using errcode = '22023';
  end if;

  insert into public.booking_events (booking_id, from_status, to_status, actor_id, actor_role, note)
  values (v_booking.id, v_booking.status, p_to, v_uid, v_actor, nullif(trim(p_note), ''));

  update public.bookings set status = p_to where id = v_booking.id returning * into v_booking;

  if v_actor <> 'customer' then
    insert into public.notifications (user_id, kind, title, body, booking_id)
    values (v_booking.customer_id, 'booking_status', 'Demande ' || v_booking.reference,
            'Nouveau statut : ' || p_to, v_booking.id);
  end if;

  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (v_uid, 'booking_transition', 'bookings', v_booking.id::text,
          jsonb_build_object('to', p_to, 'actor_role', v_actor));

  return v_booking;
end;
$$;

-- Candidature d'un prestataire : créé « en attente », l'appelant devient propriétaire.
create or replace function public.register_provider(
  p_name text, p_kind text, p_description text, p_phone text, p_email text
) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if (select count(*) from public.provider_members where user_id = v_uid and member_role = 'owner') >= 3 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  insert into public.providers (name, kind, description, phone, email, status, reliability)
  values (trim(p_name), p_kind, coalesce(p_description, ''), p_phone, p_email, 'pending', 'unverified')
  returning id into v_id;
  insert into public.provider_members (provider_id, user_id, member_role) values (v_id, v_uid, 'owner');
  return v_id;
end;
$$;

revoke execute on function public.djibouti_today(), public.to_djibouti_date(timestamptz),
  public.booking_transition_allowed(text, text, text), public.generate_booking_reference(),
  public.departure_seats_available(uuid), public.search_departures(uuid, uuid, date),
  public.request_booking(text, uuid, date, integer, jsonb, text, text, text),
  public.transition_booking(uuid, text, text),
  public.register_provider(text, text, text, text, text)
  from public, anon, authenticated;

grant execute on function public.search_departures(uuid, uuid, date),
  public.departure_seats_available(uuid) to anon, authenticated;
grant execute on function public.request_booking(text, uuid, date, integer, jsonb, text, text, text),
  public.transition_booking(uuid, text, text),
  public.register_provider(text, text, text, text, text) to authenticated;
