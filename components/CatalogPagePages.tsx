import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  GripVertical,
  ImagePlus,
  LayoutGrid,
  Link as LinkIcon,
  Loader2,
  Palette,
  Package,
  Plus,
  Save,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Upload,
  X,
  XCircle
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { CatalogBenefit, CatalogContent, CatalogPage, CatalogPageItem, CatalogPageStatus, CatalogProductLayout, CatalogSocialLink, FormThemeKey } from '../types';
import { Badge, Button, Card, ConfirmModal, Input, Textarea } from './UI';
import { FORM_THEME_OPTIONS, formThemeStyle } from './FormMakerPages';
import { getPublicBaseUrl, setPublicMetadata } from './PublicMetadata';
import logoUtama from '../src/logo-utama.png';

export const CATALOG_PAGE_SPACE_LABEL = 'Katalog Produk';
export const CATALOG_PAGE_PUBLIC_LABEL = 'Arunika Katalog Produk';

type Notice = { tone: 'success' | 'error'; message: string };
type LandingOption = { id: string; slug: string; title: string; description: string; blocks: any[] };

const asText = (value: unknown, fallback = '') => typeof value === 'string' ? value : value == null ? fallback : String(value);

const slugify = (value: string) => value
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 100) || `catalog-${Date.now()}`;

const isTheme = (value: unknown): value is FormThemeKey => FORM_THEME_OPTIONS.some(option => option.value === value);
const isCatalogProductLayout = (value: unknown): value is CatalogProductLayout => value === 'default' || value === 'grid' || value === 'large-image' || value === 'compact';

const normalizeCustomDomain = (value: unknown) => {
  let raw = asText(value).trim().toLowerCase();
  if (!raw) return '';
  try {
    const parsed = new URL(raw.includes('://') ? raw : `https://${raw}`);
    raw = parsed.hostname.toLowerCase();
  } catch {
    raw = raw.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  }
  return raw.replace(/^www\./, '').replace(/\.$/, '');
};

const isValidCustomDomain = (value: unknown) => {
  const domain = normalizeCustomDomain(value);
  return !domain || (domain.length <= 253 && domain.includes('.') && !domain.includes('..') && /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(domain));
};

const normalizeSocialLinks = (value: unknown): CatalogSocialLink[] => {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).map((item, index) => ({
    id: asText(item?.id, `social-link-${Date.now()}-${index}`),
    label: asText(item?.label),
    url: asText(item?.url)
  })).filter(item => item.label || item.url);
};

const normalizeCatalogBenefits = (value: unknown): CatalogBenefit[] => {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 6).map((item, index) => ({
    id: asText(item?.id, `catalog-benefit-${Date.now()}-${index}`),
    title: asText(item?.title),
    description: asText(item?.description)
  })).filter(item => item.title || item.description);
};

const emptyCatalogContent = (): CatalogContent => ({
  productLayout: 'default',
  announcement: '',
  heroEyebrow: '',
  heroTitle: '',
  heroDescription: '',
  heroImageUrl: '',
  heroImageAlt: 'Visual katalog produk',
  heroCtaLabel: '',
  heroCtaUrl: '',
  benefitsHeading: 'Kenapa memilih produk ini?',
  benefits: []
});

const createDefaultCatalogContent = (): CatalogContent => ({
  productLayout: 'default',
  announcement: 'Produk digital siap dipakai',
  heroEyebrow: 'KOLEKSI PRODUK DIGITAL',
  heroTitle: 'Temukan resource untuk bekerja lebih cerdas',
  heroDescription: 'Template, panduan, dan resource praktis untuk membantu Anda bergerak lebih cepat.',
  heroImageUrl: '',
  heroImageAlt: 'Koleksi produk digital',
  heroCtaLabel: 'Lihat koleksi',
  heroCtaUrl: '#catalog-products',
  benefitsHeading: 'Belanja digital dengan lebih mudah',
  benefits: [
    { id: 'catalog-benefit-default-1', title: 'Siap digunakan', description: 'Pilih resource yang sesuai lalu akses detailnya dalam satu klik.' },
    { id: 'catalog-benefit-default-2', title: 'Dibuat praktis', description: 'Produk digital yang ringkas, jelas, dan mudah disesuaikan.' },
    { id: 'catalog-benefit-default-3', title: 'Dukungan berkelanjutan', description: 'Dapatkan panduan dan bantuan setelah pembelian.' }
  ]
});

const normalizeCatalogContent = (value: unknown): CatalogContent => {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
  const fallback = emptyCatalogContent();
  const requestedLayout = [raw.productLayout, raw.product_layout, raw.layout].find(isCatalogProductLayout);
  return {
    productLayout: requestedLayout || fallback.productLayout,
    announcement: asText(raw.announcement),
    heroEyebrow: asText(raw.heroEyebrow),
    heroTitle: asText(raw.heroTitle),
    heroDescription: asText(raw.heroDescription),
    heroImageUrl: asText(raw.heroImageUrl || raw.hero_image_url),
    heroImageAlt: asText(raw.heroImageAlt || raw.hero_image_alt, fallback.heroImageAlt),
    heroCtaLabel: asText(raw.heroCtaLabel || raw.hero_cta_label),
    heroCtaUrl: asText(raw.heroCtaUrl || raw.hero_cta_url),
    benefitsHeading: asText(raw.benefitsHeading || raw.benefits_heading, fallback.benefitsHeading),
    benefits: normalizeCatalogBenefits(raw.benefits)
  };
};

const safeExternalHref = (value: unknown) => {
  let raw = asText(value).trim();
  if (!raw) return '';
  if (!/^(https?:\/\/|mailto:|tel:)/i.test(raw) && /^[^\s/]+\.[^\s/]+/.test(raw)) raw = `https://${raw}`;
  if (!/^(https?:\/\/|mailto:|tel:)/i.test(raw)) return '';
  try {
    const parsed = new URL(raw);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol) ? parsed.toString() : '';
  } catch {
    return '';
  }
};

const CATALOG_STATUS_OPTIONS: Array<{ value: CatalogPageStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Publik' },
  { value: 'archived', label: 'Arsip' }
];

const statusLabel = (status: CatalogPageStatus) => CATALOG_STATUS_OPTIONS.find(option => option.value === status)?.label || 'Draft';

const CATALOG_LAYOUT_OPTIONS: Array<{ value: CatalogProductLayout; label: string; description: string }> = [
  { value: 'default', label: 'Default', description: 'Kartu standar satu kolom.' },
  { value: 'grid', label: 'Grid', description: 'Kartu rapat dua kolom.' },
  { value: 'large-image', label: 'Large Image', description: 'Visual produk lebih dominan.' },
  { value: 'compact', label: 'Compact', description: 'Baris ringkas untuk banyak produk.' }
];

const CatalogLayoutPreview: React.FC<{ layout: CatalogProductLayout }> = ({ layout }) => {
  if (layout === 'grid') return <div className="grid h-full grid-cols-2 gap-1.5"><span className="rounded bg-[var(--accent-soft)]" /><span className="rounded bg-[var(--accent-soft)]" /><span className="rounded bg-[var(--accent-soft)]" /><span className="rounded bg-[var(--accent-soft)]" /></div>;
  if (layout === 'large-image') return <div className="flex h-full flex-col gap-1.5"><span className="h-10 rounded bg-[var(--accent-soft)]" /><span className="h-2 w-3/4 rounded bg-[var(--border-strong)]" /><span className="h-2 w-1/2 rounded bg-[var(--border)]" /></div>;
  if (layout === 'compact') return <div className="space-y-1.5"><span className="flex h-5 items-center gap-1.5 rounded bg-[var(--accent-soft)] p-1"><span className="h-3 w-5 rounded bg-[var(--border-strong)]" /><span className="h-1.5 flex-1 rounded bg-[var(--border-strong)]" /></span><span className="flex h-5 items-center gap-1.5 rounded bg-[var(--accent-soft)] p-1"><span className="h-3 w-5 rounded bg-[var(--border-strong)]" /><span className="h-1.5 flex-1 rounded bg-[var(--border-strong)]" /></span><span className="flex h-5 items-center gap-1.5 rounded bg-[var(--accent-soft)] p-1"><span className="h-3 w-5 rounded bg-[var(--border-strong)]" /><span className="h-1.5 flex-1 rounded bg-[var(--border-strong)]" /></span></div>;
  return <div className="space-y-1.5"><span className="flex h-5 items-center gap-1.5 rounded bg-[var(--accent-soft)] p-1"><span className="h-3 w-8 rounded bg-[var(--border-strong)]" /><span className="h-1.5 flex-1 rounded bg-[var(--border-strong)]" /></span><span className="flex h-5 items-center gap-1.5 rounded bg-[var(--accent-soft)] p-1"><span className="h-3 w-8 rounded bg-[var(--border-strong)]" /><span className="h-1.5 flex-1 rounded bg-[var(--border-strong)]" /></span><span className="flex h-5 items-center gap-1.5 rounded bg-[var(--accent-soft)] p-1"><span className="h-3 w-8 rounded bg-[var(--border-strong)]" /><span className="h-1.5 flex-1 rounded bg-[var(--border-strong)]" /></span></div>;
};

