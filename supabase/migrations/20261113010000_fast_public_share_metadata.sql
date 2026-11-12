-- Arunika LMS: lightweight OpenGraph metadata and image RPCs for fast link previews
-- (avoids fetching multi-megabyte JSONB blocks/items when rendering social share cards)

begin;

create or replace function public.extract_landing_preview_image(p_blocks jsonb)
returns text
language sql
immutable
as $$
  select coalesce((
    select coalesce(
      nullif(block.value->'data'->>'headerImageUrl', ''),
      nullif(block.value->'data'->>'header_image_url', ''),
      nullif(block.value->'data'->>'imageUrl', ''),
      nullif(block.value->'data'->>'image_url', ''),
      nullif(block.value->'data'->'images'->0->>'url', ''),
      nullif(block.value->'data'->'items'->0->>'imageUrl', ''),
      nullif(block.value->'data'->'items'->0->>'image_url', '')
    )
    from jsonb_array_elements(coalesce(p_blocks, '[]'::jsonb)) as block(value)
    where coalesce(
      nullif(block.value->'data'->>'headerImageUrl', ''),
      nullif(block.value->'data'->>'header_image_url', ''),
      nullif(block.value->'data'->>'imageUrl', ''),
      nullif(block.value->'data'->>'image_url', ''),
      nullif(block.value->'data'->'images'->0->>'url', ''),
      nullif(block.value->'data'->'items'->0->>'imageUrl', ''),
      nullif(block.value->'data'->'items'->0->>'image_url', '')
    ) is not null
    limit 1
  ), '');
$$;

create or replace function public.extract_landing_preview_description(p_description text, p_blocks jsonb)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(trim(coalesce(p_description, '')), ''),
    (
      select nullif(trim(coalesce(block.value->'data'->>'body', '')), '')
      from jsonb_array_elements(coalesce(p_blocks, '[]'::jsonb)) as block(value)
      where block.value->>'type' = 'hero'
        and nullif(trim(coalesce(block.value->'data'->>'body', '')), '') is not null
      limit 1
    ),
    (
      select nullif(trim(coalesce(block.value->'data'->>'body', '')), '')
      from jsonb_array_elements(coalesce(p_blocks, '[]'::jsonb)) as block(value)
      where block.value->>'type' = 'text'
        and nullif(trim(coalesce(block.value->'data'->>'body', '')), '') is not null
      limit 1
    ),
    ''
  );
$$;

