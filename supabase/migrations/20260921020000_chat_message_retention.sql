-- Chat Center correction: retention belongs to messages, not rooms.
-- Rooms remain available until an admin closes them. Each message receives
-- its own expiry timestamp and is hidden/deleted after the configured TTL.

begin;

alter table public.chat_rooms
  add column if not exists message_retention_minutes integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.chat_rooms'::regclass
      and conname = 'chat_room_message_retention_check'
  ) then
    alter table public.chat_rooms
      add constraint chat_room_message_retention_check
      check (message_retention_minutes between 5 and 43200);
  end if;
end;
$$;

update public.chat_rooms
set message_retention_minutes = coalesce(message_retention_minutes, duration_minutes, 1440),
    expires_at = 'infinity'::timestamptz;

alter table public.chat_rooms
  alter column message_retention_minutes set default 1440,
  alter column message_retention_minutes set not null;

alter table public.chat_messages
  add column if not exists expires_at timestamptz;

update public.chat_messages as message
set expires_at = message.created_at + make_interval(
  mins => coalesce(room.message_retention_minutes, room.duration_minutes, 1440)
)
from public.chat_rooms as room
where room.id = message.room_id
  and message.expires_at is null;

update public.chat_messages
set expires_at = now()
where expires_at is null;

alter table public.chat_messages
  alter column expires_at set default now(),
  alter column expires_at set not null;

create index if not exists chat_messages_expires_idx
  on public.chat_messages(expires_at);

create or replace function public.set_chat_message_expiration()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_retention integer;
begin
  select message_retention_minutes
  into v_retention
  from public.chat_rooms
  where id = new.room_id;

  if v_retention is null then
    raise exception using message = 'ROOM_NOT_FOUND';
  end if;

  new.expires_at = now() + make_interval(mins => v_retention);
  return new;
end;
$$;

drop trigger if exists set_chat_message_expiration on public.chat_messages;

create trigger set_chat_message_expiration
before insert or update of room_id on public.chat_messages
for each row execute function public.set_chat_message_expiration();

create or replace function public.cleanup_expired_chat_messages()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer;
begin
  -- The scheduled job runs without a user JWT. A logged-in caller must be
  -- an admin so this cleanup RPC cannot be used as a public delete endpoint.
  if auth.uid() is not null and not public.is_arunika_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;

  delete from public.chat_messages
  where expires_at <= now();

  get diagnostics v_deleted = row_count;
  return coalesce(v_deleted, 0);
end;
$$;

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
    raise exception using message = 'INVALID_MESSAGE_RETENTION';
  end if;

  insert into public.chat_rooms (
    owner_id,
    public_token_hash,
    public_token_hint,
    title,
    participant_name,
    participant_email,
    status,
    message_retention_minutes,
    expires_at
  )
  values (
    auth.uid(),
    private.hash_chat_token(v_token),
    right(v_token, 8),
    coalesce(v_title, 'Chat dengan ' || v_participant_name),
    v_participant_name,
    v_participant_email,
    'active',
    v_duration,
    'infinity'::timestamptz
  )
  returning id into v_room_id;

  return jsonb_build_object(
    'roomId', v_room_id,
    'token', v_token,
    'publicTokenHint', right(v_token, 8),
    'messageRetentionMinutes', v_duration
  );
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
begin
  if not public.is_arunika_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;

  if p_status not in ('active', 'closed') then
    raise exception using message = 'INVALID_ROOM_STATUS';
  end if;

  if v_duration < 5 or v_duration > 43200 then
    raise exception using message = 'INVALID_MESSAGE_RETENTION';
  end if;

  update public.chat_rooms
  set status = p_status,
      message_retention_minutes = v_duration,
      expires_at = 'infinity'::timestamptz,
      updated_at = now()
  where id = p_room_id;

  if not found then
    raise exception using message = 'ROOM_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'roomId', p_room_id,
    'status', p_status,
    'messageRetentionMinutes', v_duration
  );
end;
$$;

