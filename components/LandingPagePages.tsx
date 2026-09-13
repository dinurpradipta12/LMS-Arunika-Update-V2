import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  GripVertical,
  ImagePlus,
  Layout,
  Link as LinkIcon,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MoveDown,
  MoveUp,
  Palette,
  Plus,
  Quote,
  Save,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Video,
  X,
  XCircle
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  FormThemeKey,
  LandingBlock,
  LandingBlockType,
  LandingPage,
  LandingPageStatus
} from '../types';
import { Badge, Button, Card, ConfirmModal, Input, Textarea } from './UI';
import { FORM_THEME_OPTIONS, formThemeStyle } from './FormMakerPages';
import logoUtama from '../src/logo-utama.png';

export const LANDING_PAGE_SPACE_LABEL = 'Landing Page';
export const LANDING_PAGE_PUBLIC_LABEL = 'Arunika Landing Page';
const DEFAULT_LANDING_DESCRIPTION = 'Landing page untuk memperkenalkan produk Anda.';

type Notice = { tone: 'success' | 'error'; message: string };

const LANDING_STATUS_OPTIONS: Array<{ value: LandingPageStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Publik' },
  { value: 'archived', label: 'Arsip' }
];

const LANDING_BLOCK_OPTIONS: Array<{
  value: LandingBlockType;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
}> = [
  { value: 'hero', label: 'Hero', description: 'Judul utama dan CTA', icon: Sparkles },
  { value: 'text', label: 'Teks', description: 'Penjelasan produk', icon: Layout },
  { value: 'image', label: 'Gambar', description: 'Galeri foto atau banner produk', icon: ImagePlus },
  { value: 'video', label: 'Video', description: 'Video demo atau testimoni', icon: Video },
  { value: 'features', label: 'Manfaat', description: 'Keunggulan dalam grid', icon: Star },
  { value: 'pricing', label: 'Harga', description: 'Paket dan harga produk', icon: CreditCard },
  { value: 'testimonial', label: 'Testimoni', description: 'Bukti sosial dari pelanggan', icon: Quote },
  { value: 'faq', label: 'FAQ', description: 'Pertanyaan yang sering ditanya', icon: Layout },
  { value: 'payment', label: 'Pembayaran', description: 'QR Code dan instruksi transfer', icon: CreditCard },
  { value: 'cta', label: 'CTA', description: 'Ajakan bertindak penutup', icon: Sparkles },
  { value: 'spacer', label: 'Jarak', description: 'Atur ruang antar bagian', icon: MoveDown }
];

const LANDING_BLOCK_LABELS = Object.fromEntries(LANDING_BLOCK_OPTIONS.map(item => [item.value, item.label])) as Record<LandingBlockType, string>;
const LANDING_BLOCK_TYPES = new Set<LandingBlockType>(LANDING_BLOCK_OPTIONS.map(item => item.value));

type LandingImageLayout = 'slider' | 'marquee' | 'row';
type LandingImageItem = { url: string; alt: string; caption: string };
type LandingTestimonialItem = { quote: string; name: string; role: string; rating: number };

const normalizeHeroImageScale = (value: unknown, fallback = 1.15) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.min(1.7, Math.max(0.7, numericValue)) : fallback;
};

const normalizeHeroImagePosition = (value: unknown) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.min(100, Math.max(0, numericValue)) : 50;
};

const LANDING_IMAGE_LAYOUT_OPTIONS: Array<{ value: LandingImageLayout; label: string; description: string }> = [
  { value: 'slider', label: 'Foto slider', description: 'Satu foto utama dengan navigasi dan indikator.' },
  { value: 'marquee', label: 'Gallery otomatis', description: 'Bergerak dari kanan ke kiri dan berulang.' },
  { value: 'row', label: 'Gallery satu baris', description: 'Semua foto tampil statis dalam satu baris.' }
];

const asText = (value: unknown, fallback = '') => typeof value === 'string' ? value : value == null ? fallback : String(value);

const DEFAULT_HEADING_COLOR = '#17283a';
const isHexColor = (value: unknown) => /^#[0-9a-f]{6}$/i.test(asText(value).trim());
const headingColorValue = (value: unknown) => isHexColor(value) ? asText(value).trim() : 'var(--text)';
const headingColorInputValue = (value: unknown) => isHexColor(value) ? asText(value).trim() : DEFAULT_HEADING_COLOR;

const slugify = (value: string) => value
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 100) || `landing-${Date.now()}`;

const createBlockId = (type: LandingBlockType, index = 0) => `landing-${type}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`;

const createLandingBlock = (type: LandingBlockType, index = 0): LandingBlock => {
  const id = createBlockId(type, index);
  const data: Record<string, any> = {
    hero: {
      eyebrow: 'Produk pilihan untuk Anda',
      headline: 'Tampilkan produk Anda dengan lebih meyakinkan',
      body: 'Jelaskan manfaat utama produk Anda dengan kalimat singkat yang mudah dipahami.',
      imageBoxScale: 1,
      imageScale: 1.15,
      imagePositionX: 50,
      imagePositionY: 50,
      buttonLabel: 'Saya berminat',
      buttonUrl: ''
    },
    text: {
      heading: 'Tentang produk ini',
      body: 'Ceritakan masalah yang diselesaikan produk Anda dan alasan pelanggan perlu memilihnya.'
    },
    image: {
      url: '',
      alt: 'Visual produk',
      caption: '',
      images: [],
      layout: 'row'
    },
    video: {
      url: '',
      caption: 'Lihat cara kerja produk ini.'
    },
    features: {
      heading: 'Kenapa memilih produk ini?',
      items: [
        { title: 'Praktis digunakan', description: 'Mulai dengan langkah yang sederhana dan jelas.' },
        { title: 'Hasil lebih terarah', description: 'Dapatkan sistem yang membantu Anda bergerak lebih cepat.' },
        { title: 'Dukungan berkelanjutan', description: 'Ada panduan dan bantuan saat Anda membutuhkannya.' }
      ]
    },
    pricing: {
      heading: 'Dapatkan akses sekarang',
      price: 'Rp 0',
      body: 'Pilih paket yang paling sesuai dengan kebutuhan Anda.',
      features: ['Akses materi utama', 'Panduan praktis', 'Dukungan setelah pembelian'],
      buttonLabel: 'Daftar sekarang',
      buttonUrl: ''
    },
    testimonial: {
      quote: 'Produk ini membantu saya bekerja lebih rapi dan percaya diri.',
      name: 'Nama pelanggan',
      role: 'Pelanggan',
      rating: 5,
      items: [{
        quote: 'Produk ini membantu saya bekerja lebih rapi dan percaya diri.',
        name: 'Nama pelanggan',
        role: 'Pelanggan',
        rating: 5
      }]
    },
    faq: {
      heading: 'Pertanyaan umum',
      items: [
        { question: 'Bagaimana cara mendapatkannya?', answer: 'Klik tombol pendaftaran lalu ikuti instruksi yang tersedia.' },
        { question: 'Apakah ada bantuan setelah pembelian?', answer: 'Tulis bentuk dukungan yang Anda sediakan untuk pelanggan di sini.' }
      ]
    },
    payment: {
      heading: 'Informasi pembayaran',
      ctaBeforePrice: '',
      originalAmount: '',
      amount: 'Rp 0',
      instructions: 'Silakan lakukan pembayaran melalui QR Code atau rekening yang tersedia. Setelah itu, kirim bukti pembayaran melalui WhatsApp.',
      qrCode: '',
      accountNumber: '',
      whatsapp: '',
      buttonLabel: 'Konfirmasi melalui WhatsApp',
      buttonUrl: ''
    },
    cta: {
      heading: 'Siap mulai bersama kami?',
      body: 'Ambil langkah pertama dan hubungi kami untuk mendapatkan informasi lengkap.',
      buttonLabel: 'Hubungi kami',
      buttonUrl: ''
    },
    spacer: {
      height: '48'
    }
  }[type];
  return { id, type, data };
};

const normalizeLineItems = (value: unknown, fallback: Array<{ title: string; description: string }>) => {
  if (!Array.isArray(value)) return fallback;
  return value.map(item => ({
    title: asText(item?.title),
    description: asText(item?.description)
  })).filter(item => item.title || item.description);
};

const normalizeFaqItems = (value: unknown, fallback: Array<{ question: string; answer: string }>) => {
  if (!Array.isArray(value)) return fallback;
  return value.map(item => ({
    question: asText(item?.question),
    answer: asText(item?.answer)
  })).filter(item => item.question || item.answer);
};

const normalizeImageItems = (value: unknown, legacyData: Record<string, any> = {}): LandingImageItem[] => {
  if (Array.isArray(value)) {
    const items = value.map(item => ({
      url: asText(item?.url).trim(),
      alt: asText(item?.alt),
      caption: asText(item?.caption)
    })).filter(item => item.url);
    if (items.length) return items;
  }
  const legacyUrl = asText(legacyData.url).trim();
  return legacyUrl ? [{ url: legacyUrl, alt: asText(legacyData.alt, 'Visual produk'), caption: asText(legacyData.caption) }] : [];
};

const normalizeTestimonialRating = (value: unknown) => Math.min(5, Math.max(1, Math.round(Number(value) || 5)));