const getLandingPreviewImage = (landing: LandingOption | any) => {
  const blocks = Array.isArray(landing?.blocks) ? landing.blocks : [];
  for (const block of blocks) {
    const data = block?.data || {};
    const direct = asText(data.imageUrl).trim();
    if (direct) return direct;
    if (block?.type === 'image') {
      const images = Array.isArray(data.images) ? data.images : [];
      const first = images.find((item: any) => asText(item?.url).trim());
      if (first) return asText(first.url).trim();
    }
  }
  return '';
};

const normalizeItem = (value: any, index: number): CatalogPageItem => ({
  id: asText(value?.id, `catalog-item-${Date.now()}-${index}`),
  landingPageId: asText(value?.landingPageId || value?.landing_page_id),
  slug: asText(value?.slug),
  title: asText(value?.title),
  description: asText(value?.description),
  imageUrl: asText(value?.imageUrl || value?.image_url),
  imageAlt: asText(value?.imageAlt || value?.image_alt),
  buttonLabel: asText(value?.buttonLabel || value?.button_label, 'Lihat produk'),
  category: asText(value?.category),
  format: asText(value?.format),
  badge: asText(value?.badge),
  price: asText(value?.price),
  compareAtPrice: asText(value?.compareAtPrice || value?.compare_at_price),
  featured: value?.featured === true || value?.featured === 'true'
});

const mapCatalogRow = (row: any): CatalogPage => ({
  id: asText(row?.id),
  slug: asText(row?.slug),
  title: asText(row?.title, 'Katalog Produk'),
  description: asText(row?.description),
  theme: isTheme(row?.theme) ? row.theme : 'navy',
  status: row?.status === 'published' || row?.status === 'archived' ? row.status : 'draft',
  avatarUrl: asText(row?.avatar_url || row?.avatarUrl),
  customDomain: normalizeCustomDomain(row?.custom_domain || row?.customDomain),
  socialLinks: normalizeSocialLinks(row?.social_links || row?.socialLinks),
  content: normalizeCatalogContent(row?.content || row?.catalog_content),
  items: Array.isArray(row?.items) ? row.items.map(normalizeItem).filter((item: CatalogPageItem) => item.landingPageId) : [],
  createdAt: row?.created_at ?? row?.createdAt,
  updatedAt: row?.updated_at ?? row?.updatedAt
});

const createDefaultCatalogPage = (): CatalogPage => ({
  id: '',
  slug: `catalog-${Date.now()}`,
  title: 'Katalog Produk',
  description: 'Pilih produk yang ingin Anda lihat.',
  theme: 'navy',
  status: 'draft',
  avatarUrl: '',
  customDomain: '',
  socialLinks: [],
  content: createDefaultCatalogContent(),
  items: []
});

const catalogWriteRow = (page: CatalogPage) => ({
  ...(page.id ? { id: page.id } : {}),
  slug: page.slug,
  title: page.title,
  description: page.description,
  theme: page.theme,
  status: page.status,
  avatar_url: page.avatarUrl || '',
  custom_domain: normalizeCustomDomain(page.customDomain),
  social_links: page.socialLinks.map(link => ({ id: link.id, label: link.label, url: link.url })),
  content: {
    productLayout: page.content.productLayout,
    announcement: page.content.announcement || '',
    heroEyebrow: page.content.heroEyebrow || '',
    heroTitle: page.content.heroTitle || '',
    heroDescription: page.content.heroDescription || '',
    heroImageUrl: page.content.heroImageUrl || '',
    heroImageAlt: page.content.heroImageAlt || 'Visual katalog produk',
    heroCtaLabel: page.content.heroCtaLabel || '',
    heroCtaUrl: page.content.heroCtaUrl || '',
    benefitsHeading: page.content.benefitsHeading || 'Kenapa memilih produk ini?',
    benefits: page.content.benefits.map(benefit => ({ id: benefit.id, title: benefit.title || '', description: benefit.description || '' }))
  },
  items: page.items.map((item, index) => ({
    id: item.id,
    landingPageId: item.landingPageId,
    title: item.title || '',
    description: item.description || '',
    imageUrl: item.imageUrl || '',
    imageAlt: item.imageAlt || '',
    buttonLabel: item.buttonLabel || 'Lihat produk',
    category: item.category || '',
    format: item.format || '',
    badge: item.badge || '',
    price: item.price || '',
    compareAtPrice: item.compareAtPrice || '',
    featured: item.featured === true,
    position: index
  })),
  updated_at: new Date().toISOString()
});

const createCatalogShareLink = (slug: string, updatedAt?: string, customDomain?: string) => {
  const domain = normalizeCustomDomain(customDomain);
  const url = new URL(domain ? `https://${domain}` : getPublicBaseUrl());
  url.pathname = domain ? '/' : `/catalog/${encodeURIComponent(slug)}`;
  const version = updatedAt ? Date.parse(updatedAt) : NaN;
  if (Number.isFinite(version)) url.searchParams.set('v', String(version));
  return url.toString();
};

const landingHref = (slug: string) => {
  const url = new URL(getPublicBaseUrl());
  url.pathname = `/landing/${encodeURIComponent(slug)}`;
  return url.toString();
};

const errorMessage = (error: any) => {
  const message = asText(error?.message || error, 'Terjadi kesalahan.');
  if (message.includes('duplicate key') && message.includes('slug')) return 'Slug katalog sudah digunakan. Pilih slug yang berbeda.';
  if (message.includes('custom_domain') || message.includes('catalog_pages_custom_domain')) return 'Domain custom sudah dipakai katalog lain atau format domain belum valid.';
  if (message.includes('catalog_pages') || message.includes('get_public_catalog_page')) return 'Database katalog belum siap. Jalankan migration Catalog Hub terbaru.';
  return message;
};

const NoticeBanner: React.FC<{ notice: Notice | null }> = ({ notice }) => notice ? (
  <div className={`rounded-xl border p-4 text-sm ${notice.tone === 'success' ? 'border-[var(--border)] bg-[var(--success-soft)] text-[var(--success-text)]' : 'border-[var(--border)] bg-[var(--danger-soft)] text-[var(--danger-text)]'}`}>
    {notice.message}
  </div>
) : null;

const CatalogPageCard: React.FC<{
  page: CatalogPage;
  copied: boolean;
  onCopy: (page: CatalogPage) => void | Promise<void>;
  onDelete: (page: CatalogPage) => void;
}> = ({ page, copied, onCopy, onDelete }) => (
  <Card className="flex h-full flex-col gap-5">
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
          {page.avatarUrl || page.content.heroImageUrl ? <img src={page.avatarUrl || page.content.heroImageUrl} alt="" className="h-full w-full object-cover" /> : <LayoutGrid size={20} />}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color={page.status === 'published' ? 'var(--success-soft)' : 'var(--surface-soft)'}>{statusLabel(page.status)}</Badge>
            <Badge color="var(--surface-soft)">KATALOG</Badge>
          </div>
          <h2 className="mt-3 truncate text-lg font-bold text-[var(--text)]">{page.title}</h2>
        </div>
      </div>
      <Palette size={18} className="shrink-0 text-[var(--muted)]" />
    </div>
    <p className="break-all text-sm text-[var(--muted)]">{page.customDomain ? `https://${page.customDomain}` : `/catalog/${page.slug}`}</p>
    <p className="line-clamp-2 min-h-10 text-sm leading-relaxed text-[var(--muted)]">{page.description || 'Belum ada deskripsi katalog.'}</p>
    <div className="grid grid-cols-2 gap-3 text-xs text-[var(--muted)]">
      <span>{page.items.length} produk</span>
      <span className="text-right">Tema {FORM_THEME_OPTIONS.find(option => option.value === page.theme)?.label || 'Navy'}</span>
    </div>
    <div className="mt-auto grid grid-cols-2 gap-2">
      <Link to={`/admin/catalog-pages/${page.id}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface-soft)]">Edit katalog</Link>
      <button type="button" onClick={() => void onCopy(page)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface-soft)]">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Tersalin' : 'Salin link'}</button>
      <a href={page.status === 'published' ? createCatalogShareLink(page.slug, page.updatedAt, page.customDomain) : undefined} target="_blank" rel="noreferrer" className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${page.status === 'published' ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]' : 'cursor-not-allowed bg-[var(--surface-soft)] text-[var(--muted)]'}`} onClick={event => { if (page.status !== 'published') event.preventDefault(); }}>{page.status === 'published' ? 'Buka publik' : 'Belum publik'}{page.status === 'published' && <ExternalLink size={15} />}</a>
      <button type="button" onClick={() => onDelete(page)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--danger-text)] px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"><Trash2 size={15} />Hapus</button>
    </div>
  </Card>
);

