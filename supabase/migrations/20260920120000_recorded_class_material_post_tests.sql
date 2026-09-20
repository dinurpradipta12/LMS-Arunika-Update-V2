-- Add per-material post-tests while keeping the existing class-level tab mode.

begin;

alter table public.courses
  add column if not exists post_test_mode text not null default 'tab';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'courses_post_test_mode_check'
      and conrelid = 'public.courses'::regclass
  ) then
    alter table public.courses
      add constraint courses_post_test_mode_check
      check (post_test_mode in ('tab', 'per_material'));
  end if;
end
$$;

alter table public.course_quizzes
  add column if not exists placement text not null default 'tab',
  add column if not exists module_id text;

-- The original schema allowed one quiz row per course. Replace that constraint
-- with one class-level row or one row per material.
alter table public.course_quizzes
  drop constraint if exists course_quizzes_course_id_key;

update public.course_quizzes
set placement = 'tab', module_id = null
where placement is null or placement not in ('tab', 'module');

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'course_quizzes_placement_check'
      and conrelid = 'public.course_quizzes'::regclass
  ) then
    alter table public.course_quizzes
      add constraint course_quizzes_placement_check
      check ((placement = 'tab' and module_id is null) or (placement = 'module' and module_id is not null));
  end if;
end
$$;

create unique index if not exists course_quizzes_course_tab_unique_idx
  on public.course_quizzes(course_id)
  where placement = 'tab';

create unique index if not exists course_quizzes_course_module_unique_idx
  on public.course_quizzes(course_id, module_id)
  where placement = 'module';

create index if not exists course_quizzes_course_module_idx
  on public.course_quizzes(course_id, module_id, is_enabled);

-- Keep the legacy tab RPC safe when material rows also exist.
create or replace function public.get_public_class_quiz(p_course_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', quiz.id,
    'courseId', quiz.course_id,
    'placement', quiz.placement,
    'moduleId', quiz.module_id,
    'title', quiz.title,
    'description', quiz.description,
    'passingScore', quiz.passing_score,
    'maxAttempts', quiz.max_attempts,
    'feedbackEnabled', quiz.feedback_enabled,
    'feedbackRequired', quiz.feedback_required,
    'feedbackPrompt', quiz.feedback_prompt,
    'questions', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', question.value ->> 'id',
            'type', question.value ->> 'type',
            'prompt', question.value ->> 'prompt',
            'options', coalesce(question.value -> 'options', '[]'::jsonb),
            'points', coalesce(nullif(question.value ->> 'points', '')::numeric, 1)
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
    and quiz.placement = 'tab'
    and quiz.module_id is null
    and quiz.is_enabled = true
    and course.space_type = 'recorded_class'
    and course.published = true
    and course.post_test_mode = 'tab'
  limit 1;
$$;

-- Public clients receive only published questions and never correct answers.
create or replace function public.get_public_class_quizzes(p_course_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'courseId', course.id,
    'mode', course.post_test_mode,
    'quizzes', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', quiz.id,
          'courseId', quiz.course_id,
          'placement', case when quiz.placement = 'module' then 'per_material' else 'tab' end,
          'moduleId', quiz.module_id,
          'title', quiz.title,
          'description', quiz.description,
          'passingScore', quiz.passing_score,
          'maxAttempts', quiz.max_attempts,
          'feedbackEnabled', quiz.feedback_enabled,
          'feedbackRequired', quiz.feedback_required,
          'feedbackPrompt', quiz.feedback_prompt,
          'questions', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', question.value ->> 'id',
                'type', question.value ->> 'type',
                'prompt', question.value ->> 'prompt',
                'options', coalesce(question.value -> 'options', '[]'::jsonb),
                'points', coalesce(nullif(question.value ->> 'points', '')::numeric, 1)
              ) order by question.ordinality
            )
            from jsonb_array_elements(quiz.questions) with ordinality as question(value, ordinality)
          ), '[]'::jsonb)
        ) order by quiz.module_id nulls first, quiz.created_at
      ) filter (where quiz.id is not null),
      '[]'::jsonb
    )
  )
  from public.courses as course
  left join public.course_quizzes as quiz
    on quiz.course_id = course.id
   and quiz.is_enabled = true
   and jsonb_array_length(quiz.questions) > 0
   and ((course.post_test_mode = 'tab' and quiz.placement = 'tab' and quiz.module_id is null)
     or (course.post_test_mode = 'per_material' and quiz.placement = 'module' and quiz.module_id is not null))
  where course.id = p_course_id
    and course.space_type = 'recorded_class'
    and course.published = true
  group by course.id, course.post_test_mode;
$$;

