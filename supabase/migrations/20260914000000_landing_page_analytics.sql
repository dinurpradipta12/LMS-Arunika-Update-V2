-- Arunika LMS: anonymous analytics for public landing pages.
-- Public clients can record validated events only through the RPCs below.
-- Admin insight queries stay behind the existing is_arunika_admin() check.

begin;

create table if not exists public.landing_page_events (
  id uuid primary key default gen_random_uuid(),
  landing_page_id uuid not null references public.landing_pages(id) on delete cascade,
  event_name text not null check (event_name in ('view', 'cta_click')),
  event_label text not null default '',
  visitor_id text not null,
  device_type text not null check (device_type in ('desktop', 'mobile', 'tablet')),
  user_agent text not null default '',
  referrer text not null default 'direct',
  source text not null default 'direct',
  full_path text not null default '',
  created_at timestamptz not null default now(),
  constraint landing_page_event_label_length_check check (char_length(event_label) <= 120),
  constraint landing_page_event_visitor_length_check check (char_length(visitor_id) between 1 and 128),
  constraint landing_page_event_visitor_format_check check (visitor_id ~ '^vis_[a-z0-9_]+$'),
  constraint landing_page_event_user_agent_length_check check (char_length(user_agent) <= 512),
  constraint landing_page_event_referrer_length_check check (char_length(referrer) <= 512),
  constraint landing_page_event_source_length_check check (char_length(source) <= 120),
  constraint landing_page_event_path_length_check check (char_length(full_path) <= 2048)
);

create index if not exists landing_page_events_page_created_idx
  on public.landing_page_events(landing_page_id, created_at desc);

create index if not exists landing_page_events_page_visitor_idx
  on public.landing_page_events(landing_page_id, visitor_id, created_at desc);

alter table public.landing_page_events enable row level security;
revoke all on public.landing_page_events from public, anon, authenticated;

