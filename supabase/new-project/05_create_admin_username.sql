-- Hubungkan username login dengan user Supabase Auth yang sudah dibuat.
-- Jalankan setelah:
-- 1. SQL 1 keamanan/RLS selesai.
-- 2. User dibuat di Authentication > Users.
-- 3. Migration 20260907020000_admin_username_login.sql selesai.
--
-- Ganti email di bawah. Password tidak ditulis ke SQL.

do $$
declare
  target_username constant text := 'arunika';
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

  insert into public.arunika_admin_login_aliases (username, user_id)
  values (target_username, target_user_id)
  on conflict (username) do update
    set user_id = excluded.user_id;
end
$$;

select
  alias.username,
  auth_user.id as user_id,
  auth_user.email
from public.arunika_admin_login_aliases as alias
join auth.users as auth_user
  on auth_user.id = alias.user_id
where alias.username = 'arunika';
