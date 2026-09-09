-- Arunika LMS: Form Maker, public responses, and payment/confirmation status.
-- Form definitions and responses are admin-only. Public users interact through
-- security-definer RPCs so draft forms and other responses never leave RLS.

begin;

create table if not exists public.form_forms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null default 'Form Baru',
  event_name text not null default '',
  description text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  fields jsonb not null default '[]'::jsonb
    check (jsonb_typeof(fields) = 'array'),
  post_submit_mode text not null default 'confirmation'
    check (post_submit_mode in ('confirmation', 'payment', 'redirect')),
  post_submit_title text not null default 'Terima kasih, data Anda sudah diterima.',
  post_submit_message text not null default 'Tim kami akan menghubungi Anda untuk langkah berikutnya.',
  payment_instructions text not null default '',
  payment_link text not null default '',
  payment_amount text not null default '',
  payment_qr_code text not null default '',
  payment_account_number text not null default '',
  payment_whatsapp text not null default '',
  redirect_url text not null default '',
  allow_multiple boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.form_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.form_forms(id) on delete cascade,
  responder_name text not null,
  responder_email text not null,
  answers jsonb not null default '{}'::jsonb
    check (jsonb_typeof(answers) = 'object'),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'paid', 'cancelled')),
  payment_reference text not null default '',
  admin_note text not null default '',
  submitted_at timestamptz not null default now(),
  confirmed_at timestamptz,
  paid_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint form_response_name_length_check check (char_length(responder_name) between 1 and 160),
  constraint form_response_email_length_check check (char_length(responder_email) between 3 and 320),
  constraint form_response_payment_reference_length_check check (char_length(payment_reference) <= 200),
  constraint form_response_admin_note_length_check check (char_length(admin_note) <= 5000)
);

create index if not exists form_forms_status_created_idx
  on public.form_forms(status, created_at desc);
create index if not exists form_forms_event_name_idx
  on public.form_forms(lower(event_name));
create index if not exists form_responses_form_submitted_idx
  on public.form_responses(form_id, submitted_at desc);
create index if not exists form_responses_form_status_idx
  on public.form_responses(form_id, status);
create index if not exists form_responses_email_idx
  on public.form_responses(lower(responder_email));

create or replace function public.set_form_maker_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_form_forms_updated_at on public.form_forms;
create trigger set_form_forms_updated_at
before update on public.form_forms
for each row execute function public.set_form_maker_updated_at();

drop trigger if exists set_form_responses_updated_at on public.form_responses;
create trigger set_form_responses_updated_at
before update on public.form_responses
for each row execute function public.set_form_maker_updated_at();

alter table public.form_forms enable row level security;
alter table public.form_responses enable row level security;

revoke all on public.form_forms from public, anon, authenticated;
revoke all on public.form_responses from public, anon, authenticated;
grant select, insert, update, delete on public.form_forms to authenticated;
grant select, update, delete on public.form_responses to authenticated;

drop policy if exists form_forms_admin_all on public.form_forms;
create policy form_forms_admin_all
on public.form_forms for all
to authenticated
using ((select public.is_arunika_admin()))
with check ((select public.is_arunika_admin()));

drop policy if exists form_responses_admin_all on public.form_responses;
create policy form_responses_admin_all
on public.form_responses for all
to authenticated
using ((select public.is_arunika_admin()))
with check ((select public.is_arunika_admin()));

-- Realtime carries only a revision counter. Form answers are never present in
-- the broadcast payload and the forms scope is restricted to admins.
alter table public.public_content_revisions
  drop constraint if exists public_content_revisions_scope_check;
alter table public.public_content_revisions
  add constraint public_content_revisions_scope_check
  check (scope in ('public', 'forms'));

insert into public.public_content_revisions (scope, revision, updated_at)
values ('forms', 0, now())
on conflict (scope) do nothing;

drop policy if exists public_content_revisions_forms_admin_read on public.public_content_revisions;
create policy public_content_revisions_forms_admin_read
on public.public_content_revisions for select
to authenticated
using (scope = 'forms' and (select public.is_arunika_admin()));

