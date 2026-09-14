-- Arunika LMS: review admin untuk setiap jawaban post-test.
-- Migration ini additive dan mempertahankan seluruh hasil attempt lama.

begin;

alter table public.quiz_attempts
  add column if not exists reviewed_answers jsonb not null default '{}'::jsonb,
  add column if not exists review_feedback text,
  add column if not exists reviewed_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quiz_attempts_reviewed_answers_object_check'
      and conrelid = 'public.quiz_attempts'::regclass
  ) then
    alter table public.quiz_attempts
      add constraint quiz_attempts_reviewed_answers_object_check
      check (jsonb_typeof(reviewed_answers) = 'object');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'quiz_attempts_review_feedback_length_check'
      and conrelid = 'public.quiz_attempts'::regclass
  ) then
    alter table public.quiz_attempts
      add constraint quiz_attempts_review_feedback_length_check
      check (review_feedback is null or char_length(review_feedback) <= 5000);
  end if;
end
$$;

-- quiz_attempts sudah dibatasi policy admin pada migration keamanan utama.
-- Hak select/update juga sudah diberikan kepada authenticated admin.
notify pgrst, 'reload schema';

commit;