export const CatalogPagesPage: React.FC<{ client: any }> = ({ client }) => {
  const navigate = useNavigate();
  const [pages, setPages] = useState<CatalogPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogPage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPages = useCallback(async () => {
    if (!client) {
      setLoadError('Koneksi admin belum tersedia.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await client.from('catalog_pages').select('*').order('created_at', { ascending: false });
    if (error) {
      setLoadError(errorMessage(error));
      setPages([]);
    } else {
      setLoadError(null);
      setPages((data || []).map(mapCatalogRow));
    }
    setIsLoading(false);
  }, [client]);

  useEffect(() => { void fetchPages(); }, [fetchPages]);

  const handleCreate = async () => {
    if (!client) return;
    setIsCreating(true);
    const draft = createDefaultCatalogPage();
    const { data, error } = await client.from('catalog_pages').insert(catalogWriteRow(draft)).select('*').single();
    if (error) setNotice({ tone: 'error', message: errorMessage(error) });
    else if (data) navigate(`/admin/catalog-pages/${data.id}`);
    setIsCreating(false);
  };

  const handleCopy = async (page: CatalogPage) => {
    const url = createCatalogShareLink(page.slug, page.updatedAt, page.customDomain);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(page.slug);
      window.setTimeout(() => setCopiedSlug(current => current === page.slug ? null : current), 2000);
    } catch {
      setNotice({ tone: 'error', message: `Link katalog: ${url}` });
    }
  };

  const handleDelete = async () => {
    if (!client || !deleteTarget) return;
    setIsDeleting(true);
    const target = deleteTarget;
    const { data, error } = await client.from('catalog_pages').delete().eq('id', target.id).select('id');
    if (error) setNotice({ tone: 'error', message: errorMessage(error) });
    else if (!data?.length) setNotice({ tone: 'error', message: 'Katalog tidak ditemukan atau sudah dihapus.' });
    else {
      setPages(current => current.filter(page => page.id !== target.id));
      setDeleteTarget(null);
      setNotice({ tone: 'success', message: `Katalog “${target.title}” berhasil dihapus.` });
    }
    setIsDeleting(false);
  };

  return (
    <main className="mx-auto w-full max-w-[1320px] space-y-7 p-4 pb-24 md:p-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <Link to="/admin" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent-strong)]"><ArrowLeft size={14} /> Semua Space</Link>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{CATALOG_PAGE_SPACE_LABEL}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Katalog Produk</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">Kumpulkan beberapa landing page dalam satu link seperti Lynk.id, lalu arahkan pengunjung ke produk yang mereka pilih.</p>
        </div>
        <Button icon={Plus} onClick={() => void handleCreate()} isLoading={isCreating}>Buat katalog</Button>
      </div>
      <NoticeBanner notice={notice} />
      {loadError && <Card className="space-y-3 border-[var(--danger-text)]"><p className="text-sm text-[var(--danger-text)]">{loadError}</p><Button variant="secondary" onClick={() => void fetchPages()}>Coba lagi</Button></Card>}
      {isLoading ? <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-[var(--muted)]"><Loader2 size={18} className="animate-spin" /> Memuat katalog...</div> : pages.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{pages.map(page => <CatalogPageCard key={page.id} page={page} copied={copiedSlug === page.slug} onCopy={handleCopy} onDelete={setDeleteTarget} />)}</div> : <Card className="flex min-h-64 flex-col items-center justify-center gap-4 text-center"><LayoutGrid size={34} className="text-[var(--muted)]" /><div><h2 className="text-lg font-bold">Belum ada katalog</h2><p className="mt-1 max-w-md text-sm leading-relaxed text-[var(--muted)]">Buat katalog pertama untuk menampilkan beberapa landing page produk dari satu link.</p></div><Button icon={Plus} onClick={() => void handleCreate()} isLoading={isCreating}>Buat katalog pertama</Button></Card>}
      <ConfirmModal open={Boolean(deleteTarget)} title="Hapus katalog ini?" description={deleteTarget ? <>Katalog <strong className="text-[var(--text)]">{deleteTarget.title}</strong> akan dihapus permanen. Landing page di dalamnya tetap aman.</> : null} confirmLabel="Hapus katalog" isLoading={isDeleting} onCancel={() => { if (!isDeleting) setDeleteTarget(null); }} onConfirm={() => void handleDelete()} />
    </main>
  );
};

const CatalogAvatarField: React.FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Pilih file gambar.');
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onerror = () => reject(new Error('Gambar gagal dibaca.'));
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });
      const image = new Image();
      const resized = await new Promise<string>((resolve, reject) => {
        image.onerror = () => reject(new Error('Format gambar tidak didukung.'));
        image.onload = () => {
          const scale = Math.min(1, 800 / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const context = canvas.getContext('2d');
          if (!context) return reject(new Error('Gambar gagal diproses.'));
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        image.src = dataUrl;
      });
      if (resized.length > 2_000_000) throw new Error('Ukuran gambar terlalu besar. Gunakan gambar yang lebih kecil.');
      onChange(resized);
    } catch (uploadError) {
      setError(asText((uploadError as Error)?.message, 'Gambar gagal diproses.'));
    }
    setIsProcessing(false);
  };

  return <div className="space-y-3"><div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-[var(--muted)]">Foto profil / avatar katalog (opsional)</span>{value && <button type="button" onClick={() => onChange('')} className="text-xs font-semibold text-[var(--danger-text)] hover:underline">Hapus foto</button>}</div><div className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">{value ? <img src={value} alt="Preview avatar katalog" className="h-16 w-16 rounded-full object-cover" /> : <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]"><LayoutGrid size={24} /></span>}<div className="min-w-0 flex-1"><p className="text-xs leading-relaxed text-[var(--muted)]">Gunakan foto/logo persegi agar header katalog terlihat lebih personal.</p><input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} /><Button type="button" variant="secondary" icon={Upload} onClick={() => inputRef.current?.click()} isLoading={isProcessing} className="mt-3">Upload foto</Button></div></div>{error && <p className="text-xs text-[var(--danger-text)]">{error}</p>}<Input label="atau URL avatar" value={value.startsWith('data:') ? '' : value} onChange={event => onChange(event.target.value)} placeholder="https://.../avatar.jpg" /></div>;
};

const readCatalogImage = (file: File, maxWidth = 1600): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Gambar gagal dibaca.'));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error('Format gambar tidak didukung.'));
    image.onload = () => {
      const scale = Math.min(1, maxWidth / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) return reject(new Error('Gambar gagal diproses.'));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.84));
    };
    image.src = String(reader.result || '');
  };
  reader.readAsDataURL(file);
});

const CatalogImageField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
}> = ({ label, value, onChange, helper }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Pilih file gambar.');
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const dataUrl = await readCatalogImage(file);
      if (dataUrl.length > 1_800_000) throw new Error('Ukuran gambar terlalu besar. Gunakan gambar yang lebih kecil.');
      onChange(dataUrl);
    } catch (uploadError) {
      setError(asText((uploadError as Error)?.message, 'Gambar gagal diproses.'));
    }
    setIsProcessing(false);
  };

  return <div className="space-y-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
        {helper && <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{helper}</p>}
      </div>
      {value && <button type="button" onClick={() => onChange('')} className="text-xs font-semibold text-[var(--danger-text)] hover:underline">Hapus gambar</button>}
    </div>
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-2">
      {value ? <img src={value} alt={`Preview ${label}`} className="max-h-48 w-full rounded-lg object-contain" /> : <div className="flex min-h-28 items-center justify-center gap-2 text-sm text-[var(--muted)]"><ImagePlus size={22} /> Belum ada gambar</div>}
    </div>
    <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    <Button type="button" variant="secondary" icon={Upload} onClick={() => inputRef.current?.click()} isLoading={isProcessing}>Upload gambar</Button>
    {error && <p className="text-xs text-[var(--danger-text)]">{error}</p>}
    <Input label="atau URL gambar" icon={LinkIcon} value={value.startsWith('data:') ? '' : value} onChange={event => onChange(event.target.value)} placeholder="https://.../visual.jpg" />
  </div>;
};

