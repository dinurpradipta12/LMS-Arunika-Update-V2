-- Add an optional lightweight banner image to each Q&A session.
-- Run this after the existing Q&A migrations.

begin;

alter table public.qna_sessions
  add column if not exists header_image text not null default '';

alter table public.qna_sessions
  drop constraint if exists qna_session_header_image_length_check;

alter table public.qna_sessions
  add constraint qna_session_header_image_length_check
  check (char_length(header_image) <= 2500000);

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
    'headerImage', session.header_image,
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

notify pgrst, 'reload schema';

commit;

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'qna_sessions'
  and column_name = 'header_image';