const normalizeTestimonialItems = (value: unknown, legacyData: Record<string, any> = {}): LandingTestimonialItem[] => {
  if (Array.isArray(value)) {
    return value.slice(0, 20).map(item => ({
      quote: asText(item?.quote),
      name: asText(item?.name),
      role: asText(item?.role),
      rating: normalizeTestimonialRating(item?.rating)
    }));
  }
  const legacyItem = {
    quote: asText(legacyData.quote),
    name: asText(legacyData.name),
    role: asText(legacyData.role),
    rating: normalizeTestimonialRating(legacyData.rating)
  };
  return legacyItem.quote || legacyItem.name || legacyItem.role ? [legacyItem] : [];
};

const normalizeLandingBlock = (value: any, index: number): LandingBlock => {
  const type = LANDING_BLOCK_TYPES.has(value?.type) ? value.type as LandingBlockType : 'text';
  const fallback = createLandingBlock(type, index);
  const rawData = value?.data && typeof value.data === 'object' && !Array.isArray(value.data) ? value.data : {};
  const data = { ...fallback.data, ...rawData };
  if (type === 'features') data.items = normalizeLineItems(rawData.items, fallback.data.items);
  if (type === 'hero') {
    data.imageBoxScale = normalizeHeroImageScale(rawData.imageBoxScale, fallback.data.imageBoxScale);
    data.imageScale = normalizeHeroImageScale(rawData.imageScale, fallback.data.imageScale);
    data.imagePositionX = normalizeHeroImagePosition(rawData.imagePositionX);
    data.imagePositionY = normalizeHeroImagePosition(rawData.imagePositionY);
  }
  if (type === 'pricing') data.features = Array.isArray(rawData.features) ? rawData.features.map((item: unknown) => asText(item)).filter(Boolean) : fallback.data.features;
  if (type === 'faq') data.items = normalizeFaqItems(rawData.items, fallback.data.items);
  if (type === 'image') {
    data.images = normalizeImageItems(rawData.images, rawData);
    data.layout = (['slider', 'marquee', 'row'].includes(rawData.layout) ? rawData.layout : fallback.data.layout) as LandingImageLayout;
  }
  if (type === 'testimonial') data.items = normalizeTestimonialItems(rawData.items, rawData);
  return {
    id: asText(value?.id, fallback.id),
    type,
    data
  };
};

const mapLandingRow = (row: any): LandingPage => ({
  id: asText(row?.id),
  slug: asText(row?.slug),
  title: asText(row?.title, 'Landing Page Baru'),
  description: asText(row?.description) === DEFAULT_LANDING_DESCRIPTION ? '' : asText(row?.description),
  theme: (['navy', 'emerald', 'coral', 'violet', 'amber'].includes(row?.theme) ? row.theme : 'navy') as FormThemeKey,
  status: (['published', 'archived'].includes(row?.status) ? row.status : 'draft') as LandingPageStatus,
  blocks: Array.isArray(row?.blocks) ? row.blocks.map(normalizeLandingBlock) : [],
  createdAt: row?.created_at ?? row?.createdAt,
  updatedAt: row?.updated_at ?? row?.updatedAt
});

const createDefaultLandingPage = (): LandingPage => ({
  id: '',
  slug: `landing-${Date.now()}`,
  title: 'Produk Baru',
  description: '',
  theme: 'navy',
  status: 'draft',
  blocks: ['hero', 'features', 'payment', 'cta'].map((type, index) => createLandingBlock(type as LandingBlockType, index))
});

const landingWriteRow = (page: LandingPage) => ({
  ...(page.id ? { id: page.id } : {}),
  slug: page.slug,
  title: page.title,
  description: page.description,
  theme: page.theme,
  status: page.status,
  blocks: page.blocks,
  updated_at: new Date().toISOString()
});

const createLandingShareLink = (slug: string) => {
  const url = new URL(window.location.origin);
  url.pathname = `/landing/${encodeURIComponent(slug)}`;
  return url.toString();
};

const safeHref = (value: unknown) => {
  const href = asText(value).trim();
  if (!href) return '';
  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(href)) return href;
  return '';
};

const normalizeWhatsAppNumber = (value: unknown) => {
  const digits = asText(value).replace(/[^\d]/g, '');
  if (!digits) return '';
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
};

const whatsappHref = (phone: unknown, pageTitle: string, paymentAmount?: string) => {
  const normalized = normalizeWhatsAppNumber(phone);
  if (!normalized) return '';
  const amount = paymentAmount?.trim() || 'akan saya informasikan melalui chat ini';
  const message = [
    `Halo, saya sudah melakukan pembelian untuk ${pageTitle}.`,
    '',
    `Nominal pembayaran: ${amount}`,
    '',
    'Mohon bantuannya untuk follow-up langkah selanjutnya setelah pembelian, termasuk konfirmasi pembayaran dan informasi akses, jadwal, atau instruksi berikutnya.',
    'Bukti transfer siap saya kirimkan di chat ini bila diperlukan.',
    '',
    'Terima kasih.'
  ].join('\n');
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
};

const errorMessage = (error: any) => {
  const message = asText(error?.message || error, 'Terjadi kesalahan.');
  if (message.includes('duplicate key') && message.includes('slug')) return 'Slug landing page sudah digunakan. Pilih slug yang berbeda.';
  if (message.includes('landing_pages') || message.includes('get_public_landing_page')) return 'Database landing page belum siap. Jalankan migration Landing Page Maker terbaru.';
  if (message.includes('Landing page tidak ditemukan')) return message;
  return message;
};

const readImageDataUrl = (file: File, maxWidth = 1600, preservePng = false): Promise<string> => new Promise((resolve, reject) => {
  if (!file.type.startsWith('image/')) {
    reject(new Error('Pilih file gambar.'));
    return;
  }
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
      if (!context) {
        reject(new Error('Gambar gagal diproses.'));
        return;
      }
      context.imageSmoothingEnabled = !preservePng;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL(preservePng ? 'image/png' : 'image/jpeg', preservePng ? undefined : 0.82);
      if (dataUrl.length > 2_000_000) {
        reject(new Error('Ukuran gambar terlalu besar. Gunakan gambar yang lebih kecil.'));
        return;
      }
      resolve(dataUrl);
    };
    image.src = String(reader.result);
  };
  reader.readAsDataURL(file);
});

const NoticeBanner: React.FC<{ notice: Notice | null }> = ({ notice }) => notice ? (
  <div className={`rounded-xl border p-4 text-sm ${notice.tone === 'success' ? 'border-[var(--border)] bg-[var(--success-soft)] text-[var(--success-text)]' : 'border-[var(--border)] bg-[var(--danger-soft)] text-[var(--danger-text)]'}`}>
    {notice.message}
  </div>
) : null;

const ActionLink: React.FC<{ label: string; href?: string; className?: string }> = ({ label, href, className = '' }) => href ? (
  <a href={safeHref(href) || '#'} className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] ${className}`}>
    {label} <ExternalLink size={15} />
  </a>
) : null;

const getVideoEmbedUrl = (value: unknown) => {
  const url = safeHref(value);
  if (!url) return '';
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v');
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : '';
    }
    if (parsed.hostname === 'youtu.be') return `https://www.youtube.com/embed/${encodeURIComponent(parsed.pathname.slice(1))}`;
  } catch {
    return '';
  }
  return '';
};

const LandingImageLightbox: React.FC<{
  items: LandingImageItem[];
  activeIndex: number | null;
  onClose: () => void;
  onChange: (index: number) => void;
}> = ({ items, activeIndex, onClose, onChange }) => {
  useEffect(() => {
    if (activeIndex === null) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && items.length > 1) onChange((activeIndex - 1 + items.length) % items.length);
      if (event.key === 'ArrowRight' && items.length > 1) onChange((activeIndex + 1) % items.length);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeIndex, items.length, onChange, onClose]);

  if (activeIndex === null || !items[activeIndex]) return null;
  const item = items[activeIndex];

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483647] flex min-h-screen items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      style={{ zIndex: 2147483647 }}
      role="dialog"
      aria-modal="true"
      aria-label="Preview foto"
      onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="relative flex max-h-[92vh] max-w-[min(1100px,94vw)] flex-col items-center rounded-2xl border border-white/15 bg-slate-950/70 p-3 shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Tutup preview foto" title="Tutup preview" className="absolute right-3 top-3 z-10 rounded-full bg-slate-950/70 p-2 text-white transition-colors hover:bg-slate-800">
          <X size={18} />
        </button>
        <img src={item.url} alt={item.alt || `Foto produk ${activeIndex + 1}`} className="max-h-[78vh] max-w-full rounded-xl object-contain" />
        {items.length > 1 && (
          <>
            <button type="button" onClick={() => onChange((activeIndex - 1 + items.length) % items.length)} aria-label="Foto sebelumnya" title="Foto sebelumnya" className="absolute left-5 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/70 p-2.5 text-white transition-colors hover:bg-slate-800">
              <ChevronLeft size={20} />
            </button>
            <button type="button" onClick={() => onChange((activeIndex + 1) % items.length)} aria-label="Foto berikutnya" title="Foto berikutnya" className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/70 p-2.5 text-white transition-colors hover:bg-slate-800">
              <ChevronRight size={20} />
            </button>
          </>
        )}
        <div className="flex w-full items-center justify-between gap-4 px-2 pb-1 pt-3 text-xs text-white/80">
          <span>{item.caption || 'Preview foto produk'}</span>
          {items.length > 1 && <span className="shrink-0">{activeIndex + 1} / {items.length}</span>}
        </div>
      </div>
    </div>,
    document.body
  );
};

