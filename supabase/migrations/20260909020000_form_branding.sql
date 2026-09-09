-- Add the public Form Maker banner and selectable accent theme.
-- Run this after 20260909000000_form_maker.sql and
-- 20260909010000_form_payment_contact.sql on an existing project.

begin;

alter table public.form_forms
  add column if not exists header_image text not null default '',
  add column if not exists theme text not null default 'navy';

alter table public.form_forms
  drop constraint if exists form_forms_theme_check;

alter table public.form_forms
  add constraint form_forms_theme_check
  check (theme in ('navy', 'emerald', 'coral', 'violet', 'amber'));

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
    'headerImage', form.header_image,
    'theme', form.theme,
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

revoke all on function public.get_public_form(text)
from public, anon, authenticated;

grant execute on function public.get_public_form(text)
to anon, authenticated;

notify pgrst, 'reload schema';

commit;

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'form_forms'
  and column_name in ('header_image', 'theme')
order by column_name;
