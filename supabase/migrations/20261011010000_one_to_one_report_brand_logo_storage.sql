-- Direct uploads for report branding. The bucket is public because the logo
-- appears in a deliberately shared report; writes remain limited to admins.

begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'one-to-one-report-branding',
  'one-to-one-report-branding',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists one_to_one_report_branding_admin_insert on storage.objects;
create policy one_to_one_report_branding_admin_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'one-to-one-report-branding'
  and (select public.is_arunika_admin())
);

drop policy if exists one_to_one_report_branding_admin_update on storage.objects;
create policy one_to_one_report_branding_admin_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'one-to-one-report-branding'
  and (select public.is_arunika_admin())
)
with check (
  bucket_id = 'one-to-one-report-branding'
  and (select public.is_arunika_admin())
);

drop policy if exists one_to_one_report_branding_admin_delete on storage.objects;
create policy one_to_one_report_branding_admin_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'one-to-one-report-branding'
  and (select public.is_arunika_admin())
);

notify pgrst, 'reload schema';

commit;