const LandingImageGalleryBlock: React.FC<{ data: Record<string, any> }> = ({ data }) => {
  const items = normalizeImageItems(data.images, data);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    setActiveIndex(current => Math.min(current, Math.max(0, items.length - 1)));
    setLightboxIndex(current => current !== null && current < items.length ? current : null);
  }, [items.length]);

  if (!items.length) {
    return <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] text-sm text-[var(--muted)]">Upload gambar untuk menampilkan galeri produk.</div>;
  }

  const layout = (['slider', 'marquee', 'row'].includes(data.layout) ? data.layout : 'row') as LandingImageLayout;
  const openPreview = (index: number) => setLightboxIndex(index);
  const renderImageButton = (item: LandingImageItem, index: number, className: string, duplicate = false) => (
    <button
      key={`${item.url}-${index}-${duplicate ? 'copy' : 'main'}`}
      type="button"
      onClick={() => openPreview(index % items.length)}
      tabIndex={duplicate ? -1 : undefined}
      aria-hidden={duplicate ? true : undefined}
      aria-label={`Lihat ${item.alt || `foto produk ${index % items.length + 1}`}`}
      className={`group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] ${className}`}
    >
      <img src={item.url} alt={duplicate ? '' : item.alt || `Foto produk ${index + 1}`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
      <span className="pointer-events-none absolute inset-0 bg-slate-950/0 transition-colors group-hover:bg-slate-950/10" />
    </button>
  );

  return (
    <>
      {layout === 'slider' ? (
        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="relative">
            {renderImageButton(items[activeIndex], activeIndex, 'block aspect-[16/9] w-full rounded-none border-0')}
            {items.length > 1 && (
              <>
                <button type="button" onClick={() => setActiveIndex((activeIndex - 1 + items.length) % items.length)} aria-label="Foto sebelumnya" title="Foto sebelumnya" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/65 p-2 text-white transition-colors hover:bg-slate-800">
                  <ChevronLeft size={18} />
                </button>
                <button type="button" onClick={() => setActiveIndex((activeIndex + 1) % items.length)} aria-label="Foto berikutnya" title="Foto berikutnya" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/65 p-2 text-white transition-colors hover:bg-slate-800">
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <p className="min-w-0 truncate text-xs text-[var(--muted)]">{items[activeIndex].caption || 'Klik foto untuk memperbesar.'}</p>
            {items.length > 1 && <div className="flex shrink-0 items-center gap-1.5" aria-label="Pilih foto">{items.map((item, index) => <button key={`${item.url}-dot-${index}`} type="button" onClick={() => setActiveIndex(index)} aria-label={`Tampilkan foto ${index + 1}`} aria-current={index === activeIndex ? 'true' : undefined} className={`h-2 w-2 rounded-full transition-colors ${index === activeIndex ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)] hover:bg-[var(--muted)]'}`} />)}</div>}
          </div>
        </section>
      ) : layout === 'marquee' ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
          <div className="landing-gallery-marquee flex w-max gap-3">
            {items.map((item, index) => renderImageButton(item, index, 'h-44 w-64 shrink-0 sm:h-52 sm:w-80'))}
            {items.map((item, index) => renderImageButton(item, index, 'h-44 w-64 shrink-0 sm:h-52 sm:w-80', true))}
          </div>
          <p className="px-1 pb-1 pt-3 text-xs text-[var(--muted)]">Gallery bergerak otomatis. Arahkan kursor untuk menjeda, atau klik foto untuk melihat preview.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
          <div className="flex min-w-max gap-3">
            {items.map((item, index) => renderImageButton(item, index, 'h-44 w-64 shrink-0 sm:h-52 sm:w-80'))}
          </div>
          <p className="px-1 pb-1 pt-3 text-xs text-[var(--muted)]">Gallery satu baris. Klik foto untuk melihat preview.</p>
        </div>
      )}
      <LandingImageLightbox items={items} activeIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} onChange={setLightboxIndex} />
    </>
  );
};

const LandingTestimonialCard: React.FC<{ item: LandingTestimonialItem; index: number }> = ({ item, index }) => {
  const rating = normalizeTestimonialRating(item.rating);
  const displayName = item.name.trim() || 'Pelanggan';
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'P';

  return (
    <article className="flex h-full min-w-0 flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-0.5 text-[var(--accent-strong)]" role="img" aria-label={`Rating ${rating} dari 5`}>
          {Array.from({ length: 5 }, (_, starIndex) => <Star key={`${index}-star-${starIndex}`} size={15} fill={starIndex < rating ? 'currentColor' : 'none'} />)}
        </div>
        <Quote size={18} className="text-[var(--border-strong)]" aria-hidden="true" />
      </div>
      <blockquote className="mt-4 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">“{item.quote.trim() || 'Tambahkan pengalaman pelanggan di sini.'}”</blockquote>
      <div className="mt-5 flex items-center gap-3 border-t border-[var(--border)] pt-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent-strong)]" aria-hidden="true">{initials}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{displayName}</p>
          {item.role.trim() && <p className="truncate text-xs text-[var(--muted)]">{item.role.trim()}</p>}
        </div>
      </div>
    </article>
  );
};

