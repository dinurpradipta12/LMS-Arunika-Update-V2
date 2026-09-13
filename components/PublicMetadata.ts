export type PublicMetadataType = 'website' | 'article';

export type PublicMetadata = {
  title: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  type?: PublicMetadataType;
  url?: string;
};

const DEFAULT_TITLE = 'Arunika Learning Hub';
const DEFAULT_DESCRIPTION = 'Konten publik Arunika untuk belajar, mendaftar, dan mengikuti sesi bersama.';

const upsertMeta = (attribute: 'name' | 'property', key: string, content: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

const removeMeta = (attribute: 'name' | 'property', key: string) => {
  document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)?.remove();
};

const toAbsoluteUrl = (value: string | undefined) => {
  const candidate = String(value || '').trim();
  if (!candidate || candidate.startsWith('data:') || candidate.startsWith('blob:')) return '';
  try {
    return new URL(candidate, window.location.origin).toString();
  } catch {
    return '';
  }
};

const updateCanonicalUrl = (url: string) => {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = url;
};

export const setPublicMetadata = ({ title, description, image, imageAlt, type = 'website', url }: PublicMetadata) => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const safeTitle = String(title || '').trim() || DEFAULT_TITLE;
  const safeDescription = String(description || '').trim() || DEFAULT_DESCRIPTION;
  const pageUrl = toAbsoluteUrl(url) || window.location.href;
  const imageUrl = toAbsoluteUrl(image);
  const safeImageAlt = String(imageAlt || '').trim() || safeTitle;

  document.title = safeTitle;
  upsertMeta('name', 'description', safeDescription);
  upsertMeta('property', 'og:title', safeTitle);
  upsertMeta('property', 'og:description', safeDescription);
  upsertMeta('property', 'og:type', type);
  upsertMeta('property', 'og:url', pageUrl);
  upsertMeta('property', 'og:site_name', 'Arunika');
  upsertMeta('name', 'twitter:title', safeTitle);
  upsertMeta('name', 'twitter:description', safeDescription);
  upsertMeta('name', 'twitter:card', imageUrl ? 'summary_large_image' : 'summary');

  if (imageUrl) {
    upsertMeta('property', 'og:image', imageUrl);
    upsertMeta('property', 'og:image:alt', safeImageAlt);
    upsertMeta('name', 'twitter:image', imageUrl);
    upsertMeta('name', 'twitter:image:alt', safeImageAlt);
  } else {
    removeMeta('property', 'og:image');
    removeMeta('property', 'og:image:alt');
    removeMeta('name', 'twitter:image');
    removeMeta('name', 'twitter:image:alt');
  }

  updateCanonicalUrl(pageUrl);
};
