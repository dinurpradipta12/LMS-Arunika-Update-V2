-- Add payment QR/account details and WhatsApp confirmation contact to Form Maker.
-- Run this after 20260909000000_form_maker.sql on an existing project.

begin;

create schema if not exists private;

alter table public.form_forms
  add column if not exists payment_amount text not null default '',
  add column if not exists payment_qr_code text not null default '',
  add column if not exists payment_account_number text not null default '',
  add column if not exists payment_whatsapp text not null default '';

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
  and column_name in (
    'payment_qr_code',
    'payment_account_number',
    'payment_whatsapp',
    'payment_amount'
  )
order by column_name;
