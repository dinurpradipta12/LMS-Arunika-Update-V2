-- Arunika LMS: private 1:1 mentorship portals.
--
-- Each mentee receives a high-entropy token. The raw token is returned only
-- when a portal is created or its link is rotated; only a SHA-256 hash is
-- stored in the database. Public visitors never receive direct table access:
-- get_one_to_one_portal() resolves exactly one token and returns only the
-- published/visible content belonging to that portal.

begin;

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.one_to_one_portals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  public_token_hash text not null unique,
  public_token_hint text not null default '',
  title text not null default 'Ruang 1:1',
  mentee_name text not null default '',
  mentee_email text not null default '',
  mentor_name text not null default '',
  mentor_role text not null default '',
  mentor_avatar_url text not null default '',
  logo_url text not null default '',
  cover_image_url text not null default '',
  welcome_title text not null default 'Ruang belajar personal Anda',
  welcome_message text not null default '',
  theme text not null default 'navy'
    check (theme in ('navy', 'emerald', 'coral', 'violet', 'amber')),
  accent_color text not null default '#16436b',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_to_one_title_length_check check (char_length(title) between 1 and 200),
  constraint one_to_one_mentee_name_length_check check (char_length(mentee_name) between 1 and 160),
  constraint one_to_one_mentee_email_length_check check (char_length(mentee_email) <= 320),
  constraint one_to_one_welcome_message_length_check check (char_length(welcome_message) <= 10000),
  constraint one_to_one_token_hint_length_check check (char_length(public_token_hint) <= 16)
);

create table if not exists public.one_to_one_recordings (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.one_to_one_portals(id) on delete cascade,
  title text not null default 'Recording baru',
  description text not null default '',
  video_url text not null default '',
  material_url text not null default '',
  duration text not null default '',
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_to_one_recording_title_length_check check (char_length(title) between 1 and 240),
  constraint one_to_one_recording_description_length_check check (char_length(description) <= 10000)
);

create table if not exists public.one_to_one_schedule_events (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.one_to_one_portals(id) on delete cascade,
  title text not null default 'Sesi mentoring',
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null default '',
  meeting_url text not null default '',
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_to_one_schedule_title_length_check check (char_length(title) between 1 and 240),
  constraint one_to_one_schedule_time_check check (ends_at is null or ends_at >= starts_at)
);

create table if not exists public.one_to_one_tasks (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.one_to_one_portals(id) on delete cascade,
  title text not null default 'Task baru',
  description text not null default '',
  due_at timestamptz,
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_to_one_task_title_length_check check (char_length(title) between 1 and 240),
  constraint one_to_one_task_description_length_check check (char_length(description) <= 10000)
);

create table if not exists public.one_to_one_notes (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.one_to_one_portals(id) on delete cascade,
  title text not null default 'Catatan mentor',
  body text not null default '',
  note_date date default current_date,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_to_one_note_title_length_check check (char_length(title) between 1 and 240),
  constraint one_to_one_note_body_length_check check (char_length(body) <= 20000)
);

create index if not exists one_to_one_portals_owner_created_idx
  on public.one_to_one_portals(owner_id, created_at desc);
create index if not exists one_to_one_recordings_portal_order_idx
  on public.one_to_one_recordings(portal_id, sort_order, created_at);
create index if not exists one_to_one_schedule_portal_start_idx
  on public.one_to_one_schedule_events(portal_id, starts_at);
create index if not exists one_to_one_tasks_portal_order_idx
  on public.one_to_one_tasks(portal_id, sort_order, created_at);
create index if not exists one_to_one_notes_portal_date_idx
  on public.one_to_one_notes(portal_id, note_date desc, created_at desc);

create or replace function public.set_one_to_one_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_one_to_one_portals_updated_at on public.one_to_one_portals;
create trigger set_one_to_one_portals_updated_at
before update on public.one_to_one_portals
for each row execute function public.set_one_to_one_updated_at();

drop trigger if exists set_one_to_one_recordings_updated_at on public.one_to_one_recordings;
create trigger set_one_to_one_recordings_updated_at
before update on public.one_to_one_recordings
for each row execute function public.set_one_to_one_updated_at();

drop trigger if exists set_one_to_one_schedule_updated_at on public.one_to_one_schedule_events;
create trigger set_one_to_one_schedule_updated_at
before update on public.one_to_one_schedule_events
for each row execute function public.set_one_to_one_updated_at();

