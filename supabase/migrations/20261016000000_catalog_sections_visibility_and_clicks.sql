-- Catalog sections and image focus remain in catalog_pages JSONB.
-- This migration filters hidden cards from the public RPC and records card clicks.

begin;

create table if not exists public.catalog_item_clicks (
  id bigint generated always as identity primary key,
  catalog_page_id uuid not null references public.catalog_pages(id) on delete cascade,
  item_id text not null check (char_length(item_id) between 1 and 150),
  visitor_id text not null check (char_length(visitor_id) between 1 and 128 and visitor_id ~ '^vis_[a-z0-9_]+$'),
  created_at timestamptz not null default now()
);

create index if not exists catalog_item_clicks_page_created_idx
  on public.catalog_item_clicks(catalog_page_id, created_at desc);

create index if not exists catalog_item_clicks_dedupe_idx
  on public.catalog_item_clicks(catalog_page_id, item_id, visitor_id, created_at desc);

alter table public.catalog_item_clicks enable row level security;
revoke all on public.catalog_item_clicks from public, anon, authenticated;

create or replace function public.get_public_catalog_page(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', catalog.id,
    'slug', catalog.slug,
    'title', catalog.title,
    'description', catalog.description,
    'theme', catalog.theme,
    'avatarUrl', catalog.avatar_url,
    'customDomain', catalog.custom_domain,
    'socialLinks', catalog.social_links,
    'content', coalesce(catalog.content, '{}'::jsonb),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', item.value->>'id',
          'itemType', kind.item_type,
          'landingPageId', coalesce(page.id::text, item.value->>'landingPageId', ''),
          'slug', coalesce(page.slug, ''),
          'title', case
            when kind.item_type = 'link' then coalesce(nullif(item.value->>'title', ''), 'Buka link')
            else coalesce(nullif(item.value->>'title', ''), page.title)
          end,
          'description', case
            when kind.item_type = 'link' then ''
            else coalesce(nullif(item.value->>'description', ''), page.description)
          end,
          'url', coalesce(nullif(item.value->>'url', ''), nullif(item.value->>'linkUrl', ''), ''),
          'iconUrl', coalesce(nullif(item.value->>'iconUrl', ''), nullif(item.value->>'icon_url', ''), ''),
          'imageUrl', coalesce(nullif(item.value->>'imageUrl', ''), ''),
          'imageAlt', coalesce(nullif(item.value->>'imageAlt', ''), nullif(item.value->>'image_alt', ''), page.title, ''),
          'imageFit', coalesce(nullif(item.value->>'imageFit', ''), nullif(item.value->>'image_fit', ''), nullif(item.value->>'objectFit', ''), 'auto'),
          'imagePositionX', coalesce(item.value->'imagePositionX', item.value->'image_position_x', '50'::jsonb),
          'imagePositionY', coalesce(item.value->'imagePositionY', item.value->'image_position_y', '50'::jsonb),
          'sectionId', coalesce(nullif(item.value->>'sectionId', ''), nullif(item.value->>'section_id', ''), ''),
          'isVisible', true,
          'buttonLabel', coalesce(nullif(item.value->>'buttonLabel', ''), 'Lihat produk'),
          'category', coalesce(nullif(item.value->>'category', ''), ''),
          'format', coalesce(nullif(item.value->>'format', ''), ''),
          'badge', coalesce(nullif(item.value->>'badge', ''), ''),
          'price', coalesce(nullif(item.value->>'price', ''), ''),
          'compareAtPrice', coalesce(nullif(item.value->>'compareAtPrice', ''), nullif(item.value->>'compare_at_price', ''), ''),
          'featured', lower(coalesce(item.value->>'featured', 'false')) = 'true'
        ) order by item.position
      )
      from jsonb_array_elements(catalog.items) with ordinality as item(value, position)
      cross join lateral (
        select case
          when lower(coalesce(item.value->>'itemType', item.value->>'item_type', item.value->>'type', 'product')) = 'link' then 'link'
          else 'product'
        end as item_type
      ) as kind
      left join public.landing_pages as page
        on page.id::text = item.value->>'landingPageId'
       and page.status = 'published'
      where lower(coalesce(item.value->>'isVisible', item.value->>'is_visible', 'true')) <> 'false'
        and (kind.item_type = 'link' or page.id is not null)
    ), '[]'::jsonb)
  )
  from public.catalog_pages as catalog
  where lower(catalog.slug) = lower(trim(coalesce(p_slug, '')))
    and catalog.status = 'published';
$$;

revoke all on function public.get_public_catalog_page(text)
  from public, anon, authenticated;
grant execute on function public.get_public_catalog_page(text)
  to anon, authenticated;

create or replace function public.track_public_catalog_click(
  p_catalog_id uuid,
  p_item_id text,
  p_visitor_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_catalog_id is null
     or nullif(trim(coalesce(p_item_id, '')), '') is null
     or char_length(p_item_id) > 150
     or p_visitor_id is null
     or char_length(p_visitor_id) > 128
     or p_visitor_id !~ '^vis_[a-z0-9_]+$' then
    return false;
  end if;

  if not exists (
    select 1
    from public.catalog_pages as catalog
    cross join lateral jsonb_array_elements(catalog.items) as item(value)
    where catalog.id = p_catalog_id
      and catalog.status = 'published'
      and item.value->>'id' = p_item_id
      and lower(coalesce(item.value->>'isVisible', item.value->>'is_visible', 'true')) <> 'false'
      and (
        lower(coalesce(item.value->>'itemType', item.value->>'item_type', 'product')) = 'link'
        or exists (
          select 1 from public.landing_pages as page
          where page.id::text = item.value->>'landingPageId'
            and page.status = 'published'
        )
      )
  ) then
    return false;
  end if;

  if exists (
    select 1 from public.catalog_item_clicks as click
    where click.catalog_page_id = p_catalog_id
      and click.item_id = p_item_id
      and click.visitor_id = p_visitor_id
      and click.created_at >= now() - interval '30 seconds'
  ) then
    return false;
  end if;

  insert into public.catalog_item_clicks (catalog_page_id, item_id, visitor_id)
  values (p_catalog_id, p_item_id, p_visitor_id);
  return true;
end;
$$;

revoke all on function public.track_public_catalog_click(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.track_public_catalog_click(uuid, text, text)
  to anon, authenticated;

create or replace function public.get_catalog_click_insights(
  p_catalog_id uuid,
  p_days integer default 30
)
returns table (item_id text, click_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select click.item_id, count(*)::bigint as click_count
  from public.catalog_item_clicks as click
  where public.is_arunika_admin()
    and click.catalog_page_id = p_catalog_id
    and click.created_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)))
  group by click.item_id;
$$;

revoke all on function public.get_catalog_click_insights(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.get_catalog_click_insights(uuid, integer)
  to authenticated;

notify pgrst, 'reload schema';

commit;
