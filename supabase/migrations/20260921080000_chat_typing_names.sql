-- Chat Center: expose the room-scoped names used by the typing indicator.
-- The public guest view needs the configured admin name; the admin view already
-- receives the participant name from get_admin_chat_room.

begin;

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
    'adminDisplayName', coalesce(nullif(trim(v_room.admin_display_name), ''), 'Admin'),
    'status', v_room.status,
    'available', v_available,
    'isOnline', case when v_available then coalesce(v_room.is_online, true) else false end,
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

revoke all on function public.get_public_chat_room(text)
from public, anon, authenticated;

grant execute on function public.get_public_chat_room(text)
to anon, authenticated;

notify pgrst, 'reload schema';

commit;
