-- Arunika Catalog Hub: aggregate published landing pages into one public catalog.
-- Run after 20260907010000_secure_admin_auth_and_rls.sql and
-- 20260913000000_landing_page_maker.sql.

begin;

create table if not exists public.catalog_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null default 'Katalog Produk',
  description text not null default '',
  theme text not null default 'navy'
    check (theme in ('navy', 'emerald', 'coral', 'violet', 'amber')),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  avatar_url text not null default '',
  items jsonb not null default '[]'::jsonb
    check (jsonb_typeof(items) = 'array'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_page_slug_length_check check (char_length(slug) between 1 and 100),
  constraint catalog_page_title_length_check check (char_length(title) between 1 and 200),
  constraint catalog_page_description_length_check check (char_length(description) <= 5000),
  constraint catalog_page_avatar_size_check check (char_length(avatar_url) <= 2000000),
  constraint catalog_page_items_size_check check (char_length(items::text) <= 8000000)
);

create index if not exists catalog_pages_status_created_idx
  on public.catalog_pages(status, created_at desc);

create or replace function public.set_catalog_page_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_catalog_pages_updated_at on public.catalog_pages;
create trigger set_catalog_pages_updated_at
before update on public.catalog_pages
for each row execute function public.set_catalog_page_updated_at();

alter table public.catalog_pages enable row level security;

revoke all on public.catalog_pages from public, anon, authenticated;
grant select, insert, update, delete on public.catalog_pages to authenticated;

drop policy if exists catalog_pages_admin_all on public.catalog_pages;
create policy catalog_pages_admin_all
on public.catalog_pages for all
to authenticated
using ((select public.is_arunika_admin()))
with check ((select public.is_arunika_admin()));

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

revoke all on function public.get_public_catalog_page(text)
from public, anon, authenticated;

grant execute on function public.get_public_catalog_page(text)
to anon, authenticated;

revoke all on function public.set_catalog_page_updated_at()
from public, anon, authenticated;

notify pgrst, 'reload schema';

commit;

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'catalog_pages';
