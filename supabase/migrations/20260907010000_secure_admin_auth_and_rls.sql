-- Arunika LMS: Supabase Auth, admin allow-list, RLS, RPC publik, dan Realtime aman.
-- Jalankan melalui SQL Editor SETELAH schema/tabel Arunika tersedia.
-- Migration ini idempotent dan tidak menghapus isi kursus, analytics, quiz, atau hasil peserta.

begin;

-- Role admin disimpan di schema yang tidak diekspos oleh Data API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.arunika_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table private.arunika_admins enable row level security;
revoke all on private.arunika_admins from public, anon, authenticated;

create or replace function public.is_arunika_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.arunika_admins as admin
    where admin.user_id = auth.uid()
  );
$$;

revoke all on function public.is_arunika_admin() from public, anon, authenticated;
grant execute on function public.is_arunika_admin() to authenticated;

-- Analytics publik hanya dapat ditulis melalui RPC tervalidasi. Tidak ada akses
-- SELECT langsung bagi anon/authenticated non-admin.
create or replace function public.track_public_course_view(
  p_course_id text,
  p_visitor_id text,
  p_device_type text,
  p_user_agent text,
  p_referrer text,
  p_source text,
  p_full_path text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if nullif(trim(coalesce(p_course_id, '')), '') is null
     or nullif(trim(coalesce(p_visitor_id, '')), '') is null
     or length(p_course_id) > 200
     or length(p_visitor_id) > 128
     or p_visitor_id !~ '^vis_[a-z0-9_]+$'
     or p_device_type not in ('desktop', 'mobile', 'tablet')
     or length(coalesce(p_user_agent, '')) > 512
     or length(coalesce(p_referrer, '')) > 512
     or length(coalesce(p_source, '')) > 120
     or length(coalesce(p_full_path, '')) > 2048 then
    return false;
  end if;

  if not exists (
    select 1
    from public.courses as course
    where course.id = p_course_id
      and course.published = true
  ) then
    return false;
  end if;

  -- Abaikan refresh ganda pengunjung yang sama dalam jendela singkat.
  if exists (
    select 1
    from public.events as event
    where event.course_id = p_course_id
      and event.visitor_id = p_visitor_id
      and event.created_at >= now() - interval '30 seconds'
  ) then
    return false;
  end if;

  insert into public.events (
    event_name,
    course_id,
    visitor_id,
    device_type,
    user_agent,
    referrer,
    source,
    full_path
  ) values (
    'course_view',
    p_course_id,
    p_visitor_id,
    p_device_type,
    coalesce(p_user_agent, ''),
    coalesce(nullif(trim(p_referrer), ''), 'direct'),
    coalesce(nullif(trim(p_source), ''), 'direct'),
    coalesce(p_full_path, '')
  );

  return true;
end;
$$;

revoke all on function public.track_public_course_view(text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.track_public_course_view(text, text, text, text, text, text, text)
  to anon, authenticated;

-- Satu baris ini hanya menjadi sinyal perubahan. Payload materi, draft, jawaban,
-- hasil peserta, dan analytics tidak pernah disiarkan melalui Realtime.
create table if not exists public.public_content_revisions (
  scope text primary key,
  revision bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint public_content_revisions_scope_check check (scope = 'public')
);

insert into public.public_content_revisions (scope, revision, updated_at)
values ('public', 0, now())
on conflict (scope) do nothing;

create or replace function private.bump_public_course_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  should_bump boolean := false;
begin
  if tg_op = 'INSERT' then
    should_bump := new.published;
  elsif tg_op = 'DELETE' then
    should_bump := old.published;
  else
    should_bump := old.published or new.published;
  end if;

  if should_bump then
    update public.public_content_revisions
    set revision = revision + 1,
        updated_at = now()
    where scope = 'public';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function private.bump_public_profile_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  public_row_id text := case when tg_op = 'DELETE' then old.id else new.id end;
begin
  if public_row_id = tg_argv[0] then
    update public.public_content_revisions
    set revision = revision + 1,
        updated_at = now()
    where scope = 'public';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.bump_public_course_revision() from public, anon, authenticated;
revoke all on function private.bump_public_profile_revision() from public, anon, authenticated;

drop trigger if exists bump_public_course_revision on public.courses;
create trigger bump_public_course_revision
after insert or update or delete on public.courses
for each row execute function private.bump_public_course_revision();

drop trigger if exists bump_public_mentor_revision on public.mentor;
create trigger bump_public_mentor_revision
after insert or update or delete on public.mentor
for each row execute function private.bump_public_profile_revision('profile');

drop trigger if exists bump_public_branding_revision on public.branding;
create trigger bump_public_branding_revision
after insert or update or delete on public.branding
for each row execute function private.bump_public_profile_revision('config');

-- Hapus semua policy lama pada tabel dalam scope agar policy permisif yang tidak
-- diketahui namanya tidak tetap membuka data.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any(array[
        'courses',
        'mentor',
        'branding',
        'events',
        'course_quizzes',
        'quiz_attempts',
        'public_content_revisions'
      ])
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;
end
$$;

alter table public.courses enable row level security;
alter table public.mentor enable row level security;
alter table public.branding enable row level security;
alter table public.events enable row level security;
alter table public.course_quizzes enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.public_content_revisions enable row level security;

-- Cabut hak lama lebih dulu, lalu berikan hak minimum per operasi.
revoke create on schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated;

revoke all on public.courses from public, anon, authenticated;
revoke all on public.mentor from public, anon, authenticated;
revoke all on public.branding from public, anon, authenticated;
revoke all on public.events from public, anon, authenticated;
revoke all on public.course_quizzes from public, anon, authenticated;
revoke all on public.quiz_attempts from public, anon, authenticated;
revoke all on public.public_content_revisions from public, anon, authenticated;

grant select on public.courses, public.mentor, public.branding, public.public_content_revisions
  to anon, authenticated;
grant insert, update, delete on public.courses, public.mentor, public.branding
  to authenticated;
grant select, insert, update, delete on public.events, public.course_quizzes, public.quiz_attempts
  to authenticated;

-- Materi publik: hanya kursus published, profil mentor utama, dan branding utama.
create policy courses_public_read
on public.courses for select
to anon, authenticated
using (published = true);

create policy courses_admin_read
on public.courses for select
to authenticated
using ((select public.is_arunika_admin()));

create policy courses_admin_insert
on public.courses for insert
to authenticated
with check ((select public.is_arunika_admin()));

create policy courses_admin_update
on public.courses for update
to authenticated
using ((select public.is_arunika_admin()))
with check ((select public.is_arunika_admin()));

create policy courses_admin_delete
on public.courses for delete
to authenticated
using ((select public.is_arunika_admin()));

create policy mentor_public_read
on public.mentor for select
to anon, authenticated
using (id = 'profile');

create policy mentor_admin_read
on public.mentor for select
to authenticated
using ((select public.is_arunika_admin()));

create policy mentor_admin_insert
on public.mentor for insert
to authenticated
with check ((select public.is_arunika_admin()));

create policy mentor_admin_update
on public.mentor for update
to authenticated
using ((select public.is_arunika_admin()))
with check ((select public.is_arunika_admin()));

create policy mentor_admin_delete
on public.mentor for delete
to authenticated
using ((select public.is_arunika_admin()));

create policy branding_public_read
on public.branding for select
to anon, authenticated
using (id = 'config');

create policy branding_admin_read
on public.branding for select
to authenticated
using ((select public.is_arunika_admin()));

create policy branding_admin_insert
on public.branding for insert
to authenticated
with check ((select public.is_arunika_admin()));

create policy branding_admin_update
on public.branding for update
to authenticated
using ((select public.is_arunika_admin()))
with check ((select public.is_arunika_admin()));

create policy branding_admin_delete
on public.branding for delete
to authenticated
using ((select public.is_arunika_admin()));

-- Tabel sensitif hanya dapat diakses akun yang ada di allow-list admin.
create policy events_admin_all
on public.events for all
to authenticated
using ((select public.is_arunika_admin()))
with check ((select public.is_arunika_admin()));

create policy course_quizzes_admin_all
on public.course_quizzes for all
to authenticated
using ((select public.is_arunika_admin()))
with check ((select public.is_arunika_admin()));

create policy quiz_attempts_admin_all
on public.quiz_attempts for all
to authenticated
using ((select public.is_arunika_admin()))
with check ((select public.is_arunika_admin()));

create policy public_content_revisions_read
on public.public_content_revisions for select
to anon, authenticated
using (scope = 'public');

-- RPC post-test tetap publik, tetapi definisinya sendiri hanya membaca kelas
-- published dan tidak mengembalikan correctAnswer kecuali konfigurasi mengizinkan.
alter function public.get_public_class_quiz(text) set search_path = '';
alter function public.submit_class_post_test(text, text, text, jsonb) set search_path = '';

revoke all on function public.get_public_class_quiz(text) from public, anon, authenticated;
revoke all on function public.submit_class_post_test(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.get_public_class_quiz(text) to anon, authenticated;
grant execute on function public.submit_class_post_test(text, text, text, jsonb) to anon, authenticated;

-- Trigger timestamp tidak perlu dapat dipanggil sebagai RPC oleh client.
do $$
begin
  if to_regprocedure('public.set_arunika_updated_at()') is not null then
    execute 'revoke all on function public.set_arunika_updated_at() from public, anon, authenticated';
  end if;

  if to_regprocedure('public.set_recorded_class_updated_at()') is not null then
    execute 'revoke all on function public.set_recorded_class_updated_at() from public, anon, authenticated';
  end if;
end
$$;

-- Realtime hanya memublikasikan sinyal revisi yang tidak berisi data bisnis.
-- Ini juga menghindari kebocoran payload DELETE karena RLS tidak memfilter event DELETE.
do $$
declare
  table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array[
      'courses',
      'mentor',
      'branding',
      'events',
      'course_quizzes',
      'quiz_attempts'
    ]
    loop
      if exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = table_name
      ) then
        execute format('alter publication supabase_realtime drop table public.%I', table_name);
      end if;
    end loop;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'public_content_revisions'
    ) then
      alter publication supabase_realtime add table public.public_content_revisions;
    end if;
  end if;
end
$$;

notify pgrst, 'reload schema';

commit;

-- Pemeriksaan akhir: keenam tabel harus relrowsecurity=true dan publication
-- Realtime hanya membawa public_content_revisions untuk scope aplikasi ini.
select
  tables.table_name,
  c.relrowsecurity as rls_enabled
from information_schema.tables as tables
join pg_class as c on c.relname = tables.table_name
join pg_namespace as n on n.oid = c.relnamespace and n.nspname = tables.table_schema
where tables.table_schema = 'public'
  and tables.table_name in (
    'courses',
    'mentor',
    'branding',
    'events',
    'course_quizzes',
    'quiz_attempts',
    'public_content_revisions'
  )
order by tables.table_name;