const LandingTestimonialGridBlock: React.FC<{ data: Record<string, any> }> = ({ data }) => {
  const items = normalizeTestimonialItems(data.items, data);
  const pageSize = 3;
  const pages = Array.from({ length: Math.ceil(items.length / pageSize) }, (_, index) => items.slice(index * pageSize, (index + 1) * pageSize));
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activePage, setActivePage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const nextPage = Math.min(activePage, Math.max(0, pages.length - 1));
    if (nextPage !== activePage) setActivePage(nextPage);
    if (scrollRef.current && pages.length <= 1) scrollRef.current.scrollLeft = 0;
  }, [activePage, pages.length]);

  useEffect(() => {
    if (pages.length <= 1 || isPaused || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const intervalId = window.setInterval(() => {
      setActivePage(currentPage => {
        const nextPage = (currentPage + 1) % pages.length;
        const container = scrollRef.current;
        if (container) container.scrollTo({ left: nextPage * container.clientWidth, behavior: 'smooth' });
        return nextPage;
      });
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [isPaused, pages.length]);

  const scrollToPage = (pageIndex: number) => {
    const nextPage = (pageIndex + pages.length) % pages.length;
    setActivePage(nextPage);
    scrollRef.current?.scrollTo({ left: nextPage * (scrollRef.current.clientWidth || 0), behavior: 'smooth' });
  };

  if (!items.length) {
    return <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] text-sm text-[var(--muted)]">Tambahkan testimoni pelanggan untuk menampilkan card.</div>;
  }

  const renderCard = (item: LandingTestimonialItem, index: number) => <LandingTestimonialCard key={`${item.name}-${index}`} item={item} index={index} />;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-5 shadow-sm md:p-6" aria-label="Testimoni pelanggan">
      {pages.length <= 1 ? (
        <div className="grid gap-4 md:grid-cols-3">{items.map(renderCard)}</div>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="landing-testimonial-scroll overflow-x-auto scroll-smooth"
            role="region"
            aria-label="Daftar testimoni yang bergeser otomatis"
            tabIndex={0}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocus={() => setIsPaused(true)}
            onBlur={() => setIsPaused(false)}
            onScroll={event => {
              const container = event.currentTarget;
              const pageIndex = container.clientWidth ? Math.round(container.scrollLeft / container.clientWidth) : 0;
              if (pageIndex !== activePage) setActivePage(Math.min(pageIndex, pages.length - 1));
            }}
          >
            <div className="flex w-full">
              {pages.map((page, pageIndex) => <div key={`testimonial-page-${pageIndex}`} className="grid w-full min-w-full max-w-full shrink-0 grid-cols-1 gap-4 md:grid-cols-3">{page.map((item, itemIndex) => renderCard(item, pageIndex * pageSize + itemIndex))}</div>)}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-[var(--muted)]">Testimoni bergeser otomatis · arahkan kursor untuk menjeda</p>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => scrollToPage(activePage - 1)} aria-label="Testimoni sebelumnya" title="Testimoni sebelumnya" className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1.5 text-[var(--muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)]"><ChevronLeft size={15} /></button>
              {pages.map((_, pageIndex) => <button key={`testimonial-dot-${pageIndex}`} type="button" onClick={() => scrollToPage(pageIndex)} aria-label={`Tampilkan testimoni halaman ${pageIndex + 1}`} aria-current={pageIndex === activePage ? 'true' : undefined} className={`h-2 w-2 rounded-full transition-colors ${pageIndex === activePage ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)] hover:bg-[var(--muted)]'}`} />)}
              <button type="button" onClick={() => scrollToPage(activePage + 1)} aria-label="Testimoni berikutnya" title="Testimoni berikutnya" className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1.5 text-[var(--muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)]"><ChevronRight size={15} /></button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export const LandingBlockRenderer: React.FC<{ block: LandingBlock; pageTitle?: string }> = ({ block, pageTitle = 'produk ini' }) => {
  const data = block.data || {};
  const textBody = asText(data.body);
  const sectionHeadingColor = headingColorValue(data.headingColor);
  switch (block.type) {
    case 'hero':
      const heroImageBoxScale = normalizeHeroImageScale(data.imageBoxScale, 1);
      const heroImageScale = normalizeHeroImageScale(data.imageScale);
      const heroImagePositionX = normalizeHeroImagePosition(data.imagePositionX);
      const heroImagePositionY = normalizeHeroImagePosition(data.imagePositionY);
      return (
        <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-sm md:p-10">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[var(--accent-soft)] opacity-70" aria-hidden="true" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-center">
            <div>
              {asText(data.eyebrow) && <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">{asText(data.eyebrow)}</p>}
              <h2 className="mt-3 max-w-3xl text-3xl font-bold leading-tight md:text-5xl" style={{ color: sectionHeadingColor }}>{asText(data.headline, 'Judul produk Anda')}</h2>
              {textBody && <p className="mt-4 max-w-2xl whitespace-pre-wrap text-base leading-relaxed text-[var(--muted)]">{textBody}</p>}
              <ActionLink label={asText(data.buttonLabel, 'Pelajari lebih lanjut')} href={asText(data.buttonUrl)} className="mt-6" />
            </div>
            {asText(data.imageUrl) ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[var(--surface-soft)] shadow-sm transition-transform duration-200 ease-out" style={{ transform: `scale(${heroImageBoxScale})`, transformOrigin: 'center right' }}>
                <img src={asText(data.imageUrl)} alt={asText(data.imageAlt, 'Visual produk')} className="absolute inset-0 h-full w-full object-cover transition-transform duration-200" style={{ objectPosition: `${heroImagePositionX}% ${heroImagePositionY}%`, transform: `scale(${heroImageScale})` }} />
              </div>
            ) : (
              <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] text-center text-xs text-[var(--muted)]">Visual produk dapat ditambahkan dari pengaturan blok.</div>
            )}
          </div>
        </section>
      );
    case 'text':
      return (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-bold" style={{ color: sectionHeadingColor }}>{asText(data.heading, 'Tentang produk')}</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">{textBody || 'Tambahkan penjelasan produk Anda.'}</p>
        </section>
      );
    case 'image':
      return <LandingImageGalleryBlock data={data} />;
    case 'video': {
      const embedUrl = getVideoEmbedUrl(data.url);
      return (
        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          {embedUrl ? <div className="aspect-video bg-black"><iframe title={asText(data.caption, 'Video produk')} src={embedUrl} className="h-full w-full" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div> : <div className="flex aspect-video items-center justify-center bg-[var(--surface-soft)] text-sm text-[var(--muted)]">Tambahkan link YouTube untuk menampilkan video.</div>}
          {asText(data.caption) && <p className="px-5 py-3 text-sm text-[var(--muted)]">{asText(data.caption)}</p>}
        </section>
      );
    }
    case 'features':
      return (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold" style={{ color: sectionHeadingColor }}>{asText(data.heading, 'Manfaat produk')}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {normalizeLineItems(data.items, []).map((item, index) => (
              <div key={`${item.title}-${index}`} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent-strong)]">{index + 1}</span>
                <h3 className="mt-4 font-semibold">{item.title || 'Manfaat produk'}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      );
    case 'pricing':
      return (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm md:p-8">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_240px] md:items-center">
            <div>
              <h2 className="text-2xl font-bold" style={{ color: sectionHeadingColor }}>{asText(data.heading, 'Pilihan paket')}</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">{textBody}</p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                {(Array.isArray(data.features) ? data.features : []).map((feature: unknown, index: number) => <li key={`${asText(feature)}-${index}`} className="flex items-start gap-2"><Check size={16} className="mt-0.5 shrink-0 text-[var(--success-text)]" /> {asText(feature)}</li>)}
              </ul>
            </div>
            <div className="rounded-2xl bg-[var(--accent-soft)] p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Mulai dari</p>
              <p className="mt-2 text-2xl font-bold text-[var(--accent-strong)]">{asText(data.price, 'Hubungi kami')}</p>
              <ActionLink label={asText(data.buttonLabel, 'Daftar sekarang')} href={asText(data.buttonUrl)} className="mt-5 w-full" />
            </div>
          </div>
        </section>
      );
    case 'testimonial':
      return <LandingTestimonialGridBlock data={data} />;
    case 'faq':
      return (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold" style={{ color: sectionHeadingColor }}>{asText(data.heading, 'Pertanyaan umum')}</h2>
          <div className="space-y-3">
            {normalizeFaqItems(data.items, []).map((item, index) => <details key={`${item.question}-${index}`} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"><summary className="cursor-pointer list-none pr-6 font-semibold marker:hidden">{item.question || 'Pertanyaan umum'}</summary><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">{item.answer}</p></details>)}
          </div>
        </section>
      );
    case 'payment': {
      const confirmationHref = whatsappHref(data.whatsapp, pageTitle, asText(data.amount)) || safeHref(data.buttonUrl);
      const ctaBeforePrice = asText(data.ctaBeforePrice).trim();
      const originalAmount = asText(data.originalAmount).trim();
      return (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-6 shadow-sm md:p-8">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_230px] md:items-center">
            <div>
              {ctaBeforePrice && <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-strong)]">{ctaBeforePrice}</p>}
              <h2 className="text-2xl font-bold" style={{ color: sectionHeadingColor }}>{asText(data.heading, 'Informasi pembayaran')}</h2>
              {(originalAmount || asText(data.amount)) && <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">{originalAmount && <span className="text-base font-semibold text-[var(--muted)] line-through">{originalAmount}</span>}{asText(data.amount) && <p className="text-2xl font-bold text-[var(--accent-strong)]">{asText(data.amount)}</p>}</div>}
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">{asText(data.instructions, 'Tambahkan instruksi pembayaran.')}</p>
              {asText(data.accountNumber) && <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Nomor rekening</p><p className="mt-1 break-words text-sm font-semibold">{asText(data.accountNumber)}</p></div>}
              {confirmationHref && <a href={confirmationHref} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#128c7e] px-5 py-3 text-sm font-semibold text-white hover:brightness-95">{asText(data.buttonLabel, 'Konfirmasi melalui WhatsApp')} <ExternalLink size={15} /></a>}
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-center">
              <p className="mb-3 text-xs font-semibold text-[var(--muted)]">QR Code pembayaran</p>
              {asText(data.qrCode) ? <img src={asText(data.qrCode)} alt="QR Code pembayaran" className="mx-auto aspect-square w-full max-w-[190px] object-contain" /> : <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-[var(--border-strong)] px-4 text-xs leading-relaxed text-[var(--muted)]">Upload QR Code dari pengaturan blok.</div>}
            </div>
          </div>
        </section>
      );
    }
    case 'cta':
      return (
        <section className="rounded-2xl bg-[var(--accent)] p-7 text-white shadow-sm md:flex md:items-center md:justify-between md:gap-8 md:p-9">
          <div><h2 className="text-2xl font-bold" style={{ color: isHexColor(data.headingColor) ? asText(data.headingColor).trim() : 'white' }}>{asText(data.heading, 'Siap mulai?')}</h2><p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-white/80">{asText(data.body)}</p></div>
          <ActionLink label={asText(data.buttonLabel, 'Hubungi kami')} href={asText(data.buttonUrl)} className="mt-5 shrink-0 bg-white text-[var(--accent-strong)] hover:bg-white/90 md:mt-0" />
        </section>
      );
    case 'spacer':
      return <div aria-hidden="true" style={{ height: `${Math.min(240, Math.max(8, Number(data.height) || 48))}px` }} />;
    default:
      return null;
  }
};

const LandingPageShell: React.FC<{ page: LandingPage; children: React.ReactNode; preview?: boolean }> = ({ page, children, preview = false }) => (
  <div className={`${preview ? 'rounded-2xl border border-[var(--border)] p-3 md:p-5' : 'min-h-screen p-4 md:p-8'} bg-[var(--app-bg)]`} style={formThemeStyle(page.theme)}>
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-center gap-3 border-b border-[var(--border)] pb-5">
        <img src={logoUtama} alt="Arunika" className="h-10 w-14 object-contain" />
        <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">{LANDING_PAGE_PUBLIC_LABEL}</p><h1 className="truncate text-xl font-bold">{page.title}</h1></div>
      </header>
      {page.description && <p className="max-w-3xl text-sm leading-relaxed text-[var(--muted)]">{page.description}</p>}
      <main className="space-y-5">{children}</main>
      {!preview && <footer className="border-t border-[var(--border)] pt-5 text-center text-xs text-[var(--muted)]">Dibuat dengan Arunika Landing Page</footer>}
    </div>
  </div>
);

const LandingPagePreview: React.FC<{ page: LandingPage; editable?: boolean; selectedBlockId?: string; onSelect?: (id: string) => void; onDrop?: (event: React.DragEvent, index: number) => void; onDragStart?: (event: React.DragEvent, blockId: string) => void; onMove?: (index: number, direction: -1 | 1) => void; onRemove?: (id: string) => void }> = ({ page, editable = false, selectedBlockId, onSelect, onDrop, onDragStart, onMove, onRemove }) => (
  <LandingPageShell page={page} preview={editable}>
    {page.blocks.length === 0 && editable ? <div onDragOver={event => event.preventDefault()} onDrop={event => onDrop?.(event, 0)} className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-[var(--border-strong)] text-sm text-[var(--muted)]">Tarik elemen ke sini atau pilih elemen dari panel kiri.</div> : page.blocks.map((block, index) => (
      <div key={block.id} draggable={editable} onDragStart={event => onDragStart?.(event, block.id)} onDragOver={event => { if (editable) event.preventDefault(); }} onDrop={event => onDrop?.(event, index)} onClick={event => { if (!editable) return; event.preventDefault(); onSelect?.(block.id); }} className={`group relative rounded-3xl transition-shadow ${editable ? `cursor-grab ${selectedBlockId === block.id ? 'ring-2 ring-[var(--accent)] ring-offset-2' : 'hover:ring-2 hover:ring-[var(--accent-soft)]'}` : ''}`}>
        {editable && <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)]/95 p-1 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <span className="px-1 text-[var(--muted)]" title="Tarik untuk mengurutkan"><GripVertical size={15} /></span>
          <button type="button" aria-label={`Naikkan ${LANDING_BLOCK_LABELS[block.type]}`} disabled={index === 0} onClick={event => { event.stopPropagation(); onMove?.(index, -1); }} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-soft)] disabled:opacity-30"><MoveUp size={14} /></button>
          <button type="button" aria-label={`Turunkan ${LANDING_BLOCK_LABELS[block.type]}`} disabled={index === page.blocks.length - 1} onClick={event => { event.stopPropagation(); onMove?.(index, 1); }} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-soft)] disabled:opacity-30"><MoveDown size={14} /></button>
          <button type="button" aria-label={`Hapus ${LANDING_BLOCK_LABELS[block.type]}`} onClick={event => { event.stopPropagation(); onRemove?.(block.id); }} className="rounded-lg p-1.5 text-[var(--danger-text)] hover:bg-[var(--danger-soft)]"><Trash2 size={14} /></button>
        </div>}
        <LandingBlockRenderer block={block} pageTitle={page.title} />
      </div>
    ))}
    {editable && page.blocks.length > 0 && <div onDragOver={event => event.preventDefault()} onDrop={event => onDrop?.(event, page.blocks.length)} className="h-8 rounded-xl border border-dashed border-transparent transition-colors hover:border-[var(--border-strong)]" aria-label="Taruh elemen di bagian paling bawah" />}
  </LandingPageShell>
);

