-- Chat Center MVP: one public, token-protected room per person.
-- The raw token is returned only when a room is created or rotated. Public
-- clients never receive table access; they use the narrowly scoped RPCs below.

begin;

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  public_token_hash text not null unique,
  public_token_hint text not null default '',
  title text not null default 'Chat Center',
  participant_name text not null default '',
  participant_email text not null default '',
  status text not null default 'active'
    check (status in ('active', 'closed')),
  duration_minutes integer not null default 1440
    check (duration_minutes between 5 and 43200),
  expires_at timestamptz not null,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_room_title_length_check check (char_length(title) between 1 and 200),
  constraint chat_room_participant_name_length_check check (char_length(participant_name) between 1 and 160),
  constraint chat_room_participant_email_length_check check (char_length(participant_email) <= 320),
  constraint chat_room_token_hint_length_check check (char_length(public_token_hint) <= 16)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_role text not null check (sender_role in ('admin', 'guest')),
  sender_name text not null default '',
  body text not null,
  client_message_id text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint chat_message_body_length_check check (char_length(body) between 1 and 4000),
  constraint chat_message_sender_name_length_check check (char_length(sender_name) <= 160),
  constraint chat_message_client_id_length_check check (client_message_id is null or char_length(client_message_id) between 8 and 160)
);

create unique index if not exists chat_messages_room_client_id_unique_idx
  on public.chat_messages(room_id, client_message_id)
  where client_message_id is not null;
create index if not exists chat_rooms_owner_updated_idx
  on public.chat_rooms(owner_id, updated_at desc);
create index if not exists chat_rooms_last_message_idx
  on public.chat_rooms(last_message_at desc nulls last);
create index if not exists chat_messages_room_created_idx
  on public.chat_messages(room_id, created_at);

create or replace function public.set_chat_center_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_chat_rooms_updated_at on public.chat_rooms;
create trigger set_chat_rooms_updated_at
before update on public.chat_rooms
for each row execute function public.set_chat_center_updated_at();

alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;

revoke all on public.chat_rooms from public, anon, authenticated;
revoke all on public.chat_messages from public, anon, authenticated;
grant select, insert, update, delete on public.chat_rooms to authenticated;
grant select, insert, update, delete on public.chat_messages to authenticated;

drop policy if exists chat_rooms_admin_all on public.chat_rooms;
create policy chat_rooms_admin_all
on public.chat_rooms for all
to authenticated
using ((select public.is_arunika_admin()))
with check ((select public.is_arunika_admin()));

drop policy if exists chat_messages_admin_all on public.chat_messages;
create policy chat_messages_admin_all
on public.chat_messages for all
to authenticated
using ((select public.is_arunika_admin()))
with check ((select public.is_arunika_admin()));

create or replace function private.hash_chat_token(p_token text)
returns text
language sql
immutable
strict
security definer
set search_path = public, extensions, pg_temp
as $$
  select encode(digest(convert_to(p_token, 'utf8'), 'sha256'), 'hex');
$$;

revoke all on function private.hash_chat_token(text) from public, anon, authenticated;

