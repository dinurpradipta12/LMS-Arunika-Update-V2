-- Chat Center: allow the assigned admin to choose the sender name shown in
-- this room. The name is room-scoped and applies to new admin messages.

begin;

alter table public.chat_rooms
  add column if not exists admin_display_name text not null default 'Admin';

update public.chat_rooms
set admin_display_name = 'Admin'
where nullif(trim(admin_display_name), '') is null;

alter table public.chat_rooms
  alter column admin_display_name set default 'Admin',
  alter column admin_display_name set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.chat_rooms'::regclass
      and conname = 'chat_room_admin_display_name_length_check'
  ) then
    alter table public.chat_rooms
      add constraint chat_room_admin_display_name_length_check
      check (char_length(admin_display_name) between 1 and 120);
  end if;
end;
$$;

create or replace function public.update_chat_room_admin_display_name(
  p_room_id uuid,
  p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text := nullif(trim(coalesce(p_display_name, '')), '');
begin
  if not public.is_arunika_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;

  if v_name is null then
    v_name := 'Admin';
  end if;

  if char_length(v_name) > 120 then
    raise exception using message = 'INVALID_ADMIN_DISPLAY_NAME';
  end if;

  update public.chat_rooms
  set admin_display_name = v_name,
      updated_at = now()
  where id = p_room_id;

  if not found then
    raise exception using message = 'ROOM_NOT_FOUND';
  end if;

  return jsonb_build_object('roomId', p_room_id, 'displayName', v_name);
end;
$$;

create or replace function public.update_admin_chat_display_name(
  p_token text,
  p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_room public.chat_rooms%rowtype;
  v_name text := nullif(trim(coalesce(p_display_name, '')), '');
begin
  if p_token is null
     or char_length(trim(p_token)) < 48
     or char_length(trim(p_token)) > 128 then
    raise exception using message = 'INVALID_ADMIN_LINK';
  end if;

  if v_name is null then
    v_name := 'Admin';
  end if;

  if char_length(v_name) > 120 then
    raise exception using message = 'INVALID_ADMIN_DISPLAY_NAME';
  end if;

  select room.*
  into v_room
  from public.chat_rooms as room
  where room.admin_token_hash = private.hash_chat_token(trim(p_token));

  if not found then
    raise exception using message = 'INVALID_ADMIN_LINK';
  end if;

  update public.chat_rooms
  set admin_display_name = v_name,
      updated_at = now()
  where id = v_room.id;

  return jsonb_build_object('roomId', v_room.id, 'displayName', v_name);
end;
$$;

create or replace function public.get_admin_chat_display_name(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_room public.chat_rooms%rowtype;
begin
  if p_token is null
     or char_length(trim(p_token)) < 48
     or char_length(trim(p_token)) > 128 then
    return null;
  end if;

  select room.*
  into v_room
  from public.chat_rooms as room
  where room.admin_token_hash = private.hash_chat_token(trim(p_token));

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'roomId', v_room.id,
    'displayName', coalesce(nullif(trim(v_room.admin_display_name), ''), 'Admin')
  );
end;
$$;

-- The existing admin send RPCs intentionally remain backwards compatible. This
-- trigger makes both the authenticated admin page and the bearer-link admin
-- page use the current room display name for every newly inserted message.
create or replace function public.set_chat_admin_message_sender_name()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
begin
  if new.sender_role = 'admin' then
    select coalesce(nullif(trim(room.admin_display_name), ''), 'Admin')
    into v_name
    from public.chat_rooms as room
    where room.id = new.room_id;

    new.sender_name := coalesce(v_name, 'Admin');
  end if;

  return new;
end;
$$;

drop trigger if exists set_chat_admin_message_sender_name on public.chat_messages;
create trigger set_chat_admin_message_sender_name
before insert on public.chat_messages
for each row execute function public.set_chat_admin_message_sender_name();

revoke all on function public.update_chat_room_admin_display_name(uuid, text)
from public, anon, authenticated;

revoke all on function public.update_admin_chat_display_name(text, text)
from public, anon, authenticated;

revoke all on function public.get_admin_chat_display_name(text)
from public, anon, authenticated;

grant execute on function public.update_chat_room_admin_display_name(uuid, text)
to authenticated;

grant execute on function public.update_admin_chat_display_name(text, text)
to anon, authenticated;

grant execute on function public.get_admin_chat_display_name(text)
to anon, authenticated;

notify pgrst, 'reload schema';

commit;