const ImageUploader: React.FC<{ label: string; value: string; onChange: (value: string) => void; preservePng?: boolean }> = ({ label, value, onChange, preservePng = false }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    setIsProcessing(true);
    try {
      onChange(await readImageDataUrl(file, preservePng ? 1000 : 1600, preservePng));
    } catch (uploadError: any) {
      setError(uploadError?.message || 'Gambar gagal diproses.');
    } finally {
      setIsProcessing(false);
    }
  };
  return <div className="space-y-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-[var(--muted)]">{label}</p>{value && <button type="button" onClick={() => onChange('')} className="text-xs font-semibold text-[var(--danger-text)] hover:underline">Hapus gambar</button>}</div><div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">{value ? <img src={value} alt={`Preview ${label}`} className="max-h-48 w-full rounded-lg object-contain" /> : <div className="flex min-h-28 items-center justify-center gap-2 text-sm text-[var(--muted)]"><ImagePlus size={22} /> Belum ada gambar</div>}</div><input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} /><Button type="button" variant="secondary" icon={Upload} onClick={() => inputRef.current?.click()} isLoading={isProcessing}>Upload gambar</Button>{error && <p className="text-xs text-[var(--danger-text)]">{error}</p>}</div>;
};

const HeroImageControls: React.FC<{
  imageUrl: string;
  boxScale: number;
  scale: number;
  positionX: number;
  positionY: number;
  onChange: (values: Record<string, number>) => void;
}> = ({ imageUrl, boxScale, scale, positionX, positionY, onChange }) => {
  const boxSizePercent = Math.round(normalizeHeroImageScale(boxScale, 1) * 100);
  const sizePercent = Math.round(normalizeHeroImageScale(scale) * 100);
  const horizontalPosition = normalizeHeroImagePosition(positionX);
  const verticalPosition = normalizeHeroImagePosition(positionY);
  const rangeClass = 'h-2 w-full cursor-pointer accent-[var(--accent)]';

  return (
    <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
      <div>
        <p className="text-xs font-semibold text-[var(--muted)]">Atur tampilan gambar</p>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">Geser posisi dan ubah ukuran gambar yang tampil di Hero.</p>
      </div>
      {imageUrl ? <>
        <label className="flex flex-col gap-2">
          <span className="flex items-center justify-between gap-3 text-xs font-semibold text-[var(--muted)]"><span>Ukuran box media</span><span className="text-[var(--text)]">{boxSizePercent}%</span></span>
          <input type="range" min="75" max="150" step="5" value={boxSizePercent} onChange={event => onChange({ imageBoxScale: Number(event.target.value) / 100 })} className={rangeClass} aria-label="Ukuran box media Hero" />
          <span className="flex justify-between text-[10px] text-[var(--muted)]"><span>Kecil</span><span>Besar</span></span>
        </label>
        <label className="flex flex-col gap-2">
          <span className="flex items-center justify-between gap-3 text-xs font-semibold text-[var(--muted)]"><span>Ukuran gambar</span><span className="text-[var(--text)]">{sizePercent}%</span></span>
          <input type="range" min="70" max="170" step="5" value={sizePercent} onChange={event => onChange({ imageScale: Number(event.target.value) / 100 })} className={rangeClass} aria-label="Ukuran gambar Hero" />
          <span className="flex justify-between text-[10px] text-[var(--muted)]"><span>Kecil</span><span>Besar</span></span>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="flex items-center justify-between gap-2 text-xs font-semibold text-[var(--muted)]"><span>Geser horizontal</span><span className="text-[var(--text)]">{Math.round(horizontalPosition)}%</span></span>
            <input type="range" min="0" max="100" step="1" value={horizontalPosition} onChange={event => onChange({ imagePositionX: Number(event.target.value) })} className={rangeClass} aria-label="Posisi horizontal gambar Hero" />
            <span className="flex justify-between text-[10px] text-[var(--muted)]"><span>Kiri</span><span>Kanan</span></span>
          </label>
          <label className="flex flex-col gap-2">
            <span className="flex items-center justify-between gap-2 text-xs font-semibold text-[var(--muted)]"><span>Geser vertikal</span><span className="text-[var(--text)]">{Math.round(verticalPosition)}%</span></span>
            <input type="range" min="0" max="100" step="1" value={verticalPosition} onChange={event => onChange({ imagePositionY: Number(event.target.value) })} className={rangeClass} aria-label="Posisi vertikal gambar Hero" />
            <span className="flex justify-between text-[10px] text-[var(--muted)]"><span>Atas</span><span>Bawah</span></span>
          </label>
        </div>
      </> : <p className="rounded-lg border border-dashed border-[var(--border-strong)] px-3 py-3 text-[11px] leading-relaxed text-[var(--muted)]">Upload visual Hero terlebih dahulu untuk mengatur ukuran dan posisinya.</p>}
    </div>
  );
};

const ImageGalleryUploader: React.FC<{ items: LandingImageItem[]; onChange: (items: LandingImageItem[]) => void }> = ({ items, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const maxImages = 10;

  const updateItem = (index: number, patch: Partial<LandingImageItem>) => onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const removeItem = (index: number) => onChange(items.filter((_, itemIndex) => itemIndex !== index));

  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    setError(null);
    const available = Math.max(0, maxImages - items.length);
    if (!available) {
      setError(`Maksimal ${maxImages} foto per galeri.`);
      return;
    }
    const selectedFiles = files.slice(0, available);
    setIsProcessing(true);
    try {
      const uploadedUrls = await Promise.all(selectedFiles.map(file => readImageDataUrl(file, 1400)));
      onChange([
        ...items,
        ...uploadedUrls.map(url => ({ url, alt: 'Visual produk', caption: '' }))
      ]);
      if (files.length > selectedFiles.length) setError(`Hanya ${available} foto yang ditambahkan. Maksimal ${maxImages} foto per galeri.`);
    } catch (uploadError: any) {
      setError(uploadError?.message || 'Gambar gagal diproses.');
    } finally {
      setIsProcessing(false);
    }
  };

  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    if (items.length >= maxImages) {
      setError(`Maksimal ${maxImages} foto per galeri.`);
      return;
    }
    if (!safeHref(url)) {
      setError('Masukkan URL gambar yang valid, misalnya https://.../foto.jpg.');
      return;
    }
    setError(null);
    onChange([...items, { url, alt: 'Visual produk', caption: '' }]);
    setUrlInput('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-[var(--muted)]">Foto galeri</p>
        <span className="text-[11px] text-[var(--muted)]">{items.length}/{maxImages} foto</span>
      </div>
      {items.length ? (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={`${item.url}-${index}`} className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
              <div className="flex items-start gap-3">
                <img src={item.url} alt={item.alt || `Foto produk ${index + 1}`} className="h-20 w-20 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface)] object-cover" />
                <div className="min-w-0 flex-1 space-y-3">
                  <Input label={`Alt foto ${index + 1}`} value={item.alt} onChange={event => updateItem(index, { alt: event.target.value })} placeholder="Visual produk" />
                  <Input label="Caption (opsional)" value={item.caption} onChange={event => updateItem(index, { caption: event.target.value })} placeholder="Keterangan foto" />
                </div>
                <button type="button" onClick={() => removeItem(index)} aria-label={`Hapus foto ${index + 1}`} title={`Hapus foto ${index + 1}`} className="rounded-lg p-2 text-[var(--danger-text)] transition-colors hover:bg-[var(--danger-soft)]">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] px-4 text-center text-xs leading-relaxed text-[var(--muted)]">Belum ada foto. Upload beberapa foto untuk membuat detail produk lebih menarik.</div>
      )}
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      <Button type="button" variant="secondary" icon={Upload} onClick={() => inputRef.current?.click()} isLoading={isProcessing} disabled={items.length >= maxImages}>Upload beberapa foto</Button>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Input label="Tambah URL foto (opsional)" value={urlInput} onChange={event => setUrlInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addUrl(); } }} placeholder="https://.../foto.jpg" />
        <Button type="button" variant="secondary" onClick={addUrl} disabled={!urlInput.trim() || items.length >= maxImages}>Tambah URL</Button>
      </div>
      <p className="text-[11px] leading-relaxed text-[var(--muted)]">Foto akan dikompres otomatis. Klik foto di halaman publik untuk membuka preview besar.</p>
      {error && <p className="text-xs text-[var(--danger-text)]">{error}</p>}
    </div>
  );
};

