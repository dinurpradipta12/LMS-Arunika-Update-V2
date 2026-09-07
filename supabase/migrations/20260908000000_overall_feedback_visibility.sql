-- Arunika LMS: pengaturan visibilitas tab feedback keseluruhan per kelas.
-- Default true agar kelas yang sudah ada tetap menampilkan fitur feedback.

begin;

alter table public.courses
  add column if not exists overall_feedback_enabled boolean;

update public.courses
set overall_feedback_enabled = true
where overall_feedback_enabled is null;

alter table public.courses
  alter column overall_feedback_enabled set default true,
  alter column overall_feedback_enabled set not null;

notify pgrst, 'reload schema';

commit;