const CatalogSocialLinksEditor: React.FC<{
  links: CatalogSocialLink[];
  onChange: (links: CatalogSocialLink[]) => void;
}> = ({ links, onChange }) => {
  const updateLink = (id: string, patch: Partial<CatalogSocialLink>) => {
    onChange(links.map(link => link.id === id ? { ...link, ...patch } : link));
  };

  const addLink = () => {
    if (links.length >= 10) return;
    onChange([...links, { id: `social-link-${Date.now()}-${links.length}`, label: '', url: '' }]);
  };

  const removeLink = (id: string) => onChange(links.filter(link => link.id !== id));

  return <div className="space-y-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-[var(--muted)]">Tautan sosial & lainnya</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">Tampilkan Instagram, WhatsApp, website, atau tautan lain di bawah profil katalog.</p>
      </div>
      <button type="button" onClick={addLink} disabled={links.length >= 10} aria-label="Tambah tautan" className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-xs font-semibold text-[var(--accent-strong)] hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"><Plus size={14} /> Tambah</button>
    </div>
    {links.length > 0 && <div className="space-y-3">
      {links.map((link, index) => <div key={link.id || `social-link-${index}`} className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
        <div className="mb-2 flex items-center justify-between gap-2"><span className="text-[11px] font-semibold text-[var(--muted)]">Tautan {index + 1}</span><button type="button" onClick={() => removeLink(link.id)} aria-label={`Hapus tautan ${index + 1}`} className="rounded-md p-1 text-[var(--danger-text)] hover:bg-[var(--surface)]"><Trash2 size={14} /></button></div>
        <div className="space-y-2"><Input label="Label" value={link.label} onChange={event => updateLink(link.id, { label: event.target.value })} placeholder="Instagram" /><Input label="URL" icon={LinkIcon} value={link.url} onChange={event => updateLink(link.id, { url: event.target.value })} placeholder="https://instagram.com/username" /></div>
      </div>)}
    </div>}
    {links.length === 0 && <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] p-3 text-xs leading-relaxed text-[var(--muted)]">Belum ada tautan. Tambahkan link agar pengunjung dapat menemukan kanal Anda.</div>}
  </div>;
};

