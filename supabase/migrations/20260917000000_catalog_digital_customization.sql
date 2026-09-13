-- Arunika Catalog Hub: digital-product storefront customization.
-- Run after 20260916000000_catalog_profile_links_and_domains.sql.

begin;

alter table public.catalog_pages
  add column if not exists content jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'catalog_page_content_object_check'
      and conrelid = 'public.catalog_pages'::regclass
  ) then
    alter table public.catalog_pages
      add constraint catalog_page_content_object_check
      check (jsonb_typeof(content) = 'object');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'catalog_page_content_size_check'
      and conrelid = 'public.catalog_pages'::regclass
  ) then
    alter table public.catalog_pages
      add constraint catalog_page_content_size_check
      check (char_length(content::text) <= 6000000);
  end if;
end;
$$;

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
          'landingPageId', page.id,
          'slug', page.slug,
          'title', coalesce(nullif(item.value->>'title', ''), page.title),
          'description', coalesce(nullif(item.value->>'description', ''), page.description),
          'imageUrl', coalesce(nullif(item.value->>'imageUrl', ''), ''),
          'imageAlt', coalesce(nullif(item.value->>'imageAlt', ''), nullif(item.value->>'image_alt', ''), page.title),
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
      join public.landing_pages as page
        on page.id::text = item.value->>'landingPageId'
       and page.status = 'published'
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

notify pgrst, 'reload schema';

commit;
