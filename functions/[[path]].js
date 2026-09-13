const DEFAULT_SUPABASE_URL = 'https://drezwxfgykkdnnwjrnnt.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZXp3eGZneWtrZG5ud2pybm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NTUwNTksImV4cCI6MjEwNDMzMTA1OX0.nZ3OGNXEFN82CqA1-KXUQ9IWvhp7Gl0U1xyUVjKcdFY';

const PUBLIC_KINDS = new Set(['landing', 'form', 'qna']);
const NOT_FOUND_DESCRIPTION = 'Halaman yang Anda tuju tidak diberikan akses atau tidak ditemukan.';

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const cleanText = (value, fallback = '') => String(value || '').replace(/\s+/g, ' ').trim() || fallback;

const truncate = (value, limit = 240) => {
  const text = cleanText(value);
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
};

const getPublicRoute = (request) => {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const kind = segments[0];
  if (!PUBLIC_KINDS.has(kind)) return null;

  let slug = '';
  if (segments[1]) {
    try {
      slug = decodeURIComponent(segments[1]);
    } catch {
      slug = segments[1];
    }
  }

  return { kind, slug, action: segments[2] === 'og-image' ? 'image' : 'page', url };
};

const getSupabaseConfig = (env) => ({
  url: String(env.PUBLIC_SUPABASE_URL || env.VITE_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, ''),
  anonKey: String(env.PUBLIC_SUPABASE_ANON_KEY || env.VITE_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY)
});

