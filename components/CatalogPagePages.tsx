import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Copy,
  ExternalLink,
  GripVertical,
  ImagePlus,
  LayoutGrid,
  Link as LinkIcon,
  Loader2,
  Palette,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
  XCircle
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { CatalogPage, CatalogPageItem, CatalogPageStatus, FormThemeKey } from '../types';
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

const CATALOG_STATUS_OPTIONS: Array<{ value: CatalogPageStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Publik' },
  { value: 'archived', label: 'Arsip' }
];

const statusLabel = (status: CatalogPageStatus) => CATALOG_STATUS_OPTIONS.find(option => option.value === status)?.label || 'Draft';

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
  title: asText(value?.title),
  description: asText(value?.description),
  imageUrl: asText(value?.imageUrl || value?.image_url),
  buttonLabel: asText(value?.buttonLabel || value?.button_label, 'Lihat produk')
});

const mapCatalogRow = (row: any): CatalogPage => ({
  id: asText(row?.id),
  slug: asText(row?.slug),
  title: asText(row?.title, 'Katalog Produk'),
  description: asText(row?.description),
  theme: isTheme(row?.theme) ? row.theme : 'navy',
  status: row?.status === 'published' || row?.status === 'archived' ? row.status : 'draft',
  avatarUrl: asText(row?.avatar_url || row?.avatarUrl),
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
  items: page.items.map((item, index) => ({
    id: item.id,
    landingPageId: item.landingPageId,
    title: item.title || '',
    description: item.description || '',
    imageUrl: item.imageUrl || '',
    buttonLabel: item.buttonLabel || 'Lihat produk',
    position: index
  })),
  updated_at: new Date().toISOString()
});

const createCatalogShareLink = (slug: string, updatedAt?: string) => {
  const url = new URL(getPublicBaseUrl());
  url.pathname = `/catalog/${encodeURIComponent(slug)}`;
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
          {page.avatarUrl ? <img src={page.avatarUrl} alt="" className="h-full w-full object-cover" /> : <LayoutGrid size={20} />}
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
    <p className="text-sm text-[var(--muted)]">/catalog/{page.slug}</p>
    <p className="line-clamp-2 min-h-10 text-sm leading-relaxed text-[var(--muted)]">{page.description || 'Belum ada deskripsi katalog.'}</p>
    <div className="grid grid-cols-2 gap-3 text-xs text-[var(--muted)]">
      <span>{page.items.length} produk</span>
      <span className="text-right">Tema {FORM_THEME_OPTIONS.find(option => option.value === page.theme)?.label || 'Navy'}</span>
    </div>
    <div className="mt-auto grid grid-cols-2 gap-2">
      <Link to={`/admin/catalog-pages/${page.id}`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface-soft)]">Edit katalog</Link>
      <button type="button" onClick={() => void onCopy(page)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface-soft)]">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Tersalin' : 'Salin link'}</button>
      <a href={page.status === 'published' ? createCatalogShareLink(page.slug) : undefined} target="_blank" rel="noreferrer" className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${page.status === 'published' ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]' : 'cursor-not-allowed bg-[var(--surface-soft)] text-[var(--muted)]'}`} onClick={event => { if (page.status !== 'published') event.preventDefault(); }}>{page.status === 'published' ? 'Buka publik' : 'Belum publik'}{page.status === 'published' && <ExternalLink size={15} />}</a>
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
    const url = createCatalogShareLink(page.slug, page.updatedAt);
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

const CatalogItemEditor: React.FC<{
  item: CatalogPageItem;
  index: number;
  options: LandingOption[];
  onChange: (patch: Partial<CatalogPageItem>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}> = ({ item, index, options, onChange, onMove, onRemove }) => (
  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
    <div className="flex items-start gap-3">
      <span className="mt-2 text-[var(--muted)]" title="Urutan produk"><GripVertical size={18} /></span>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-bold">Produk {index + 1}</p><div className="flex items-center gap-1"><button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Naikkan produk" className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface)] disabled:opacity-30"><ArrowUp size={15} /></button><button type="button" onClick={() => onMove(1)} disabled={index === options.length - 1} aria-label="Turunkan produk" className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface)] disabled:opacity-30"><ArrowDown size={15} /></button><button type="button" onClick={onRemove} aria-label="Hapus produk dari katalog" className="rounded-lg p-2 text-[var(--danger-text)] hover:bg-[var(--surface)]"><Trash2 size={15} /></button></div></div>
        <label className="flex flex-col gap-2"><span className="text-xs font-semibold text-[var(--muted)]">Landing page tujuan</span><select value={item.landingPageId} onChange={event => onChange({ landingPageId: event.target.value })} className="min-h-[46px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"><option value="">Pilih landing page</option>{options.map(option => <option key={option.id} value={option.id}>{option.title} · /landing/{option.slug}</option>)}</select></label>
        <div className="grid gap-3 md:grid-cols-2"><Input label="Judul kartu (opsional)" value={item.title} onChange={event => onChange({ title: event.target.value })} placeholder="Mengikuti judul landing page" /><Input label="Label tombol" value={item.buttonLabel} onChange={event => onChange({ buttonLabel: event.target.value })} placeholder="Lihat produk" /></div>
        <Textarea label="Deskripsi kartu (opsional)" value={item.description} onChange={event => onChange({ description: event.target.value })} placeholder="Mengikuti deskripsi landing page" className="min-h-[88px]" />
        <Input label="URL gambar kartu (opsional)" icon={LinkIcon} value={item.imageUrl.startsWith('data:') ? '' : item.imageUrl} onChange={event => onChange({ imageUrl: event.target.value })} placeholder="https://.../produk.jpg" />
      </div>
    </div>
  </div>
);