drop trigger if exists set_one_to_one_tasks_updated_at on public.one_to_one_tasks;
create trigger set_one_to_one_tasks_updated_at
before update on public.one_to_one_tasks
for each row execute function public.set_one_to_one_updated_at();

drop trigger if exists set_one_to_one_notes_updated_at on public.one_to_one_notes;
create trigger set_one_to_one_notes_updated_at
before update on public.one_to_one_notes
for each row execute function public.set_one_to_one_updated_at();

alter table public.one_to_one_portals enable row level security;
alter table public.one_to_one_recordings enable row level security;
alter table public.one_to_one_schedule_events enable row level security;
alter table public.one_to_one_tasks enable row level security;
alter table public.one_to_one_notes enable row level security;

revoke all on public.one_to_one_portals from public, anon, authenticated;
revoke all on public.one_to_one_recordings from public, anon, authenticated;
revoke all on public.one_to_one_schedule_events from public, anon, authenticated;
revoke all on public.one_to_one_tasks from public, anon, authenticated;
revoke all on public.one_to_one_notes from public, anon, authenticated;

grant select, insert, update, delete on public.one_to_one_portals to authenticated;
grant select, insert, update, delete on public.one_to_one_recordings to authenticated;
grant select, insert, update, delete on public.one_to_one_schedule_events to authenticated;
grant select, insert, update, delete on public.one_to_one_tasks to authenticated;
grant select, insert, update, delete on public.one_to_one_notes to authenticated;

drop policy if exists one_to_one_portals_admin_all on public.one_to_one_portals;
create policy one_to_one_portals_admin_all
on public.one_to_one_portals for all
to authenticated
using ((select public.is_arunika_admin()))
with check ((select public.is_arunika_admin()));

drop policy if exists one_to_one_recordings_admin_all on public.one_to_one_recordings;
create policy one_to_one_recordings_admin_all
on public.one_to_one_recordings for all
to authenticated
using ((select public.is_arunika_admin()))
with check ((select public.is_arunika_admin()));

drop policy if exists one_to_one_schedule_admin_all on public.one_to_one_schedule_events;
create policy one_to_one_schedule_admin_all
on public.one_to_one_schedule_events for all
to authenticated
using ((select public.is_arunika_admin()))
with check ((select public.is_arunika_admin()));

drop policy if exists one_to_one_tasks_admin_all on public.one_to_one_tasks;
create policy one_to_one_tasks_admin_all
on public.one_to_one_tasks for all
to authenticated
using ((select public.is_arunika_admin()))
with check ((select public.is_arunika_admin()));

drop policy if exists one_to_one_notes_admin_all on public.one_to_one_notes;
create policy one_to_one_notes_admin_all
on public.one_to_one_notes for all
to authenticated
using ((select public.is_arunika_admin()))
with check ((select public.is_arunika_admin()));

-- The hash helper is private and never exposed to the Data API.
create or replace function private.hash_one_to_one_token(p_token text)
returns text
language sql
immutable
strict
security definer
set search_path = public, extensions, pg_temp
as $$
  select encode(digest(convert_to(p_token, 'utf8'), 'sha256'), 'hex');
$$;

revoke all on function private.hash_one_to_one_token(text) from public, anon, authenticated;