const callPublicRpc = async (env, functionName, parameters) => {
  const { url, anonKey } = getSupabaseConfig(env);
  const response = await fetch(`${url}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(parameters)
  });

  if (!response.ok) return null;
  return response.json();
};

const parseJson = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getLandingImage = (row) => {
  const blocks = parseJson(row?.blocks);
  for (const block of blocks) {
    const data = block?.data || {};
    if (data.imageUrl) return data.imageUrl;
    if (block?.type === 'image') {
      const firstImage = parseJson(data.images).find((item) => item?.url);
      if (firstImage?.url) return firstImage.url;
    }
  }
  return '';
};

const getPublicImage = (kind, row) => {
  if (kind === 'landing') return getLandingImage(row);
  return row?.headerImage || '';
};

const getLandingDescription = (row) => {
  const description = cleanText(row?.description);
  if (description) return description;
  const heroBlock = parseJson(row?.blocks).find((block) => block?.type === 'hero');
  return cleanText(heroBlock?.data?.body);
};

const getPublicRow = async (env, route) => {
  if (route.kind === 'landing') {
    return callPublicRpc(env, 'get_public_landing_page', { p_slug: route.slug });
  }
  if (route.kind === 'form') {
    return callPublicRpc(env, 'get_public_form', { p_slug: route.slug });
  }
  return callPublicRpc(env, 'get_public_qna_session', { p_slug: route.slug, p_presenter_token: '' });
};

const isDataImage = (value) => /^data:image\//i.test(String(value || '').trim());

const getImageProxyUrl = (route) => {
  const url = new URL(`/${route.kind}/${encodeURIComponent(route.slug)}/og-image`, route.url);
  url.search = '';
  url.hash = '';
  return url.toString();
};

const decodeDataImage = (value) => {
  const raw = String(value || '').trim();
  const match = raw.match(/^data:([^;,]+)(;base64)?,([\s\S]*)$/i);
  if (!match || !match[1].toLowerCase().startsWith('image/')) return null;

  try {
    if (match[2]) {
      const binary = atob(match[3].replace(/\s/g, ''));
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      return { contentType: match[1], bytes };
    }
    return { contentType: match[1], bytes: new TextEncoder().encode(decodeURIComponent(match[3])) };
  } catch {
    return null;
  }
};

const getImageResponse = async (env, route) => {
  try {
    const row = await getPublicRow(env, route);
    if (!row) return new Response(null, { status: 404 });
    const image = decodeDataImage(getPublicImage(route.kind, row));
    if (!image) return new Response(null, { status: 404 });
    return new Response(image.bytes, {
      status: 200,
      headers: {
        'content-type': image.contentType,
        'cache-control': 'public, max-age=300, s-maxage=300',
        'x-content-type-options': 'nosniff'
      }
    });
  } catch {
    return new Response(null, { status: 404 });
  }
};

const toPublicAssetUrl = (value, requestUrl) => {
  const raw = cleanText(value);
  if (!raw || raw.startsWith('data:') || raw.startsWith('blob:')) return '';
  try {
    const assetUrl = new URL(raw, requestUrl);
    return assetUrl.protocol === 'http:' || assetUrl.protocol === 'https:' ? assetUrl.toString() : '';
  } catch {
    return '';
  }
};

const getMetadata = async (env, route) => {
  if (!route.slug) {
    return {
      title: 'Halaman tidak tersedia | Arunika',
      description: NOT_FOUND_DESCRIPTION,
      image: ''
    };
  }

  try {
    if (route.kind === 'landing') {
      const row = await getPublicRow(env, route);
      const image = getPublicImage(route.kind, row);
      return row ? {
        title: cleanText(row.title, 'Landing Page'),
        description: truncate(getLandingDescription(row), 300),
        image,
        imageProxyUrl: isDataImage(image) ? getImageProxyUrl(route) : ''
      } : null;
    }

    if (route.kind === 'form') {
      const row = await getPublicRow(env, route);
      const image = getPublicImage(route.kind, row);
      return row ? {
        title: cleanText(row.title, 'Form Maker'),
        description: truncate(row.description || row.eventName, 300),
        image,
        imageProxyUrl: isDataImage(image) ? getImageProxyUrl(route) : ''
      } : null;
    }

    const row = await getPublicRow(env, route);
    const image = getPublicImage(route.kind, row);
    return row ? {
      title: cleanText(row.title, 'Q&A Audience'),
      description: truncate(row.description || row.eventName || row.welcomeMessage, 300),
      image,
      imageProxyUrl: isDataImage(image) ? getImageProxyUrl(route) : ''
    } : null;
  } catch {
    return null;
  }
};

const injectMetadata = (html, metadata, pageUrl) => {
  const title = escapeHtml(metadata.title);
  const description = escapeHtml(metadata.description || '');
  const image = toPublicAssetUrl(metadata.image, pageUrl) || toPublicAssetUrl(metadata.imageProxyUrl, pageUrl);
  const imageTags = image
    ? `\n    <meta property="og:image" content="${escapeHtml(image)}" />\n    <meta property="og:image:alt" content="${title}" />\n    <meta name="twitter:image" content="${escapeHtml(image)}" />`
    : '';
  const tags = `
    <meta name="description" content="${description}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta property="og:site_name" content="Arunika" />
    <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />${imageTags}
    <link rel="canonical" href="${escapeHtml(pageUrl)}" />`;

  return html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
    .replace(/<\/head>/i, `${tags}\n  </head>`);
};

export async function onRequest(context) {
  if (context.request.method !== 'GET' && context.request.method !== 'HEAD') return context.next();

  const route = getPublicRoute(context.request);
  if (!route) return context.next();

  if (route.action === 'image') return getImageResponse(context.env, route);

  const metadata = await getMetadata(context.env, route);
  const fallbackMetadata = metadata || {
    title: 'Halaman tidak tersedia | Arunika',
    description: NOT_FOUND_DESCRIPTION,
    image: ''
  };

  const assetResponse = context.env.ASSETS
    ? await context.env.ASSETS.fetch(new URL('/', context.request.url))
    : await context.next();
  if (!assetResponse.ok) return assetResponse;

  const html = injectMetadata(await assetResponse.text(), fallbackMetadata, route.url.toString());
  return new Response(context.request.method === 'HEAD' ? null : html, {
    status: assetResponse.status,
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300'
    }
  });
}