const LandingTestimonialEditor: React.FC<{ items: LandingTestimonialItem[]; onChange: (items: LandingTestimonialItem[]) => void }> = ({ items, onChange }) => {
  const maxTestimonials = 20;
  const updateItem = (index: number, patch: Partial<LandingTestimonialItem>) => onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const addItem = () => {
    if (items.length >= maxTestimonials) return;
    onChange([...items, { quote: '', name: '', role: '', rating: 5 }]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-[var(--muted)]">Daftar testimoni</p>
        <span className="text-[11px] text-[var(--muted)]">{items.length}/{maxTestimonials} testimoni</span>
      </div>
      {items.length ? items.map((item, index) => (
        <div key={`testimonial-editor-${index}`} className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Testimoni {index + 1}</p>
            <button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Hapus testimoni ${index + 1}`} className="rounded-lg p-1.5 text-[var(--danger-text)] transition-colors hover:bg-[var(--danger-soft)]"><Trash2 size={16} /></button>
          </div>
          <Textarea label="Testimoni" value={item.quote} onChange={event => updateItem(index, { quote: event.target.value })} placeholder="Ceritakan pengalaman pelanggan..." className="min-h-[120px]" />
          <Input label="Nama pelanggan" value={item.name} onChange={event => updateItem(index, { name: event.target.value })} placeholder="Nama pelanggan" />
          <Input label="Jabatan / keterangan" value={item.role} onChange={event => updateItem(index, { role: event.target.value })} placeholder="Pelanggan" />
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-[var(--muted)]">Rating bintang</span>
            <div className="flex items-center gap-1" role="radiogroup" aria-label={`Rating testimoni ${index + 1}`}>
              {Array.from({ length: 5 }, (_, starIndex) => {
                const rating = starIndex + 1;
                return <button key={`testimonial-rating-${index}-${rating}`} type="button" onClick={() => updateItem(index, { rating })} aria-label={`${rating} bintang`} aria-pressed={item.rating === rating} className="rounded-md p-1 text-[var(--accent-strong)] transition-colors hover:bg-[var(--accent-soft)]"><Star size={20} fill={rating <= item.rating ? 'currentColor' : 'none'} /></button>;
              })}
            </div>
          </div>
        </div>
      )) : <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] px-4 py-6 text-center text-xs leading-relaxed text-[var(--muted)]">Belum ada testimoni. Tambahkan testimoni pertama untuk ditampilkan di halaman publik.</div>}
      <Button type="button" variant="secondary" icon={Plus} onClick={addItem} disabled={items.length >= maxTestimonials}>Tambah testimoni</Button>
      <p className="text-[11px] leading-relaxed text-[var(--muted)]">Pada halaman publik, tiga card tampil per baris. Jika lebih dari tiga, card bergeser otomatis dan bisa dijeda saat diarahkan.</p>
    </div>
  );
};

const pipeItemsToText = (items: Array<{ title: string; description: string }>) => items.map(item => `${item.title} | ${item.description}`).join('\n');
const textToPipeItems = (value: string) => value.split('\n').map(line => line.trim()).filter(Boolean).map(line => { const [title, ...description] = line.split('|'); return { title: title.trim(), description: description.join('|').trim() }; });
const faqItemsToText = (items: Array<{ question: string; answer: string }>) => items.map(item => `${item.question} | ${item.answer}`).join('\n');
const textToFaqItems = (value: string) => value.split('\n').map(line => line.trim()).filter(Boolean).map(line => { const [question, ...answer] = line.split('|'); return { question: question.trim(), answer: answer.join('|').trim() }; });

const BlockInspector: React.FC<{ block: LandingBlock; onChange: (data: Record<string, any>) => void }> = ({ block, onChange }) => {
  const data = block.data || {};
  const patch = (values: Record<string, any>) => onChange({ ...data, ...values });
  const commonButtonFields = <div className="grid gap-4"><Input label="Label tombol" value={asText(data.buttonLabel)} onChange={event => patch({ buttonLabel: event.target.value })} placeholder="Contoh: Daftar sekarang" /><Input label="Link tombol" value={asText(data.buttonUrl)} onChange={event => patch({ buttonUrl: event.target.value })} icon={LinkIcon} placeholder="/form/nama-form atau https://..." /><p className="-mt-2 text-xs leading-relaxed text-[var(--muted)]">Untuk pendaftaran, arahkan ke link Form Maker, misalnya <code>/form/nama-form</code>.</p></div>;
  const hasHeadingColor = ['hero', 'text', 'features', 'pricing', 'faq', 'payment', 'cta'].includes(block.type);
  const headingColorField = hasHeadingColor ? <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3"><div><p className="text-xs font-semibold text-[var(--muted)]">Warna judul section</p><p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">Atur warna judul bagian ini tanpa mengubah warna section lainnya.</p></div><div className="flex items-center gap-3"><input type="color" value={headingColorInputValue(data.headingColor)} onChange={event => patch({ headingColor: event.target.value })} aria-label="Warna judul section" className="h-10 w-14 cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1" /><span className="text-xs font-semibold text-[var(--text)]">{isHexColor(data.headingColor) ? asText(data.headingColor).toUpperCase() : 'Default tema'}</span></div>{isHexColor(data.headingColor) && <button type="button" onClick={() => patch({ headingColor: '' })} className="text-left text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--text)]">Gunakan warna default tema</button>}</div> : null;
  switch (block.type) {
    case 'hero':
      return <div className="space-y-4"><Input label="Eyebrow" value={asText(data.eyebrow)} onChange={event => patch({ eyebrow: event.target.value })} /><Input label="Judul utama" value={asText(data.headline)} onChange={event => patch({ headline: event.target.value })} />{headingColorField}<Textarea label="Deskripsi" value={asText(data.body)} onChange={event => patch({ body: event.target.value })} /><ImageUploader label="Visual hero (opsional)" value={asText(data.imageUrl)} onChange={value => patch({ imageUrl: value })} /><HeroImageControls imageUrl={asText(data.imageUrl)} boxScale={normalizeHeroImageScale(data.imageBoxScale, 1)} scale={normalizeHeroImageScale(data.imageScale)} positionX={normalizeHeroImagePosition(data.imagePositionX)} positionY={normalizeHeroImagePosition(data.imagePositionY)} onChange={values => patch(values)} /><Input label="Alt visual" value={asText(data.imageAlt)} onChange={event => patch({ imageAlt: event.target.value })} />{commonButtonFields}</div>;
    case 'text':
      return <div className="space-y-4"><Input label="Judul bagian" value={asText(data.heading)} onChange={event => patch({ heading: event.target.value })} />{headingColorField}<Textarea label="Isi teks" value={asText(data.body)} onChange={event => patch({ body: event.target.value })} className="min-h-[180px]" /></div>;
    case 'image': {
      const items = normalizeImageItems(data.images, data);
      const layout = (['slider', 'marquee', 'row'].includes(data.layout) ? data.layout : 'row') as LandingImageLayout;
      return (
        <div className="space-y-5">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-[var(--muted)]">Tampilan galeri</span>
            <select
              value={layout}
              onChange={event => patch({ layout: event.target.value as LandingImageLayout })}
              className="min-h-[46px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              {LANDING_IMAGE_LAYOUT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <span className="text-[11px] leading-relaxed text-[var(--muted)]">
              {LANDING_IMAGE_LAYOUT_OPTIONS.find(option => option.value === layout)?.description}
            </span>
          </label>
          <ImageGalleryUploader
            items={items}
            onChange={nextItems => patch({
              images: nextItems,
              url: nextItems[0]?.url || '',
              alt: nextItems[0]?.alt || 'Visual produk',
              caption: nextItems[0]?.caption || ''
            })}
          />
        </div>
      );
    }
    case 'video':
      return <div className="space-y-4"><Input label="Link YouTube" value={asText(data.url)} onChange={event => patch({ url: event.target.value })} icon={LinkIcon} placeholder="https://youtube.com/watch?v=..." /><Textarea label="Keterangan video" value={asText(data.caption)} onChange={event => patch({ caption: event.target.value })} /></div>;
    case 'features':
      return <div className="space-y-4"><Input label="Judul bagian" value={asText(data.heading)} onChange={event => patch({ heading: event.target.value })} />{headingColorField}<Textarea label="Manfaat (satu per baris, format: Judul | Deskripsi)" value={pipeItemsToText(normalizeLineItems(data.items, []))} onChange={event => patch({ items: textToPipeItems(event.target.value) })} className="min-h-[180px]" /></div>;
    case 'pricing':
      return <div className="space-y-4"><Input label="Judul bagian" value={asText(data.heading)} onChange={event => patch({ heading: event.target.value })} />{headingColorField}<Input label="Nominal / harga" value={asText(data.price)} onChange={event => patch({ price: event.target.value })} /><Textarea label="Deskripsi" value={asText(data.body)} onChange={event => patch({ body: event.target.value })} /><Textarea label="Isi paket (satu per baris)" value={Array.isArray(data.features) ? data.features.join('\n') : ''} onChange={event => patch({ features: event.target.value.split('\n').map(value => value.trim()).filter(Boolean) })} />{commonButtonFields}</div>;
    case 'testimonial': {
      const items = normalizeTestimonialItems(data.items, data);
      const updateItems = (nextItems: LandingTestimonialItem[]) => {
        const first = nextItems[0];
        patch({
          items: nextItems,
          quote: first?.quote || '',
          name: first?.name || '',
          role: first?.role || '',
          rating: first?.rating || 5
        });
      };
      return <LandingTestimonialEditor items={items} onChange={updateItems} />;
    }
    case 'faq':
      return <div className="space-y-4"><Input label="Judul bagian" value={asText(data.heading)} onChange={event => patch({ heading: event.target.value })} />{headingColorField}<Textarea label="FAQ (satu per baris, format: Pertanyaan | Jawaban)" value={faqItemsToText(normalizeFaqItems(data.items, []))} onChange={event => patch({ items: textToFaqItems(event.target.value) })} className="min-h-[200px]" /></div>;
    case 'payment':
      return <div className="space-y-4"><Input label="Judul bagian" value={asText(data.heading)} onChange={event => patch({ heading: event.target.value })} />{headingColorField}<Input label="CTA sebelum harga (opsional)" value={asText(data.ctaBeforePrice)} onChange={event => patch({ ctaBeforePrice: event.target.value })} placeholder="Contoh: Dapatkan harga promo hari ini" /><Input label="Harga coret (opsional)" value={asText(data.originalAmount)} onChange={event => patch({ originalAmount: event.target.value })} placeholder="Contoh: Rp 350.000" /><Input label="Nominal pembayaran" value={asText(data.amount)} onChange={event => patch({ amount: event.target.value })} placeholder="Contoh: Rp 250.000" /><Textarea label="Instruksi pembayaran" value={asText(data.instructions)} onChange={event => patch({ instructions: event.target.value })} /><Input label="Nomor rekening (opsional)" value={asText(data.accountNumber)} onChange={event => patch({ accountNumber: event.target.value })} /><Input label="WhatsApp konfirmasi (opsional)" value={asText(data.whatsapp)} onChange={event => patch({ whatsapp: event.target.value })} placeholder="62812xxxxxxx" /><Input label="Label tombol" value={asText(data.buttonLabel)} onChange={event => patch({ buttonLabel: event.target.value })} /><ImageUploader label="QR Code pembayaran" value={asText(data.qrCode)} onChange={value => patch({ qrCode: value })} preservePng /><Input label="URL QR Code (opsional)" value={asText(data.qrCode).startsWith('data:') ? '' : asText(data.qrCode)} onChange={event => patch({ qrCode: event.target.value })} placeholder="https://.../qr.png" /></div>;
    case 'cta':
      return <div className="space-y-4"><Input label="Judul CTA" value={asText(data.heading)} onChange={event => patch({ heading: event.target.value })} />{headingColorField}<Textarea label="Deskripsi CTA" value={asText(data.body)} onChange={event => patch({ body: event.target.value })} />{commonButtonFields}</div>;
    case 'spacer':
      return <div className="space-y-4"><Input label="Tinggi jarak (px)" type="number" min="8" max="240" value={asText(data.height, '48')} onChange={event => patch({ height: event.target.value })} /></div>;
    default:
      return null;
  }
};

const PageSettingsPanel: React.FC<{ page: LandingPage; onChange: (patch: Partial<LandingPage>) => void }> = ({ page, onChange }) => (
  <div className="space-y-4"><Input label="Judul landing page" value={page.title} onChange={event => onChange({ title: event.target.value })} /><Input label="Slug link publik" value={page.slug} onChange={event => onChange({ slug: event.target.value })} onBlur={() => onChange({ slug: slugify(page.slug || page.title) })} /><Textarea label="Deskripsi singkat" value={page.description} onChange={event => onChange({ description: event.target.value })} /><label className="flex flex-col gap-2"><span className="text-xs font-semibold text-[var(--muted)]">Status halaman</span><select value={page.status} onChange={event => onChange({ status: event.target.value as LandingPageStatus })} className="min-h-[46px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]">{LANDING_STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><div className="space-y-3"><div><p className="text-xs font-semibold text-[var(--muted)]">Nuansa warna</p><p className="mt-1 text-xs text-[var(--muted)]">Pilih aksen lembut untuk tombol dan elemen penting.</p></div><div className="grid grid-cols-2 gap-2">{FORM_THEME_OPTIONS.map(option => <button key={option.value} type="button" aria-pressed={page.theme === option.value} onClick={() => onChange({ theme: option.value })} className={`rounded-xl border p-2 text-left transition-colors ${page.theme === option.value ? 'border-[var(--accent)] ring-2 ring-[var(--accent-soft)]' : 'border-[var(--border)] hover:border-[var(--border-strong)]'}`}><span className="mb-2 block h-6 rounded-lg" style={{ backgroundColor: option.swatch }} /><span className="block text-xs font-semibold">{option.label}</span></button>)}</div></div></div>
);

export const LandingPagesPage: React.FC<{ client: any }> = ({ client }) => {
  const navigate = useNavigate();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LandingPage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPages = useCallback(async () => {
    if (!client) {
      setLoadError('Koneksi admin belum tersedia.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await client.from('landing_pages').select('*').order('created_at', { ascending: false });
    if (error) {
      setLoadError(errorMessage(error));
    } else {
      setPages((data || []).map(mapLandingRow));
      setLoadError(null);
    }
    setIsLoading(false);
  }, [client]);

  useEffect(() => { void fetchPages(); }, [fetchPages]);

  const handleCreate = async () => {
    if (!client) return;
    setIsCreating(true);
    const draft = createDefaultLandingPage();
    const { data, error } = await client.from('landing_pages').insert(landingWriteRow(draft)).select('*').single();
    if (error) setNotice({ tone: 'error', message: errorMessage(error) });
    else if (data) navigate(`/admin/landing-pages/${data.id}`);
    setIsCreating(false);
  };

  const handleCopy = async (page: LandingPage) => {
    const url = createLandingShareLink(page.slug);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(page.slug);
      window.setTimeout(() => setCopiedSlug(current => current === page.slug ? null : current), 2000);
    } catch {
      setNotice({ tone: 'error', message: `Link landing page: ${url}` });
    }
  };

  const handleDelete = async () => {
    if (!client || !deleteTarget) return;
    setIsDeleting(true);
    const target = deleteTarget;
    const { data, error } = await client.from('landing_pages').delete().eq('id', target.id).select('id');
    if (error) setNotice({ tone: 'error', message: errorMessage(error) });
    else if (!data?.length) setNotice({ tone: 'error', message: 'Landing page tidak ditemukan atau sudah dihapus.' });
    else {
      setPages(current => current.filter(page => page.id !== target.id));
      setDeleteTarget(null);
      setNotice({ tone: 'success', message: `Landing page “${target.title}” berhasil dihapus.` });
    }
    setIsDeleting(false);
  };

  return <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><Link to="/admin" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent-strong)]"><ArrowLeft size={14} /> Semua Space</Link><h1 className="text-3xl font-bold">{LANDING_PAGE_SPACE_LABEL}</h1><p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">Buat halaman promosi produk dengan blok drag-and-drop, CTA pendaftaran, dan informasi pembayaran.</p></div><Button icon={Plus} onClick={() => void handleCreate()} isLoading={isCreating}>Buat Landing Page</Button></div><NoticeBanner notice={notice} />{isLoading ? <Card className="flex items-center justify-center gap-3 py-14 text-sm text-[var(--muted)]"><Loader2 size={18} className="animate-spin" /> Memuat landing page...</Card> : loadError ? <Card className="space-y-4 py-12 text-center"><XCircle size={30} className="mx-auto text-[var(--danger-text)]" /><p className="text-sm text-[var(--danger-text)]">{loadError}</p><Button variant="secondary" onClick={() => void fetchPages()}>Coba Lagi</Button></Card> : pages.length === 0 ? <Card className="space-y-4 py-14 text-center"><Layout size={34} className="mx-auto text-[var(--muted)]" /><p className="font-semibold">Belum ada landing page</p><p className="text-sm text-[var(--muted)]">Buat halaman pertama untuk mempromosikan produk Anda.</p><Button onClick={() => void handleCreate()} icon={Plus} className="mx-auto">Buat Landing Page Pertama</Button></Card> : <div className="grid gap-5 md:grid-cols-2">{pages.map(page => <Card key={page.id} className="flex h-full flex-col gap-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge color="var(--accent-soft)">{LANDING_PAGE_SPACE_LABEL}</Badge><span className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${page.status === 'published' ? 'bg-[var(--success-soft)] text-[var(--success-text)]' : page.status === 'archived' ? 'bg-[var(--danger-soft)] text-[var(--danger-text)]' : 'bg-[var(--surface-soft)] text-[var(--muted)]'}`}>{page.status === 'published' ? 'Publik' : page.status === 'archived' ? 'Arsip' : 'Draft'}</span></div><h2 className="mt-3 truncate text-xl font-bold">{page.title}</h2><p className="mt-1 break-all text-xs text-[var(--muted)]">/landing/{page.slug}</p></div><Layout className="shrink-0 text-[var(--accent-strong)]" size={24} /></div><p className="line-clamp-2 text-sm leading-relaxed text-[var(--muted)]">{page.description || 'Belum ada deskripsi landing page.'}</p><div className="grid grid-cols-2 gap-3 text-xs text-[var(--muted)]"><span>{page.blocks.length} blok konten</span><span className="text-right">Tema {FORM_THEME_OPTIONS.find(option => option.value === page.theme)?.label || 'Navy'}</span></div><div className="mt-auto grid grid-cols-2 gap-2 pt-2"><Button variant="secondary" className="px-2 text-xs" onClick={() => navigate(`/admin/landing-pages/${page.id}`)}>Edit Page</Button><Button variant={copiedSlug === page.slug ? 'green' : 'secondary'} className="px-2 text-xs" icon={copiedSlug === page.slug ? Check : Copy} onClick={() => void handleCopy(page)}>{copiedSlug === page.slug ? 'Tersalin' : 'Copy Link'}</Button><Button className="px-2 text-xs" icon={ExternalLink} disabled={page.status !== 'published'} onClick={() => window.open(createLandingShareLink(page.slug), '_blank', 'noopener,noreferrer')}>Buka Publik</Button><Button type="button" variant="danger" className="px-2 text-xs" icon={Trash2} onClick={() => setDeleteTarget(page)}>Hapus</Button></div></Card>)}</div>}<ConfirmModal open={Boolean(deleteTarget)} title="Hapus landing page ini?" description={deleteTarget ? <>Landing page <strong className="text-[var(--text)]">{deleteTarget.title}</strong> akan dihapus permanen.</> : null} confirmLabel="Hapus Page" isLoading={isDeleting} onCancel={() => { if (!isDeleting) setDeleteTarget(null); }} onConfirm={() => void handleDelete()} /></div>;
};

export const LandingPageEditor: React.FC<{ client: any }> = ({ client }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<LandingPage | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const fetchPage = useCallback(async () => {
    if (!id || !client) return;
    setIsLoading(true);
    const { data, error } = await client.from('landing_pages').select('*').eq('id', id).maybeSingle();
    if (error || !data) setNotice({ tone: 'error', message: errorMessage(error || 'Landing page tidak ditemukan.') });
    else setPage(mapLandingRow(data));
    setIsLoading(false);
  }, [client, id]);

  useEffect(() => { void fetchPage(); }, [fetchPage]);

  const selectedBlock = page?.blocks.find(block => block.id === selectedBlockId) || null;
  const updatePage = (patch: Partial<LandingPage>) => setPage(current => current ? { ...current, ...patch } : current);

  const addBlock = (type: LandingBlockType, index = page?.blocks.length || 0) => {
    if (!page) return;
    const block = createLandingBlock(type, index);
    setPage(current => current ? { ...current, blocks: [...current.blocks.slice(0, index), block, ...current.blocks.slice(index)] } : current);
    setSelectedBlockId(block.id);
  };

  const moveBlock = (index: number, direction: -1 | 1) => setPage(current => {
    if (!current) return current;
    const target = index + direction;
    if (target < 0 || target >= current.blocks.length) return current;
    const blocks = [...current.blocks];
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    return { ...current, blocks };
  });

  const removeBlock = (blockId: string) => {
    setPage(current => current ? { ...current, blocks: current.blocks.filter(block => block.id !== blockId) } : current);
    setSelectedBlockId(current => current === blockId ? null : current);
  };

  const handleDrop = (event: React.DragEvent, targetIndex: number) => {
    event.preventDefault();
    if (!page) return;
    const blockId = event.dataTransfer.getData('application/x-landing-block-id');
    const blockType = event.dataTransfer.getData('application/x-landing-block-type') as LandingBlockType;
    if (blockId) {
      setPage(current => {
        if (!current) return current;
        const fromIndex = current.blocks.findIndex(block => block.id === blockId);
        if (fromIndex < 0) return current;
        const blocks = [...current.blocks];
        const [moved] = blocks.splice(fromIndex, 1);
        const insertionIndex = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
        blocks.splice(Math.max(0, Math.min(insertionIndex, blocks.length)), 0, moved);
        return { ...current, blocks };
      });
      return;
    }
    if (LANDING_BLOCK_TYPES.has(blockType)) addBlock(blockType, targetIndex);
  };

  const handleSave = async () => {
    if (!page || !client) return;
    if (!page.title.trim()) {
      setNotice({ tone: 'error', message: 'Judul landing page wajib diisi.' });
      return;
    }
    const normalized = { ...page, slug: slugify(page.slug || page.title), blocks: page.blocks.map(normalizeLandingBlock) };
    setIsSaving(true);
    const { data, error } = await client.from('landing_pages').update(landingWriteRow(normalized)).eq('id', page.id).select('*').single();
    if (error) setNotice({ tone: 'error', message: errorMessage(error) });
    else {
      setPage(mapLandingRow(data));
      setNotice({ tone: 'success', message: 'Landing page berhasil disimpan.' });
    }
    setIsSaving(false);
  };

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-[var(--muted)]"><Loader2 size={18} className="animate-spin" /> Memuat editor landing page...</div>;
  if (!page) return <div className="mx-auto max-w-xl p-8"><Card className="space-y-4 text-center"><XCircle className="mx-auto text-[var(--danger-text)]" /><p>Landing page tidak ditemukan.</p><Button variant="secondary" onClick={() => navigate('/admin/landing-pages')}>Kembali</Button></Card></div>;

  return <div className="mx-auto flex max-w-[1600px] flex-col gap-6 p-4 pb-28 md:p-8 xl:h-[100dvh] xl:gap-5 xl:overflow-hidden xl:pb-8"><div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center"><div><Link to="/admin/landing-pages" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent-strong)]"><ArrowLeft size={14} /> {LANDING_PAGE_SPACE_LABEL}</Link><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold">Editor Landing Page</h1><Badge color={page.status === 'published' ? 'var(--success-soft)' : 'var(--surface-soft)'}>{page.status === 'published' ? 'Publik' : page.status === 'archived' ? 'Arsip' : 'Draft'}</Badge></div><p className="mt-2 text-sm text-[var(--muted)]">Tarik blok ke canvas, klik blok untuk mengedit, lalu simpan dan publikasikan.</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" icon={ExternalLink} disabled={page.status !== 'published'} onClick={() => window.open(createLandingShareLink(page.slug), '_blank', 'noopener,noreferrer')}>Preview publik</Button><Button icon={Save} onClick={() => void handleSave()} isLoading={isSaving}>Simpan Page</Button></div></div><NoticeBanner notice={notice} /><div className="grid gap-5 xl:min-h-0 xl:flex-1 xl:items-stretch xl:overflow-hidden xl:grid-cols-[230px_minmax(0,1fr)_300px]"><Card className="space-y-4 xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Elemen</p><h2 className="mt-2 text-lg font-bold">Tambah blok</h2><p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">Tarik ke posisi yang diinginkan atau klik untuk menambah di bagian bawah.</p></div><div className="space-y-2">{LANDING_BLOCK_OPTIONS.map(option => { const Icon = option.icon; return <button key={option.value} type="button" draggable onDragStart={event => { event.dataTransfer.effectAllowed = 'copy'; event.dataTransfer.setData('application/x-landing-block-type', option.value); }} onClick={() => addBlock(option.value)} className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]"><Icon size={16} /></span><span className="min-w-0"><span className="block text-sm font-semibold">{option.label}</span><span className="mt-0.5 block text-[10px] leading-snug text-[var(--muted)]">{option.description}</span></span><GripVertical size={14} className="ml-auto shrink-0 text-[var(--muted)]" /></button>; })}</div></Card><div className="min-w-0 xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain"><LandingPagePreview page={page} editable selectedBlockId={selectedBlockId || undefined} onSelect={setSelectedBlockId} onDrop={handleDrop} onDragStart={(event, blockId) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-landing-block-id', blockId); }} onMove={moveBlock} onRemove={removeBlock} /></div><Card className="space-y-5 xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Pengaturan</p><h2 className="mt-2 text-lg font-bold">{selectedBlock ? LANDING_BLOCK_LABELS[selectedBlock.type] : 'Landing page'}</h2></div><Palette size={20} className="text-[var(--accent-strong)]" /></div>{selectedBlock ? <><button type="button" onClick={() => setSelectedBlockId(null)} className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)]">← Kembali ke pengaturan page</button><BlockInspector block={selectedBlock} onChange={data => setPage(current => current ? { ...current, blocks: current.blocks.map(block => block.id === selectedBlock.id ? { ...block, data } : block) } : current)} /></> : <PageSettingsPanel page={page} onChange={updatePage} />}</Card></div></div>;
};

export const PublicLandingPageView: React.FC<{ client: any; slugOverride?: string }> = ({ client, slugOverride }) => {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const slug = slugOverride || routeSlug;
  const [page, setPage] = useState<LandingPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchPage = useCallback(async () => {
    if (!client || !slug) {
      setLoadError('Link landing page tidak valid.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await client.rpc('get_public_landing_page', { p_slug: decodeURIComponent(slug) });
    if (error || !data) setLoadError(errorMessage(error || 'Landing page tidak ditemukan.'));
    else {
      setPage(mapLandingRow(data));
      setLoadError(null);
    }
    setIsLoading(false);
  }, [client, slug]);

  useEffect(() => { void fetchPage(); }, [fetchPage]);
  useEffect(() => { if (page?.title) document.title = page.title; }, [page?.title]);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center gap-3 bg-[var(--app-bg)] text-sm text-[var(--muted)]"><Loader2 size={18} className="animate-spin" /> Memuat landing page...</div>;
  if (loadError || !page) return <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] p-6"><Card className="w-full max-w-md space-y-5 py-10 text-center"><XCircle size={34} className="mx-auto text-[var(--danger-text)]" /><div><h1 className="text-xl font-bold">Landing page tidak dapat dibuka</h1><p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{loadError}</p></div><Button icon={Loader2} onClick={() => void fetchPage()} className="mx-auto w-full">Coba Lagi</Button></Card></div>;
  return <LandingPageShell page={page}><>{page.blocks.map(block => <LandingBlockRenderer key={block.id} block={block} pageTitle={page.title} />)}</></LandingPageShell>;
};

export { createLandingShareLink };
