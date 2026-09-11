-- Arunika LMS: moderated public Q&A for webinars, classes, and events.
-- Public users only interact through security-definer RPCs. Realtime carries
-- a revision signal and never contains question or voter data.

begin;

create schema if not exists private;

create table if not exists public.qna_sessions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null default 'Sesi Q&A Baru',
  event_name text not null default '',
  description text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'live', 'paused', 'closed', 'archived')),
  allow_anonymous boolean not null default true,
  require_name boolean not null default false,
  voting_enabled boolean not null default true,
  welcome_message text not null default 'Pertanyaan akan ditampilkan setelah disetujui moderator.',
  closed_message text not null default 'Sesi Q&A ini sudah ditutup.',
  theme text not null default 'navy'
    check (theme in ('navy', 'emerald', 'coral', 'violet', 'amber')),
  presenter_token text not null default replace(gen_random_uuid()::text, '-', ''),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint qna_session_slug_length_check check (char_length(slug) between 1 and 80),
  constraint qna_session_title_length_check check (char_length(title) between 1 and 200),
  constraint qna_session_description_length_check check (char_length(description) <= 5000),
  constraint qna_session_welcome_length_check check (char_length(welcome_message) <= 2000),
  constraint qna_session_closed_length_check check (char_length(closed_message) <= 2000)
);

create table if not exists public.qna_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.qna_sessions(id) on delete cascade,
  body text not null,
  display_name text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'answered', 'hidden', 'archived')),
  answer text not null default '',
  is_pinned boolean not null default false,
  upvotes integer not null default 0 check (upvotes >= 0),
  sort_order integer not null default 0,
  client_token_hash text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint qna_question_body_length_check check (char_length(body) between 1 and 1200),
  constraint qna_question_name_length_check check (char_length(display_name) <= 120),
  constraint qna_question_answer_length_check check (char_length(answer) <= 5000),
  constraint qna_question_token_length_check check (char_length(client_token_hash) <= 64)
);

create table if not exists public.qna_question_votes (
  question_id uuid not null references public.qna_questions(id) on delete cascade,
  voter_token_hash text not null,
  created_at timestamptz not null default now(),
  primary key (question_id, voter_token_hash),
  constraint qna_vote_token_length_check check (char_length(voter_token_hash) between 1 and 64)
);

create index if not exists qna_sessions_status_created_idx
  on public.qna_sessions(status, created_at desc);
create index if not exists qna_questions_session_status_idx
  on public.qna_questions(session_id, status, is_pinned desc, created_at desc);
create index if not exists qna_questions_session_token_idx
  on public.qna_questions(session_id, client_token_hash, created_at desc);

-- Reuse the timestamp trigger created by the Form Maker migration.
drop trigger if exists set_qna_sessions_updated_at on public.qna_sessions;
create trigger set_qna_sessions_updated_at
before update on public.qna_sessions
for each row execute function public.set_form_maker_updated_at();

drop trigger if exists set_qna_questions_updated_at on public.qna_questions;
create trigger set_qna_questions_updated_at
before update on public.qna_questions
for each row execute function public.set_form_maker_updated_at();

alter table public.qna_sessions enable row level security;
alter table public.qna_questions enable row level security;
alter table public.qna_question_votes enable row level security;

revoke all on public.qna_sessions, public.qna_questions, public.qna_question_votes
  from public, anon, authenticated;
grant select, insert, update, delete on public.qna_sessions, public.qna_questions to authenticated;
-- Votes are written only by the security-definer vote RPC.

drop policy if exists qna_sessions_admin_all on public.qna_sessions;
create policy qna_sessions_admin_all
on public.qna_sessions for all to authenticated
using ((select public.is_arunika_admin()))
with check ((select public.is_arunika_admin()));

drop policy if exists qna_questions_admin_all on public.qna_questions;
create policy qna_questions_admin_all
on public.qna_questions for all to authenticated
using ((select public.is_arunika_admin()))
with check ((select public.is_arunika_admin()));

