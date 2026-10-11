-- Per-report visual identity for shareable 1:1 mentorship reports.
-- The fallback remains Arunika Learning Hub when existing reports have not
-- been customized yet.

begin;

alter table public.one_to_one_reports
  add column if not exists brand_name text not null default 'Arunika Learning Hub',
  add column if not exists brand_logo_url text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.one_to_one_reports'::regclass
      and conname = 'one_to_one_report_brand_name_length_check'
  ) then
    alter table public.one_to_one_reports
      add constraint one_to_one_report_brand_name_length_check
      check (char_length(brand_name) between 1 and 160);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.one_to_one_reports'::regclass
      and conname = 'one_to_one_report_brand_logo_url_length_check'
  ) then
    alter table public.one_to_one_reports
      add constraint one_to_one_report_brand_logo_url_length_check
      check (char_length(brand_logo_url) <= 2000);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.one_to_one_reports'::regclass
      and conname = 'one_to_one_report_brand_logo_url_format_check'
  ) then
    alter table public.one_to_one_reports
      add constraint one_to_one_report_brand_logo_url_format_check
      check (brand_logo_url = '' or brand_logo_url ~* '^https?://');
  end if;
end;
$$;

-- The public report endpoint returns an allow-list, so add the branding
-- fields explicitly without exposing owner, booking, portal, or token data.
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
    'brandName', v_report.brand_name,
    'brandLogoUrl', v_report.brand_logo_url,
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

notify pgrst, 'reload schema';

commit;