create or replace function public.create_one_to_one_portal(
  p_title text,
  p_mentee_name text,
  p_mentee_email text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_token text := encode(gen_random_bytes(32), 'hex');
  v_portal_id uuid;
  v_title text := nullif(trim(coalesce(p_title, '')), '');
  v_mentee_name text := nullif(trim(coalesce(p_mentee_name, '')), '');
  v_mentee_email text := lower(trim(coalesce(p_mentee_email, '')));
begin
  if not public.is_arunika_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  if v_mentee_name is null or char_length(v_mentee_name) > 160 then
    raise exception using message = 'INVALID_MENTEE_NAME';
  end if;
  if char_length(v_mentee_email) > 320 then
    raise exception using message = 'INVALID_MENTEE_EMAIL';
  end if;

  insert into public.one_to_one_portals (
    owner_id, public_token_hash, public_token_hint, title, mentee_name, mentee_email
  ) values (
    auth.uid(), private.hash_one_to_one_token(v_token), right(v_token, 8),
    coalesce(v_title, 'Ruang 1:1 ' || v_mentee_name), v_mentee_name, v_mentee_email
  ) returning id into v_portal_id;

  return jsonb_build_object('portalId', v_portal_id, 'token', v_token, 'publicTokenHint', right(v_token, 8));
end;
$$;

create or replace function public.rotate_one_to_one_portal_token(p_portal_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_token text := encode(gen_random_bytes(32), 'hex');
  v_exists boolean;
begin
  if not public.is_arunika_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;

  update public.one_to_one_portals
  set public_token_hash = private.hash_one_to_one_token(v_token),
      public_token_hint = right(v_token, 8),
      updated_at = now()
  where id = p_portal_id
  returning true into v_exists;

  if not coalesce(v_exists, false) then
    raise exception using message = 'PORTAL_NOT_FOUND';
  end if;
  return jsonb_build_object('portalId', p_portal_id, 'token', v_token, 'publicTokenHint', right(v_token, 8));
end;
$$;

-- Public access is intentionally a single token lookup. The function does not
-- expose owner_id, token hashes, inactive portals, hidden tasks/notes, or any
-- content from another portal.
create or replace function public.get_one_to_one_portal(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_portal public.one_to_one_portals%rowtype;
begin
  if p_token is null or char_length(trim(p_token)) < 48 or char_length(trim(p_token)) > 128 then
    return null;
  end if;

  select portal.*
  into v_portal
  from public.one_to_one_portals as portal
  where portal.public_token_hash = private.hash_one_to_one_token(trim(p_token))
    and portal.is_active = true;

  if not found then return null; end if;

  return jsonb_build_object(
    'id', v_portal.id,
    'title', v_portal.title,
    'menteeName', v_portal.mentee_name,
    'menteeEmail', v_portal.mentee_email,
    'mentorName', v_portal.mentor_name,
    'mentorRole', v_portal.mentor_role,
    'mentorAvatarUrl', v_portal.mentor_avatar_url,
    'logoUrl', v_portal.logo_url,
    'coverImageUrl', v_portal.cover_image_url,
    'welcomeTitle', v_portal.welcome_title,
    'welcomeMessage', v_portal.welcome_message,
    'theme', v_portal.theme,
    'accentColor', v_portal.accent_color,
    'recordings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', item.id, 'title', item.title, 'description', item.description,
        'videoUrl', item.video_url, 'materialUrl', item.material_url,
        'duration', item.duration, 'sortOrder', item.sort_order
      ) order by item.sort_order, item.created_at)
      from public.one_to_one_recordings as item
      where item.portal_id = v_portal.id and item.is_published = true
    ), '[]'::jsonb),
    'schedule', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', item.id, 'title', item.title, 'description', item.description,
        'startsAt', item.starts_at, 'endsAt', item.ends_at, 'location', item.location,
        'meetingUrl', item.meeting_url, 'status', item.status, 'sortOrder', item.sort_order
      ) order by item.starts_at, item.sort_order)
      from public.one_to_one_schedule_events as item
      where item.portal_id = v_portal.id and item.status <> 'cancelled'
    ), '[]'::jsonb),
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', item.id, 'title', item.title, 'description', item.description,
        'dueAt', item.due_at, 'status', item.status, 'priority', item.priority,
        'sortOrder', item.sort_order
      ) order by item.sort_order, item.due_at nulls last, item.created_at)
      from public.one_to_one_tasks as item
      where item.portal_id = v_portal.id and item.is_visible = true
    ), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', item.id, 'title', item.title, 'body', item.body,
        'noteDate', item.note_date, 'sortOrder', item.sort_order
      ) order by item.note_date desc nulls last, item.sort_order, item.created_at desc)
      from public.one_to_one_notes as item
      where item.portal_id = v_portal.id and item.is_visible = true
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.create_one_to_one_portal(text, text, text) from public, anon, authenticated;
revoke all on function public.rotate_one_to_one_portal_token(uuid) from public, anon, authenticated;
revoke all on function public.get_one_to_one_portal(text) from public, anon, authenticated;
grant execute on function public.create_one_to_one_portal(text, text, text) to authenticated;
grant execute on function public.rotate_one_to_one_portal_token(uuid) to authenticated;
grant execute on function public.get_one_to_one_portal(text) to anon, authenticated;

revoke all on function public.set_one_to_one_updated_at() from public, anon, authenticated;

notify pgrst, 'reload schema';

commit;
