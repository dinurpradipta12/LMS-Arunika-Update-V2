-- Arunika LMS: support larger landing page blocks payload for header photo,
-- full-width banners, and multi-item classes blocks.

begin;

alter table if exists public.landing_pages
  drop constraint if exists landing_page_blocks_size_check;

alter table if exists public.landing_pages
  add constraint landing_page_blocks_size_check
  check (char_length(blocks::text) <= 25000000);

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

notify pgrst, 'reload schema';

commit;