-- Submit one selected quiz. This is used for material-level tests and keeps
-- the existing quiz_attempts/review/report pipeline intact.
create or replace function public.submit_class_quiz_attempt(
  p_course_id text,
  p_quiz_id uuid,
  p_participant_name text,
  p_participant_email text,
  p_answers jsonb,
  p_class_feedback text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quiz public.course_quizzes%rowtype;
  v_question jsonb;
  v_question_id text;
  v_question_type text;
  v_correct_answer text;
  v_submitted_answer text;
  v_points numeric;
  v_total_points numeric := 0;
  v_earned_points numeric := 0;
  v_score integer := 0;
  v_attempt_count integer := 0;
  v_attempt_id uuid;
  v_passed boolean := false;
  v_needs_review boolean := false;
  v_feedback jsonb := null;
  v_class_feedback text := nullif(trim(coalesce(p_class_feedback, '')), '');
  v_normalized_email text := lower(trim(coalesce(p_participant_email, '')));
begin
  if nullif(trim(coalesce(p_course_id, '')), '') is null or p_quiz_id is null then
    raise exception using message = 'INVALID_COURSE_ID';
  end if;
  if nullif(trim(coalesce(p_participant_name, '')), '') is null or length(trim(p_participant_name)) > 160 then
    raise exception using message = 'INVALID_PARTICIPANT_NAME';
  end if;
  if v_normalized_email = '' or position('@' in v_normalized_email) < 2 or length(v_normalized_email) > 320 then
    raise exception using message = 'INVALID_PARTICIPANT_EMAIL';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception using message = 'INVALID_ANSWERS';
  end if;

  select quiz.* into v_quiz
  from public.course_quizzes as quiz
  join public.courses as course on course.id = quiz.course_id
  where quiz.id = p_quiz_id
    and quiz.course_id = p_course_id
    and quiz.is_enabled = true
    and jsonb_array_length(quiz.questions) > 0
    and course.space_type = 'recorded_class'
    and course.published = true
    and ((course.post_test_mode = 'tab' and quiz.placement = 'tab' and quiz.module_id is null)
      or (course.post_test_mode = 'per_material' and quiz.placement = 'module' and quiz.module_id is not null));
  if not found then raise exception using message = 'POST_TEST_NOT_AVAILABLE'; end if;

  if not v_quiz.feedback_enabled then
    v_class_feedback := null;
  elsif v_quiz.feedback_required and v_class_feedback is null then
    raise exception using message = 'FEEDBACK_REQUIRED';
  elsif v_class_feedback is not null and char_length(v_class_feedback) > 5000 then
    raise exception using message = 'FEEDBACK_TOO_LONG';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_quiz.id::text || ':' || v_normalized_email, 0));
  select count(*)::integer into v_attempt_count
  from public.quiz_attempts
  where quiz_id = v_quiz.id and lower(participant_email) = v_normalized_email;
  if v_attempt_count >= v_quiz.max_attempts then
    raise exception using message = 'MAX_ATTEMPTS_REACHED';
  end if;

  for v_question in select value from jsonb_array_elements(v_quiz.questions)
  loop
    v_question_id := nullif(v_question ->> 'id', '');
    v_question_type := coalesce(v_question ->> 'type', 'multiple_choice');
    v_correct_answer := v_question ->> 'correctAnswer';
    v_submitted_answer := case when v_question_id is null then null else p_answers ->> v_question_id end;
    if v_question_id is null or nullif(trim(coalesce(v_submitted_answer, '')), '') is null then
      raise exception using message = 'INCOMPLETE_ANSWERS';
    end if;
    begin
      v_points := greatest(coalesce(nullif(v_question ->> 'points', '')::numeric, 1), 0);
    exception when others then
      v_points := 1;
    end;
    if v_question_type = 'long_answer' then
      v_needs_review := true;
    else
      v_total_points := v_total_points + v_points;
      if trim(coalesce(v_submitted_answer, '')) = trim(coalesce(v_correct_answer, '')) then
        v_earned_points := v_earned_points + v_points;
      end if;
    end if;
  end loop;
  if v_total_points > 0 then v_score := round((v_earned_points / v_total_points) * 100)::integer; end if;
  v_passed := v_score >= v_quiz.passing_score and not v_needs_review;

  insert into public.quiz_attempts (quiz_id, course_id, participant_name, participant_email, answers, class_feedback, score, passed, needs_review, attempt_number)
  values (v_quiz.id, p_course_id, trim(p_participant_name), v_normalized_email, p_answers, v_class_feedback, v_score, v_passed, v_needs_review, v_attempt_count + 1)
  returning id into v_attempt_id;

  if v_quiz.show_answers then
    select coalesce(jsonb_agg(case when question.value ->> 'type' = 'long_answer' then
      jsonb_build_object('questionId', question.value ->> 'id', 'answer', p_answers ->> (question.value ->> 'id'), 'correctAnswer', null, 'correct', null, 'review', true)
      else jsonb_build_object('questionId', question.value ->> 'id', 'answer', p_answers ->> (question.value ->> 'id'), 'correctAnswer', question.value ->> 'correctAnswer', 'correct', trim(coalesce(p_answers ->> (question.value ->> 'id'), '')) = trim(coalesce(question.value ->> 'correctAnswer', '')), 'review', false)
      end order by question.ordinality), '[]'::jsonb) into v_feedback
    from jsonb_array_elements(v_quiz.questions) with ordinality as question(value, ordinality);
  end if;
  return jsonb_build_object('attemptId', v_attempt_id, 'attemptNumber', v_attempt_count + 1, 'maxAttempts', v_quiz.max_attempts, 'score', v_score, 'passed', v_passed, 'needsReview', v_needs_review, 'passingScore', v_quiz.passing_score, 'feedback', v_feedback);
end;
$$;

revoke all on function public.get_public_class_quizzes(text) from public, anon, authenticated;
grant execute on function public.get_public_class_quizzes(text) to anon, authenticated;
grant execute on function public.get_public_class_quiz(text) to anon, authenticated;
revoke all on function public.submit_class_quiz_attempt(text, uuid, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.submit_class_quiz_attempt(text, uuid, text, text, jsonb, text) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
