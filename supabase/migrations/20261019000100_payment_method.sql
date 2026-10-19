-- =============================================================================
-- DjiSea — mode de paiement choisi par le client
--
-- Le client indique comment il réglera le prestataire (CAC Pay, Waafi, D-Money ou
-- espèces à l'agence). AUCUN paiement n'est encaissé par la plateforme : le règlement
-- se fait auprès du prestataire après confirmation. Les identifiants reprennent ceux
-- de `payments.gateway` pour une future intégration.
-- =============================================================================

alter table public.bookings
  add column payment_method text
  check (payment_method in ('cac_pay', 'waafi', 'dmoney', 'cash_on_site'));

-- Nouvelle signature : on supprime l'ancienne pour ne laisser qu'un seul point d'entrée.
drop function public.request_booking(text, uuid, date, integer, jsonb, text, text, text);

create or replace function public.request_booking(
  p_kind text,
  p_item_id uuid,
  p_service_date date,
  p_party_size integer,
  p_passengers jsonb,
  p_contact_name text,
  p_contact_phone text,
  p_notes text default null,
  p_payment_method text default null
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
     or p_payment_method is null
     or p_payment_method not in ('cac_pay', 'waafi', 'dmoney', 'cash_on_site')
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
        item_label, service_date, party_size, contact_name, contact_phone, notes, status, quoted_total_djf,
        payment_method
      ) values (
        public.generate_booking_reference(), v_uid, p_kind, v_departure_id, v_experience_id, v_stay_id,
        v_provider_id, v_label, v_service_date, p_party_size, trim(p_contact_name), p_contact_phone,
        nullif(trim(p_notes), ''), 'submitted', v_unit_price * p_party_size,
        p_payment_method
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

revoke execute on function public.request_booking(text, uuid, date, integer, jsonb, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.request_booking(text, uuid, date, integer, jsonb, text, text, text, text)
  to authenticated;