create or replace function public.get_public_chat_room(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_room public.chat_rooms%rowtype;
  v_available boolean;
begin
  if p_token is null
     or char_length(trim(p_token)) < 48
     or char_length(trim(p_token)) > 128 then
    return null;
  end if;

  select room.*
  into v_room
  from public.chat_rooms as room
  where room.public_token_hash = private.hash_chat_token(trim(p_token));

  if not found then
    return null;
  end if;

  delete from public.chat_messages
  where room_id = v_room.id
    and expires_at <= now();

  v_available := v_room.status = 'active';

  return jsonb_build_object(
    'id', v_room.id,
    'title', v_room.title,
    'participantName', v_room.participant_name,
    'status', v_room.status,
    'available', v_available,
    'messageRetentionMinutes', v_room.message_retention_minutes,
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', recent.id,
        'senderRole', recent.sender_role,
        'senderName', recent.sender_name,
        'body', recent.body,
        'clientMessageId', recent.client_message_id,
        'readAt', recent.read_at,
        'expiresAt', recent.expires_at,
        'createdAt', recent.created_at
      ) order by recent.created_at)
      from (
        select message.*
        from public.chat_messages as message
        where message.room_id = v_room.id
          and message.expires_at > now()
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
  if p_token is null
     or char_length(trim(p_token)) < 48
     or char_length(trim(p_token)) > 128 then
    raise exception using message = 'INVALID_ROOM_TOKEN';
  end if;

  if v_body is null or char_length(v_body) > 4000 then
    raise exception using message = 'INVALID_MESSAGE';
  end if;

  select room.*
  into v_room
  from public.chat_rooms as room
  where room.public_token_hash = private.hash_chat_token(trim(p_token));

  if not found then
    raise exception using message = 'ROOM_NOT_FOUND';
  end if;

  if v_room.status <> 'active' then
    raise exception using message = 'ROOM_CLOSED';
  end if;

  delete from public.chat_messages
  where room_id = v_room.id
    and expires_at <= now();

  if p_client_message_id is not null then
    select message.*
    into v_message
    from public.chat_messages as message
    where message.room_id = v_room.id
      and message.client_message_id = p_client_message_id;

    if found then
      return jsonb_build_object(
        'id', v_message.id,
        'senderRole', v_message.sender_role,
        'senderName', v_message.sender_name,
        'body', v_message.body,
        'clientMessageId', v_message.client_message_id,
        'readAt', v_message.read_at,
        'expiresAt', v_message.expires_at,
        'createdAt', v_message.created_at
      );
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_room.id::text, 0));

  select count(*)::integer
  into v_recent_count
  from public.chat_messages as message
  where message.room_id = v_room.id
    and message.sender_role = 'guest'
    and message.created_at > now() - interval '1 minute';

  if v_recent_count >= 30 then
    raise exception using message = 'RATE_LIMITED';
  end if;

  insert into public.chat_messages (
    room_id,
    sender_role,
    sender_name,
    body,
    client_message_id
  )
  values (
    v_room.id,
    'guest',
    v_room.participant_name,
    v_body,
    nullif(trim(p_client_message_id), '')
  )
  returning * into v_message;

  update public.chat_rooms
  set last_message_at = v_message.created_at,
      updated_at = v_message.created_at
  where id = v_room.id;

  return jsonb_build_object(
    'id', v_message.id,
    'senderRole', v_message.sender_role,
    'senderName', v_message.sender_name,
    'body', v_message.body,
    'clientMessageId', v_message.client_message_id,
    'readAt', v_message.read_at,
    'expiresAt', v_message.expires_at,
    'createdAt', v_message.created_at
  );
end;
$$;

revoke all on function public.cleanup_expired_chat_messages()
from public, anon, authenticated;

grant execute on function public.cleanup_expired_chat_messages()
to authenticated;

revoke all on function public.create_chat_room(text, text, text, integer)
from public, anon, authenticated;

revoke all on function public.update_chat_room_access(uuid, text, integer)
from public, anon, authenticated;

revoke all on function public.get_public_chat_room(text)
from public, anon, authenticated;

revoke all on function public.send_public_chat_message(text, text, text)
from public, anon, authenticated;

grant execute on function public.create_chat_room(text, text, text, integer)
to authenticated;

grant execute on function public.update_chat_room_access(uuid, text, integer)
to authenticated;

grant execute on function public.get_public_chat_room(text)
to anon, authenticated;

grant execute on function public.send_public_chat_message(text, text, text)
to anon, authenticated;

-- Supabase projects normally expose pg_cron. If it is available, keep a
-- one-minute database cleanup job. If it is unavailable, access/send RPCs
-- still remove expired messages for the room being used.
do $$
declare
  v_job_id bigint;
begin
  if exists (
    select 1 from pg_available_extensions where name = 'pg_cron'
  ) then
    begin
      execute 'create extension if not exists pg_cron';
    exception when others then
      null;
    end;
  end if;

  if to_regprocedure('cron.schedule(text,text,text)') is not null then
    begin
      for v_job_id in
        select jobid from cron.job
        where jobname = 'arunika_chat_center_cleanup'
      loop
        perform cron.unschedule(v_job_id);
      end loop;

      perform cron.schedule(
        'arunika_chat_center_cleanup',
        '* * * * *',
        'select public.cleanup_expired_chat_messages();'
      );
    exception when others then
      null;
    end;
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
