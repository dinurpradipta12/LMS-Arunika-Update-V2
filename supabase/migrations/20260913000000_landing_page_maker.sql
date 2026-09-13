-- Arunika LMS: lightweight landing page builder and public product pages.
-- Run after the admin auth migrations so is_arunika_admin() is available.

begin;

create table if not exists public.landing_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null default 'Landing Page Baru',
  description text not null default '',
  theme text not null default 'navy'
    check (theme in ('navy', 'emerald', 'coral', 'violet', 'amber')),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  blocks jsonb not null default '[]'::jsonb
    check (jsonb_typeof(blocks) = 'array'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint landing_page_slug_length_check check (char_length(slug) between 1 and 100),
  constraint landing_page_title_length_check check (char_length(title) between 1 and 200),
  constraint landing_page_description_length_check check (char_length(description) <= 5000),
  constraint landing_page_blocks_size_check check (char_length(blocks::text) <= 8000000)
);

create index if not exists landing_pages_status_created_idx
  on public.landing_pages(status, created_at desc);

create or replace function public.set_landing_page_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_landing_pages_updated_at on public.landing_pages;
create trigger set_landing_pages_updated_at
before update on public.landing_pages
for each row execute function public.set_landing_page_updated_at();

alter table public.landing_pages enable row level security;

revoke all on public.landing_pages from public, anon, authenticated;
grant select, insert, update, delete on public.landing_pages to authenticated;

drop policy if exists landing_pages_admin_all on public.landing_pages;
create policy landing_pages_admin_all
on public.landing_pages for all
to authenticated
using ((select public.is_arunika_admin()))
with check ((select public.is_arunika_admin()));

create or replace function public.get_public_landing_page(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', page.id,
    'slug', page.slug,
    'title', page.title,
    'description', page.description,
    'theme', page.theme,
    'blocks', page.blocks
  )
  from public.landing_pages as page
  where lower(page.slug) = lower(trim(coalesce(p_slug, '')))
    and page.status = 'published';
$$;

revoke all on function public.get_public_landing_page(text)
from public, anon, authenticated;

grant execute on function public.get_public_landing_page(text)
to anon, authenticated;

revoke all on function public.set_landing_page_updated_at()
from public, anon, authenticated;

notify pgrst, 'reload schema';

commit;

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = 'landing_pages';
