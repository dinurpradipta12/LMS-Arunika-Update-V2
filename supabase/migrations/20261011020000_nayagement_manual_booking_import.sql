-- Manual Nayagement → Arunika booking import.
--
-- The signed Edge Function remains the preferred automated path. This migration
-- adds a safe fallback for a workspace administrator: export a JSON file from
-- Nayagement, then import it from Arunika's report flow. The imported booking
-- still uses the same external booking, portal, and schedule-event mappings as
-- the server-to-server sync, so retries are idempotent.

begin;

create or replace function private.sync_nayagement_one_to_one_booking_core(
  p_workspace_id uuid,
  p_booking_id uuid,
  p_name text,
  p_email text,
  p_whatsapp text,
  p_topic text,
  p_details text,
  p_status text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_source_updated_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  v_connection public.one_to_one_external_sync_connections%rowtype;
  v_link public.one_to_one_external_booking_links%rowtype;
  v_link_exists boolean := false;
  v_token text;
  v_portal_id uuid;
  v_event_id uuid;
  v_name text := trim(coalesce(p_name, ''));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_phone text := regexp_replace(trim(coalesce(p_whatsapp, '')), '[^0-9+]', '', 'g');
  v_topic text := trim(coalesce(p_topic, ''));
  v_status text := lower(trim(coalesce(p_status, '')));
  v_event_status text;
  v_contact_fingerprint text;
  v_event_title text;
  v_event_description text := 'Jadwal disinkronkan dari booking Nayagement.';
  v_sort_order integer;
begin
  if p_workspace_id is null or p_booking_id is null then raise exception using message = 'INVALID_SOURCE_BOOKING'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 160 then raise exception using message = 'INVALID_MENTEE_NAME'; end if;
  if char_length(v_email) > 320 then raise exception using message = 'INVALID_MENTEE_EMAIL'; end if;
  if char_length(v_topic) < 2 or char_length(v_topic) > 240 then raise exception using message = 'INVALID_BOOKING_TOPIC'; end if;
  if char_length(coalesce(p_details, '')) > 10000 then raise exception using message = 'INVALID_BOOKING_DETAILS'; end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at then raise exception using message = 'INVALID_BOOKING_TIME'; end if;
  if p_source_updated_at is null then raise exception using message = 'INVALID_SOURCE_UPDATED_AT'; end if;
  if v_status not in ('new', 'confirmed', 'completed', 'cancelled') then raise exception using message = 'INVALID_BOOKING_STATUS'; end if;

  select * into v_connection
  from public.one_to_one_external_sync_connections
  where provider = 'nayagement'
    and source_workspace_id = p_workspace_id
    and is_active = true;
  if not found then raise exception using errcode = 'P0001', message = 'SYNC_CONNECTION_NOT_CONFIGURED'; end if;

  select * into v_link
  from public.one_to_one_external_booking_links
  where provider = 'nayagement'
    and source_workspace_id = p_workspace_id
    and source_booking_id = p_booking_id;
  v_link_exists := found;

  if v_link_exists and v_link.source_updated_at is not null and p_source_updated_at < v_link.source_updated_at then
    return jsonb_build_object('portalId', v_link.portal_id, 'scheduleEventId', v_link.schedule_event_id, 'ignored', true, 'reason', 'STALE_SOURCE_UPDATE');
  end if;

  if v_link_exists and v_link.portal_id is not null then
    select id into v_portal_id from public.one_to_one_portals where id = v_link.portal_id;
  end if;

  if v_portal_id is null and v_email <> '' then
    v_contact_fingerprint := encode(digest('email:' || v_email, 'sha256'), 'hex');
  elsif v_portal_id is null and v_phone <> '' then
    v_contact_fingerprint := encode(digest('whatsapp:' || v_phone, 'sha256'), 'hex');
  end if;

  if v_portal_id is null and v_contact_fingerprint is not null then
    select portal.id into v_portal_id
    from public.one_to_one_external_contact_links as contact
    join public.one_to_one_portals as portal on portal.id = contact.portal_id
    where contact.provider = 'nayagement'
      and contact.source_workspace_id = p_workspace_id
      and contact.contact_fingerprint = v_contact_fingerprint
      and portal.owner_id = v_connection.owner_id;
  end if;

  if v_portal_id is null then
    v_token := encode(gen_random_bytes(32), 'hex');
    insert into public.one_to_one_portals (
      owner_id, public_token_hash, public_token_hint, title, mentee_name, mentee_email,
      mentor_name, mentor_role, accent_color
    ) values (
      v_connection.owner_id, private.hash_one_to_one_token(v_token), right(v_token, 8),
      left('Ruang 1:1 · ' || v_name, 200), v_name, v_email,
      v_connection.mentor_name, v_connection.mentor_role, v_connection.accent_color
    ) returning id into v_portal_id;
  else
    update public.one_to_one_portals
    set mentee_name = v_name,
        mentee_email = v_email,
        mentor_name = v_connection.mentor_name,
        mentor_role = v_connection.mentor_role,
        accent_color = v_connection.accent_color,
        updated_at = now()
    where id = v_portal_id;
  end if;

  if v_contact_fingerprint is not null then
    insert into public.one_to_one_external_contact_links (
      provider, source_workspace_id, contact_fingerprint, portal_id
    ) values ('nayagement', p_workspace_id, v_contact_fingerprint, v_portal_id)
    on conflict (provider, source_workspace_id, contact_fingerprint) do update
    set portal_id = excluded.portal_id, updated_at = now();
  end if;

  v_event_status := case when v_status = 'completed' then 'completed' when v_status = 'cancelled' then 'cancelled' else 'scheduled' end;
  v_event_title := left('Konsultasi Nayagement · ' || v_topic, 240);

  if v_link_exists and v_link.schedule_event_id is not null then
    update public.one_to_one_schedule_events
    set portal_id = v_portal_id,
        title = v_event_title,
        description = v_event_description,
        starts_at = p_starts_at,
        ends_at = p_ends_at,
        status = v_event_status,
        updated_at = now()
    where id = v_link.schedule_event_id
    returning id into v_event_id;
  end if;

  if v_event_id is null then
    select coalesce(max(sort_order), -1) + 1 into v_sort_order
    from public.one_to_one_schedule_events
    where portal_id = v_portal_id;
    insert into public.one_to_one_schedule_events (
      portal_id, title, description, starts_at, ends_at, status, sort_order
    ) values (
      v_portal_id, v_event_title, v_event_description, p_starts_at, p_ends_at, v_event_status, v_sort_order
    ) returning id into v_event_id;
  end if;

  insert into public.one_to_one_external_booking_links (
    provider, source_workspace_id, source_booking_id, portal_id, schedule_event_id,
    source_status, source_updated_at, synced_at
  ) values (
    'nayagement', p_workspace_id, p_booking_id, v_portal_id, v_event_id,
    v_status, p_source_updated_at, now()
  )
  on conflict (provider, source_workspace_id, source_booking_id) do update
  set portal_id = excluded.portal_id,
      schedule_event_id = excluded.schedule_event_id,
      source_status = excluded.source_status,
      source_updated_at = excluded.source_updated_at,
      synced_at = excluded.synced_at,
      updated_at = now();

  return jsonb_build_object('portalId', v_portal_id, 'scheduleEventId', v_event_id, 'status', v_event_status, 'ignored', false);
end;
$$;

-- Keep the existing signed Edge Function contract intact, while sharing the
-- same idempotent projection logic with the administrator-only manual import.
create or replace function public.sync_nayagement_one_to_one_booking(
  p_workspace_id uuid,
  p_booking_id uuid,
  p_name text,
  p_email text,
  p_whatsapp text,
  p_topic text,
  p_details text,
  p_status text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_source_updated_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  return private.sync_nayagement_one_to_one_booking_core(
    p_workspace_id, p_booking_id, p_name, p_email, p_whatsapp, p_topic,
    p_details, p_status, p_starts_at, p_ends_at, p_source_updated_at
  );
end;
$$;

create or replace function public.import_nayagement_one_to_one_bookings(p_export jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  v_workspace_id uuid;
  v_booking jsonb;
  v_result jsonb;
  v_results jsonb := '[]'::jsonb;
  v_booking_id uuid;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_updated_at timestamptz;
  v_bookings jsonb;
  v_total integer := 0;
  v_imported integer := 0;
  v_ignored integer := 0;
begin
  if not public.is_arunika_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  if jsonb_typeof(p_export) <> 'object' then
    raise exception using message = 'INVALID_NAYAGEMENT_EXPORT';
  end if;
  if coalesce(p_export ->> 'format', '') <> 'nayagement-consultation-bookings/v1' then
    raise exception using message = 'UNSUPPORTED_NAYAGEMENT_EXPORT';
  end if;
  if coalesce(p_export ->> 'workspaceId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception using message = 'INVALID_NAYAGEMENT_WORKSPACE_ID';
  end if;
  v_workspace_id := (p_export ->> 'workspaceId')::uuid;
  v_bookings := p_export -> 'bookings';
  if jsonb_typeof(v_bookings) <> 'array' then
    raise exception using message = 'INVALID_NAYAGEMENT_EXPORT';
  end if;
  v_total := jsonb_array_length(v_bookings);
  if v_total < 1 then raise exception using message = 'NAYAGEMENT_EXPORT_EMPTY'; end if;
  if v_total > 200 then raise exception using message = 'NAYAGEMENT_EXPORT_TOO_LARGE'; end if;

  -- Check the connection before doing any write. This preserves the configured
  -- workspace boundary even though the file is manually selected by an admin.
  if not exists (
    select 1 from public.one_to_one_external_sync_connections
    where provider = 'nayagement'
      and source_workspace_id = v_workspace_id
      and is_active = true
  ) then
    raise exception using message = 'SYNC_CONNECTION_NOT_CONFIGURED';
  end if;

  for v_booking in select value from jsonb_array_elements(v_bookings)
  loop
    if jsonb_typeof(v_booking) <> 'object' then raise exception using message = 'INVALID_NAYAGEMENT_BOOKING'; end if;
    if coalesce(v_booking ->> 'id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception using message = 'INVALID_NAYAGEMENT_BOOKING_ID';
    end if;
    v_booking_id := (v_booking ->> 'id')::uuid;
    begin
      v_starts_at := (v_booking ->> 'startsAt')::timestamptz;
      v_ends_at := (v_booking ->> 'endsAt')::timestamptz;
      v_updated_at := (v_booking ->> 'updatedAt')::timestamptz;
    exception when others then
      raise exception using message = 'INVALID_NAYAGEMENT_BOOKING_TIME';
    end;

    v_result := private.sync_nayagement_one_to_one_booking_core(
      v_workspace_id,
      v_booking_id,
      coalesce(v_booking ->> 'name', ''),
      coalesce(v_booking ->> 'email', ''),
      coalesce(v_booking ->> 'whatsapp', ''),
      coalesce(v_booking ->> 'topic', ''),
      coalesce(v_booking ->> 'details', ''),
      coalesce(v_booking ->> 'status', ''),
      v_starts_at,
      v_ends_at,
      v_updated_at
    );
    v_results := v_results || jsonb_build_array(v_result || jsonb_build_object('sourceBookingId', v_booking_id));
    if coalesce((v_result ->> 'ignored')::boolean, false) then v_ignored := v_ignored + 1; else v_imported := v_imported + 1; end if;
  end loop;

  return jsonb_build_object(
    'workspaceId', v_workspace_id,
    'total', v_total,
    'imported', v_imported,
    'ignored', v_ignored,
    'results', v_results
  );
end;
$$;

revoke all on function private.sync_nayagement_one_to_one_booking_core(uuid, uuid, text, text, text, text, text, text, timestamptz, timestamptz, timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.sync_nayagement_one_to_one_booking(uuid, uuid, text, text, text, text, text, text, timestamptz, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.sync_nayagement_one_to_one_booking(uuid, uuid, text, text, text, text, text, text, timestamptz, timestamptz, timestamptz) to service_role;
revoke all on function public.import_nayagement_one_to_one_bookings(jsonb) from public, anon, authenticated;
grant execute on function public.import_nayagement_one_to_one_bookings(jsonb) to authenticated;

notify pgrst, 'reload schema';

commit;