create or replace function public.create_chat_room(
  p_title text,
  p_participant_name text,
  p_participant_email text default '',
  p_duration_minutes integer default 1440
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_token text := encode(gen_random_bytes(32), 'hex');
  v_room_id uuid;
  v_title text := nullif(trim(coalesce(p_title, '')), '');
  v_participant_name text := nullif(trim(coalesce(p_participant_name, '')), '');
  v_participant_email text := lower(trim(coalesce(p_participant_email, '')));
  v_duration integer := coalesce(p_duration_minutes, 1440);
  v_expires_at timestamptz := now() + make_interval(mins => v_duration);
begin
  if not public.is_arunika_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  if v_participant_name is null or char_length(v_participant_name) > 160 then
    raise exception using message = 'INVALID_PARTICIPANT_NAME';
  end if;
  if char_length(v_participant_email) > 320 then
    raise exception using message = 'INVALID_PARTICIPANT_EMAIL';
  end if;
  if v_duration < 5 or v_duration > 43200 then
    raise exception using message = 'INVALID_DURATION';
  end if;

  insert into public.chat_rooms (
    owner_id, public_token_hash, public_token_hint, title,
    participant_name, participant_email, duration_minutes, expires_at
  ) values (
    auth.uid(), private.hash_chat_token(v_token), right(v_token, 8),
    coalesce(v_title, 'Chat dengan ' || v_participant_name),
    v_participant_name, v_participant_email, v_duration, v_expires_at
  ) returning id into v_room_id;

  return jsonb_build_object(
    'roomId', v_room_id,
    'token', v_token,
    'publicTokenHint', right(v_token, 8),
    'expiresAt', v_expires_at
  );
end;
$$;

create or replace function public.rotate_chat_room_token(p_room_id uuid)
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

  update public.chat_rooms
  set public_token_hash = private.hash_chat_token(v_token),
      public_token_hint = right(v_token, 8),
      updated_at = now()
  where id = p_room_id
  returning true into v_exists;

  if not coalesce(v_exists, false) then
    raise exception using message = 'ROOM_NOT_FOUND';
  end if;

  return jsonb_build_object('roomId', p_room_id, 'token', v_token, 'publicTokenHint', right(v_token, 8));
end;
$$;

create or replace function public.update_chat_room_access(
  p_room_id uuid,
  p_status text,
  p_duration_minutes integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_duration integer := coalesce(p_duration_minutes, 1440);
  v_expires_at timestamptz;
begin
  if not public.is_arunika_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  if p_status not in ('active', 'closed') then
    raise exception using message = 'INVALID_ROOM_STATUS';
  end if;
  if v_duration < 5 or v_duration > 43200 then
    raise exception using message = 'INVALID_DURATION';
  end if;

  v_expires_at := case
    when p_status = 'active' then now() + make_interval(mins => v_duration)
    else now()
  end;

  update public.chat_rooms
  set status = p_status,
      duration_minutes = v_duration,
      expires_at = v_expires_at,
      updated_at = now()
  where id = p_room_id;

  if not found then
    raise exception using message = 'ROOM_NOT_FOUND';
  end if;

  return jsonb_build_object('roomId', p_room_id, 'status', p_status, 'durationMinutes', v_duration, 'expiresAt', v_expires_at);
end;
$$;

create or replace function public.get_public_chat_room(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_room public.chat_rooms%rowtype;
  v_available boolean;
  v_status text;
begin
  if p_token is null or char_length(trim(p_token)) < 48 or char_length(trim(p_token)) > 128 then
    return null;
  end if;

  select room.* into v_room
  from public.chat_rooms as room
  where room.public_token_hash = private.hash_chat_token(trim(p_token));

  if not found then return null; end if;

  v_available := v_room.status = 'active' and v_room.expires_at > now();
  v_status := case
    when v_room.status = 'closed' then 'closed'
    when v_room.expires_at <= now() then 'expired'
    else 'active'
  end;

  return jsonb_build_object(
    'id', v_room.id,
    'title', v_room.title,
    'participantName', v_room.participant_name,
    'status', v_status,
    'available', v_available,
    'expiresAt', v_room.expires_at,
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', recent.id,
        'senderRole', recent.sender_role,
        'senderName', recent.sender_name,
        'body', recent.body,
        'clientMessageId', recent.client_message_id,
        'readAt', recent.read_at,
        'createdAt', recent.created_at
      ) order by recent.created_at)
      from (
        select message.*
        from public.chat_messages as message
        where message.room_id = v_room.id
        order by message.created_at desc
        limit 200
      ) as recent
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.send_public_chat_message(
  p_token text,
  p_body text,
  p_client_message_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_room public.chat_rooms%rowtype;
  v_body text := nullif(trim(coalesce(p_body, '')), '');
  v_message public.chat_messages%rowtype;
  v_recent_count integer;
begin
  if p_token is null or char_length(trim(p_token)) < 48 or char_length(trim(p_token)) > 128 then
    raise exception using message = 'INVALID_ROOM_TOKEN';
  end if;
  if v_body is null or char_length(v_body) > 4000 then
    raise exception using message = 'INVALID_MESSAGE';
  end if;

  select room.* into v_room
  from public.chat_rooms as room
  where room.public_token_hash = private.hash_chat_token(trim(p_token));

  if not found then raise exception using message = 'ROOM_NOT_FOUND'; end if;
  if v_room.status <> 'active' or v_room.expires_at <= now() then
    raise exception using message = 'ROOM_EXPIRED';
  end if;

  if p_client_message_id is not null then
    select message.* into v_message
    from public.chat_messages as message
    where message.room_id = v_room.id
      and message.client_message_id = p_client_message_id;
    if found then
      return jsonb_build_object(
        'id', v_message.id, 'senderRole', v_message.sender_role,
        'senderName', v_message.sender_name, 'body', v_message.body,
        'clientMessageId', v_message.client_message_id,
        'readAt', v_message.read_at, 'createdAt', v_message.created_at
      );
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_room.id::text, 0));
  select count(*)::integer into v_recent_count
  from public.chat_messages as message
  where message.room_id = v_room.id
    and message.sender_role = 'guest'
    and message.created_at > now() - interval '1 minute';
  if v_recent_count >= 30 then
    raise exception using message = 'RATE_LIMITED';
  end if;

  insert into public.chat_messages (room_id, sender_role, sender_name, body, client_message_id)
  values (v_room.id, 'guest', v_room.participant_name, v_body, nullif(trim(p_client_message_id), ''))
  returning * into v_message;

  update public.chat_rooms
  set last_message_at = v_message.created_at, updated_at = v_message.created_at
  where id = v_room.id;

  return jsonb_build_object(
    'id', v_message.id, 'senderRole', v_message.sender_role,
    'senderName', v_message.sender_name, 'body', v_message.body,
    'clientMessageId', v_message.client_message_id,
    'readAt', v_message.read_at, 'createdAt', v_message.created_at
  );
end;
$$;

revoke all on function public.create_chat_room(text, text, text, integer) from public, anon, authenticated;
revoke all on function public.rotate_chat_room_token(uuid) from public, anon, authenticated;
revoke all on function public.update_chat_room_access(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.get_public_chat_room(text) from public, anon, authenticated;
revoke all on function public.send_public_chat_message(text, text, text) from public, anon, authenticated;
grant execute on function public.create_chat_room(text, text, text, integer) to authenticated;
grant execute on function public.rotate_chat_room_token(uuid) to authenticated;
grant execute on function public.update_chat_room_access(uuid, text, integer) to authenticated;
grant execute on function public.get_public_chat_room(text) to anon, authenticated;
grant execute on function public.send_public_chat_message(text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