create or replace function public.get_public_share_image(
  p_kind text,
  p_slug text,
  p_domain text default ''
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_kind text := lower(trim(coalesce(p_kind, '')));
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_domain text := regexp_replace(regexp_replace(lower(trim(coalesce(p_domain, ''))), '^www\.', ''), '\.$', '');
  v_image text := '';
  v_updated_at timestamptz;
begin
  if v_kind = 'landing' then
    select public.extract_landing_preview_image(lp.blocks), lp.updated_at
    into v_image, v_updated_at
    from public.landing_pages as lp
    where lower(lp.slug) = v_slug
      and lp.status = 'published'
    limit 1;

    if not found then
      return null;
    end if;

    return jsonb_build_object(
      'image', coalesce(v_image, ''),
      'updatedAt', v_updated_at
    );
  end if;

  if v_kind = 'catalog' then
    select coalesce(
      nullif(c.content->>'heroImageUrl', ''),
      (
        select coalesce(
          nullif(item.value->>'imageUrl', ''),
          nullif(item.value->>'image_url', ''),
          public.extract_landing_preview_image(lp.blocks)
        )
        from jsonb_array_elements(coalesce(c.items, '[]'::jsonb)) with ordinality as item(value, pos)
        left join public.landing_pages as lp
          on lp.id::text = item.value->>'landingPageId'
         and lp.status = 'published'
        where lower(coalesce(item.value->>'isVisible', item.value->>'is_visible', 'true')) <> 'false'
          and coalesce(
            nullif(item.value->>'imageUrl', ''),
            nullif(item.value->>'image_url', ''),
            nullif(public.extract_landing_preview_image(lp.blocks), '')
          ) is not null
        order by item.pos
        limit 1
      ),
      nullif(c.avatar_url, ''),
      (
        select coalesce(nullif(item.value->>'iconUrl', ''), nullif(item.value->>'icon_url', ''))
        from jsonb_array_elements(coalesce(c.items, '[]'::jsonb)) with ordinality as item(value, pos)
        where lower(coalesce(item.value->>'isVisible', item.value->>'is_visible', 'true')) <> 'false'
          and coalesce(nullif(item.value->>'iconUrl', ''), nullif(item.value->>'icon_url', '')) is not null
        order by item.pos
        limit 1
      ),
      ''
    ), c.updated_at
    into v_image, v_updated_at
    from public.catalog_pages as c
    where c.status = 'published'
      and (
        (v_domain <> '' and lower(coalesce(c.custom_domain, '')) = v_domain)
        or (v_domain = '' and lower(c.slug) = v_slug)
      )
    limit 1;

    if not found then
      return null;
    end if;

    return jsonb_build_object(
      'image', coalesce(v_image, ''),
      'updatedAt', v_updated_at
    );
  end if;

  return null;
end;
$$;

create or replace function public.get_public_share_metadata(
  p_kind text,
  p_slug text,
  p_domain text default ''
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_kind text := lower(trim(coalesce(p_kind, '')));
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_domain text := regexp_replace(regexp_replace(lower(trim(coalesce(p_domain, ''))), '^www\.', ''), '\.$', '');
  v_title text;
  v_description text;
  v_updated_at timestamptz;
  v_image text;
  v_is_data boolean;
  v_mime text;
begin
  if v_kind = 'landing' then
    select
      lp.title,
      public.extract_landing_preview_description(lp.description, lp.blocks),
      lp.updated_at,
      public.extract_landing_preview_image(lp.blocks)
    into v_title, v_description, v_updated_at, v_image
    from public.landing_pages as lp
    where lower(lp.slug) = v_slug
      and lp.status = 'published'
    limit 1;

    if not found then
      return null;
    end if;

    v_is_data := coalesce(v_image, '') ~* '^data:image/';
    v_mime := case when v_is_data then coalesce(substring(v_image from '(?i)^data:([^;,]+)'), 'image/jpeg') else '' end;

    return jsonb_build_object(
      'title', coalesce(nullif(trim(v_title), ''), 'Landing Page'),
      'description', coalesce(v_description, ''),
      'updatedAt', v_updated_at,
      'hasDataImage', v_is_data,
      'imageMimeType', v_mime,
      'imageUrl', case when v_is_data then '' else coalesce(v_image, '') end
    );
  end if;

  if v_kind = 'catalog' then
    select
      coalesce(nullif(trim(c.title), ''), nullif(trim(c.content->>'heroTitle'), ''), 'Katalog Produk'),
      coalesce(
        nullif(trim(c.description), ''),
        nullif(trim(c.content->>'heroDescription'), ''),
        nullif(trim(c.content->>'announcement'), ''),
        (
          select coalesce(
            nullif(trim(item.value->>'description'), ''),
            nullif(trim(item.value->>'title'), ''),
            nullif(trim(lp.title), '')
          )
          from jsonb_array_elements(coalesce(c.items, '[]'::jsonb)) with ordinality as item(value, pos)
          left join public.landing_pages as lp
            on lp.id::text = item.value->>'landingPageId'
           and lp.status = 'published'
          where lower(coalesce(item.value->>'isVisible', item.value->>'is_visible', 'true')) <> 'false'
          order by item.pos
          limit 1
        ),
        ''
      ),
      c.updated_at,
      coalesce((public.get_public_share_image('catalog', c.slug, c.custom_domain)->>'image'), '')
    into v_title, v_description, v_updated_at, v_image
    from public.catalog_pages as c
    where c.status = 'published'
      and (
        (v_domain <> '' and lower(coalesce(c.custom_domain, '')) = v_domain)
        or (v_domain = '' and lower(c.slug) = v_slug)
      )
    limit 1;

    if not found then
      return null;
    end if;

    v_is_data := coalesce(v_image, '') ~* '^data:image/';
    v_mime := case when v_is_data then coalesce(substring(v_image from '(?i)^data:([^;,]+)'), 'image/jpeg') else '' end;

    return jsonb_build_object(
      'title', coalesce(nullif(trim(v_title), ''), 'Katalog Produk'),
      'description', coalesce(v_description, ''),
      'updatedAt', v_updated_at,
      'hasDataImage', v_is_data,
      'imageMimeType', v_mime,
      'imageUrl', case when v_is_data then '' else coalesce(v_image, '') end
    );
  end if;

  return null;
end;
$$;

revoke all on function public.get_public_share_image(text, text, text)
  from public, anon, authenticated;
grant execute on function public.get_public_share_image(text, text, text)
  to anon, authenticated;

revoke all on function public.get_public_share_metadata(text, text, text)
  from public, anon, authenticated;
grant execute on function public.get_public_share_metadata(text, text, text)
  to anon, authenticated;

notify pgrst, 'reload schema';

commit;
