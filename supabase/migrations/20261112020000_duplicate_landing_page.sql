-- Arunika LMS: add duplicate_landing_page helper RPC for admins
-- and ensure blocks size constraint supports full landing page duplication.

begin;

alter table if exists public.landing_pages
  drop constraint if exists landing_page_blocks_size_check;

alter table if exists public.landing_pages
  add constraint landing_page_blocks_size_check
  check (char_length(blocks::text) <= 25000000);

create or replace function public.duplicate_landing_page(p_landing_page_id uuid)
returns public.landing_pages
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_source public.landing_pages%rowtype;
  v_new_slug text;
  v_result public.landing_pages%rowtype;
begin
  if not public.is_arunika_admin() then
    raise exception 'Akses ditolak: hanya admin yang dapat menduplikat landing page.';
  end if;

  select *
  into v_source
  from public.landing_pages
  where id = p_landing_page_id;

  if not found then
    raise exception 'Landing page asal tidak ditemukan.';
  end if;

  v_new_slug := left(coalesce(nullif(trim(v_source.slug), ''), 'landing'), 75)
    || '-copy-'
    || substr(md5(gen_random_uuid()::text), 1, 6);

  insert into public.landing_pages (
    slug,
    title,
    description,
    theme,
    status,
    blocks,
    created_by
  )
  values (
    v_new_slug,
    left(coalesce(nullif(trim(v_source.title), ''), 'Landing Page') || ' (Salinan)', 200),
    v_source.description,
    v_source.theme,
    'draft',
    v_source.blocks,
    auth.uid()
  )
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.duplicate_landing_page(uuid)
  from public, anon, authenticated;

grant execute on function public.duplicate_landing_page(uuid)
  to authenticated;

notify pgrst, 'reload schema';

commit;
