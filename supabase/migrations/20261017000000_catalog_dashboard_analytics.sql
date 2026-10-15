-- Catalog dashboard: real visits and item clicks, without inferred sales or revenue.
begin;

create table if not exists public.catalog_page_views (
  id bigint generated always as identity primary key,
  catalog_page_id uuid not null references public.catalog_pages(id) on delete cascade,
  visitor_id text not null check (char_length(visitor_id) between 1 and 128 and visitor_id ~ '^vis_[a-z0-9_]+$'),
  created_at timestamptz not null default now()
);

create index if not exists catalog_page_views_page_created_idx
  on public.catalog_page_views(catalog_page_id, created_at desc);
create index if not exists catalog_page_views_dedupe_idx
  on public.catalog_page_views(catalog_page_id, visitor_id, created_at desc);

alter table public.catalog_page_views enable row level security;
revoke all on public.catalog_page_views from public, anon, authenticated;

create or replace function public.track_public_catalog_view(
  p_catalog_id uuid,
  p_visitor_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_catalog_id is null
     or p_visitor_id is null
     or char_length(p_visitor_id) > 128
     or p_visitor_id !~ '^vis_[a-z0-9_]+$'
     or not exists (
       select 1 from public.catalog_pages as catalog
       where catalog.id = p_catalog_id and catalog.status = 'published'
     ) then
    return false;
  end if;

  -- A reload within 30 minutes is the same visit, not a new session.
  if exists (
    select 1 from public.catalog_page_views as view
    where view.catalog_page_id = p_catalog_id
      and view.visitor_id = p_visitor_id
      and view.created_at >= now() - interval '30 minutes'
  ) then
    return false;
  end if;

  insert into public.catalog_page_views (catalog_page_id, visitor_id)
  values (p_catalog_id, p_visitor_id);
  return true;
end;
$$;

revoke all on function public.track_public_catalog_view(uuid, text)
  from public, anon, authenticated;
grant execute on function public.track_public_catalog_view(uuid, text)
  to anon, authenticated;

create or replace function public.get_catalog_dashboard(
  p_catalog_id uuid,
  p_days integer default 30
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with params as (
    select greatest(1, least(coalesce(p_days, 30), 90)) as days,
           (now() at time zone 'Asia/Makassar')::date as today
  ), visits as (
    select v.visitor_id, (v.created_at at time zone 'Asia/Makassar')::date as day
    from public.catalog_page_views as v, params as p
    where v.catalog_page_id = p_catalog_id
      and v.created_at >= ((p.today - (p.days - 1))::timestamp at time zone 'Asia/Makassar')
  ), clicks as (
    select c.item_id, (c.created_at at time zone 'Asia/Makassar')::date as day
    from public.catalog_item_clicks as c, params as p
    where c.catalog_page_id = p_catalog_id
      and c.created_at >= ((p.today - (p.days - 1))::timestamp at time zone 'Asia/Makassar')
  ), days as (
    select generate_series(p.today - (p.days - 1), p.today, interval '1 day')::date as day
    from params as p
  )
  select jsonb_build_object(
    'views', (select count(*) from visits),
    'uniqueVisitors', (select count(distinct visitor_id) from visits),
    'clicks', (select count(*) from clicks),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object(
        'day', d.day,
        'views', (select count(*) from visits as v where v.day = d.day),
        'clicks', (select count(*) from clicks as c where c.day = d.day)
      ) order by d.day)
      from days as d
    ), '[]'::jsonb),
    'topItems', coalesce((
      select jsonb_agg(jsonb_build_object('itemId', ranked.item_id, 'clicks', ranked.click_count)
        order by ranked.click_count desc, ranked.item_id)
      from (
        select item_id, count(*) as click_count
        from clicks
        group by item_id
        order by click_count desc, item_id
        limit 10
      ) as ranked
    ), '[]'::jsonb)
  )
  from params
  where public.is_arunika_admin();
$$;

revoke all on function public.get_catalog_dashboard(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.get_catalog_dashboard(uuid, integer)
  to authenticated;

notify pgrst, 'reload schema';
commit;