export const CatalogPageEditor: React.FC<{ client: any }> = ({ client }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<CatalogPage | null>(null);
  const [landingOptions, setLandingOptions] = useState<LandingOption[]>([]);
  const [selectedLandingId, setSelectedLandingId] = useState('');
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
      buttonLabel: 'Lihat produk'
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
    const normalized = { ...page, slug: slugify(page.slug || page.title), items: page.items.filter(item => item.landingPageId) };
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

  return <main className="mx-auto w-full max-w-[1440px] space-y-6 p-4 pb-28 md:p-8"><div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center"><div><Link to="/admin/catalog-pages" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent-strong)]"><ArrowLeft size={14} /> {CATALOG_PAGE_SPACE_LABEL}</Link><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold tracking-tight">Editor Katalog</h1><Badge color={page.status === 'published' ? 'var(--success-soft)' : 'var(--surface-soft)'}>{statusLabel(page.status)}</Badge></div><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">Atur tampilan profil dan susunan produk. Setiap kartu akan mengarah ke landing page produk yang dipilih.</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" icon={ExternalLink} disabled={page.status !== 'published'} onClick={() => window.open(createCatalogShareLink(page.slug), '_blank', 'noopener,noreferrer')}>Preview publik</Button><Button icon={Save} onClick={() => void handleSave()} isLoading={isSaving}>Simpan katalog</Button></div></div><NoticeBanner notice={notice} /><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"><section className="space-y-5"><Card className="space-y-5"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Produk di katalog</p><h2 className="mt-2 text-xl font-bold">Pilih landing page</h2><p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">Hanya landing page berstatus Publik yang bisa ditambahkan agar link pengunjung tidak buntu.</p></div><div className="flex flex-col gap-3 sm:flex-row"><select value={selectedLandingId} onChange={event => setSelectedLandingId(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"><option value="">Pilih landing page untuk ditambahkan</option>{landingOptions.filter(option => !selectedIds.has(option.id)).map(option => <option key={option.id} value={option.id}>{option.title} · /landing/{option.slug}</option>)}</select><Button type="button" variant="secondary" icon={Plus} onClick={addItem} disabled={!selectedLandingId}>Tambah produk</Button></div>{!landingOptions.length && <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] p-4 text-sm leading-relaxed text-[var(--muted)]">Belum ada landing page Publik. Publikasikan minimal satu landing page terlebih dahulu dari menu Landing Page.</div>}{page.items.length ? <div className="space-y-3">{page.items.map((item, index) => <CatalogItemEditor key={item.id} item={item} index={index} options={page.items} onChange={patch => updateItem(item.id, patch)} onMove={direction => moveItem(index, direction)} onRemove={() => removeItem(item.id)} />)}</div> : <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-8 text-center text-sm text-[var(--muted)]">Belum ada produk di katalog. Pilih landing page di atas untuk mulai menambahkan.</div>}</Card></section><aside className="space-y-5"><Card className="space-y-5"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Pengaturan</p><h2 className="mt-2 text-xl font-bold">Profil katalog</h2></div><Palette size={20} className="text-[var(--accent-strong)]" /></div><Input label="Judul katalog" value={page.title} onChange={event => updatePage({ title: event.target.value })} /><Input label="Slug link publik" value={page.slug} onChange={event => updatePage({ slug: event.target.value })} onBlur={() => updatePage({ slug: slugify(page.slug || page.title) })} /><Textarea label="Bio / deskripsi singkat" value={page.description} onChange={event => updatePage({ description: event.target.value })} placeholder="Ceritakan produk atau layanan Anda secara singkat." /><label className="flex flex-col gap-2"><span className="text-xs font-semibold text-[var(--muted)]">Status katalog</span><select value={page.status} onChange={event => updatePage({ status: event.target.value as CatalogPageStatus })} className="min-h-[46px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]">{CATALOG_STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><div className="space-y-3"><div><p className="text-xs font-semibold text-[var(--muted)]">Nuansa warna</p><p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">Aksen lembut untuk tombol dan highlight katalog.</p></div><div className="grid grid-cols-2 gap-2">{FORM_THEME_OPTIONS.map(option => <button key={option.value} type="button" aria-pressed={page.theme === option.value} onClick={() => updatePage({ theme: option.value })} className={`rounded-xl border p-2 text-left transition-colors ${page.theme === option.value ? 'border-[var(--accent)] ring-2 ring-[var(--accent-soft)]' : 'border-[var(--border)] hover:border-[var(--border-strong)]'}`}><span className="mb-2 block h-6 rounded-lg" style={{ backgroundColor: option.swatch }} /><span className="block text-xs font-semibold">{option.label}</span></button>)}</div></div><CatalogAvatarField value={page.avatarUrl} onChange={avatarUrl => updatePage({ avatarUrl })} /></Card><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm leading-relaxed text-[var(--muted)]"><p className="font-semibold text-[var(--text)]">Link publik katalog</p><p className="mt-2 break-all">{createCatalogShareLink(page.slug)}</p><p className="mt-2">Publikasikan katalog setelah semua produk siap ditampilkan.</p></div></aside></div></main>;
};

