-- Arunika LMS: username login untuk admin melalui Edge Function.
-- Email Supabase Auth tetap menjadi identitas internal dan tidak dikirim ke client
-- pada proses resolusi username.

begin;

create table if not exists public.arunika_admin_login_aliases (
  username text primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint arunika_admin_login_aliases_username_check
    check (username ~ '^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$')
);

alter table public.arunika_admin_login_aliases enable row level security;

-- Alias admin tidak boleh dibaca atau diubah melalui Data API oleh browser.
revoke all on public.arunika_admin_login_aliases
from public, anon, authenticated;

-- Hanya Edge Function dengan service role yang membaca alias ini.
grant select on public.arunika_admin_login_aliases to service_role;

commit;

select
  username,
  user_id,
  created_at
from public.arunika_admin_login_aliases
order by username;
