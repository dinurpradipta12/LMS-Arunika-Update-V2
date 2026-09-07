-- Arunika LMS - schema lengkap untuk project Supabase baru.
-- Target: https://drezwxfgykkdnnwjrnnt.supabase.co
-- Jalankan file ini PERTAMA melalui Supabase Dashboard > SQL Editor.
-- Script aman dijalankan ulang pada project yang sama.

begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.courses (
  id text primary key,
  title text not null default '',
  description text not null default '',
  cover_image text not null default '',
  modules jsonb not null default '[]'::jsonb,
  assets jsonb not null default '[]'::jsonb,
  categories jsonb not null default '[]'::jsonb,
  mentor_id text not null default 'profile',
  space_type text not null default 'product_tutorial',
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_modules_array_check check (jsonb_typeof(modules) = 'array'),
  constraint courses_assets_array_check check (jsonb_typeof(assets) = 'array'),
  constraint courses_categories_array_check check (jsonb_typeof(categories) = 'array'),
  constraint courses_space_type_check check (space_type in ('product_tutorial', 'recorded_class'))
);

-- Kolom additive ini membuat script tetap berguna bila dijalankan pada schema Arunika lama.
alter table public.courses add column if not exists categories jsonb default '[]'::jsonb;
alter table public.courses add column if not exists space_type text default 'product_tutorial';
alter table public.courses add column if not exists published boolean default true;

update public.courses
set categories = '[]'::jsonb
where categories is null;

update public.courses
set space_type = 'product_tutorial'
where space_type is null
   or space_type not in ('product_tutorial', 'recorded_class');

update public.courses
set published = true
where published is null;

alter table public.courses
  alter column categories set default '[]'::jsonb,
  alter column categories set not null,
  alter column space_type set default 'product_tutorial',
  alter column space_type set not null,
  alter column published set default true,
  alter column published set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'courses_space_type_check'
      and conrelid = 'public.courses'::regclass
  ) then
    alter table public.courses
      add constraint courses_space_type_check
      check (space_type in ('product_tutorial', 'recorded_class'));
  end if;
end
$$;

create table if not exists public.mentor (
  id text primary key default 'profile',
  name text not null default '',
  role text not null default '',
  bio text not null default '',
  photo text not null default '',
  socials jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint mentor_socials_object_check check (jsonb_typeof(socials) = 'object')
);

