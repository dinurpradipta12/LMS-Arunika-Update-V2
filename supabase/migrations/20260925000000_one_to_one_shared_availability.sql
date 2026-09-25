-- 1:1 Mentorship: expose only the mentor's occupied time ranges to public
-- portals. Existing schedule events remain the source of truth; only events
-- marked as scheduled block the mentor's shared availability.

begin;

create or replace function public.get_one_to_one_mentor_busy_slots(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_portal public.one_to_one_portals%rowtype;
begin
  if p_token is null
     or char_length(trim(p_token)) < 48
     or char_length(trim(p_token)) > 128 then
    return '[]'::jsonb;
  end if;

  select portal.*
  into v_portal
  from public.one_to_one_portals as portal
  where portal.public_token_hash = private.hash_one_to_one_token(trim(p_token))
    and portal.is_active = true;

  if not found then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', item.id,
        'startsAt', item.starts_at,
        'endsAt', coalesce(item.ends_at, item.starts_at + interval '1 hour')
      )
      order by item.starts_at
    )
    from public.one_to_one_schedule_events as item
    join public.one_to_one_portals as owner_portal
      on owner_portal.id = item.portal_id
    where owner_portal.owner_id = v_portal.owner_id
      and item.status = 'scheduled'
      and item.starts_at < now() + interval '90 days'
      and coalesce(item.ends_at, item.starts_at + interval '1 hour') > now() - interval '1 day'
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.get_one_to_one_mentor_busy_slots(text)
from public, anon, authenticated;

grant execute on function public.get_one_to_one_mentor_busy_slots(text)
to anon, authenticated;

notify pgrst, 'reload schema';

commit;
