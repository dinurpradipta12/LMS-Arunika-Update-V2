-- Arunika Catalog Hub: profile links and optional custom domains.
-- Run after 20260915000000_catalog_hub.sql.

begin;

alter table public.catalog_pages
  add column if not exists social_links jsonb not null default '[]'::jsonb,
  add column if not exists custom_domain text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'catalog_page_social_links_array_check'
      and conrelid = 'public.catalog_pages'::regclass
  ) then
    alter table public.catalog_pages
      add constraint catalog_page_social_links_array_check
      check (jsonb_typeof(social_links) = 'array');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'catalog_page_social_links_size_check'
      and conrelid = 'public.catalog_pages'::regclass
  ) then
    alter table public.catalog_pages
      add constraint catalog_page_social_links_size_check
      check (char_length(social_links::text) <= 100000);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'catalog_page_custom_domain_length_check'
      and conrelid = 'public.catalog_pages'::regclass
  ) then
    alter table public.catalog_pages
      add constraint catalog_page_custom_domain_length_check
      check (char_length(custom_domain) <= 253);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'catalog_page_custom_domain_format_check'
      and conrelid = 'public.catalog_pages'::regclass
  ) then
    alter table public.catalog_pages
      add constraint catalog_page_custom_domain_format_check
      check (
        custom_domain = ''
        or custom_domain ~* '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
      );
  end if;
end;
$$;

create unique index if not exists catalog_pages_custom_domain_unique_idx
  on public.catalog_pages (
    lower(regexp_replace(trim(custom_domain), '^www\.', ''))
  )
  where nullif(trim(custom_domain), '') is not null;

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
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', item.value->>'id',
          'landingPageId', page.id,
          'slug', page.slug,
          'title', coalesce(nullif(item.value->>'title', ''), page.title),
          'description', coalesce(nullif(item.value->>'description', ''), page.description),
          'imageUrl', coalesce(nullif(item.value->>'imageUrl', ''), ''),
          'buttonLabel', coalesce(nullif(item.value->>'buttonLabel', ''), 'Lihat produk')
        ) order by item.position
      )
      from jsonb_array_elements(catalog.items) with ordinality as item(value, position)
      join public.landing_pages as page
        on page.id::text = item.value->>'landingPageId'
       and page.status = 'published'
    ), '[]'::jsonb)
  )
  from public.catalog_pages as catalog
  where lower(catalog.slug) = lower(trim(coalesce(p_slug, '')))
    and catalog.status = 'published';
$$;

create or replace function public.get_public_catalog_page_by_domain(p_domain text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.get_public_catalog_page(catalog.slug)
  from public.catalog_pages as catalog
  where catalog.status = 'published'
    and nullif(trim(catalog.custom_domain), '') is not null
    and lower(regexp_replace(trim(catalog.custom_domain), '^www\.', '')) =
        lower(regexp_replace(trim(coalesce(p_domain, '')), '^www\.', ''))
  limit 1;
$$;

revoke all on function public.get_public_catalog_page(text)
from public, anon, authenticated;

grant execute on function public.get_public_catalog_page(text)
to anon, authenticated;

revoke all on function public.get_public_catalog_page_by_domain(text)
from public, anon, authenticated;

grant execute on function public.get_public_catalog_page_by_domain(text)
to anon, authenticated;

notify pgrst, 'reload schema';

commit;
