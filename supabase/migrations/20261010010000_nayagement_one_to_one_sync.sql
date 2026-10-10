-- Connect Nayagement consultation bookings to Arunika 1:1 mentorship.
-- Nayagement remains the booking source of truth; Arunika owns the derived
-- mentoring portal, schedule projection, and report workflow.

begin;

create extension if not exists pgcrypto;

create table if not exists public.one_to_one_external_sync_connections (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('nayagement')),
  source_workspace_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  mentor_name text not null default '',
  mentor_role text not null default '',
  accent_color text not null default '#16436b',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, source_workspace_id),
  constraint one_to_one_external_sync_mentor_name_length_check check (char_length(mentor_name) <= 160),
  constraint one_to_one_external_sync_mentor_role_length_check check (char_length(mentor_role) <= 160),
  constraint one_to_one_external_sync_accent_color_check check (accent_color ~ '^#[0-9A-Fa-f]{6}$')
);

-- A one-way contact fingerprint safely reuses a private portal for repeat
-- bookings without creating a second raw copy of the contact information.
create table if not exists public.one_to_one_external_contact_links (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('nayagement')),
  source_workspace_id uuid not null,
  contact_fingerprint text not null,
  portal_id uuid references public.one_to_one_portals(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, source_workspace_id, contact_fingerprint),
  constraint one_to_one_external_contact_fingerprint_check check (contact_fingerprint ~ '^[0-9a-f]{64}$')
);

-- Booking IDs, not names or emails, make retries idempotent and prevent a
-- sync from creating duplicate Arunika schedule events.
create table if not exists public.one_to_one_external_booking_links (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('nayagement')),
  source_workspace_id uuid not null,
  source_booking_id uuid not null,
  portal_id uuid references public.one_to_one_portals(id) on delete set null,
  schedule_event_id uuid references public.one_to_one_schedule_events(id) on delete set null,
  source_status text not null default 'new' check (source_status in ('new', 'confirmed', 'completed', 'cancelled')),
  source_updated_at timestamptz,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, source_workspace_id, source_booking_id)
);

create index if not exists one_to_one_external_sync_connections_owner_idx
  on public.one_to_one_external_sync_connections(owner_id, created_at desc);
create index if not exists one_to_one_external_contact_links_portal_idx
  on public.one_to_one_external_contact_links(portal_id);
create index if not exists one_to_one_external_booking_links_portal_idx
  on public.one_to_one_external_booking_links(portal_id);
create index if not exists one_to_one_external_booking_links_schedule_idx
  on public.one_to_one_external_booking_links(schedule_event_id);

drop trigger if exists set_one_to_one_external_sync_connections_updated_at on public.one_to_one_external_sync_connections;
create trigger set_one_to_one_external_sync_connections_updated_at
before update on public.one_to_one_external_sync_connections
for each row execute function public.set_one_to_one_updated_at();

drop trigger if exists set_one_to_one_external_contact_links_updated_at on public.one_to_one_external_contact_links;
create trigger set_one_to_one_external_contact_links_updated_at
before update on public.one_to_one_external_contact_links
for each row execute function public.set_one_to_one_updated_at();

drop trigger if exists set_one_to_one_external_booking_links_updated_at on public.one_to_one_external_booking_links;
create trigger set_one_to_one_external_booking_links_updated_at
before update on public.one_to_one_external_booking_links
for each row execute function public.set_one_to_one_updated_at();

alter table public.one_to_one_external_sync_connections enable row level security;
alter table public.one_to_one_external_contact_links enable row level security;
alter table public.one_to_one_external_booking_links enable row level security;

revoke all on public.one_to_one_external_sync_connections from public, anon, authenticated;
revoke all on public.one_to_one_external_contact_links from public, anon, authenticated;
revoke all on public.one_to_one_external_booking_links from public, anon, authenticated;

-- The admin UI can only read its configured connection; all mapping writes are
-- behind security-definer RPCs or the service-role-only sync RPC.
grant select on public.one_to_one_external_sync_connections to authenticated;

drop policy if exists one_to_one_external_sync_connections_admin_read on public.one_to_one_external_sync_connections;
create policy one_to_one_external_sync_connections_admin_read
on public.one_to_one_external_sync_connections for select
to authenticated
using ((select public.is_arunika_admin()));

create or replace function public.configure_nayagement_one_to_one_sync(
  p_workspace_id uuid,
  p_mentor_name text default '',
  p_mentor_role text default '',
  p_accent_color text default '#16436b'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_mentor_name text := trim(coalesce(p_mentor_name, ''));
  v_mentor_role text := trim(coalesce(p_mentor_role, ''));
  v_accent_color text := trim(coalesce(p_accent_color, '#16436b'));
  v_connection public.one_to_one_external_sync_connections%rowtype;
begin
  if not public.is_arunika_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  if p_workspace_id is null then raise exception using message = 'INVALID_NAYAGEMENT_WORKSPACE_ID'; end if;
  if char_length(v_mentor_name) > 160 then raise exception using message = 'INVALID_MENTOR_NAME'; end if;
  if char_length(v_mentor_role) > 160 then raise exception using message = 'INVALID_MENTOR_ROLE'; end if;
  if v_accent_color !~ '^#[0-9A-Fa-f]{6}$' then raise exception using message = 'INVALID_ACCENT_COLOR'; end if;

  insert into public.one_to_one_external_sync_connections (
    provider, source_workspace_id, owner_id, mentor_name, mentor_role, accent_color, is_active
  ) values (
    'nayagement', p_workspace_id, auth.uid(), v_mentor_name, v_mentor_role, lower(v_accent_color), true
  )
  on conflict (provider, source_workspace_id) do update
  set owner_id = excluded.owner_id,
      mentor_name = excluded.mentor_name,
      mentor_role = excluded.mentor_role,
      accent_color = excluded.accent_color,
      is_active = true,
      updated_at = now()
  returning * into v_connection;

  return jsonb_build_object(
    'id', v_connection.id,
    'provider', v_connection.provider,
    'sourceWorkspaceId', v_connection.source_workspace_id,
    'ownerId', v_connection.owner_id,
    'mentorName', v_connection.mentor_name,
    'mentorRole', v_connection.mentor_role,
    'accentColor', v_connection.accent_color,
    'isActive', v_connection.is_active
  );
end;
$$;

-- This procedure is called only by the Arunika Edge Function, after it has
-- validated Nayagement's HMAC signature. Browser roles cannot execute it.
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
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
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

revoke all on function public.configure_nayagement_one_to_one_sync(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.configure_nayagement_one_to_one_sync(uuid, text, text, text) to authenticated;
revoke all on function public.sync_nayagement_one_to_one_booking(uuid, uuid, text, text, text, text, text, text, timestamptz, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.sync_nayagement_one_to_one_booking(uuid, uuid, text, text, text, text, text, text, timestamptz, timestamptz, timestamptz) to service_role;

notify pgrst, 'reload schema';

commit;