create table if not exists public.branding (
  id text primary key default 'config',
  site_name text not null default 'Platform Arunika',
  logo text not null default '',
  favicon text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.branding add column if not exists favicon text default '';
update public.branding set favicon = '' where favicon is null;
alter table public.branding alter column favicon set default '';

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_name text,
  course_id text,
  visitor_id text,
  device_type text,
  user_agent text,
  referrer text,
  source text,
  full_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.course_quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id text not null unique references public.courses(id) on delete cascade,
  title text not null default 'Post-Test Kelas',
  description text not null default '',
  is_enabled boolean not null default false,
  passing_score integer not null default 70 check (passing_score between 0 and 100),
  max_attempts integer not null default 3 check (max_attempts between 1 and 100),
  show_answers boolean not null default false,
  questions jsonb not null default '[]'::jsonb check (jsonb_typeof(questions) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.course_quizzes(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  participant_name text not null,
  participant_email text not null,
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  score integer not null check (score between 0 and 100),
  passed boolean not null,
  attempt_number integer not null check (attempt_number >= 1),
  submitted_at timestamptz not null default now()
);

create index if not exists courses_space_type_created_idx
  on public.courses(space_type, created_at desc);

create index if not exists events_created_at_idx
  on public.events(created_at desc);

create index if not exists events_course_created_idx
  on public.events(course_id, created_at desc);

create index if not exists course_quizzes_course_id_idx
  on public.course_quizzes(course_id);

create index if not exists quiz_attempts_course_submitted_idx
  on public.quiz_attempts(course_id, submitted_at desc);

create index if not exists quiz_attempts_email_idx
  on public.quiz_attempts(quiz_id, lower(participant_email));

create unique index if not exists quiz_attempts_number_unique_idx
  on public.quiz_attempts(quiz_id, lower(participant_email), attempt_number);

create or replace function public.set_arunika_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_courses_updated_at on public.courses;
create trigger set_courses_updated_at
before update on public.courses
for each row execute function public.set_arunika_updated_at();

drop trigger if exists set_mentor_updated_at on public.mentor;
create trigger set_mentor_updated_at
before update on public.mentor
for each row execute function public.set_arunika_updated_at();

drop trigger if exists set_branding_updated_at on public.branding;
create trigger set_branding_updated_at
before update on public.branding
for each row execute function public.set_arunika_updated_at();

drop trigger if exists set_course_quizzes_updated_at on public.course_quizzes;
create trigger set_course_quizzes_updated_at
before update on public.course_quizzes
for each row execute function public.set_arunika_updated_at();

-- Halaman publik hanya menerima pertanyaan tanpa field correctAnswer.
create or replace function public.get_public_class_quiz(p_course_id text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', quiz.id,
    'courseId', quiz.course_id,
    'title', quiz.title,
    'description', quiz.description,
    'passingScore', quiz.passing_score,
    'maxAttempts', quiz.max_attempts,
    'questions', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', question.value ->> 'id',
            'type', question.value ->> 'type',
            'prompt', question.value ->> 'prompt',
            'options', coalesce(question.value -> 'options', '[]'::jsonb),
            'points', case
              when jsonb_typeof(question.value -> 'points') = 'number'
                then greatest((question.value ->> 'points')::numeric, 0)
              else 1
            end
          )
          order by question.ordinality
        )
        from jsonb_array_elements(quiz.questions) with ordinality as question(value, ordinality)
      ),
      '[]'::jsonb
    )
  )
  from public.course_quizzes as quiz
  join public.courses as course on course.id = quiz.course_id
  where quiz.course_id = p_course_id
    and quiz.is_enabled = true
    and course.space_type = 'recorded_class'
    and course.published = true;
$$;

-- Penilaian dilakukan di database. Browser hanya mengirim jawaban peserta.
create or replace function public.submit_class_post_test(
  p_course_id text,
  p_participant_name text,
  p_participant_email text,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quiz public.course_quizzes%rowtype;
  v_question jsonb;
  v_question_id text;
  v_correct_answer text;
  v_submitted_answer text;
  v_points numeric;
  v_total_points numeric := 0;
  v_earned_points numeric := 0;
  v_score integer := 0;
  v_attempt_count integer := 0;
  v_attempt_id uuid;
  v_passed boolean := false;
  v_feedback jsonb := null;
  v_normalized_email text := lower(trim(coalesce(p_participant_email, '')));
begin
  if nullif(trim(coalesce(p_course_id, '')), '') is null then
    raise exception using message = 'INVALID_COURSE_ID';
  end if;

  if nullif(trim(coalesce(p_participant_name, '')), '') is null
     or length(trim(p_participant_name)) > 160 then
    raise exception using message = 'INVALID_PARTICIPANT_NAME';
  end if;

  if v_normalized_email = ''
     or position('@' in v_normalized_email) < 2
     or length(v_normalized_email) > 320 then
    raise exception using message = 'INVALID_PARTICIPANT_EMAIL';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception using message = 'INVALID_ANSWERS';
  end if;

  select quiz.*
  into v_quiz
  from public.course_quizzes as quiz
  join public.courses as course on course.id = quiz.course_id
  where quiz.course_id = p_course_id
    and quiz.is_enabled = true
    and course.space_type = 'recorded_class'
    and course.published = true;

  if not found then
    raise exception using message = 'POST_TEST_NOT_AVAILABLE';
  end if;

  if jsonb_array_length(v_quiz.questions) = 0 then
    raise exception using message = 'POST_TEST_HAS_NO_QUESTIONS';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_quiz.id::text || ':' || v_normalized_email, 0)
  );

  select count(*)::integer
  into v_attempt_count
  from public.quiz_attempts
  where quiz_id = v_quiz.id
    and lower(participant_email) = v_normalized_email;

  if v_attempt_count >= v_quiz.max_attempts then
    raise exception using message = 'MAX_ATTEMPTS_REACHED';
  end if;

  for v_question in
    select value from jsonb_array_elements(v_quiz.questions)
  loop
    v_question_id := nullif(v_question ->> 'id', '');
    v_correct_answer := v_question ->> 'correctAnswer';
    v_submitted_answer := case
      when v_question_id is null then null
      else p_answers ->> v_question_id
    end;

    if jsonb_typeof(v_question -> 'points') = 'number' then
      v_points := greatest((v_question ->> 'points')::numeric, 0);
    else
      v_points := 1;
    end if;

    v_total_points := v_total_points + v_points;
    if v_question_id is not null
       and v_correct_answer is not null
       and trim(coalesce(v_submitted_answer, '')) = trim(v_correct_answer) then
      v_earned_points := v_earned_points + v_points;
    end if;
  end loop;

  if v_total_points > 0 then
    v_score := round((v_earned_points / v_total_points) * 100)::integer;
  end if;
  v_passed := v_score >= v_quiz.passing_score;

  insert into public.quiz_attempts (
    quiz_id,
    course_id,
    participant_name,
    participant_email,
    answers,
    score,
    passed,
    attempt_number
  ) values (
    v_quiz.id,
    p_course_id,
    trim(p_participant_name),
    v_normalized_email,
    p_answers,
    v_score,
    v_passed,
    v_attempt_count + 1
  )
  returning id into v_attempt_id;

  if v_quiz.show_answers then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'questionId', question.value ->> 'id',
          'answer', p_answers ->> (question.value ->> 'id'),
          'correctAnswer', question.value ->> 'correctAnswer',
          'correct', trim(coalesce(p_answers ->> (question.value ->> 'id'), ''))
            = trim(coalesce(question.value ->> 'correctAnswer', ''))
        )
        order by question.ordinality
      ),
      '[]'::jsonb
    )
    into v_feedback
    from jsonb_array_elements(v_quiz.questions) with ordinality as question(value, ordinality);
  end if;

  return jsonb_build_object(
    'attemptId', v_attempt_id,
    'attemptNumber', v_attempt_count + 1,
    'maxAttempts', v_quiz.max_attempts,
    'score', v_score,
    'passed', v_passed,
    'passingScore', v_quiz.passing_score,
    'feedback', v_feedback
  );
