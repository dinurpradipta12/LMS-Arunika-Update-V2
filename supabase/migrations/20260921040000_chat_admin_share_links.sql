-- Chat Center: expiring capability links for a chat-only admin view.
-- The link grants access to one room's conversation and reply action only;
-- it does not grant access to the admin application or any other room.

begin;

alter table public.chat_rooms
  add column if not exists admin_token_hash text,
  add column if not exists admin_token_hint text not null default '',
  add column if not exists admin_link_expires_at timestamptz;

create unique index if not exists chat_rooms_admin_token_hash_unique_idx
  on public.chat_rooms(admin_token_hash)
  where admin_token_hash is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.chat_rooms'::regclass
      and conname = 'chat_room_admin_token_hint_length_check'
  ) then
    alter table public.chat_rooms
      add constraint chat_room_admin_token_hint_length_check
      check (char_length(admin_token_hint) <= 16);
  end if;
end;
$$;

create or replace function public.create_chat_admin_link(
  p_room_id uuid,
  p_duration_minutes integer default 1440
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_token text := encode(gen_random_bytes(32), 'hex');
  v_duration integer := coalesce(p_duration_minutes, 1440);
  v_expires_at timestamptz := now() + make_interval(mins => v_duration);
begin
  if not public.is_arunika_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;

  if v_duration < 5 or v_duration > 43200 then
    raise exception using message = 'INVALID_ADMIN_LINK_DURATION';
  end if;

  update public.chat_rooms
  set admin_token_hash = private.hash_chat_token(v_token),
      admin_token_hint = right(v_token, 8),
      admin_link_expires_at = v_expires_at,
      updated_at = now()
  where id = p_room_id;

  if not found then
    raise exception using message = 'ROOM_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'roomId', p_room_id,
    'token', v_token,
    'adminTokenHint', right(v_token, 8),
    'expiresAt', v_expires_at
  );
end;
$$;

create or replace function public.revoke_chat_admin_link(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_arunika_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;

  update public.chat_rooms
  set admin_token_hash = null,
      admin_token_hint = '',
      admin_link_expires_at = null,
      updated_at = now()
  where id = p_room_id;

  if not found then
    raise exception using message = 'ROOM_NOT_FOUND';
  end if;

  return jsonb_build_object('roomId', p_room_id, 'revoked', true);
end;
$$;

create or replace function public.get_admin_chat_room(p_token text)
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
  where room.admin_token_hash = private.hash_chat_token(trim(p_token))
    and room.admin_link_expires_at > now();

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
    'isOnline', case when v_available then coalesce(v_room.is_online, true) else false end,
    'adminLinkExpiresAt', v_room.admin_link_expires_at,
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', recent.id,
        'senderRole', recent.sender_role,
        'senderName', recent.sender_name,
        'body', recent.body,
        'clientMessageId', recent.client_message_id,
        'readAt', recent.read_at,
        'expiresAt', recent.expires_at,
        'replyToMessageId', recent.reply_to_message_id,
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

create or replace function public.send_admin_chat_message(
  p_token text,
  p_body text,
  p_client_message_id text default null,
  p_reply_to_message_id uuid default null
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
    raise exception using message = 'INVALID_ADMIN_LINK';
  end if;

  if v_body is null or char_length(v_body) > 4000 then
    raise exception using message = 'INVALID_MESSAGE';
  end if;

  select room.*
  into v_room
  from public.chat_rooms as room
  where room.admin_token_hash = private.hash_chat_token(trim(p_token))
    and room.admin_link_expires_at > now();

  if not found then
    raise exception using message = 'ADMIN_LINK_EXPIRED';
  end if;

  if v_room.status <> 'active' then
    raise exception using message = 'ROOM_CLOSED';
  end if;

  delete from public.chat_messages
  where room_id = v_room.id
    and expires_at <= now();

  if p_reply_to_message_id is not null
     and not exists (
       select 1
       from public.chat_messages as reply
       where reply.id = p_reply_to_message_id
         and reply.room_id = v_room.id
         and reply.expires_at > now()
     ) then
    raise exception using message = 'INVALID_REPLY';
  end if;

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
        'replyToMessageId', v_message.reply_to_message_id,
        'createdAt', v_message.created_at
      );
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_room.id::text || ':admin', 0));

  select count(*)::integer
  into v_recent_count
  from public.chat_messages as message
  where message.room_id = v_room.id
    and message.sender_role = 'admin'
    and message.created_at > now() - interval '1 minute';

  if v_recent_count >= 60 then
    raise exception using message = 'RATE_LIMITED';
  end if;

  insert into public.chat_messages (
    room_id,
    sender_role,
    sender_name,
    body,
    client_message_id,
    reply_to_message_id
  )
  values (
    v_room.id,
    'admin',
    'Admin',
    v_body,
    nullif(trim(p_client_message_id), ''),
    p_reply_to_message_id
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
    'replyToMessageId', v_message.reply_to_message_id,
    'createdAt', v_message.created_at
  );
end;
$$;

revoke all on function public.create_chat_admin_link(uuid, integer)
from public, anon, authenticated;

revoke all on function public.revoke_chat_admin_link(uuid)
from public, anon, authenticated;

revoke all on function public.get_admin_chat_room(text)
from public, anon, authenticated;

revoke all on function public.send_admin_chat_message(text, text, text, uuid)
from public, anon, authenticated;

grant execute on function public.create_chat_admin_link(uuid, integer)
to authenticated;

grant execute on function public.revoke_chat_admin_link(uuid)
to authenticated;

grant execute on function public.get_admin_chat_room(text)
to anon, authenticated;

grant execute on function public.send_admin_chat_message(text, text, text, uuid)
to anon, authenticated;

notify pgrst, 'reload schema';

commit;