const CatalogContentEditor: React.FC<{
  content: CatalogContent;
  onChange: (content: CatalogContent) => void;
}> = ({ content, onChange }) => {
  const update = (patch: Partial<CatalogContent>) => onChange({ ...content, ...patch });
  const updateBenefit = (id: string, patch: Partial<CatalogBenefit>) => onChange({ ...content, benefits: content.benefits.map(benefit => benefit.id === id ? { ...benefit, ...patch } : benefit) });
  const addBenefit = () => {
    if (content.benefits.length >= 6) return;
    onChange({ ...content, benefits: [...content.benefits, { id: `catalog-benefit-${Date.now()}-${content.benefits.length}`, title: '', description: '' }] });
  };
  const removeBenefit = (id: string) => onChange({ ...content, benefits: content.benefits.filter(benefit => benefit.id !== id) });

  return <div className="space-y-5 border-t border-[var(--border)] pt-5">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Tampilan etalase</p>
      <h3 className="mt-2 text-lg font-bold">Hero & benefit katalog</h3>
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">Buat katalog terasa seperti storefront produk digital dengan banner, ajakan, dan alasan untuk membeli.</p>
    </div>
    <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
      <div><p className="text-sm font-semibold">Layout produk</p><p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">Pilih susunan kartu yang paling cocok untuk jumlah dan visual produk Anda.</p></div>
      <div className="grid grid-cols-2 gap-2">
        {CATALOG_LAYOUT_OPTIONS.map(option => <button key={option.value} type="button" aria-pressed={content.productLayout === option.value} onClick={() => update({ productLayout: option.value })} className={`rounded-xl border p-2.5 text-left transition-colors ${content.productLayout === option.value ? 'border-[var(--accent)] bg-[var(--surface)] ring-2 ring-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]'}`}><div className="mb-2 h-16 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-2"><CatalogLayoutPreview layout={option.value} /></div><span className="block text-xs font-semibold text-[var(--text)]">{option.label}</span><span className="mt-1 block text-[10px] leading-relaxed text-[var(--muted)]">{option.description}</span></button>)}
      </div>
    </div>
    <Input label="Pengumuman singkat (opsional)" value={content.announcement} onChange={event => update({ announcement: event.target.value })} placeholder="Produk digital baru sudah tersedia" />
    <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
      <div className="flex items-start gap-2"><Sparkles size={17} className="mt-0.5 shrink-0 text-[var(--accent-strong)]" /><div><p className="text-sm font-semibold">Hero katalog</p><p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">Tampilkan pesan utama dan visual koleksi di bagian paling atas.</p></div></div>
      <Input label="Eyebrow" value={content.heroEyebrow} onChange={event => update({ heroEyebrow: event.target.value })} placeholder="KOLEKSI PRODUK DIGITAL" />
      <Input label="Judul hero" value={content.heroTitle} onChange={event => update({ heroTitle: event.target.value })} placeholder="Temukan resource untuk bekerja lebih cerdas" />
      <Textarea label="Deskripsi hero" value={content.heroDescription} onChange={event => update({ heroDescription: event.target.value })} placeholder="Jelaskan nilai utama koleksi Anda." className="min-h-[92px]" />
      <CatalogImageField label="Visual hero (opsional)" value={content.heroImageUrl} onChange={heroImageUrl => update({ heroImageUrl })} helper="Gunakan gambar horizontal agar banner terlihat seimbang." />
      <Input label="Alt visual" value={content.heroImageAlt} onChange={event => update({ heroImageAlt: event.target.value })} placeholder="Koleksi produk digital" />
      <div className="grid gap-3 sm:grid-cols-2"><Input label="Label CTA" value={content.heroCtaLabel} onChange={event => update({ heroCtaLabel: event.target.value })} placeholder="Lihat koleksi" /><Input label="Link CTA" icon={LinkIcon} value={content.heroCtaUrl} onChange={event => update({ heroCtaUrl: event.target.value })} placeholder="#catalog-products atau https://..." /></div>
    </div>
    <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">Benefit katalog</p><p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">Tambahkan sampai 6 alasan singkat yang tampil di bawah hero.</p></div><button type="button" onClick={addBenefit} disabled={content.benefits.length >= 6} aria-label="Tambah benefit" className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-xs font-semibold text-[var(--accent-strong)] hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"><Plus size={14} /> Tambah</button></div>
      <Input label="Judul bagian benefit" value={content.benefitsHeading} onChange={event => update({ benefitsHeading: event.target.value })} placeholder="Belanja digital dengan lebih mudah" />
      {content.benefits.map((benefit, index) => <div key={benefit.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"><div className="mb-2 flex items-center justify-between gap-2"><span className="text-[11px] font-semibold text-[var(--muted)]">Benefit {index + 1}</span><button type="button" onClick={() => removeBenefit(benefit.id)} aria-label={`Hapus benefit ${index + 1}`} className="rounded-md p-1 text-[var(--danger-text)] hover:bg-[var(--surface-soft)]"><Trash2 size={14} /></button></div><div className="space-y-2"><Input label="Judul" value={benefit.title} onChange={event => updateBenefit(benefit.id, { title: event.target.value })} placeholder="Siap digunakan" /><Textarea label="Deskripsi" value={benefit.description} onChange={event => updateBenefit(benefit.id, { description: event.target.value })} placeholder="Jelaskan benefit secara singkat." className="min-h-[70px]" /></div></div>)}
      {content.benefits.length === 0 && <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-3 text-xs leading-relaxed text-[var(--muted)]">Belum ada benefit. Tambahkan jika ingin memberi konteks lebih kuat sebelum daftar produk.</div>}
    </div>
  </div>;
};

const CatalogItemEditor: React.FC<{
  item: CatalogPageItem;
  index: number;
  itemCount: number;
  options: LandingOption[];
  onChange: (patch: Partial<CatalogPageItem>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}> = ({ item, index, itemCount, options, onChange, onMove, onRemove }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const selectedLanding = options.find(option => option.id === item.landingPageId);
  const summary = item.title || selectedLanding?.title || 'Pilih landing page';

  return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
    <div className="flex items-start gap-3">
      <span className="mt-2 text-[var(--muted)]" title="Urutan produk"><GripVertical size={18} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><p className="text-sm font-bold">Produk {index + 1}</p>{!isExpanded && <p className="mt-1 truncate text-xs text-[var(--muted)]">{summary}</p>}</div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setIsExpanded(current => !current)} aria-expanded={isExpanded} aria-label={isExpanded ? 'Lipat detail produk' : 'Buka detail produk'} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold text-[var(--accent-strong)] hover:bg-[var(--surface)]">{isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}{isExpanded ? 'Lipat' : 'Edit'}</button>
            <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Naikkan produk" className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface)] disabled:opacity-30"><ArrowUp size={15} /></button>
            <button type="button" onClick={() => onMove(1)} disabled={index === itemCount - 1} aria-label="Turunkan produk" className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface)] disabled:opacity-30"><ArrowDown size={15} /></button>
            <button type="button" onClick={onRemove} aria-label="Hapus produk dari katalog" className="rounded-lg p-2 text-[var(--danger-text)] hover:bg-[var(--surface)]"><Trash2 size={15} /></button>
          </div>
        </div>
        {isExpanded && <div className="mt-3 space-y-4">
          <label className="flex flex-col gap-2"><span className="text-xs font-semibold text-[var(--muted)]">Landing page tujuan</span><select value={item.landingPageId} onChange={event => onChange({ landingPageId: event.target.value })} className="min-h-[46px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"><option value="">Pilih landing page</option>{options.map(option => <option key={option.id} value={option.id}>{option.title} · /landing/{option.slug}</option>)}</select></label>
          <div className="grid gap-3 sm:grid-cols-2"><Input label="Judul produk" value={item.title} onChange={event => onChange({ title: event.target.value })} placeholder="Mengikuti judul landing page" /><Input label="Label tombol" value={item.buttonLabel} onChange={event => onChange({ buttonLabel: event.target.value })} placeholder="Lihat produk" /></div>
          <Textarea label="Deskripsi singkat" value={item.description} onChange={event => onChange({ description: event.target.value })} placeholder="Mengikuti deskripsi landing page" className="min-h-[88px]" />
          <div className="grid gap-3 sm:grid-cols-2"><Input label="Kategori" value={item.category || ''} onChange={event => onChange({ category: event.target.value })} placeholder="Template, Kelas, E-book" /><Input label="Format produk" value={item.format || ''} onChange={event => onChange({ format: event.target.value })} placeholder="Canva, PDF, Video" /></div>
          <div className="grid gap-3 sm:grid-cols-2"><Input label="Harga promo" value={item.price || ''} onChange={event => onChange({ price: event.target.value })} placeholder="Rp 150.000" /><Input label="Harga coret (opsional)" value={item.compareAtPrice || ''} onChange={event => onChange({ compareAtPrice: event.target.value })} placeholder="Rp 250.000" /></div>
          <Input label="Badge (opsional)" value={item.badge || ''} onChange={event => onChange({ badge: event.target.value })} placeholder="Best seller atau Baru" />
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm"><input type="checkbox" checked={item.featured === true} onChange={event => onChange({ featured: event.target.checked })} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" /><span><span className="block font-semibold">Tandai sebagai produk unggulan</span><span className="mt-1 block text-xs leading-relaxed text-[var(--muted)]">Kartu diberi aksen khusus dan muncul lebih menonjol di etalase.</span></span></label>
          <CatalogImageField label="Gambar produk" value={item.imageUrl} onChange={imageUrl => onChange({ imageUrl })} helper="Upload cover produk digital atau masukkan URL gambar." />
          <Input label="Alt gambar" value={item.imageAlt || ''} onChange={event => onChange({ imageAlt: event.target.value })} placeholder={summary} />
        </div>}
      </div>
    </div>
  </div>;
};

function CatalogMobilePreview({ page }: { page: CatalogPage }) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.7);
  const [screenZoom, setScreenZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    baseLeft: number;
    baseTop: number;
    width: number;
    height: number;
  } | null>(null);
  const zoomPercent = Math.round(zoom * 100);
  const screenZoomPercent = Math.round(screenZoom * 100);
  const phoneWidth = 360;
  const phoneHeight = 682;

  const endDragging = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return undefined;
    window.addEventListener('pointerup', endDragging, true);
    window.addEventListener('pointercancel', endDragging, true);
    window.addEventListener('blur', endDragging);
    return () => {
      window.removeEventListener('pointerup', endDragging, true);
      window.removeEventListener('pointercancel', endDragging, true);
      window.removeEventListener('blur', endDragging);
    };
  }, [endDragging, isDragging]);

  const clampOffset = (nextX: number, nextY: number) => {
    const drag = dragRef.current;
    if (!drag) return { x: nextX, y: nextY };
    const minX = 12 - drag.baseLeft;
    const maxX = window.innerWidth - drag.width - 12 - drag.baseLeft;
    const minY = 12 - drag.baseTop;
    const maxY = window.innerHeight - drag.height - 12 - drag.baseTop;
    return {
      x: Math.min(Math.max(nextX, Math.min(minX, maxX)), Math.max(minX, maxX)),
      y: Math.min(Math.max(nextY, Math.min(minY, maxY)), Math.max(minY, maxY))
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as Element | null;
    if (target?.closest('button')) return;
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is unavailable for synthetic events, but dragging can still continue.
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
      baseLeft: rect.left - offset.x,
      baseTop: rect.top - offset.y,
      width: rect.width,
      height: rect.height
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setOffset(clampOffset(drag.originX + event.clientX - drag.startX, drag.originY + event.clientY - drag.startY));
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId && event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    endDragging();
  };

  const changeZoom = (direction: -1 | 1) => setZoom(current => Math.min(1, Math.max(0.6, Number((current + direction * 0.1).toFixed(2)))));
  const changeScreenZoom = (direction: -1 | 1) => setScreenZoom(current => Math.min(1.4, Math.max(0.8, Number((current + direction * 0.1).toFixed(2)))));
  const resetPosition = () => {
    endDragging();
    setOffset({ x: 0, y: 0 });
  };

  return <div ref={previewRef} className="fixed bottom-4 right-4 z-50 w-[min(420px,calc(100vw-2rem))]" style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }}>
    <Card className={`space-y-3 border-[var(--border-strong)] p-4 shadow-2xl ${isDragging ? 'cursor-grabbing select-none' : ''}`}>
      <div className="touch-none flex items-start justify-between gap-3" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={stopDragging} onPointerCancel={stopDragging} onLostPointerCapture={endDragging}>
        <div className={`flex min-w-0 items-start gap-2 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`} title="Tarik untuk memindahkan preview">
          <GripVertical size={17} className="mt-1 shrink-0 text-[var(--muted)]" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Preview live</p>
            <h2 className="mt-1 text-lg font-bold">Tampilan mobile</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">Tarik grip untuk memindahkan preview di sekitar layar.</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--success-soft)] px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--success-text)]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--success-text)]" /> Live</span>
          <button type="button" onClick={resetPosition} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-[10px] font-semibold text-[var(--muted)] hover:bg-[var(--surface-soft)]" aria-label="Kembalikan posisi preview">Reset</button>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-2.5 py-2">
        <div className="flex min-w-0 flex-1 items-center justify-between gap-1.5" role="group" aria-label="Kontrol zoom frame HP">
          <span className="truncate text-[10px] font-semibold text-[var(--muted)]">Frame HP</span>
          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={() => changeZoom(-1)} disabled={zoom <= 0.6} className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm font-bold text-[var(--text)] hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Perkecil preview">−</button>
            <span className="w-9 text-center text-[11px] font-bold text-[var(--text)]">{zoomPercent}%</span>
            <button type="button" onClick={() => changeZoom(1)} disabled={zoom >= 1} className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm font-bold text-[var(--text)] hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Perbesar preview">+</button>
          </div>
        </div>
        <span className="h-6 w-px shrink-0 bg-[var(--border)]" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 items-center justify-between gap-1.5" role="group" aria-label="Kontrol zoom isi layar">
          <span className="truncate text-[10px] font-semibold text-[var(--muted)]">Isi layar</span>
          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={() => changeScreenZoom(-1)} disabled={screenZoom <= 0.8} className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm font-bold text-[var(--text)] hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Perkecil isi layar">−</button>
            <span className="w-9 text-center text-[11px] font-bold text-[var(--text)]">{screenZoomPercent}%</span>
            <button type="button" onClick={() => changeScreenZoom(1)} disabled={screenZoom >= 1.4} className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm font-bold text-[var(--text)] hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Perbesar isi layar">+</button>
          </div>
        </div>
      </div>
      <div className="mx-auto overflow-hidden" style={{ width: `${phoneWidth * zoom}px`, height: `${phoneHeight * zoom}px` }}>
        <div className="w-[360px] rounded-[2.7rem] border-[10px] border-slate-950 bg-slate-950 p-1 shadow-2xl" style={{ height: `${phoneHeight}px`, transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
          <div className="relative overflow-hidden rounded-[2.15rem] border border-slate-800 bg-[var(--app-bg)]">
            <div className="pointer-events-none absolute left-1/2 top-2 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-slate-950" aria-hidden="true" />
            <div className="flex h-[650px] flex-col items-center overflow-x-hidden overflow-y-auto overscroll-contain pt-8" onClick={event => { if ((event.target as HTMLElement).closest('a')) event.preventDefault(); }}>
              <div className="min-h-full shrink-0" style={{ width: '100%', zoom: screenZoom } as React.CSSProperties}>
                <PublicCatalogPageView client={null} pageOverride={page} embedded />
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="text-center text-[11px] leading-relaxed text-[var(--muted)]">Preview ini tidak mengubah data publik sampai Anda menekan “Simpan katalog”.</p>
    </Card>
  </div>;
}

export const CatalogPageEditor: React.FC<{ client: any }> = ({ client }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<CatalogPage | null>(null);
  const [landingOptions, setLandingOptions] = useState<LandingOption[]>([]);
  const [selectedLandingId, setSelectedLandingId] = useState('');
  const [showDnsGuide, setShowDnsGuide] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const fetchData = useCallback(async () => {
    if (!client || !id) return;
    setIsLoading(true);
    const [catalogResult, landingResult] = await Promise.all([
      client.from('catalog_pages').select('*').eq('id', id).maybeSingle(),
      client.from('landing_pages').select('id,slug,title,description,blocks').eq('status', 'published').order('created_at', { ascending: false })
    ]);
    if (catalogResult.error || !catalogResult.data) setNotice({ tone: 'error', message: errorMessage(catalogResult.error || 'Katalog tidak ditemukan.') });
    else setPage(mapCatalogRow(catalogResult.data));
    if (landingResult.error) setNotice(current => current || { tone: 'error', message: errorMessage(landingResult.error) });
    else setLandingOptions((landingResult.data || []).map((row: any) => ({ id: asText(row.id), slug: asText(row.slug), title: asText(row.title, 'Landing page'), description: asText(row.description), blocks: Array.isArray(row.blocks) ? row.blocks : [] })));
    setIsLoading(false);
  }, [client, id]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const selectedIds = useMemo(() => new Set((page?.items || []).map(item => item.landingPageId)), [page?.items]);
  const addItem = () => {
    if (!page || !selectedLandingId) return;
    if (selectedIds.has(selectedLandingId)) {
      setNotice({ tone: 'error', message: 'Landing page ini sudah ada di katalog.' });
      return;
    }
    const landing = landingOptions.find(option => option.id === selectedLandingId);
    if (!landing) return;
    const previewImage = getLandingPreviewImage(landing);
    const item: CatalogPageItem = {
      id: `catalog-item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      landingPageId: landing.id,
      title: '',
      description: '',
      imageUrl: previewImage.length <= 700000 ? previewImage : '',
      imageAlt: landing.title,
      buttonLabel: 'Lihat produk',
      category: '',
      format: '',
      badge: '',
      price: '',
      compareAtPrice: '',
      featured: false
    };
    setPage(current => current ? { ...current, items: [...current.items, item] } : current);
    setSelectedLandingId('');
  };

  const updateItem = (itemId: string, patch: Partial<CatalogPageItem>) => setPage(current => current ? { ...current, items: current.items.map(item => item.id === itemId ? { ...item, ...patch } : item) } : current);
  const moveItem = (index: number, direction: -1 | 1) => setPage(current => {
    if (!current) return current;
    const target = index + direction;
    if (target < 0 || target >= current.items.length) return current;
    const items = [...current.items];
    [items[index], items[target]] = [items[target], items[index]];
    return { ...current, items };
  });
  const removeItem = (itemId: string) => setPage(current => current ? { ...current, items: current.items.filter(item => item.id !== itemId) } : current);
  const updatePage = (patch: Partial<CatalogPage>) => setPage(current => current ? { ...current, ...patch } : current);

  const handleSave = async () => {
    if (!page || !client) return;
    if (!page.title.trim()) {
      setNotice({ tone: 'error', message: 'Judul katalog wajib diisi.' });
      return;
    }
    if (!isValidCustomDomain(page.customDomain)) {
      setNotice({ tone: 'error', message: 'Format domain custom belum valid. Gunakan contoh promo.domainanda.com.' });
      return;
    }
    const normalized = {
      ...page,
      slug: slugify(page.slug || page.title),
      customDomain: normalizeCustomDomain(page.customDomain),
      socialLinks: normalizeSocialLinks(page.socialLinks),
      content: { ...page.content, benefits: normalizeCatalogBenefits(page.content.benefits) },
      items: page.items.filter(item => item.landingPageId)
    };
    setIsSaving(true);
    const { data, error } = await client.from('catalog_pages').update(catalogWriteRow(normalized)).eq('id', page.id).select('*').single();
    if (error) setNotice({ tone: 'error', message: errorMessage(error) });
    else {
      setPage(mapCatalogRow(data));
      setNotice({ tone: 'success', message: 'Katalog berhasil disimpan.' });
    }
    setIsSaving(false);
  };

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-[var(--muted)]"><Loader2 size={18} className="animate-spin" /> Memuat editor katalog...</div>;
  if (!page) return <div className="mx-auto max-w-xl p-8"><Card className="space-y-4 text-center"><XCircle className="mx-auto text-[var(--danger-text)]" /><p>Katalog tidak ditemukan.</p><Button variant="secondary" onClick={() => navigate('/admin/catalog-pages')}>Kembali</Button></Card></div>;

  const dnsDomain = normalizeCustomDomain(page.customDomain) || 'promo.domainanda.com';
  const dnsLabels = dnsDomain.split('.');
  const dnsRecordName = page.customDomain && dnsLabels.length > 2 ? dnsLabels.slice(0, -2).join('.') : 'subdomain';

  return <main className="mx-auto w-full max-w-[1440px] space-y-6 p-4 pb-28 md:p-8">
    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center"><div><Link to="/admin/catalog-pages" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent-strong)]"><ArrowLeft size={14} /> {CATALOG_PAGE_SPACE_LABEL}</Link><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold tracking-tight">Editor Katalog</h1><Badge color={page.status === 'published' ? 'var(--success-soft)' : 'var(--surface-soft)'}>{statusLabel(page.status)}</Badge></div><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">Bangun etalase produk digital dengan hero, kategori, harga promo, benefit, dan CTA yang bisa Anda atur sendiri.</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" icon={ExternalLink} disabled={page.status !== 'published'} onClick={() => window.open(createCatalogShareLink(page.slug, undefined, page.customDomain), '_blank', 'noopener,noreferrer')}>Preview publik</Button><Button icon={Save} onClick={() => void handleSave()} isLoading={isSaving}>Simpan katalog</Button></div></div>
    <NoticeBanner notice={notice} />
    <CatalogMobilePreview page={page} />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <section className="space-y-5"><Card className="space-y-5"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Produk digital</p><h2 className="mt-2 text-xl font-bold">Pilih landing page</h2><p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">Setiap produk diarahkan ke landing page publik yang Anda pilih. Lengkapi kategori, harga, badge, dan visual agar terasa seperti katalog marketplace.</p></div><div className="flex flex-col gap-3 sm:flex-row"><select value={selectedLandingId} onChange={event => setSelectedLandingId(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"><option value="">Pilih landing page untuk ditambahkan</option>{landingOptions.filter(option => !selectedIds.has(option.id)).map(option => <option key={option.id} value={option.id}>{option.title} · /landing/{option.slug}</option>)}</select><Button type="button" variant="secondary" icon={Plus} onClick={addItem} disabled={!selectedLandingId}>Tambah produk</Button></div>{!landingOptions.length && <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] p-4 text-sm leading-relaxed text-[var(--muted)]">Belum ada landing page Publik. Publikasikan minimal satu landing page terlebih dahulu dari menu Landing Page.</div>}{page.items.length ? <div className="space-y-3">{page.items.map((item, index) => <CatalogItemEditor key={item.id} item={item} index={index} itemCount={page.items.length} options={landingOptions} onChange={patch => updateItem(item.id, patch)} onMove={direction => moveItem(index, direction)} onRemove={() => removeItem(item.id)} />)}</div> : <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-8 text-center text-sm text-[var(--muted)]">Belum ada produk di katalog. Pilih landing page di atas untuk mulai menambahkan.</div>}</Card></section>
      <aside className="space-y-5"><Card className="space-y-5"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Pengaturan</p><h2 className="mt-2 text-xl font-bold">Profil katalog</h2></div><Palette size={20} className="text-[var(--accent-strong)]" /></div><Input label="Judul katalog" value={page.title} onChange={event => updatePage({ title: event.target.value })} /><Input label="Slug link publik" value={page.slug} onChange={event => updatePage({ slug: event.target.value })} onBlur={() => updatePage({ slug: slugify(page.slug || page.title) })} /><Textarea label="Bio / deskripsi singkat" value={page.description} onChange={event => updatePage({ description: event.target.value })} placeholder="Ceritakan produk atau layanan Anda secara singkat." /><label className="flex flex-col gap-2"><span className="text-xs font-semibold text-[var(--muted)]">Status katalog</span><select value={page.status} onChange={event => updatePage({ status: event.target.value as CatalogPageStatus })} className="min-h-[46px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]">{CATALOG_STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><div className="space-y-3"><div><p className="text-xs font-semibold text-[var(--muted)]">Nuansa warna</p><p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">Aksen lembut untuk tombol dan highlight katalog.</p></div><div className="grid grid-cols-2 gap-2">{FORM_THEME_OPTIONS.map(option => <button key={option.value} type="button" aria-pressed={page.theme === option.value} onClick={() => updatePage({ theme: option.value })} className={`rounded-xl border p-2 text-left transition-colors ${page.theme === option.value ? 'border-[var(--accent)] ring-2 ring-[var(--accent-soft)]' : 'border-[var(--border)] hover:border-[var(--border-strong)]'}`}><span className="mb-2 block h-6 rounded-lg" style={{ backgroundColor: option.swatch }} /><span className="block text-xs font-semibold">{option.label}</span></button>)}</div></div><CatalogAvatarField value={page.avatarUrl} onChange={avatarUrl => updatePage({ avatarUrl })} /><CatalogContentEditor content={page.content} onChange={content => updatePage({ content })} /><div className="space-y-3"><Input label="Domain custom (opsional)" value={page.customDomain} onChange={event => updatePage({ customDomain: event.target.value })} onBlur={() => updatePage({ customDomain: normalizeCustomDomain(page.customDomain) })} placeholder="promo.domainanda.com" /><p className="text-xs leading-relaxed text-[var(--muted)]">Arahkan DNS domain ke deployment Arunika terlebih dahulu. Katalog akan dibuka dari alamat utama domain ini.</p>{page.customDomain && !isValidCustomDomain(page.customDomain) && <p className="text-xs text-[var(--danger-text)]">Format domain belum valid. Gunakan subdomain atau domain dengan ekstensi, misalnya promo.domainanda.com.</p>}<button type="button" onClick={() => setShowDnsGuide(current => !current)} aria-expanded={showDnsGuide} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-strong)] hover:underline">{showDnsGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {showDnsGuide ? 'Sembunyikan panduan DNS' : 'Lihat panduan DNS'}</button>{showDnsGuide && <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 text-xs leading-relaxed text-[var(--muted)]"><p className="font-semibold text-[var(--text)]">Cara menghubungkan {dnsDomain}</p><ol className="list-decimal space-y-2 pl-4"><li>Simpan domain di atas, lalu publikasikan katalog.</li><li>Di pengelola DNS domain, tambahkan record <strong className="text-[var(--text)]">CNAME</strong>. Untuk contoh <strong className="text-[var(--text)]">{dnsDomain}</strong>, isi nama/host <strong className="text-[var(--text)]">{dnsRecordName}</strong>.</li><li>Isi target CNAME dengan hostname deployment Arunika yang diberikan platform hosting, misalnya <code className="rounded bg-[var(--surface)] px-1 py-0.5 text-[11px] text-[var(--text)]">project.pages.dev</code>. Jangan gunakan slug katalog sebagai target.</li><li>Tambahkan domain yang sama pada menu Custom Domains di platform hosting, aktifkan HTTPS, lalu tunggu propagasi DNS.</li><li>Buka <strong className="text-[var(--text)]">https://{dnsDomain}</strong> untuk memverifikasi katalog.</li></ol><p className="border-t border-[var(--border)] pt-3">Untuk domain utama tanpa subdomain, gunakan fitur CNAME flattening/ALIAS dari penyedia DNS atau arahkan <strong className="text-[var(--text)]">www</strong> sebagai CNAME sesuai dukungan provider.</p></div>}</div><CatalogSocialLinksEditor links={page.socialLinks} onChange={socialLinks => updatePage({ socialLinks })} /></Card><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm leading-relaxed text-[var(--muted)]"><p className="font-semibold text-[var(--text)]">Link publik katalog</p><p className="mt-2 break-all">{createCatalogShareLink(page.slug, page.updatedAt, page.customDomain)}</p><p className="mt-2">Publikasikan katalog setelah semua produk siap ditampilkan.</p></div></aside>
    </div>
  </main>;
};

const safeCatalogCtaHref = (value: unknown) => {
  const raw = asText(value).trim();
  if (/^#/.test(raw) || /^\/(?!\/)/.test(raw)) return raw;
  return safeExternalHref(raw);
};

const CatalogPublicCard: React.FC<{ item: CatalogPageItem; index: number; layout: CatalogProductLayout }> = ({ item, index, layout }) => {
  const href = item.slug ? landingHref(item.slug) : '#catalog-products';
  const isCompact = layout === 'compact';
  const imageClass = isCompact
    ? 'h-28 w-28 shrink-0 sm:h-32 sm:w-32'
    : layout === 'large-image'
      ? 'aspect-[16/8] w-full'
      : layout === 'grid'
        ? 'aspect-square w-full'
        : 'aspect-[16/10] w-full';
  return <a href={href} onClick={event => { if (!item.slug) event.preventDefault(); }} className={`group ${isCompact ? 'flex min-h-32 flex-row' : 'flex h-full flex-col'} overflow-hidden rounded-2xl border bg-[var(--surface)] text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${item.featured ? 'border-[var(--accent)] ring-2 ring-[var(--accent-soft)]' : 'border-[var(--border)] hover:border-[var(--accent)]'}`}>
    <div className={`relative overflow-hidden bg-[var(--surface-soft)] ${imageClass}`}>{item.imageUrl ? <img src={item.imageUrl} alt={item.imageAlt || item.title || `Produk ${index + 1}`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" /> : <div className="flex h-full items-center justify-center text-[var(--accent-strong)]"><Package size={isCompact ? 30 : 42} strokeWidth={1.5} /></div>}{item.badge && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[var(--surface)]/95 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--accent-strong)] shadow-sm"><BadgeCheck size={13} />{item.badge}</span>}{item.featured && !item.badge && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--accent-strong)]"><Star size={13} fill="currentColor" /> Unggulan</span>}</div>
    <div className={`flex min-w-0 flex-1 flex-col ${isCompact ? 'p-3.5 sm:p-4' : 'p-4'}`}><div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{item.category && <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2 py-1 text-[var(--accent-strong)]"><Tag size={12} />{item.category}</span>}{item.format && <span className="inline-flex items-center gap-1"><Package size={12} />{item.format}</span>}</div><h2 className={`${isCompact ? 'mt-2' : 'mt-3'} line-clamp-2 text-base font-bold leading-snug text-[var(--text)]`}>{item.title || 'Lihat produk'}</h2><p className={`${isCompact ? 'line-clamp-2' : 'line-clamp-3'} mt-2 text-sm leading-relaxed text-[var(--muted)]`}>{item.description || 'Pelajari detail produk dan penawaran selengkapnya.'}</p><div className={`${isCompact ? 'mt-4' : 'mt-auto pt-5'} flex flex-wrap items-end justify-between gap-3`}><div>{item.price && <p className="text-base font-bold text-[var(--text)]">{item.price}</p>}{item.compareAtPrice && <p className="mt-0.5 text-xs text-[var(--muted)] line-through">{item.compareAtPrice}</p>}{!item.price && !item.compareAtPrice && <p className="text-xs font-semibold text-[var(--muted)]">Detail produk</p>}</div><span className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white transition-colors group-hover:bg-[var(--accent-hover)]">{item.buttonLabel || 'Lihat produk'}</span></div></div>
  </a>;
};

type PublicCatalogPageViewProps = {
  client: any;
  slugOverride?: string;
  domainOverride?: string;
  pageOverride?: CatalogPage;
  embedded?: boolean;
};

export const PublicCatalogPageView: React.FC<PublicCatalogPageViewProps> = ({ client, slugOverride, domainOverride, pageOverride, embedded = false }) => {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const slug = slugOverride || routeSlug;
  const domain = normalizeCustomDomain(domainOverride);
  const [loadedPage, setLoadedPage] = useState<CatalogPage | null>(null);
  const [isLoading, setIsLoading] = useState(!pageOverride);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const fetchPage = useCallback(async () => {
    if (!client || (!slug && !domain)) {
      setLoadError('Link katalog tidak valid.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = domain
      ? await client.rpc('get_public_catalog_page_by_domain', { p_domain: domain })
      : await client.rpc('get_public_catalog_page', { p_slug: decodeURIComponent(slug || '') });
    if (error || !data) setLoadError(errorMessage(error || 'Katalog tidak ditemukan.'));
    else {
      setLoadedPage(mapCatalogRow(data));
      setLoadError(null);
    }
    setIsLoading(false);
  }, [client, domain, slug]);

  const page = pageOverride || loadedPage;

  useEffect(() => {
    if (pageOverride) {
      setIsLoading(false);
      setLoadError(null);
      return;
    }
    void fetchPage();
  }, [fetchPage, pageOverride]);
  useEffect(() => {
    if (!page || embedded) return;
    setPublicMetadata({
      title: page.title,
      description: page.description || page.content.heroDescription || `Katalog produk ${page.title}`,
      image: page.content.heroImageUrl || page.avatarUrl || page.items.find(item => item.imageUrl)?.imageUrl || '',
      imageAlt: page.content.heroImageAlt || page.title
    });
  }, [embedded, page]);

  const categories = useMemo(() => page ? Array.from(new Set(page.items.map(item => asText(item.category).trim()).filter(Boolean))) : [], [page]);
  const visibleItems = useMemo(() => page ? page.items.filter(item => activeCategory === 'all' || asText(item.category).trim() === activeCategory) : [], [activeCategory, page]);
  useEffect(() => {
    if (activeCategory !== 'all' && !categories.includes(activeCategory)) setActiveCategory('all');
  }, [activeCategory, categories]);

  if (isLoading) return <div className={`flex ${embedded ? 'min-h-full' : 'min-h-screen'} items-center justify-center gap-3 bg-[var(--app-bg)] text-sm text-[var(--muted)]`}><Loader2 size={18} className="animate-spin" /> Memuat katalog...</div>;
  if (loadError || !page) return <div className={`flex ${embedded ? 'min-h-full' : 'min-h-screen'} items-center justify-center bg-[var(--app-bg)] p-6`}><Card className="w-full max-w-md space-y-5 py-10 text-center"><XCircle size={34} className="mx-auto text-[var(--danger-text)]" /><div><h1 className="text-xl font-bold">Katalog tidak dapat dibuka</h1><p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{loadError}</p></div><Button onClick={() => void fetchPage()} className="mx-auto w-full">Coba lagi</Button></Card></div>;

  const content = page.content;
  const productLayout = isCatalogProductLayout(content.productLayout) ? content.productLayout : 'default';
  const productGridClass = productLayout === 'grid' ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4';
  const heroCtaHref = safeCatalogCtaHref(content.heroCtaUrl);
  const hasHero = Boolean(content.heroEyebrow || content.heroTitle || content.heroDescription || content.heroImageUrl || content.heroCtaLabel);

  return <div className={`${embedded ? 'min-h-full px-3 py-5' : 'min-h-screen px-4 py-8 sm:px-6'} bg-[var(--app-bg)] text-[var(--text)]`} style={formThemeStyle(page.theme)}><main className="mx-auto flex w-full max-w-5xl flex-col items-center"><header className="flex w-full flex-col items-center text-center"><div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--surface)] bg-[var(--accent-soft)] p-1 shadow-sm">{page.avatarUrl ? <img src={page.avatarUrl} alt={page.title} className="h-full w-full rounded-full object-cover" /> : <img src={logoUtama} alt="Arunika" className="max-h-16 max-w-16 object-contain" />}</div><h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">{page.title}</h1>{page.description && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">{page.description}</p>}<div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]"><LinkIcon size={13} /> Katalog produk digital</div>{content.announcement && <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--success-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--success-text)]"><Sparkles size={13} /> {content.announcement}</div>}{page.socialLinks.length > 0 && <nav className="mt-4 flex flex-wrap justify-center gap-2" aria-label="Tautan sosial dan lainnya">{page.socialLinks.map(link => { const href = safeExternalHref(link.url); return href ? <a key={link.id} href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface-soft)]"><LinkIcon size={13} className="text-[var(--accent-strong)]" />{link.label || 'Link'}<ExternalLink size={12} className="text-[var(--muted)]" /></a> : null; })}</nav>}</header>
    {hasHero && <section className="relative mt-8 w-full overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"><div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[var(--accent-soft)] opacity-70" /><div className="relative grid items-center gap-6 p-6 sm:p-10 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.78fr)]"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">{content.heroEyebrow || 'PRODUK DIGITAL'}</p><h2 className="mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{content.heroTitle || page.title}</h2>{content.heroDescription && <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">{content.heroDescription}</p>}{content.heroCtaLabel && heroCtaHref && <a href={heroCtaHref} target={heroCtaHref.startsWith('http') ? '_blank' : undefined} rel={heroCtaHref.startsWith('http') ? 'noreferrer' : undefined} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--accent-hover)]">{content.heroCtaLabel}<ArrowRight size={16} /></a>}</div><div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)]">{content.heroImageUrl ? <img src={content.heroImageUrl} alt={content.heroImageAlt || 'Visual katalog produk'} className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-[var(--muted)]"><Package size={42} strokeWidth={1.5} className="text-[var(--accent-strong)]" /><span className="text-xs font-semibold">Koleksi produk digital</span></div>}</div></div></section>}
    {content.benefits.length > 0 && <section className="mt-10 w-full"><div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Keunggulan</p><h2 className="mt-2 text-2xl font-bold tracking-tight">{content.benefitsHeading || 'Belanja digital dengan lebih mudah'}</h2></div><Badge color="var(--surface)"><BadgeCheck size={13} className="mr-1.5" /> Terpilih</Badge></div><div className="grid gap-3 md:grid-cols-3">{content.benefits.map((benefit, index) => <article key={benefit.id || `benefit-${index}`} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent-strong)]">{String(index + 1).padStart(2, '0')}</span><h3 className="mt-4 text-sm font-bold">{benefit.title || 'Benefit produk'}</h3>{benefit.description && <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{benefit.description}</p>}</article>)}</div></section>}
    <section id="catalog-products" className="mt-10 w-full"><div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Etalase digital</p><h2 className="mt-2 text-2xl font-bold tracking-tight">Pilih produk yang Anda butuhkan</h2><p className="mt-1 text-sm text-[var(--muted)]">{visibleItems.length} dari {page.items.length} produk ditampilkan</p></div>{categories.length > 1 && <label className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]"><span className="sr-only">Filter kategori</span><select value={activeCategory} onChange={event => setActiveCategory(event.target.value)} className="min-h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-semibold text-[var(--text)] outline-none focus:border-[var(--accent)]"><option value="all">Semua kategori</option>{categories.map(category => <option key={category} value={category}>{category}</option>)}</select></label>}</div>{visibleItems.length ? <div className={productGridClass} data-layout={productLayout}>{visibleItems.map((item, index) => <CatalogPublicCard key={item.id || `${item.landingPageId}-${index}`} item={item} index={index} layout={productLayout} />)}</div> : <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted)]">Belum ada produk pada kategori ini.</div>}</section>
    <footer className="mt-12 flex items-center gap-2 text-xs text-[var(--muted)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> Dibuat dengan Arunika</footer></main></div>;
};
