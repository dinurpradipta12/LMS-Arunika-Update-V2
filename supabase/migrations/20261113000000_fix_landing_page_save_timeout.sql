-- Arunika LMS: fix "canceling statement due to statement timeout" when saving
-- or duplicating landing pages with many class cards / images.
-- 1) Replaces expensive char_length(blocks::text) check with O(1) pg_column_size(blocks) check.
-- 2) Adds save_landing_page RPC with extended 60s statement_timeout and lightweight metadata return.
-- 3) Adds extended 60s statement_timeout to duplicate_landing_page RPC.

begin;

alter table if exists public.landing_pages
  drop constraint if exists landing_page_blocks_size_check;

alter table if exists public.landing_pages
  add constraint landing_page_blocks_size_check
  check (pg_column_size(blocks) <= 50000000);

create or replace function public.save_landing_page(
  p_id uuid,
  p_slug text,
  p_title text,
  p_description text,
  p_theme text,
  p_status text,
  p_blocks jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row record;
begin
  perform set_config('statement_timeout', '60s', true);

  if not public.is_arunika_admin() then
    raise exception 'Akses ditolak: hanya admin yang dapat menyimpan landing page.';
  end if;

  update public.landing_pages
  set
    slug = trim(coalesce(p_slug, '')),
    title = trim(coalesce(p_title, 'Landing Page Baru')),
    description = coalesce(p_description, ''),
    theme = coalesce(p_theme, 'navy'),
    status = coalesce(p_status, 'draft'),
    blocks = coalesce(p_blocks, '[]'::jsonb),
    updated_at = now()
  where id = p_id
  returning id, slug, title, description, theme, status, created_at, updated_at
  into v_row;

  if not found then
    raise exception 'Landing page tidak ditemukan.';
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'slug', v_row.slug,
    'title', v_row.title,
    'description', v_row.description,
    'theme', v_row.theme,
    'status', v_row.status,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke all on function public.save_landing_page(uuid, text, text, text, text, text, jsonb)
  from public, anon, authenticated;

grant execute on function public.save_landing_page(uuid, text, text, text, text, text, jsonb)
  to authenticated;

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
  perform set_config('statement_timeout', '60s', true);

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