-- Add the qna signal scope without exposing business rows.
alter table public.public_content_revisions
  drop constraint if exists public_content_revisions_scope_check;
alter table public.public_content_revisions
  add constraint public_content_revisions_scope_check
  check (scope in ('public', 'forms', 'qna'));

insert into public.public_content_revisions (scope, revision, updated_at)
values ('qna', 0, now())
on conflict (scope) do nothing;

drop policy if exists public_content_revisions_qna_read on public.public_content_revisions;
create policy public_content_revisions_qna_read
on public.public_content_revisions for select
to anon, authenticated
using (scope = 'qna');

create or replace function private.bump_qna_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.public_content_revisions
  set revision = revision + 1, updated_at = now()
  where scope = 'qna';
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.bump_qna_revision() from public, anon, authenticated;

drop trigger if exists bump_qna_sessions_revision on public.qna_sessions;
create trigger bump_qna_sessions_revision
after insert or update or delete on public.qna_sessions
for each row execute function private.bump_qna_revision();

drop trigger if exists bump_qna_questions_revision on public.qna_questions;
create trigger bump_qna_questions_revision
after insert or update or delete on public.qna_questions
for each row execute function private.bump_qna_revision();

drop trigger if exists bump_qna_votes_revision on public.qna_question_votes;
create trigger bump_qna_votes_revision
after insert or update or delete on public.qna_question_votes
for each row execute function private.bump_qna_revision();

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
      and question.created_at > now() - interval '20 seconds'
  ) then
    raise exception using message = 'QNA_RATE_LIMITED';
  end if;

  insert into public.qna_questions(session_id, body, display_name, client_token_hash)
  values (v_session.id, v_question, v_name, v_token_hash)
  returning id, created_at into v_question_id, v_created_at;

  return jsonb_build_object(
    'questionId', v_question_id,
    'status', 'pending',
    'createdAt', v_created_at
  );
end;
$$;

create or replace function public.vote_public_qna_question(
  p_slug text,
  p_question_id uuid,
  p_voter_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.qna_sessions%rowtype;
  v_question public.qna_questions%rowtype;
  v_voter_token text := trim(coalesce(p_voter_token, ''));
  v_hash text;
begin
  if v_voter_token = '' then
    raise exception using message = 'QNA_VOTER_REQUIRED';
  end if;
  v_hash := md5(v_voter_token);

  select session.* into v_session
  from public.qna_sessions as session
  where lower(session.slug) = lower(trim(coalesce(p_slug, '')))
    and session.status in ('live', 'paused');
  if not found then
    raise exception using message = 'QNA_CLOSED';
  end if;
  if not v_session.voting_enabled then
    raise exception using message = 'QNA_VOTING_DISABLED';
  end if;

  select question.* into v_question
  from public.qna_questions as question
  where question.id = p_question_id
    and question.session_id = v_session.id
    and question.status in ('approved', 'answered');
  if not found then
    raise exception using message = 'QNA_NOT_FOUND';
  end if;

  begin
    insert into public.qna_question_votes(question_id, voter_token_hash)
    values (v_question.id, v_hash);
  exception when unique_violation then
    return jsonb_build_object('upvotes', v_question.upvotes, 'voted', false);
  end;

  update public.qna_questions
  set upvotes = upvotes + 1, updated_at = now()
  where id = v_question.id
  returning upvotes into v_question.upvotes;

  return jsonb_build_object('upvotes', v_question.upvotes, 'voted', true);
end;
$$;

revoke all on function public.get_public_qna_session(text, text)
  from public, anon, authenticated;
revoke all on function public.submit_public_qna_question(text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.vote_public_qna_question(text, uuid, text)
  from public, anon, authenticated;

grant execute on function public.get_public_qna_session(text, text) to anon, authenticated;
grant execute on function public.submit_public_qna_question(text, text, text, text) to anon, authenticated;
grant execute on function public.vote_public_qna_question(text, uuid, text) to anon, authenticated;

notify pgrst, 'reload schema';

commit;

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('qna_sessions', 'qna_questions', 'qna_question_votes')
order by table_name;
