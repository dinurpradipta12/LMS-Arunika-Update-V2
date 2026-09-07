-- Arunika LMS: hubungkan satu akun Supabase Auth ke role admin aplikasi.
--
-- SEBELUM MENJALANKAN:
-- 1. Buka Supabase Dashboard > Authentication > Users > Add user.
-- 2. Buat user memakai email dan password admin Anda sendiri.
-- 3. Ganti nilai GANTI_DENGAN_EMAIL_ADMIN di bawah, lalu jalankan seluruh file.
--
-- Password tidak ditulis ke SQL maupun source aplikasi.

do $$
declare
  target_email constant text := 'GANTI_DENGAN_EMAIL_ADMIN';
  target_user_id uuid;
begin
  if target_email = 'GANTI_DENGAN_EMAIL_ADMIN' then
    raise exception 'Ganti GANTI_DENGAN_EMAIL_ADMIN sebelum menjalankan SQL ini';
  end if;

  select id
  into target_user_id
  from auth.users
  where lower(email) = lower(trim(target_email))
  order by created_at asc
  limit 1;

  if target_user_id is null then
    raise exception 'User Auth dengan email % tidak ditemukan', target_email;
  end if;

  insert into private.arunika_admins (user_id)
  values (target_user_id)
  on conflict (user_id) do nothing;
end
$$;

-- Hasil harus menampilkan email admin yang baru diizinkan.
select
  auth_user.id as user_id,
  auth_user.email,
  admin.created_at as admin_since
from private.arunika_admins as admin
join auth.users as auth_user on auth_user.id = admin.user_id
order by admin.created_at;
