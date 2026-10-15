-- Adds standalone, compact link cards to catalog_pages.items.
-- Product cards still require a published landing page; link cards are public
-- directly from their stored URL and optional custom icon.

begin;

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
      where kind.item_type = 'link' or page.id is not null
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