const CatalogPublicCard: React.FC<{ item: CatalogPageItem; index: number }> = ({ item, index }) => (
  <a href={landingHref(item.slug)} className="group flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-md">
    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-lg font-bold">{String(index + 1).padStart(2, '0')}</span>}</div>
    <div className="min-w-0 flex-1"><h2 className="truncate text-base font-semibold text-[var(--text)]">{item.title || 'Lihat produk'}</h2><p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[var(--muted)]">{item.description || 'Pelajari detail produk dan penawaran selengkapnya.'}</p><span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-strong)]">{item.buttonLabel || 'Lihat produk'} <ExternalLink size={13} className="transition-transform group-hover:translate-x-0.5" /></span></div>
  </a>
);

export const PublicCatalogPageView: React.FC<{ client: any; slugOverride?: string }> = ({ client, slugOverride }) => {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const slug = slugOverride || routeSlug;
  const [page, setPage] = useState<CatalogPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchPage = useCallback(async () => {
    if (!client || !slug) {
      setLoadError('Link katalog tidak valid.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await client.rpc('get_public_catalog_page', { p_slug: decodeURIComponent(slug) });
    if (error || !data) setLoadError(errorMessage(error || 'Katalog tidak ditemukan.'));
    else {
      setPage(mapCatalogRow(data));
      setLoadError(null);
    }
    setIsLoading(false);
  }, [client, slug]);

  useEffect(() => { void fetchPage(); }, [fetchPage]);
  useEffect(() => {
    if (!page) return;
    setPublicMetadata({
      title: page.title,
      description: page.description || `Katalog produk ${page.title}`,
      image: page.avatarUrl || page.items.find(item => item.imageUrl)?.imageUrl || '',
      imageAlt: page.title
    });
  }, [page]);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center gap-3 bg-[var(--app-bg)] text-sm text-[var(--muted)]"><Loader2 size={18} className="animate-spin" /> Memuat katalog...</div>;
  if (loadError || !page) return <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] p-6"><Card className="w-full max-w-md space-y-5 py-10 text-center"><XCircle size={34} className="mx-auto text-[var(--danger-text)]" /><div><h1 className="text-xl font-bold">Katalog tidak dapat dibuka</h1><p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{loadError}</p></div><Button onClick={() => void fetchPage()} className="mx-auto w-full">Coba lagi</Button></Card></div>;

  return <div className="min-h-screen bg-[var(--app-bg)] px-4 py-8 text-[var(--text)] sm:px-6" style={formThemeStyle(page.theme)}><main className="mx-auto flex w-full max-w-xl flex-col items-center"><header className="flex w-full flex-col items-center text-center"><div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--surface)] bg-[var(--accent-soft)] p-1 shadow-sm">{page.avatarUrl ? <img src={page.avatarUrl} alt={page.title} className="h-full w-full rounded-full object-cover" /> : <img src={logoUtama} alt="Arunika" className="max-h-16 max-w-16 object-contain" />}</div><h1 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">{page.title}</h1>{page.description && <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--muted)] sm:text-base">{page.description}</p>}<div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]"><LinkIcon size={13} /> Katalog produk</div></header><section className="mt-8 flex w-full flex-col gap-3" aria-label="Daftar produk">{page.items.length ? page.items.map((item, index) => <CatalogPublicCard key={item.id || `${item.landingPageId}-${index}`} item={item} index={index} />) : <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted)]">Belum ada produk yang ditampilkan.</div>}</section><footer className="mt-10 flex items-center gap-2 text-xs text-[var(--muted)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> Dibuat dengan Arunika</footer></main></div>;
};