create or replace function private.bump_form_maker_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_public_form boolean := false;
begin
  if tg_table_name = 'form_forms' then
    if tg_op = 'DELETE' then
      is_public_form := old.status = 'published';
    elsif tg_op = 'INSERT' then
      is_public_form := new.status = 'published';
    else
      is_public_form := old.status = 'published' or new.status = 'published';
    end if;
  end if;

  update public.public_content_revisions
  set revision = revision + 1, updated_at = now()
  where scope = 'forms';

  if is_public_form then
    update public.public_content_revisions
    set revision = revision + 1, updated_at = now()
    where scope = 'public';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.set_form_maker_updated_at() from public, anon, authenticated;
revoke all on function private.bump_form_maker_revision() from public, anon, authenticated;

drop trigger if exists bump_form_forms_revision on public.form_forms;
create trigger bump_form_forms_revision
after insert or update or delete on public.form_forms
for each row execute function private.bump_form_maker_revision();

drop trigger if exists bump_form_responses_revision on public.form_responses;
create trigger bump_form_responses_revision
after insert or update or delete on public.form_responses
for each row execute function private.bump_form_maker_revision();

create or replace function public.get_public_form(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', form.id,
    'slug', form.slug,
    'title', form.title,
    'eventName', form.event_name,
    'description', form.description,
    'fields', form.fields,
    'allowMultiple', form.allow_multiple,
    'postSubmitMode', form.post_submit_mode,
    'postSubmitTitle', form.post_submit_title,
    'postSubmitMessage', form.post_submit_message,
    'paymentInstructions', form.payment_instructions,
    'paymentLink', form.payment_link,
    'paymentAmount', form.payment_amount,
    'paymentQrCode', form.payment_qr_code,
    'paymentAccountNumber', form.payment_account_number,
    'paymentWhatsapp', form.payment_whatsapp,
    'redirectUrl', form.redirect_url
  )
  from public.form_forms as form
  where lower(form.slug) = lower(trim(coalesce(p_slug, '')))
    and form.status = 'published';
$$;

