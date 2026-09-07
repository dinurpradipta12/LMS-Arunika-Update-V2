import { createClient } from 'npm:@supabase/supabase-js@2';

const allowedOrigins = (Deno.env.get('ARUNIKA_ALLOWED_ORIGINS') || '*')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const getCorsHeaders = (request: Request) => {
  const requestOrigin = request.headers.get('origin') || '';
  const allowOrigin = allowedOrigins.includes('*')
    ? '*'
    : allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : allowedOrigins[0] || 'null';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8'
  };
};

const json = (request: Request, body: Record<string, unknown>, status = 200) => (
  new Response(JSON.stringify(body), {
    status,
    headers: getCorsHeaders(request)
  })
);

const invalidCredentials = async (request: Request) => {
  // Keep unknown usernames and wrong passwords indistinguishable and make
  // cheap alias enumeration less attractive.
  await new Promise(resolve => setTimeout(resolve, 250));
  return json(request, { error: 'invalid_credentials' }, 401);
};

const normalizeUsername = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const username = value.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/.test(username) ? username : null;
};

Deno.serve(async request => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(request) });
  }

  if (request.method !== 'POST') {
    return json(request, { error: 'method_not_allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase Edge Function secrets.');
    return json(request, { error: 'server_configuration_error' }, 500);
  }

  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return invalidCredentials(request);
  }

  const username = normalizeUsername(body.username);
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || password.length < 8 || password.length > 128) {
    return invalidCredentials(request);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });

  const { data: alias, error: aliasError } = await supabaseAdmin
    .from('arunika_admin_login_aliases')
    .select('user_id')
    .eq('username', username)
    .maybeSingle();

  if (aliasError || !alias?.user_id) return invalidCredentials(request);

  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(alias.user_id);
  const email = userData.user?.email;
  if (userError || !email) return invalidCredentials(request);

  const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password
  });

  if (authError || !authData.session) return invalidCredentials(request);

  // Do not return the internal email. The browser receives only the session
  // tokens needed by supabase.auth.setSession().
  return json(request, {
    access_token: authData.session.access_token,
    refresh_token: authData.session.refresh_token,
    expires_in: authData.session.expires_in,
    expires_at: authData.session.expires_at,
    token_type: authData.session.token_type
  });
});
