-- Keep per-material post-test requirements visible to the public class page,
-- even while a mentor temporarily closes a post-test. The public client gets
-- metadata for the closed quiz but never receives its questions or answers.

begin;

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
          'enabled', quiz.is_enabled = true and jsonb_array_length(coalesce(quiz.questions, '[]'::jsonb)) > 0,
          'passingScore', quiz.passing_score,
          'maxAttempts', quiz.max_attempts,
          'feedbackEnabled', quiz.feedback_enabled,
          'feedbackRequired', quiz.feedback_required,
          'feedbackPrompt', quiz.feedback_prompt,
          'questions', case
            when quiz.is_enabled = true and jsonb_array_length(coalesce(quiz.questions, '[]'::jsonb)) > 0 then coalesce((
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
            else '[]'::jsonb
          end
        ) order by quiz.module_id nulls first, quiz.created_at
      ) filter (where quiz.id is not null),
      '[]'::jsonb
    )
  )
  from public.courses as course
  left join public.course_quizzes as quiz
    on quiz.course_id = course.id
   and ((course.post_test_mode = 'tab' and quiz.placement = 'tab' and quiz.module_id is null)
     or (course.post_test_mode = 'per_material' and quiz.placement = 'module' and quiz.module_id is not null))
  where course.id = p_course_id
    and course.space_type = 'recorded_class'
    and course.published = true
  group by course.id, course.post_test_mode;
$$;

notify pgrst, 'reload schema';

commit;
