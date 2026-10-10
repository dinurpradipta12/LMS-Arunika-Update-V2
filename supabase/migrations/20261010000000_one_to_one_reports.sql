-- Custom, shareable 1:1 mentorship reports.
-- Reports retain a snapshot of the recipient and mentor so a historical
-- report remains useful even if a booking or portal is later removed.

begin;

create extension if not exists pgcrypto;

create table if not exists public.one_to_one_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  portal_id uuid references public.one_to_one_portals(id) on delete set null,
  booking_event_id uuid references public.one_to_one_schedule_events(id) on delete set null,
  public_token_hash text not null unique,
  public_token_hint text not null default '',
  title text not null default 'Laporan mentoring',
  recipient_type text not null default 'individual'
    check (recipient_type in ('individual', 'team')),
  mentee_name text not null default '',
  mentee_email text not null default '',
  team_name text not null default '',
  team_members jsonb not null default '[]'::jsonb
    check (jsonb_typeof(team_members) = 'array'),
  period_label text not null default '',
  report_scope text not null default 'single'
    check (report_scope in ('single', 'multiple')),
  status text not null default 'draft'
    check (status in ('draft', 'shared', 'archived')),
  mentor_name text not null default '',
  mentor_role text not null default '',
  accent_color text not null default '#16436b',
  cover_title text not null default 'Laporan perkembangan',
  cover_subtitle text not null default '',
  summary text not null default '',
  evaluation text not null default '',
  next_steps text not null default '',
  footer_note text not null default '',
  template_settings jsonb not null default '{"headerLabel":"Laporan perkembangan","summaryLabel":"Catatan mentoring","evaluationLabel":"Evaluasi mentor","actionItemsLabel":"Hal yang perlu dilakukan","showMentor":true}'::jsonb
    check (jsonb_typeof(template_settings) = 'object'),
  is_shared boolean not null default false,
  shared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_to_one_report_title_length_check check (char_length(title) between 1 and 240),
  constraint one_to_one_report_mentee_name_length_check check (char_length(mentee_name) <= 160),
  constraint one_to_one_report_mentee_email_length_check check (char_length(mentee_email) <= 320),
  constraint one_to_one_report_team_name_length_check check (char_length(team_name) <= 240),
  constraint one_to_one_report_period_length_check check (char_length(period_label) <= 240),
  constraint one_to_one_report_token_hint_length_check check (char_length(public_token_hint) <= 16)
);

create table if not exists public.one_to_one_report_sessions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.one_to_one_reports(id) on delete cascade,
  booking_event_id uuid references public.one_to_one_schedule_events(id) on delete set null,
  session_date date,
  title text not null default 'Pertemuan 1',
  notes text not null default '',
  evaluation text not null default '',
  action_items text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_to_one_report_session_title_length_check check (char_length(title) between 1 and 240)
);

create index if not exists one_to_one_reports_owner_updated_idx
  on public.one_to_one_reports(owner_id, updated_at desc);
create index if not exists one_to_one_reports_portal_idx
  on public.one_to_one_reports(portal_id, updated_at desc);
create index if not exists one_to_one_reports_booking_idx
  on public.one_to_one_reports(booking_event_id);
create index if not exists one_to_one_report_sessions_report_order_idx
  on public.one_to_one_report_sessions(report_id, sort_order, session_date, created_at);

drop trigger if exists set_one_to_one_reports_updated_at on public.one_to_one_reports;
create trigger set_one_to_one_reports_updated_at
before update on public.one_to_one_reports
for each row execute function public.set_one_to_one_updated_at();

drop trigger if exists set_one_to_one_report_sessions_updated_at on public.one_to_one_report_sessions;
create trigger set_one_to_one_report_sessions_updated_at
before update on public.one_to_one_report_sessions
for each row execute function public.set_one_to_one_updated_at();

alter table public.one_to_one_reports enable row level security;
alter table public.one_to_one_report_sessions enable row level security;

revoke all on public.one_to_one_reports from public, anon, authenticated;
revoke all on public.one_to_one_report_sessions from public, anon, authenticated;

grant select, update, delete on public.one_to_one_reports to authenticated;
grant select, insert, update, delete on public.one_to_one_report_sessions to authenticated;

drop policy if exists one_to_one_reports_admin_all on public.one_to_one_reports;
create policy one_to_one_reports_admin_all
on public.one_to_one_reports for all
to authenticated
using ((select public.is_arunika_admin()))
with check ((select public.is_arunika_admin()));

drop policy if exists one_to_one_report_sessions_admin_all on public.one_to_one_report_sessions;
create policy one_to_one_report_sessions_admin_all
on public.one_to_one_report_sessions for all
to authenticated
using ((select public.is_arunika_admin()))
with check ((select public.is_arunika_admin()));