create or replace function public.track_public_landing_event(
  p_slug text,
  p_event_name text,
  p_visitor_id text,
  p_device_type text,
  p_user_agent text,
  p_referrer text,
  p_source text,
  p_full_path text,
  p_event_label text default ''
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_landing_page_id uuid;
  v_event_label text := coalesce(trim(p_event_label), '');
  v_referrer text := coalesce(nullif(trim(p_referrer), ''), 'direct');
  v_source text := coalesce(nullif(trim(p_source), ''), 'direct');
  v_full_path text := coalesce(p_full_path, '');
  v_user_agent text := coalesce(p_user_agent, '');
begin
  if nullif(trim(coalesce(p_slug, '')), '') is null
     or length(trim(p_slug)) > 100
     or p_event_name not in ('view', 'cta_click')
     or nullif(trim(coalesce(p_visitor_id, '')), '') is null
     or length(p_visitor_id) > 128
     or p_visitor_id !~ '^vis_[a-z0-9_]+$'
     or p_device_type not in ('desktop', 'mobile', 'tablet')
     or length(v_event_label) > 120
     or length(v_user_agent) > 512
     or length(v_referrer) > 512
     or length(v_source) > 120
     or length(v_full_path) > 2048 then
    return false;
  end if;

  select page.id
  into v_landing_page_id
  from public.landing_pages as page
  where lower(page.slug) = lower(trim(p_slug))
    and page.status = 'published'
  limit 1;

  if v_landing_page_id is null then
    return false;
  end if;

  -- Avoid refreshes and rapid duplicate clicks creating noisy analytics.
  if exists (
    select 1
    from public.landing_page_events as event
    where event.landing_page_id = v_landing_page_id
      and event.event_name = p_event_name
      and event.event_label = v_event_label
      and event.visitor_id = p_visitor_id
      and event.created_at >= now() - interval '30 seconds'
  ) then
    return false;
  end if;

  insert into public.landing_page_events (
    landing_page_id,
    event_name,
    event_label,
    visitor_id,
    device_type,
    user_agent,
    referrer,
    source,
    full_path
  ) values (
    v_landing_page_id,
    p_event_name,
    v_event_label,
    p_visitor_id,
    p_device_type,
    v_user_agent,
    v_referrer,
    v_source,
    v_full_path
  );

  return true;
end;
$$;

revoke all on function public.track_public_landing_event(text, text, text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.track_public_landing_event(text, text, text, text, text, text, text, text, text)
  to anon, authenticated;

create or replace function public.get_landing_page_insights(p_days integer default 30)
returns table (
  landing_page_id uuid,
  total_views bigint,
  unique_visitors bigint,
  cta_clicks bigint,
  conversion_rate numeric,
  last_viewed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    page.id as landing_page_id,
    count(event.id) filter (where event.event_name = 'view') as total_views,
    count(distinct event.visitor_id) filter (where event.event_name = 'view') as unique_visitors,
    count(event.id) filter (where event.event_name = 'cta_click') as cta_clicks,
    case
      when count(event.id) filter (where event.event_name = 'view') = 0 then 0::numeric
      else round(
        (count(event.id) filter (where event.event_name = 'cta_click'))::numeric * 100
        / nullif(count(event.id) filter (where event.event_name = 'view'), 0),
        2
      )
    end as conversion_rate,
    max(event.created_at) filter (where event.event_name = 'view') as last_viewed_at
  from public.landing_pages as page
  left join public.landing_page_events as event
    on event.landing_page_id = page.id
   and event.created_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
  where public.is_arunika_admin()
  group by page.id, page.created_at
  order by page.created_at desc;
$$;

revoke all on function public.get_landing_page_insights(integer)
  from public, anon, authenticated;
grant execute on function public.get_landing_page_insights(integer)
  to authenticated;

create or replace function public.get_landing_page_insight(
  p_landing_page_id uuid,
  p_days integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_days, 30), 365));
  v_result jsonb;
begin
  if not public.is_arunika_admin()
     or p_landing_page_id is null
     or not exists (
       select 1
       from public.landing_pages as page
       where page.id = p_landing_page_id
     ) then
    return null;
  end if;

  with filtered as materialized (
    select event_name, event_label, visitor_id, device_type, source, created_at
    from public.landing_page_events
    where landing_page_id = p_landing_page_id
      and created_at >= now() - make_interval(days => v_days)
  ),
  daily as (
    select
      to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day,
      count(*) filter (where event_name = 'view') as views,
      count(*) filter (where event_name = 'cta_click') as cta_clicks
    from filtered
    group by 1
  ),
  devices as (
    select device_type as device, count(*) as count
    from filtered
    where event_name = 'view'
    group by device_type
  ),
  sources as (
    select source, count(*) as count
    from filtered
    where event_name = 'view'
    group by source
  )
  select jsonb_build_object(
    'landingPageId', p_landing_page_id,
    'totalViews', (select count(*) from filtered where event_name = 'view'),
    'uniqueVisitors', (select count(distinct visitor_id) from filtered where event_name = 'view'),
    'ctaClicks', (select count(*) from filtered where event_name = 'cta_click'),
    'conversionRate', case
      when (select count(*) from filtered where event_name = 'view') = 0 then 0::numeric
      else round(
        (select count(*) from filtered where event_name = 'cta_click')::numeric * 100
        / nullif((select count(*) from filtered where event_name = 'view'), 0),
        2
      )
    end,
    'daily', coalesce(
      (select jsonb_agg(
        jsonb_build_object('date', daily.day, 'views', daily.views, 'ctaClicks', daily.cta_clicks)
        order by daily.day
      ) from daily),
      '[]'::jsonb
    ),
    'devices', coalesce(
      (select jsonb_agg(
        jsonb_build_object('device', devices.device, 'count', devices.count)
        order by devices.count desc, devices.device
      ) from devices),
      '[]'::jsonb
    ),
    'sources', coalesce(
      (select jsonb_agg(
        jsonb_build_object('source', sources.source, 'count', sources.count)
        order by sources.count desc, sources.source
      ) from sources),
      '[]'::jsonb
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_landing_page_insight(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.get_landing_page_insight(uuid, integer)
  to authenticated;

notify pgrst, 'reload schema';

commit;

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'landing_page_events';
