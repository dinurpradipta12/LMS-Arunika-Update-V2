-- Add question categories and allow the presenter to mark a question done
-- without requiring a written moderator answer.

begin;

alter table public.qna_questions
  add column if not exists category text not null default 'Umum';

update public.qna_questions
set category = 'Umum'
where category is null or trim(category) = '';

alter table public.qna_questions
  drop constraint if exists qna_question_category_length_check;

alter table public.qna_questions
  add constraint qna_question_category_length_check
  check (char_length(category) between 1 and 80);

create or replace function public.get_public_qna_session(
  p_slug text,
  p_presenter_token text default ''
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', session.id,
    'slug', session.slug,
    'title', session.title,
    'eventName', session.event_name,
    'description', session.description,
    'status', session.status,
    'allowAnonymous', session.allow_anonymous,
    'requireName', session.require_name,
    'votingEnabled', session.voting_enabled,
    'welcomeMessage', session.welcome_message,
    'closedMessage', session.closed_message,
    'theme', session.theme,
    'presenterValid', nullif(trim(coalesce(p_presenter_token, '')), '') = session.presenter_token,
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', question.id,
        'sessionId', question.session_id,
        'body', question.body,
        'displayName', coalesce(nullif(trim(question.display_name), ''), 'Anonim'),
        'category', coalesce(nullif(trim(question.category), ''), 'Umum'),
        'status', question.status,
        'answer', question.answer,
        'isPinned', question.is_pinned,
        'upvotes', question.upvotes,
        'sortOrder', question.sort_order,
        'createdAt', question.created_at,
        'updatedAt', question.updated_at
      ) order by question.is_pinned desc, question.upvotes desc, question.created_at asc)
      from public.qna_questions as question
      where question.session_id = session.id
        and question.status in ('approved', 'answered')
    ), '[]'::jsonb)
  )
  from public.qna_sessions as session
  where lower(session.slug) = lower(trim(coalesce(p_slug, '')))
    and session.status in ('live', 'paused', 'closed');
$$;

create or replace function public.submit_public_qna_question(
  p_slug text,
  p_question text,
  p_display_name text,
  p_client_token text,
  p_category text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.qna_sessions%rowtype;
  v_question text := trim(coalesce(p_question, ''));
  v_name text := trim(coalesce(p_display_name, ''));
  v_token text := trim(coalesce(p_client_token, ''));
  v_category text := trim(coalesce(p_category, 'Umum'));
  v_token_hash text := case when v_token = '' then '' else md5(v_token) end;
  v_question_id uuid;
  v_created_at timestamptz;
begin
  if v_question = '' or char_length(v_question) > 1200 then
    raise exception using message = 'QNA_QUESTION_REQUIRED';
  end if;

  if char_length(v_name) > 120 then
    raise exception using message = 'QNA_NAME_TOO_LONG';
  end if;

  if v_category = '' then
    v_category := 'Umum';
  end if;
  if char_length(v_category) > 80 then
    raise exception using message = 'QNA_CATEGORY_TOO_LONG';
  end if;

  select session.* into v_session
  from public.qna_sessions as session
  where lower(session.slug) = lower(trim(coalesce(p_slug, '')))
    and session.status = 'live';

  if not found then
    raise exception using message = 'QNA_CLOSED';
  end if;

  if (v_session.require_name or not v_session.allow_anonymous) and v_name = '' then
    raise exception using message = 'QNA_NAME_REQUIRED';
  end if;

  if v_token_hash <> '' and exists (
    select 1
    from public.qna_questions as question
    where question.session_id = v_session.id
      and question.client_token_hash = v_token_hash
      and question.body = v_question
      and question.created_at > now() - interval '20 seconds'
  ) then
    raise exception using message = 'QNA_RATE_LIMITED';
  end if;

  insert into public.qna_questions(
    session_id,
    body,
    display_name,
    category,
    client_token_hash,
    status
  )
  values (
    v_session.id,
    v_question,
    v_name,
    v_category,
    v_token_hash,
    'approved'
  )
  returning id, created_at into v_question_id, v_created_at;

  return jsonb_build_object(
    'questionId', v_question_id,
    'status', 'approved',
    'category', v_category,
    'createdAt', v_created_at
  );
end;
$$;

create or replace function public.mark_public_qna_question_answered(
  p_slug text,
  p_presenter_token text,
  p_question_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.qna_sessions%rowtype;
  v_question_id uuid;
begin
  if trim(coalesce(p_presenter_token, '')) = '' then
    raise exception using message = 'QNA_PRESENTER_REQUIRED';
  end if;

  select session.* into v_session
  from public.qna_sessions as session
  where lower(session.slug) = lower(trim(coalesce(p_slug, '')))
    and session.presenter_token = trim(p_presenter_token)
    and session.status in ('live', 'paused');

  if not found then
    raise exception using message = 'QNA_PRESENTER_INVALID';
  end if;

  update public.qna_questions
  set status = 'answered', updated_at = now()
  where id = p_question_id
    and session_id = v_session.id
    and status = 'approved'
  returning id into v_question_id;

  if not found then
    raise exception using message = 'QNA_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'questionId', v_question_id,
    'status', 'answered'
  );
end;
$$;

revoke all on function public.get_public_qna_session(text, text)
  from public, anon, authenticated;
revoke all on function public.submit_public_qna_question(text, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.mark_public_qna_question_answered(text, text, uuid)
  from public, anon, authenticated;

grant execute on function public.get_public_qna_session(text, text)
  to anon, authenticated;
grant execute on function public.submit_public_qna_question(text, text, text, text, text)
  to anon, authenticated;
grant execute on function public.mark_public_qna_question_answered(text, text, uuid)
  to anon, authenticated;

notify pgrst, 'reload schema';

commit;