create or replace function public.create_one_to_one_report(
  p_booking_event_id uuid default null,
  p_portal_id uuid default null,
  p_recipient_type text default 'individual',
  p_team_name text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_token text := encode(gen_random_bytes(32), 'hex');
  v_report_id uuid;
  v_portal_id uuid := p_portal_id;
  v_mentee_name text := '';
  v_mentee_email text := '';
  v_mentor_name text := '';
  v_mentor_role text := '';
  v_accent_color text := '#16436b';
  v_booking_title text := '';
  v_booking_start timestamptz;
  v_recipient_type text := lower(trim(coalesce(p_recipient_type, 'individual')));
  v_team_name text := trim(coalesce(p_team_name, ''));
begin
  if not public.is_arunika_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;
  if v_recipient_type not in ('individual', 'team') then
    raise exception using message = 'INVALID_REPORT_RECIPIENT_TYPE';
  end if;

  if p_booking_event_id is not null then
    select event.portal_id, event.title, event.starts_at,
      portal.mentee_name, portal.mentee_email, portal.mentor_name,
      portal.mentor_role, portal.accent_color
    into v_portal_id, v_booking_title, v_booking_start,
      v_mentee_name, v_mentee_email, v_mentor_name,
      v_mentor_role, v_accent_color
    from public.one_to_one_schedule_events as event
    join public.one_to_one_portals as portal on portal.id = event.portal_id
    where event.id = p_booking_event_id;

    if not found then
      raise exception using message = 'BOOKING_NOT_FOUND';
    end if;
  elsif v_portal_id is not null then
    select portal.mentee_name, portal.mentee_email, portal.mentor_name,
      portal.mentor_role, portal.accent_color
    into v_mentee_name, v_mentee_email, v_mentor_name, v_mentor_role, v_accent_color
    from public.one_to_one_portals as portal
    where portal.id = v_portal_id;

    if not found then
      raise exception using message = 'PORTAL_NOT_FOUND';
    end if;
  end if;

  insert into public.one_to_one_reports (
    owner_id, portal_id, booking_event_id, public_token_hash, public_token_hint,
    title, recipient_type, mentee_name, mentee_email, team_name, period_label,
    mentor_name, mentor_role, accent_color
  ) values (
    auth.uid(), v_portal_id, p_booking_event_id,
    private.hash_one_to_one_token(v_token), right(v_token, 8),
    case
      when v_recipient_type = 'team' then 'Laporan mentoring tim'
      when nullif(v_mentee_name, '') is not null then 'Laporan mentoring - ' || v_mentee_name
      else 'Laporan mentoring'
    end,
    v_recipient_type, v_mentee_name, v_mentee_email, v_team_name,
    case when v_booking_start is not null then to_char(v_booking_start, 'DD Mon YYYY') else '' end,
    v_mentor_name, v_mentor_role, coalesce(nullif(v_accent_color, ''), '#16436b')
  ) returning id into v_report_id;

  if p_booking_event_id is not null then
    insert into public.one_to_one_report_sessions (
      report_id, booking_event_id, session_date, title, sort_order
    ) values (
      v_report_id, p_booking_event_id, v_booking_start::date,
      coalesce(nullif(v_booking_title, ''), 'Pertemuan 1'), 0
    );
  end if;

  return jsonb_build_object('reportId', v_report_id, 'publicTokenHint', right(v_token, 8));
end;
$$;

create or replace function public.rotate_one_to_one_report_share_token(p_report_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_token text := encode(gen_random_bytes(32), 'hex');
  v_exists boolean;
begin
  if not public.is_arunika_admin() then
    raise exception using errcode = '42501', message = 'ADMIN_REQUIRED';
  end if;

  update public.one_to_one_reports
  set public_token_hash = private.hash_one_to_one_token(v_token),
      public_token_hint = right(v_token, 8),
      is_shared = true,
      status = 'shared',
      shared_at = now(),
      updated_at = now()
  where id = p_report_id
  returning true into v_exists;

  if not coalesce(v_exists, false) then
    raise exception using message = 'REPORT_NOT_FOUND';
  end if;

  return jsonb_build_object('reportId', p_report_id, 'token', v_token, 'publicTokenHint', right(v_token, 8));
end;
$$;

-- Public data is deliberately limited to reports explicitly shared by an
-- administrator. Owner IDs, token hashes, booking links, and private portal
-- data are never returned.
create or replace function public.get_public_one_to_one_report(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_report public.one_to_one_reports%rowtype;
begin
  if p_token is null or char_length(trim(p_token)) < 48 or char_length(trim(p_token)) > 128 then
    return null;
  end if;

  select report.*
  into v_report
  from public.one_to_one_reports as report
  where report.public_token_hash = private.hash_one_to_one_token(trim(p_token))
    and report.is_shared = true
    and report.status = 'shared';

  if not found then return null; end if;

  return jsonb_build_object(
    'id', v_report.id,
    'title', v_report.title,
    'recipientType', v_report.recipient_type,
    'menteeName', v_report.mentee_name,
    'menteeEmail', v_report.mentee_email,
    'teamName', v_report.team_name,
    'teamMembers', v_report.team_members,
    'periodLabel', v_report.period_label,
    'reportScope', v_report.report_scope,
    'mentorName', v_report.mentor_name,
    'mentorRole', v_report.mentor_role,
    'accentColor', v_report.accent_color,
    'coverTitle', v_report.cover_title,
    'coverSubtitle', v_report.cover_subtitle,
    'summary', v_report.summary,
    'evaluation', v_report.evaluation,
    'nextSteps', v_report.next_steps,
    'footerNote', v_report.footer_note,
    'templateSettings', v_report.template_settings,
    'sharedAt', v_report.shared_at,
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', item.id,
        'sessionDate', item.session_date,
        'title', item.title,
        'notes', item.notes,
        'evaluation', item.evaluation,
        'actionItems', item.action_items,
        'sortOrder', item.sort_order
      ) order by item.sort_order, item.session_date nulls last, item.created_at)
      from public.one_to_one_report_sessions as item
      where item.report_id = v_report.id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.create_one_to_one_report(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.rotate_one_to_one_report_share_token(uuid) from public, anon, authenticated;
revoke all on function public.get_public_one_to_one_report(text) from public, anon, authenticated;
grant execute on function public.create_one_to_one_report(uuid, uuid, text, text) to authenticated;
grant execute on function public.rotate_one_to_one_report_share_token(uuid) to authenticated;
grant execute on function public.get_public_one_to_one_report(text) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
