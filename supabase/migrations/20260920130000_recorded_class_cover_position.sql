-- Persist the recording-class cover focal point, crop zoom, and text tone.
-- The image itself remains unchanged (including PNG transparency); the public
-- banner applies these values with object-position and object-fit.

begin;

alter table public.courses
  add column if not exists cover_position text not null default '50% 50%',
  add column if not exists cover_zoom numeric not null default 100,
  add column if not exists cover_text_mode text not null default 'dark';

update public.courses
set cover_position = '50% 50%'
where cover_position is null or btrim(cover_position) = '';

update public.courses
set cover_zoom = 100
where cover_zoom is null or cover_zoom < 100 or cover_zoom > 200;

update public.courses
set cover_text_mode = 'dark'
where cover_text_mode is null or cover_text_mode not in ('dark', 'light');

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'courses_cover_zoom_check'
      and conrelid = 'public.courses'::regclass
  ) then
    alter table public.courses
      add constraint courses_cover_zoom_check
      check (cover_zoom between 100 and 200);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'courses_cover_text_mode_check'
      and conrelid = 'public.courses'::regclass
  ) then
    alter table public.courses
      add constraint courses_cover_text_mode_check
      check (cover_text_mode in ('dark', 'light'));
  end if;
end
$$;

commit;
