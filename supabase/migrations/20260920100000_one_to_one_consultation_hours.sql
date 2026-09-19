-- Add mentor WhatsApp consultation hours to each private 1:1 portal.
-- The schedule is stored per portal so one mentee's availability never
-- changes another mentee's link.

begin;

alter table public.one_to_one_portals
  add column if not exists consultation_phone text not null default '',
  add column if not exists consultation_timezone text not null default 'Asia/Makassar',
  add column if not exists consultation_hours jsonb not null default '{
    "mon": {"enabled": true, "start": "09:00", "end": "17:00"},
    "tue": {"enabled": true, "start": "09:00", "end": "17:00"},
    "wed": {"enabled": true, "start": "09:00", "end": "17:00"},
    "thu": {"enabled": true, "start": "09:00", "end": "17:00"},
    "fri": {"enabled": true, "start": "09:00", "end": "17:00"},
    "sat": {"enabled": false, "start": "09:00", "end": "12:00"},
    "sun": {"enabled": false, "start": "09:00", "end": "12:00"}
  }'::jsonb;

alter table public.one_to_one_portals
  drop constraint if exists one_to_one_consultation_phone_length_check;
alter table public.one_to_one_portals
  add constraint one_to_one_consultation_phone_length_check check (char_length(consultation_phone) <= 32);

-- Keep the existing secure token lookup, while exposing only the new
-- per-portal consultation settings to the public dashboard.
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
    'consultationPhone', v_portal.consultation_phone,
    'consultationTimezone', v_portal.consultation_timezone,
    'consultationHours', v_portal.consultation_hours,
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

revoke all on function public.get_one_to_one_portal(text) from public, anon, authenticated;
grant execute on function public.get_one_to_one_portal(text) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