end;
$$;

insert into public.mentor (id, name, role, bio, photo, socials)
values ('profile', '', '', '', '', '{}'::jsonb)
on conflict (id) do nothing;

insert into public.branding (id, site_name, logo, favicon)
values ('config', 'Platform Arunika', '', '')
on conflict (id) do nothing;

revoke all on function public.get_public_class_quiz(text) from public;
revoke all on function public.submit_class_post_test(text, text, text, jsonb) from public;
grant execute on function public.get_public_class_quiz(text) to anon, authenticated;
grant execute on function public.submit_class_post_test(text, text, text, jsonb) to anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.courses to anon, authenticated;
grant select, insert, update, delete on public.mentor to anon, authenticated;
grant select, insert, update, delete on public.branding to anon, authenticated;
grant select, insert, update, delete on public.events to anon, authenticated;
grant select, insert, update, delete on public.course_quizzes to anon, authenticated;
grant select, insert, update, delete on public.quiz_attempts to anon, authenticated;

-- KOMPATIBILITAS SEMENTARA:
-- Admin Arunika saat ini masih memakai login lokal dan anon key yang sama dengan halaman publik.
-- Karena itu RLS belum dapat membedakan admin dan pengunjung. Pindahkan admin ke Supabase Auth
-- sebelum menyimpan data sensitif, lalu aktifkan RLS berbasis role.
alter table public.courses disable row level security;
alter table public.mentor disable row level security;
alter table public.branding disable row level security;
alter table public.events disable row level security;
alter table public.course_quizzes disable row level security;
alter table public.quiz_attempts disable row level security;

-- Daftarkan semua tabel ke Realtime tanpa error bila script dijalankan ulang.
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
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = table_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      end if;
    end loop;
  end if;
end
$$;

notify pgrst, 'reload schema';

commit;

-- Pemeriksaan cepat setelah script selesai.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'courses',
    'mentor',
    'branding',
    'events',
    'course_quizzes',
    'quiz_attempts'
  )
order by table_name;
