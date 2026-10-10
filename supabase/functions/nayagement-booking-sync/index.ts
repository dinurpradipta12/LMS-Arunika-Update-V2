import { createClient } from 'npm:@supabase/supabase-js@2';

type SyncPayload = {
  source?: unknown;
  workspaceId?: unknown;
  bookingId?: unknown;
  name?: unknown;
  email?: unknown;
  whatsapp?: unknown;
  topic?: unknown;
  details?: unknown;
  status?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  updatedAt?: unknown;
};

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  }
});

const isUuid = (value: unknown): value is string => typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const readText = (value: unknown, maxLength: number) => (
  typeof value === 'string' && value.length <= maxLength ? value : null
);

const isTimestamp = (value: unknown): value is string => typeof value === 'string'
  && value.length <= 64
  && Number.isFinite(Date.parse(value));

const toHex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer), item => item.toString(16).padStart(2, '0')).join('');

const hmacHex = async (secret: string, value: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
};

const secureEqual = (first: string, second: string) => {
  if (first.length !== second.length) return false;
  let difference = 0;
  for (let index = 0; index < first.length; index += 1) {
    difference |= first.charCodeAt(index) ^ second.charCodeAt(index);
  }
  return difference === 0;
};

Deno.serve(async request => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const syncSecret = Deno.env.get('NAYAGEMENT_SYNC_SECRET') || '';
  if (!supabaseUrl || !serviceRoleKey || !syncSecret) {
    console.error('Nayagement booking sync is missing required server secrets.');
    return json({ error: 'server_configuration_error' }, 500);
  }

  const timestamp = request.headers.get('x-nayagement-timestamp') || '';
  const signature = request.headers.get('x-nayagement-signature') || '';
  const timestampSeconds = Number(timestamp);
  if (!/^\d{10}$/.test(timestamp) || !Number.isFinite(timestampSeconds)
    || Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) > 300) {
    return json({ error: 'unauthorized' }, 401);
  }

  const rawBody = await request.text();
  if (!rawBody || rawBody.length > 32_000) return json({ error: 'invalid_payload' }, 400);
  const expectedSignature = await hmacHex(syncSecret, `${timestamp}.${rawBody}`);
  if (!signature || !secureEqual(signature.toLowerCase(), expectedSignature)) {
    return json({ error: 'unauthorized' }, 401);
  }

  let payload: SyncPayload;
  try {
    payload = JSON.parse(rawBody) as SyncPayload;
  } catch {
    return json({ error: 'invalid_payload' }, 400);
  }

  const workspaceId = readText(payload.workspaceId, 36);
  const bookingId = readText(payload.bookingId, 36);
  const name = readText(payload.name, 160);
  const email = readText(payload.email, 320);
  const whatsapp = readText(payload.whatsapp, 80);
  const topic = readText(payload.topic, 240);
  const details = readText(payload.details, 10_000);
  const status = readText(payload.status, 16)?.toLowerCase();
  const startsAt = readText(payload.startsAt, 64);
  const endsAt = readText(payload.endsAt, 64);
  const updatedAt = readText(payload.updatedAt, 64);

  if (payload.source !== 'nayagement'
    || !isUuid(workspaceId)
    || !isUuid(bookingId)
    || !name || !topic || email === null || whatsapp === null || details === null
    || !['new', 'confirmed', 'completed', 'cancelled'].includes(status || '')
    || !isTimestamp(startsAt) || !isTimestamp(endsAt) || !isTimestamp(updatedAt)
    || Date.parse(endsAt) <= Date.parse(startsAt)) {
    return json({ error: 'invalid_payload' }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });
  const { data, error } = await supabase.rpc('sync_nayagement_one_to_one_booking', {
    p_workspace_id: workspaceId,
    p_booking_id: bookingId,
    p_name: name,
    p_email: email,
    p_whatsapp: whatsapp,
    p_topic: topic,
    p_details: details,
    p_status: status,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_source_updated_at: updatedAt
  });

  if (error) {
    const errorCode = error.message === 'SYNC_CONNECTION_NOT_CONFIGURED'
      ? 'sync_connection_not_configured'
      : 'sync_failed';
    console.error(`Nayagement booking sync failed: ${error.code || 'unknown'} ${errorCode}`);
    return json({ error: errorCode }, errorCode === 'sync_connection_not_configured' ? 409 : 422);
  }

  return json({ ok: true, sync: data || null });
});
