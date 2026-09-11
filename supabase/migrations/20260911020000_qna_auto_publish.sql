-- Publish audience questions immediately. Moderators can still hide, pin,
-- answer, or delete questions from the admin detail page.

begin;

alter table public.qna_questions
  alter column status set default 'approved';

-- Make questions that were waiting under the previous workflow visible too.
update public.qna_questions
set status = 'approved', updated_at = now()
where status = 'pending';

update public.qna_sessions
set welcome_message = 'Pertanyaan akan langsung tampil di ruang diskusi.',
    updated_at = now()
where welcome_message = 'Pertanyaan akan ditampilkan setelah disetujui moderator.';

create or replace function public.submit_public_qna_question(
  p_slug text,
  p_question text,
  p_display_name text default '',
  p_client_token text default ''
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
    client_token_hash,
    status
  )
  values (
    v_session.id,
    v_question,
    v_name,
    v_token_hash,
    'approved'
  )
  returning id, created_at into v_question_id, v_created_at;

  return jsonb_build_object(
    'questionId', v_question_id,
    'status', 'approved',
    'createdAt', v_created_at
  );
end;
$$;

revoke all on function public.submit_public_qna_question(text, text, text, text)
from public, anon, authenticated;

grant execute on function public.submit_public_qna_question(text, text, text, text)
to anon, authenticated;

notify pgrst, 'reload schema';

commit;