create or replace function public.submit_public_form(
  p_slug text,
  p_responder_name text,
  p_responder_email text,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_form public.form_forms%rowtype;
  v_field jsonb;
  v_field_id text;
  v_field_type text;
  v_value jsonb;
  v_option text;
  v_responder_name text := trim(coalesce(p_responder_name, ''));
  v_responder_email text := lower(trim(coalesce(p_responder_email, '')));
  v_response_id uuid;
  v_submitted_at timestamptz;
begin
  if nullif(trim(coalesce(p_slug, '')), '') is null then
    raise exception using message = 'FORM_NOT_FOUND';
  end if;

  if v_responder_name = '' or char_length(v_responder_name) > 160 then
    raise exception using message = 'INVALID_RESPONDER_NAME';
  end if;

  if v_responder_email = ''
     or position('@' in v_responder_email) < 2
     or char_length(v_responder_email) > 320 then
    raise exception using message = 'INVALID_RESPONDER_EMAIL';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object'
     or char_length(p_answers::text) > 100000 then
    raise exception using message = 'INVALID_FORM_ANSWERS';
  end if;

  select form.*
  into v_form
  from public.form_forms as form
  where lower(form.slug) = lower(trim(p_slug))
    and form.status = 'published';

  if not found then
    raise exception using message = 'FORM_NOT_FOUND';
  end if;

  if not v_form.allow_multiple and exists (
    select 1
    from public.form_responses as response
    where response.form_id = v_form.id
      and lower(response.responder_email) = v_responder_email
      and response.status <> 'cancelled'
  ) then
    raise exception using message = 'FORM_ALREADY_SUBMITTED';
  end if;

  for v_field in
    select value from jsonb_array_elements(coalesce(v_form.fields, '[]'::jsonb)) as field(value)
  loop
    v_field_id := nullif(trim(v_field ->> 'id'), '');
    v_field_type := coalesce(v_field ->> 'type', 'short_text');
    v_value := p_answers -> v_field_id;

    if v_field_id is null or char_length(v_field_id) > 80 then
      raise exception using message = 'INVALID_FORM_FIELD';
    end if;

    if coalesce((v_field ->> 'required')::boolean, false)
       and (
         v_value is null
         or (jsonb_typeof(v_value) = 'string' and nullif(trim(v_value #>> '{}'), '') is null)
         or (jsonb_typeof(v_value) = 'array' and jsonb_array_length(v_value) = 0)
       ) then
      raise exception using message = 'REQUIRED_FIELD:' || v_field_id;
    end if;

    if v_value is null then continue; end if;

    if v_field_type in ('short_text', 'email', 'link', 'number', 'date', 'multiple_choice', 'dropdown')
       and jsonb_typeof(v_value) <> 'string' then
      raise exception using message = 'INVALID_FIELD:' || v_field_id;
    end if;

    if v_field_type = 'long_text'
       and jsonb_typeof(v_value) <> 'string' then
      raise exception using message = 'INVALID_FIELD:' || v_field_id;
    end if;

    if v_field_type = 'short_text' and char_length(v_value #>> '{}') > 500 then
      raise exception using message = 'FIELD_TOO_LONG:' || v_field_id;
    elsif v_field_type = 'long_text' and char_length(v_value #>> '{}') > 5000 then
      raise exception using message = 'FIELD_TOO_LONG:' || v_field_id;
    elsif v_field_type = 'email' and (
      position('@' in lower(v_value #>> '{}')) < 2
      or char_length(v_value #>> '{}') > 320
    ) then
      raise exception using message = 'INVALID_FIELD:' || v_field_id;
    elsif v_field_type = 'link' and (
      char_length(v_value #>> '{}') > 2000
      or (v_value #>> '{}') !~* '^https?://'
    ) then
      raise exception using message = 'INVALID_FIELD:' || v_field_id;
    elsif v_field_type = 'number' then
      begin
        perform (v_value #>> '{}')::numeric;
      exception when others then
        raise exception using message = 'INVALID_FIELD:' || v_field_id;
      end;
    elsif v_field_type in ('multiple_choice', 'dropdown') and not exists (
      select 1
      from jsonb_array_elements_text(coalesce(v_field -> 'options', '[]'::jsonb)) as opt(value)
      where opt.value = v_value #>> '{}'
    ) then
      raise exception using message = 'INVALID_FIELD:' || v_field_id;
    elsif v_field_type = 'checkbox' then
      if jsonb_typeof(v_value) <> 'array' then
        raise exception using message = 'INVALID_FIELD:' || v_field_id;
      end if;
      for v_option in select value from jsonb_array_elements_text(v_value) as item(value) loop
        if not exists (
          select 1
          from jsonb_array_elements_text(coalesce(v_field -> 'options', '[]'::jsonb)) as opt(value)
          where opt.value = v_option
        ) then
          raise exception using message = 'INVALID_FIELD:' || v_field_id;
        end if;
      end loop;
    end if;
  end loop;

  insert into public.form_responses (
    form_id, responder_name, responder_email, answers, status
  ) values (
    v_form.id, v_responder_name, v_responder_email, p_answers, 'pending'
  ) returning id, submitted_at into v_response_id, v_submitted_at;

  return jsonb_build_object(
    'responseId', v_response_id,
    'submittedAt', v_submitted_at,
    'status', 'pending',
    'postSubmitMode', v_form.post_submit_mode,
    'postSubmitTitle', v_form.post_submit_title,
    'postSubmitMessage', v_form.post_submit_message,
    'paymentInstructions', v_form.payment_instructions,
    'paymentLink', v_form.payment_link,
    'paymentAmount', v_form.payment_amount,
    'paymentQrCode', v_form.payment_qr_code,
    'paymentAccountNumber', v_form.payment_account_number,
    'paymentWhatsapp', v_form.payment_whatsapp,
    'redirectUrl', v_form.redirect_url
  );
end;
$$;

revoke all on function public.get_public_form(text) from public, anon, authenticated;
revoke all on function public.submit_public_form(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.get_public_form(text) to anon, authenticated;
grant execute on function public.submit_public_form(text, text, text, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';

commit;

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('form_forms', 'form_responses')
order by table_name;
