-- Chat Center: mark incoming messages as read for the authenticated admin,
-- the public guest link, or the persistent admin bearer link. Typing status is
-- intentionally handled by Supabase Realtime broadcast and is never stored.

begin;

create or replace function public.mark_chat_messages_read(p_room_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated integer;
begin
  if not public.is_arunika_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;

  update public.chat_messages
  set read_at = coalesce(read_at, now())
  where room_id = p_room_id
    and sender_role = 'guest'
    and expires_at > now()
    and read_at is null;

  get diagnostics v_updated = row_count;
  return coalesce(v_updated, 0);
end;
$$;

create or replace function public.mark_public_chat_messages_read(p_token text)
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_room public.chat_rooms%rowtype;
  v_updated integer;
begin
  if p_token is null
     or char_length(trim(p_token)) < 48
     or char_length(trim(p_token)) > 128 then
    raise exception using message = 'INVALID_ROOM_TOKEN';
  end if;

  select room.*
  into v_room
  from public.chat_rooms as room
  where room.public_token_hash = private.hash_chat_token(trim(p_token));

  if not found then
    raise exception using message = 'ROOM_NOT_FOUND';
  end if;

  update public.chat_messages
  set read_at = coalesce(read_at, now())
  where room_id = v_room.id
    and sender_role = 'admin'
    and expires_at > now()
    and read_at is null;

  get diagnostics v_updated = row_count;
  return coalesce(v_updated, 0);
end;
$$;

create or replace function public.mark_admin_chat_messages_read(p_token text)
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_room public.chat_rooms%rowtype;
  v_updated integer;
begin
  if p_token is null
     or char_length(trim(p_token)) < 48
     or char_length(trim(p_token)) > 128 then
    raise exception using message = 'INVALID_ADMIN_LINK';
  end if;

  select room.*
  into v_room
  from public.chat_rooms as room
  where room.admin_token_hash = private.hash_chat_token(trim(p_token));

  if not found then
    raise exception using message = 'INVALID_ADMIN_LINK';
  end if;

  update public.chat_messages
  set read_at = coalesce(read_at, now())
  where room_id = v_room.id
    and sender_role = 'guest'
    and expires_at > now()
    and read_at is null;

  get diagnostics v_updated = row_count;
  return coalesce(v_updated, 0);
end;
$$;

revoke all on function public.mark_chat_messages_read(uuid)
from public, anon, authenticated;

revoke all on function public.mark_public_chat_messages_read(text)
from public, anon, authenticated;

revoke all on function public.mark_admin_chat_messages_read(text)
from public, anon, authenticated;

grant execute on function public.mark_chat_messages_read(uuid)
to authenticated;

grant execute on function public.mark_public_chat_messages_read(text)
to anon, authenticated;

grant execute on function public.mark_admin_chat_messages_read(text)
to anon, authenticated;

notify pgrst, 'reload schema';

commit;
