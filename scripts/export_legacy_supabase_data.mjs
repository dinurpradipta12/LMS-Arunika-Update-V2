import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const legacyUrl = process.env.LEGACY_SUPABASE_URL?.replace(/\/$/, '');
const legacyAnonKey = process.env.LEGACY_SUPABASE_ANON_KEY;
const skipAnalytics = process.env.SKIP_ANALYTICS === '1';

if (!legacyUrl || !legacyAnonKey) {
  throw new Error('Isi LEGACY_SUPABASE_URL dan LEGACY_SUPABASE_ANON_KEY sebelum menjalankan script.');
}

const projectRoot = process.cwd();
const outputDirectory = path.join(projectRoot, 'supabase', 'new-project');
const privateOutputDirectory = path.join(outputDirectory, 'private');
const pageSize = 1000;

await mkdir(privateOutputDirectory, { recursive: true });

const fetchTable = async (table, order) => {
  const rows = [];
  let offset = 0;

  while (true) {
    const endpoint = new URL(`${legacyUrl}/rest/v1/${table}`);
    endpoint.searchParams.set('select', '*');
    endpoint.searchParams.set('order', order);

    const response = await fetch(endpoint, {
      headers: {
        apikey: legacyAnonKey,
        Authorization: `Bearer ${legacyAnonKey}`,
        Prefer: 'count=exact',
        Range: `${offset}-${offset + pageSize - 1}`,
        'Range-Unit': 'items'
      }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gagal membaca ${table}: HTTP ${response.status} ${body.slice(0, 500)}`);
    }

    const page = await response.json();
    rows.push(...page);
    if (page.length < pageSize) break;
    offset += page.length;
  }

  return rows;
};

const asArray = value => Array.isArray(value) ? value : [];
const asObject = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const asString = value => typeof value === 'string' ? value : '';

const sanitizeFullPath = value => {
  if (typeof value !== 'string') return null;

  return value
    .replace(/([?&])cfg=[^&#]*/gi, (_, separator) => separator === '?' ? '?' : '')
    .replace(/\?&/g, '?')
    .replace(/&&+/g, '&')
    .replace(/[?&](?=#|$)/g, '');
};

const encodeJson = rows => Buffer.from(JSON.stringify(rows), 'utf8').toString('base64');

const sqlBase64Literal = rows => {
  const encoded = encodeJson(rows);
  const pieces = encoded.match(/.{1,4000}/g) || [''];
  return pieces.map(piece => `'${piece}'`).join(' ||\n      ');
};

const chunkRows = (rows, size) => {
  const chunks = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
};

const recordsetCte = (rows, columns) => `with recovered as (\n  select *\n  from jsonb_to_recordset(\n    convert_from(\n      decode(\n        ${sqlBase64Literal(rows)},\n        'base64'\n      ),\n      'UTF8'\n    )::jsonb\n  ) as row(${columns})\n)`;

const courseSql = rows => `${recordsetCte(rows, `
    id text,
    title text,
    description text,
    cover_image text,
    modules jsonb,
    assets jsonb,
    categories jsonb,
    mentor_id text,
    space_type text,
    published boolean,
    created_at timestamptz,
    updated_at timestamptz
  `)}
insert into public.courses (
  id, title, description, cover_image, modules, assets, categories,
  mentor_id, space_type, published, created_at, updated_at
)
select
  id, title, description, cover_image, modules, assets, categories,
  mentor_id, space_type, published, created_at, updated_at
from recovered
on conflict (id) do nothing;
`;

const mentorSql = rows => `${recordsetCte(rows, `
    id text,
    name text,
    role text,
    bio text,
    photo text,
    socials jsonb,
    updated_at timestamptz
  `)}
insert into public.mentor (id, name, role, bio, photo, socials, updated_at)
select id, name, role, bio, photo, socials, updated_at
from recovered
on conflict (id) do update
set
  name = excluded.name,
  role = excluded.role,
  bio = excluded.bio,
  photo = excluded.photo,
  socials = excluded.socials,
  updated_at = excluded.updated_at
where public.mentor.name = ''
  and public.mentor.role = ''
  and public.mentor.bio = ''
  and public.mentor.photo = '';
`;

const brandingSql = rows => `${recordsetCte(rows, `
    id text,
    site_name text,
    logo text,
    favicon text,
    updated_at timestamptz
  `)}
insert into public.branding (id, site_name, logo, favicon, updated_at)
select id, site_name, logo, favicon, updated_at
from recovered
on conflict (id) do update
set
  site_name = excluded.site_name,
  logo = excluded.logo,
  favicon = excluded.favicon,
  updated_at = excluded.updated_at
where public.branding.site_name = 'Platform Arunika'
  and public.branding.logo = ''
  and public.branding.favicon = '';
`;

const eventSql = rows => `${recordsetCte(rows, `
    id uuid,
    event_name text,
    course_id text,
    visitor_id text,
    device_type text,
    user_agent text,
    referrer text,
    source text,
    full_path text,
    created_at timestamptz
  `)}
insert into public.events (
  id, event_name, course_id, visitor_id, device_type,
  user_agent, referrer, source, full_path, created_at
)
select
  id, event_name, course_id, visitor_id, device_type,
  user_agent, referrer, source, full_path, created_at
from recovered
on conflict (id) do nothing;
`;

const [rawCourses, rawMentors, rawBranding, rawEvents] = await Promise.all([
  fetchTable('courses', 'created_at.asc'),
  fetchTable('mentor', 'id.asc'),
  fetchTable('branding', 'id.asc'),
  skipAnalytics ? Promise.resolve([]) : fetchTable('events', 'created_at.asc')
]);

const courses = rawCourses.map(row => ({
  id: asString(row.id),
  title: asString(row.title),
  description: asString(row.description),
  cover_image: asString(row.cover_image),
  modules: asArray(row.modules),
  assets: asArray(row.assets),
  categories: asArray(row.categories),
  mentor_id: asString(row.mentor_id) || 'profile',
  space_type: row.space_type === 'recorded_class' ? 'recorded_class' : 'product_tutorial',
  published: row.published !== false,
  created_at: row.created_at,
  updated_at: row.updated_at
}));

const mentors = rawMentors.map(row => ({
  id: asString(row.id),
  name: asString(row.name),
  role: asString(row.role),
  bio: asString(row.bio),
  photo: asString(row.photo),
  socials: asObject(row.socials),
  updated_at: row.updated_at
}));

const branding = rawBranding.map(row => ({
  id: asString(row.id),
  site_name: asString(row.site_name) || 'Platform Arunika',
  logo: asString(row.logo),
  favicon: asString(row.favicon),
  updated_at: row.updated_at
}));

const events = rawEvents.map(row => ({
  id: row.id,
  event_name: row.event_name,
  course_id: row.course_id,
  visitor_id: row.visitor_id,
  device_type: row.device_type,
  user_agent: row.user_agent,
  referrer: row.referrer,
  source: row.source,
  full_path: sanitizeFullPath(row.full_path),
  created_at: row.created_at
}));

const generatedAt = new Date().toISOString();
const contentStatements = [
  ...chunkRows(courses, 1).map(courseSql),
  ...chunkRows(mentors, 1).map(mentorSql),
  ...chunkRows(branding, 1).map(brandingSql)
];

const contentFile = `-- Arunika LMS - snapshot konten publik dari project lama.\n-- Dibuat ${generatedAt}. Jalankan SETELAH 01_schema.sql.\n-- Isi: ${courses.length} courses, ${mentors.length} mentor, ${branding.length} branding.\n-- Payload memakai base64 agar teks, emoji, dan gambar data-URL tetap utuh.\n\nbegin;\n\n${contentStatements.join('\n')}\ncommit;\n\nselect 'courses' as table_name, count(*) as row_count from public.courses\nunion all\nselect 'mentor', count(*) from public.mentor\nunion all\nselect 'branding', count(*) from public.branding;\n`;

await writeFile(path.join(outputDirectory, '02_recovered_content.sql'), contentFile, 'utf8');

if (!skipAnalytics) {
  const analyticsStatements = chunkRows(events, 100).map(eventSql);
  const analyticsFile = `-- Arunika LMS - snapshot analytics privat dari project lama.\n-- Dibuat ${generatedAt}. Jalankan OPSIONAL setelah 01_schema.sql.\n-- Isi: ${events.length} events. Parameter cfg lama sudah dihapus dari full_path.\n-- File ini diabaikan Git karena berisi visitor ID, user-agent, dan referrer.\n\nbegin;\n\n${analyticsStatements.join('\n')}\ncommit;\n\nselect count(*) as recovered_events from public.events;\n`;

  await writeFile(
    path.join(privateOutputDirectory, '03_recovered_analytics.sql'),
    analyticsFile,
    'utf8'
  );
}

process.stdout.write(
  `Recovery SQL dibuat: ${courses.length} courses, ${mentors.length} mentor, `
  + `${branding.length} branding, ${events.length} events.\n`
);
