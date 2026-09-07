-- Arunika LMS: feedback keseluruhan kelas dan email sertifikat.
-- Feedback hanya dibuka setelah seluruh materi ditandai selesai oleh peserta.

begin;

create table if not exists public.class_feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses(id) on delete cascade,
  participant_name text not null,
  participant_email text not null,
  certificate_email text not null,
  rating smallint not null,
  feedback text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_feedback_rating_check check (rating between 1 and 5),
  constraint class_feedback_name_length_check check (char_length(participant_name) between 1 and 160),
  constraint class_feedback_participant_email_length_check check (char_length(participant_email) between 3 and 320),
  constraint class_feedback_certificate_email_length_check check (char_length(certificate_email) between 3 and 320),
  constraint class_feedback_text_length_check check (char_length(feedback) between 1 and 5000),
  constraint class_feedback_course_participant_unique unique (course_id, participant_email)
);

create index if not exists class_feedback_submissions_course_created_idx
  on public.class_feedback_submissions(course_id, created_at desc);

create or replace function public.set_class_feedback_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_class_feedback_updated_at on public.class_feedback_submissions;
create trigger set_class_feedback_updated_at
before update on public.class_feedback_submissions
for each row execute function public.set_class_feedback_updated_at();

alter table public.class_feedback_submissions enable row level security;
revoke all on public.class_feedback_submissions from public, anon, authenticated;
grant select, update, delete on public.class_feedback_submissions to authenticated;

drop policy if exists class_feedback_submissions_admin_all on public.class_feedback_submissions;
create policy class_feedback_submissions_admin_all
on public.class_feedback_submissions for all
to authenticated
using ((select public.is_arunika_admin()))
with check ((select public.is_arunika_admin()));

create or replace function public.submit_class_feedback(
  p_course_id text,
  p_participant_name text,
  p_participant_email text,
  p_certificate_email text,
  p_rating integer,
  p_feedback text,
  p_completed_module_ids jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course public.courses%rowtype;
  v_participant_name text := trim(coalesce(p_participant_name, ''));
  v_participant_email text := lower(trim(coalesce(p_participant_email, '')));
  v_certificate_email text := lower(trim(coalesce(p_certificate_email, '')));
  v_feedback text := trim(coalesce(p_feedback, ''));
  v_feedback_id uuid;
  v_created_at timestamptz;
  v_updated_at timestamptz;
begin
  if nullif(trim(coalesce(p_course_id, '')), '') is null then
    raise exception using message = 'INVALID_COURSE_ID';
  end if;

  if v_participant_name = '' or char_length(v_participant_name) > 160 then
    raise exception using message = 'INVALID_PARTICIPANT_NAME';
  end if;

  if v_participant_email = ''
     or position('@' in v_participant_email) < 2
     or char_length(v_participant_email) > 320 then
    raise exception using message = 'INVALID_PARTICIPANT_EMAIL';
  end if;

  if v_certificate_email = ''
     or position('@' in v_certificate_email) < 2
     or char_length(v_certificate_email) > 320 then
    raise exception using message = 'INVALID_CERTIFICATE_EMAIL';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception using message = 'INVALID_FEEDBACK_RATING';
  end if;

  if v_feedback = '' or char_length(v_feedback) > 5000 then
    raise exception using message = 'INVALID_FEEDBACK_TEXT';
  end if;

  if p_completed_module_ids is null or jsonb_typeof(p_completed_module_ids) <> 'array' then
    raise exception using message = 'FEEDBACK_NOT_READY';
  end if;

  select course.*
  into v_course
  from public.courses as course
  where course.id = p_course_id
    and course.space_type = 'recorded_class'
    and course.published = true;

  if not found then
    raise exception using message = 'CLASS_NOT_AVAILABLE';
  end if;

  if jsonb_array_length(coalesce(v_course.modules, '[]'::jsonb)) = 0 then
    raise exception using message = 'FEEDBACK_NOT_READY';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(v_course.modules, '[]'::jsonb)) as module(value)
    where nullif(module.value ->> 'id', '') is not null
      and not exists (
        select 1
        from jsonb_array_elements(p_completed_module_ids) as completed(value)
        where jsonb_typeof(completed.value) = 'string'
          and completed.value #>> '{}' = module.value ->> 'id'
      )
  ) then
    raise exception using message = 'FEEDBACK_NOT_READY';
  end if;

  insert into public.class_feedback_submissions (
    course_id,
    participant_name,
    participant_email,
    certificate_email,
    rating,
    feedback
  ) values (
    p_course_id,
    v_participant_name,
    v_participant_email,
    v_certificate_email,
    p_rating,
    v_feedback
  )
  on conflict (course_id, participant_email) do update
  set participant_name = excluded.participant_name,
      certificate_email = excluded.certificate_email,
      rating = excluded.rating,
      feedback = excluded.feedback,
      updated_at = now()
  returning id, created_at, updated_at
  into v_feedback_id, v_created_at, v_updated_at;

  return jsonb_build_object(
    'id', v_feedback_id,
    'courseId', p_course_id,
    'submittedAt', v_created_at,
    'updatedAt', v_updated_at,
    'certificateEmail', v_certificate_email
  );
end;
$$;

revoke all on function public.set_class_feedback_updated_at() from public, anon, authenticated;
revoke all on function public.submit_class_feedback(text, text, text, text, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.submit_class_feedback(text, text, text, text, integer, text, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
