import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  BarChart3,
  Bold,
  Check,
  Copy,
  CreditCard,
  Eye,
  ExternalLink,
  Gift,
  GripVertical,
  Heading2,
  Heading3,
  Italic,
  ImagePlus,
  Layout,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MoveDown,
  MoveUp,
  MousePointerClick,
  Palette,
  Plus,
  Quote,
  Save,
  Sparkles,
  Star,
  Trash2,
  Upload,
  UserRound,
  Users,
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
import { getPublicBaseUrl, setPublicMetadata } from './PublicMetadata';
import { trackPublicLandingEvent } from './PublicAnalytics';
import logoUtama from '../src/logo-utama.png';

export const LANDING_PAGE_SPACE_LABEL = 'Landing Page';
export const LANDING_PAGE_PUBLIC_LABEL = 'Arunika Landing Page';
const DEFAULT_LANDING_DESCRIPTION = 'Landing page untuk memperkenalkan produk Anda.';

type Notice = { tone: 'success' | 'error'; message: string };

const asText = (value: unknown, fallback = '') => typeof value === 'string' ? value : value == null ? fallback : String(value);

type LandingInsightSummary = {
  landing_page_id: string;
  total_views: number;
  unique_visitors: number;
  cta_clicks: number;
  conversion_rate: number;
  last_viewed_at?: string | null;
};

type LandingInsightDetail = {
  landingPageId: string;
  totalViews: number;
  uniqueVisitors: number;
  ctaClicks: number;
  conversionRate: number;
  daily: Array<{ date: string; views: number; ctaClicks: number }>;
  devices: Array<{ device: string; count: number }>;
  sources: Array<{ source: string; count: number }>;
};

const insightCount = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const formatInsightCount = (value: unknown) => new Intl.NumberFormat('id-ID').format(insightCount(value));

const formatInsightDate = (value: unknown) => {
  const dateText = asText(value);
  if (!dateText) return '-';
  const date = new Date(`${dateText.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? dateText : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

const emptyLandingInsight = (landingPageId = ''): LandingInsightDetail => ({
  landingPageId,
  totalViews: 0,
  uniqueVisitors: 0,
  ctaClicks: 0,
  conversionRate: 0,
  daily: [],
  devices: [],
  sources: []
});

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
  { value: 'topics', label: 'Topik bahasan', description: 'Kategori dengan daftar poin', icon: List },
  { value: 'workflow', label: 'Workflow', description: 'Tahapan proses bernomor', icon: ListOrdered },
  { value: 'pricing', label: 'Harga', description: 'Paket dan harga produk', icon: CreditCard },
  { value: 'testimonial', label: 'Testimoni', description: 'Bukti sosial dari pelanggan', icon: Quote },
  { value: 'profile', label: 'Profil', description: 'Foto dan biografi singkat', icon: UserRound },
  { value: 'faq', label: 'FAQ', description: 'Pertanyaan yang sering ditanya', icon: Layout },
  { value: 'payment', label: 'Pembayaran', description: 'QR Code dan instruksi transfer', icon: CreditCard },
  { value: 'bonus', label: 'Bonus', description: 'Foto dan keterangan bonus', icon: Gift },
  { value: 'cta', label: 'CTA', description: 'Ajakan bertindak penutup', icon: Sparkles },
  { value: 'spacer', label: 'Jarak', description: 'Atur ruang antar bagian', icon: MoveDown }
];

const LANDING_BLOCK_LABELS = Object.fromEntries(LANDING_BLOCK_OPTIONS.map(item => [item.value, item.label])) as Record<LandingBlockType, string>;
const LANDING_BLOCK_TYPES = new Set<LandingBlockType>(LANDING_BLOCK_OPTIONS.map(item => item.value));

type LandingImageLayout = 'slider' | 'marquee' | 'row';
type LandingImageItem = { url: string; alt: string; caption: string };
type LandingVideoLayout = 'grid' | 'slider' | 'row';
type LandingVideoSourceType = 'youtube' | 'upload';
type LandingVideoItem = {
  id: string;
  sourceType: LandingVideoSourceType;
  url: string;
  fileUrl: string;
  title: string;
  caption: string;
  startSeconds: number;
  endSeconds: number | null;
};
type LandingTopicCategory = { id: string; title: string; items: string[] };
type LandingWorkflowLayout = 'vertical' | 'horizontal';
type LandingWorkflowStep = { id: string; label: string; title: string; description: string };
type LandingTestimonialItem = { quote: string; name: string; role: string; rating: number };
type LandingProfileLayout = 'split' | 'centered';
type LandingBonusItem = { title: string; body: string; imageUrl: string; imageAlt: string; caption: string };
type LandingPricingPackage = {
  id: string;
  name: string;
  price: string;
  originalPrice: string;
  description: string;
  features: string[];
};

const normalizeHeroImageScale = (value: unknown, fallback = 1.15) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.min(1.7, Math.max(0.7, numericValue)) : fallback;
};

const normalizeHeroImagePosition = (value: unknown) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.min(100, Math.max(0, numericValue)) : 50;
};

const normalizeHeroImageBoxOffset = (value: unknown) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.min(50, Math.max(-50, numericValue)) : 0;
};

const LANDING_IMAGE_LAYOUT_OPTIONS: Array<{ value: LandingImageLayout; label: string; description: string }> = [
  { value: 'slider', label: 'Foto slider', description: 'Satu foto utama dengan navigasi dan indikator.' },
  { value: 'marquee', label: 'Gallery otomatis', description: 'Bergerak dari kanan ke kiri dan berulang.' },
  { value: 'row', label: 'Gallery satu baris', description: 'Semua foto tampil statis dalam satu baris.' }
];

const LANDING_VIDEO_LAYOUT_OPTIONS: Array<{ value: LandingVideoLayout; label: string; description: string }> = [
  { value: 'grid', label: 'Video grid', description: 'Beberapa video tampil sebagai card dalam grid.' },
  { value: 'slider', label: 'Video slider', description: 'Satu video utama dengan navigasi dan indikator.' },
  { value: 'row', label: 'Video satu baris', description: 'Semua video tampil dalam satu baris yang bisa digeser.' }
];

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
      imageBoxOffsetX: 0,
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
      caption: 'Lihat cara kerja produk ini.',
      videos: [],
      layout: 'grid'
    },
    features: {
      heading: 'Kenapa memilih produk ini?',
      items: [
        { title: 'Praktis digunakan', description: 'Mulai dengan langkah yang sederhana dan jelas.' },
        { title: 'Hasil lebih terarah', description: 'Dapatkan sistem yang membantu Anda bergerak lebih cepat.' },
        { title: 'Dukungan berkelanjutan', description: 'Ada panduan dan bantuan saat Anda membutuhkannya.' }
      ]
    },
    topics: {
      heading: 'Hal yang Bisa Kita Bahas',
      intro: '',
      categories: [
        {
          id: 'landing-topic-default-1',
          title: 'Strategi dan Optimasi Akun',
          items: [
            'Audit kondisi akun.',
            'Penentuan positioning dan target audiens.',
            'Evaluasi content pillar dan content value.',
            'Identifikasi peluang optimasi.'
          ]
        },
        {
          id: 'landing-topic-default-2',
          title: 'Sistem dan Manajemen Konten',
          items: [
            'Sistem pencarian dan pengelolaan ide.',
            'Content planning dan editorial calendar.',
            'Alur produksi, revisi, approval, hingga publikasi.'
          ]
        }
      ]
    },
    workflow: {
      heading: 'Bagaimana prosesnya?',
      intro: 'Ikuti beberapa langkah sederhana untuk mulai mendapatkan hasil yang lebih terarah.',
      layout: 'vertical',
      steps: [
        { id: 'landing-workflow-default-1', label: '01', title: 'Pilih paket', description: 'Tentukan paket atau layanan yang paling sesuai dengan kebutuhan Anda.' },
        { id: 'landing-workflow-default-2', label: '02', title: 'Lakukan pembayaran', description: 'Selesaikan pembayaran sesuai instruksi yang tersedia.' },
        { id: 'landing-workflow-default-3', label: '03', title: 'Mulai proses', description: 'Anda akan menerima detail akses dan langkah berikutnya.' }
      ]
    },
    pricing: {
      heading: 'Dapatkan akses sekarang',
      packages: [{
        id: 'landing-package-default',
        name: 'Paket utama',
        price: 'Rp 0',
        originalPrice: '',
        description: 'Pilih paket yang paling sesuai dengan kebutuhan Anda.',
        features: ['Akses materi utama', 'Panduan praktis', 'Dukungan setelah pembelian']
      }],
      price: 'Rp 0',
      body: 'Pilih paket yang paling sesuai dengan kebutuhan Anda.',
      features: ['Akses materi utama', 'Panduan praktis', 'Dukungan setelah pembelian'],
      buttonLabel: 'Pilih paket',
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
    profile: {
      heading: 'Tentang saya',
      eyebrow: 'Profil',
      name: 'Nama Anda',
      role: 'Mentor / Founder',
      bio: 'Tulis biografi singkat, pengalaman, dan alasan pengunjung perlu mengenal Anda.',
      photoUrl: '',
      photoAlt: 'Foto profil',
      layout: 'split'
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
      instructions: 'Pilih paket yang sesuai di atas, lakukan pembayaran sesuai total, lalu kirim bukti pembayaran melalui WhatsApp.',
      qrCode: '',
      accountNumber: '',
      whatsapp: '',
      buttonLabel: 'Konfirmasi melalui WhatsApp',
      buttonUrl: ''
    },
    bonus: {
      heading: 'Bonus spesial untuk Anda',
      title: 'Dapatkan bonus tambahan',
      body: 'Jelaskan bonus yang akan diterima pelanggan setelah melakukan pembelian.',
      imageUrl: '',
      imageAlt: 'Visual bonus',
      caption: '',
      items: [{
        title: 'Dapatkan bonus tambahan',
        body: 'Jelaskan bonus yang akan diterima pelanggan setelah melakukan pembelian.',
        imageUrl: '',
        imageAlt: 'Visual bonus',
        caption: ''
      }]
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

const createTopicCategory = (index = 0): LandingTopicCategory => ({
  id: `landing-topic-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
  title: `Kategori ${index + 1}`,
  items: ['Poin pembahasan pertama.']
});

const normalizeTopicCategories = (value: unknown, fallback: LandingTopicCategory[] = []): LandingTopicCategory[] => {
  if (!Array.isArray(value)) return fallback;
  return value.slice(0, 12).map((item, index) => ({
    id: asText(item?.id, `landing-topic-${index}`),
    title: asText(item?.title),
    items: Array.isArray(item?.items ?? item?.points) ? (item?.items ?? item?.points).map((point: unknown) => asText(point)) : []
  }));
};

const createWorkflowStep = (index = 0): LandingWorkflowStep => ({
  id: `landing-workflow-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
  label: String(index + 1).padStart(2, '0'),
  title: `Langkah ${index + 1}`,
  description: 'Jelaskan apa yang perlu dilakukan pada tahap ini.'
});

const normalizeWorkflowSteps = (value: unknown, fallback: LandingWorkflowStep[] = []): LandingWorkflowStep[] => {
  if (!Array.isArray(value)) return fallback;
  return value.slice(0, 12).map((item, index) => ({
    id: asText(item?.id, `landing-workflow-${index}`),
    label: asText(item?.label, String(index + 1).padStart(2, '0')),
    title: asText(item?.title),
    description: asText(item?.description || item?.body)
  }));
};

const normalizeWorkflowLayout = (value: unknown): LandingWorkflowLayout => (
  ['vertical', 'horizontal'].includes(asText(value)) ? asText(value) as LandingWorkflowLayout : 'vertical'
);

const createPricingPackage = (index = 0): LandingPricingPackage => ({
  id: `landing-package-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
  name: `Paket ${index + 1}`,
  price: '',
  originalPrice: '',
  description: '',
  features: []
});

const normalizePricingPackages = (value: unknown, legacyData: Record<string, any> = {}): LandingPricingPackage[] => {
  if (Array.isArray(value)) {
    return value.slice(0, 12).map((item, index) => ({
      id: asText(item?.id, `landing-package-${index}`),
      name: asText(item?.name || item?.title),
      price: asText(item?.price),
      originalPrice: asText(item?.originalPrice || item?.original_price),
      description: asText(item?.description || item?.body),
      features: Array.isArray(item?.features) ? item.features.map((feature: unknown) => asText(feature)).filter(Boolean) : []
    }));
  }

  return [{
    id: 'landing-package-legacy',
    name: asText(legacyData.packageName || legacyData.package_name, 'Paket utama'),
    price: asText(legacyData.price),
    originalPrice: asText(legacyData.originalPrice || legacyData.original_price),
    description: asText(legacyData.body),
    features: Array.isArray(legacyData.features) ? legacyData.features.map((feature: unknown) => asText(feature)).filter(Boolean) : []
  }];
};

const getPricingPackagesForPage = (page: LandingPage): LandingPricingPackage[] => {
  const pricingBlock = page.blocks.find(block => block.type === 'pricing');
  return pricingBlock ? normalizePricingPackages(pricingBlock.data?.packages, pricingBlock.data || {}) : [];
};

const getFirstPricingPackage = (page: LandingPage): LandingPricingPackage | null => {
  return getPricingPackagesForPage(page)[0] || null;
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

const normalizeVideoSeconds = (value: unknown, fallback = 0) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) return fallback;
  return Math.min(86400, Math.floor(numericValue));
};

const createVideoItem = (index = 0): LandingVideoItem => ({
  id: `landing-video-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
  sourceType: 'youtube',
  url: '',
  fileUrl: '',
  title: `Video ${index + 1}`,
  caption: '',
  startSeconds: 0,
  endSeconds: null
});

const normalizeVideoItems = (value: unknown, legacyData: Record<string, any> = {}): LandingVideoItem[] => {
  if (Array.isArray(value) && value.length) {
    return value.slice(0, 12).map((item, index) => {
      const endValue = asText(item?.endSeconds ?? item?.end_seconds).trim();
      const startSeconds = normalizeVideoSeconds(item?.startSeconds ?? item?.start_seconds, 0);
      const parsedEnd = endValue ? normalizeVideoSeconds(endValue, 0) : null;
      return {
        id: asText(item?.id, `landing-video-${index}`),
        sourceType: item?.sourceType === 'upload' ? 'upload' : 'youtube',
        url: asText(item?.url).trim(),
        fileUrl: asText(item?.fileUrl || item?.file_url).trim(),
        title: asText(item?.title, `Video ${index + 1}`),
        caption: asText(item?.caption),
        startSeconds,
        endSeconds: parsedEnd !== null && parsedEnd > startSeconds ? parsedEnd : null
      };
    });
  }

  const legacyUrl = asText(legacyData.url).trim();
  if (!legacyUrl) return [];
  const startSeconds = normalizeVideoSeconds(legacyData.startSeconds ?? legacyData.start_seconds, 0);
  const endValue = asText(legacyData.endSeconds ?? legacyData.end_seconds).trim();
  const parsedEnd = endValue ? normalizeVideoSeconds(endValue, 0) : null;
  return [{
    id: 'landing-video-legacy',
    sourceType: 'youtube',
    url: legacyUrl,
    fileUrl: '',
    title: asText(legacyData.title, 'Video produk'),
    caption: asText(legacyData.caption),
    startSeconds,
    endSeconds: parsedEnd !== null && parsedEnd > startSeconds ? parsedEnd : null
  }];
};

const normalizeVideoLayout = (value: unknown): LandingVideoLayout => (
  ['grid', 'slider', 'row'].includes(asText(value)) ? asText(value) as LandingVideoLayout : 'grid'
);

const normalizeProfileLayout = (value: unknown): LandingProfileLayout => (
  ['split', 'centered'].includes(asText(value)) ? asText(value) as LandingProfileLayout : 'split'
);

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

const normalizeBonusItems = (value: unknown, legacyData: Record<string, any> = {}): LandingBonusItem[] => {
  if (Array.isArray(value)) {
    return value.slice(0, 12).map(item => ({
      title: asText(item?.title),
      body: asText(item?.body),
      imageUrl: asText(item?.imageUrl || item?.image_url),
      imageAlt: asText(item?.imageAlt || item?.image_alt, 'Visual bonus'),
      caption: asText(item?.caption)
    }));
  }
  const legacyItem = {
    title: asText(legacyData.title),
    body: asText(legacyData.body),
    imageUrl: asText(legacyData.imageUrl || legacyData.image_url),
    imageAlt: asText(legacyData.imageAlt || legacyData.image_alt, 'Visual bonus'),
    caption: asText(legacyData.caption)
  };
  return legacyItem.title || legacyItem.body || legacyItem.imageUrl ? [legacyItem] : [];
};

const normalizeLandingBlock = (value: any, index: number): LandingBlock => {
  const type = LANDING_BLOCK_TYPES.has(value?.type) ? value.type as LandingBlockType : 'text';
  const fallback = createLandingBlock(type, index);
  const rawData = value?.data && typeof value.data === 'object' && !Array.isArray(value.data) ? value.data : {};
  const data = { ...fallback.data, ...rawData };
  if (type === 'features') data.items = normalizeLineItems(rawData.items, fallback.data.items);
  if (type === 'hero') {
    data.imageBoxScale = normalizeHeroImageScale(rawData.imageBoxScale, fallback.data.imageBoxScale);
    data.imageBoxOffsetX = normalizeHeroImageBoxOffset(rawData.imageBoxOffsetX);
    data.imageScale = normalizeHeroImageScale(rawData.imageScale, fallback.data.imageScale);
    data.imagePositionX = normalizeHeroImagePosition(rawData.imagePositionX);
    data.imagePositionY = normalizeHeroImagePosition(rawData.imagePositionY);
  }
  if (type === 'pricing') {
    data.packages = normalizePricingPackages(rawData.packages, rawData);
    const firstPackage = data.packages[0];
    data.price = asText(rawData.price, firstPackage?.price || fallback.data.price);
    data.body = asText(rawData.body, firstPackage?.description || fallback.data.body);
    data.features = Array.isArray(rawData.features) ? rawData.features.map((item: unknown) => asText(item)).filter(Boolean) : firstPackage?.features || fallback.data.features;
  }
  if (type === 'faq') data.items = normalizeFaqItems(rawData.items, fallback.data.items);
  if (type === 'topics') data.categories = normalizeTopicCategories(rawData.categories, fallback.data.categories);
  if (type === 'workflow') {
    data.steps = normalizeWorkflowSteps(rawData.steps, fallback.data.steps);
    data.layout = normalizeWorkflowLayout(rawData.layout);
  }
  if (type === 'image') {
    data.images = normalizeImageItems(rawData.images, rawData);
    data.layout = (['slider', 'marquee', 'row'].includes(rawData.layout) ? rawData.layout : fallback.data.layout) as LandingImageLayout;
  }
  if (type === 'video') {
    data.videos = normalizeVideoItems(rawData.videos, rawData);
    data.layout = normalizeVideoLayout(rawData.layout);
  }
  if (type === 'testimonial') data.items = normalizeTestimonialItems(rawData.items, rawData);
  if (type === 'profile') data.layout = normalizeProfileLayout(rawData.layout);
  if (type === 'bonus') data.items = normalizeBonusItems(rawData.items, rawData);
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

const createLandingShareLink = (slug: string, updatedAt?: string) => {
  const url = new URL(getPublicBaseUrl());
  url.pathname = `/landing/${encodeURIComponent(slug)}`;
  const version = updatedAt ? Date.parse(updatedAt) : NaN;
  if (Number.isFinite(version)) url.searchParams.set('v', String(version));
  return url.toString();
};

const getLandingPreviewImage = (page: LandingPage) => {
  for (const block of page.blocks) {
    const imageUrl = asText(block.data?.imageUrl).trim();
    if (imageUrl) return imageUrl;
    if (block.type === 'image' && Array.isArray(block.data?.images)) {
      const firstImage = block.data.images.find((item: any) => asText(item?.url).trim());
      if (firstImage) return asText(firstImage.url).trim();
    }
  }
  return '';
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

const whatsappHref = (phone: unknown, pageTitle: string, paymentAmount?: string, selectedPackage?: LandingPricingPackage | null, paymentAccount?: string) => {
  const normalized = normalizeWhatsAppNumber(phone);
  if (!normalized) return '';
  const packageName = selectedPackage?.name.trim();
  const amount = selectedPackage?.price.trim() || paymentAmount?.trim() || 'akan saya informasikan melalui chat ini';
  const benefits = selectedPackage?.features.filter(Boolean) || [];
  const message = [
    `Halo, saya ingin melakukan pembayaran untuk ${pageTitle}.`,
    packageName ? `Paket yang dipilih: ${packageName}` : '',
    `Total pembayaran: ${amount}`,
    benefits.length ? `Benefit paket:\n${benefits.map(feature => `- ${feature}`).join('\n')}` : '',
    paymentAccount?.trim() ? `Transfer ke: ${paymentAccount.trim()}` : '',
    '',
    'Saya akan melakukan pembayaran melalui QR Code/rekening yang tersedia. Setelah transfer, saya akan mengirimkan bukti pembayaran melalui chat ini untuk diproses.',
    '',
    'Terima kasih.'
  ].filter(Boolean).join('\n');
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
};

const errorMessage = (error: any) => {
  const message = asText(error?.message || error, 'Terjadi kesalahan.');
  if (message.includes('duplicate key') && message.includes('slug')) return 'Slug landing page sudah digunakan. Pilih slug yang berbeda.';
  if (message.includes('landing_pages') || message.includes('get_public_landing_page')) return 'Database landing page belum siap. Jalankan migration Landing Page Maker terbaru.';
  if (message.includes('landing_page_events') || message.includes('track_public_landing_event') || message.includes('get_landing_page_insight')) return 'Analytics landing page belum siap. Jalankan migration analytics landing page terbaru.';
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

const readVideoDataUrl = (file: File, maxBytes = 15 * 1024 * 1024): Promise<string> => new Promise((resolve, reject) => {
  if (!file.type.startsWith('video/')) {
    reject(new Error('Pilih file video yang valid.'));
    return;
  }
  if (file.size > maxBytes) {
    reject(new Error(`Ukuran video maksimal ${Math.round(maxBytes / 1024 / 1024)} MB. Gunakan hasil clip yang lebih pendek atau masukkan URL file video.`));
    return;
  }
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Video gagal dibaca.'));
  reader.onload = () => resolve(String(reader.result || ''));
  reader.readAsDataURL(file);
});

const isVideoSourceUrl = (value: unknown) => {
  const url = asText(value).trim();
  if (/^data:video\//i.test(url)) return true;
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    const parsed = new URL(url);
    return !parsed.hostname.toLowerCase().replace(/^www\./, '').endsWith('youtube.com') && parsed.hostname.toLowerCase() !== 'youtu.be';
  } catch {
    return false;
  }
};

const NoticeBanner: React.FC<{ notice: Notice | null }> = ({ notice }) => notice ? (
  <div className={`rounded-xl border p-4 text-sm ${notice.tone === 'success' ? 'border-[var(--border)] bg-[var(--success-soft)] text-[var(--success-text)]' : 'border-[var(--border)] bg-[var(--danger-soft)] text-[var(--danger-text)]'}`}>
    {notice.message}
  </div>
) : null;

const ActionLink: React.FC<{ label: string; href?: string; className?: string; onClick?: () => void }> = ({ label, href, className = '', onClick }) => href ? (
  <a href={safeHref(href) || '#'} onClick={onClick} className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] ${className}`}>
    {label} <ExternalLink size={15} />
  </a>
) : null;

const INLINE_MARKDOWN_PATTERN = /(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\((?:https?:\/\/|mailto:)[^)\s]+\))/g;

const renderRichTextInline = (value: string, keyPrefix: string): React.ReactNode[] => value.split(INLINE_MARKDOWN_PATTERN).filter(Boolean).map((part, index) => {
  const key = `${keyPrefix}-${index}`;
  if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
    return <strong key={key} className="font-bold text-[var(--text)]">{part.slice(2, -2)}</strong>;
  }
  if ((part.startsWith('~~') && part.endsWith('~~'))) {
    return <del key={key}>{part.slice(2, -2)}</del>;
  }
  if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
    return <em key={key}>{part.slice(1, -1)}</em>;
  }
  const linkMatch = part.match(/^\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)\s]+)\)$/i);
  if (linkMatch) {
    return <a key={key} href={linkMatch[2]} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent-strong)] underline underline-offset-2">{linkMatch[1]}</a>;
  }
  return <React.Fragment key={key}>{part}</React.Fragment>;
});

const renderRichText = (value: string): React.ReactNode[] => {
  const lines = value.replace(/\r\n?/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let paragraphLines: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    const paragraphIndex = blocks.length;
    blocks.push(<p key={`rich-paragraph-${paragraphIndex}`}>{paragraphLines.map((line, index) => <React.Fragment key={`rich-line-${paragraphIndex}-${index}`}>{index > 0 && <br />}{renderRichTextInline(line, `rich-inline-${paragraphIndex}-${index}`)}</React.Fragment>)}</p>);
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listType || !listItems.length) return;
    const listIndex = blocks.length;
    const ListTag = listType;
    blocks.push(<ListTag key={`rich-list-${listIndex}`} className={`space-y-2 pl-5 ${listType === 'ul' ? 'list-disc' : 'list-decimal'}`}>{listItems.map((item, index) => <li key={`rich-list-item-${listIndex}-${index}`}>{renderRichTextInline(item, `rich-list-inline-${listIndex}-${index}`)}</li>)}</ListTag>);
    listType = null;
    listItems = [];
  };

  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      flushParagraph();
      flushList();
      return;
    }

    const headingMatch = line.match(/^\s*(#{2,3})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const HeadingTag = headingMatch[1].length === 2 ? 'h3' : 'h4';
      blocks.push(<HeadingTag key={`rich-heading-${blocks.length}`} className={HeadingTag === 'h3' ? 'text-xl font-bold text-[var(--text)]' : 'text-lg font-semibold text-[var(--text)]'}>{renderRichTextInline(headingMatch[2], `rich-heading-inline-${blocks.length}`)}</HeadingTag>);
      return;
    }

    const unorderedMatch = line.match(/^\s*[-*•]\s+(.+)$/);
    const orderedMatch = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (unorderedMatch || orderedMatch) {
      flushParagraph();
      const nextListType = unorderedMatch ? 'ul' : 'ol';
      if (listType && listType !== nextListType) flushList();
      listType = nextListType;
      listItems.push((unorderedMatch || orderedMatch)?.[1] || '');
      return;
    }

    const quoteMatch = line.match(/^\s*>\s?(.+)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      blocks.push(<blockquote key={`rich-quote-${blocks.length}`} className="border-l-4 border-[var(--accent)] pl-4 italic text-[var(--muted)]">{renderRichTextInline(quoteMatch[1], `rich-quote-inline-${blocks.length}`)}</blockquote>);
      return;
    }

    if (/^\s*---+\s*$/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push(<hr key={`rich-rule-${blocks.length}`} className="border-[var(--border)]" />);
      return;
    }

    flushList();
    paragraphLines.push(line);
  });

  flushParagraph();
  flushList();
  return blocks;
};

const RichTextToolbarButton: React.FC<{ label: string; title: string; icon: React.ComponentType<any>; onClick: () => void }> = ({ label, title, icon: Icon, onClick }) => (
  <button type="button" title={title} aria-label={title} onClick={onClick} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs font-semibold text-[var(--text)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]">
    <Icon size={15} />{label && <span>{label}</span>}
  </button>
);

const RichTextEditor: React.FC<{ label: string; value: string; onChange: (value: string) => void; className?: string }> = ({ label, value, onChange, className = '' }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wrapSelection = (prefix: string, suffix = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const replacement = selected ? `${prefix}${selected}${suffix}` : `${prefix}${suffix}`;
    const nextCursor = selected ? start + replacement.length : start + prefix.length;
    onChange(`${value.slice(0, start)}${replacement}${value.slice(end)}`);
    window.requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(selected ? start + replacement.length : nextCursor, selected ? start + replacement.length : nextCursor);
    });
  };

  const prefixLines = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const nextBreak = value.indexOf('\n', end);
    const lineEnd = nextBreak === -1 ? value.length : nextBreak;
    const selectedLines = value.slice(lineStart, lineEnd).split('\n');
    const formattedLines = selectedLines.map(line => line.startsWith(prefix) ? line : `${prefix}${line}`);
    const replacement = formattedLines.join('\n');
    onChange(`${value.slice(0, lineStart)}${replacement}${value.slice(lineEnd)}`);
    window.requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(lineStart, lineStart + replacement.length);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-[var(--muted)]">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-2">
        <RichTextToolbarButton label="Tebal" title="Tebalkan teks yang dipilih" icon={Bold} onClick={() => wrapSelection('**')} />
        <RichTextToolbarButton label="Miring" title="Miringkan teks yang dipilih" icon={Italic} onClick={() => wrapSelection('*')} />
        <RichTextToolbarButton label="Subjudul" title="Jadikan baris sebagai subjudul" icon={Heading2} onClick={() => prefixLines('## ')} />
        <RichTextToolbarButton label="Judul kecil" title="Jadikan baris sebagai judul kecil" icon={Heading3} onClick={() => prefixLines('### ')} />
        <RichTextToolbarButton label="Bullet" title="Buat daftar bullet" icon={List} onClick={() => prefixLines('- ')} />
        <RichTextToolbarButton label="Nomor" title="Buat daftar bernomor" icon={ListOrdered} onClick={() => prefixLines('1. ')} />
        <RichTextToolbarButton label="Kutipan" title="Jadikan baris sebagai kutipan" icon={Quote} onClick={() => prefixLines('> ')} />
      </div>
      <textarea ref={textareaRef} aria-label={label} value={value} onChange={event => onChange(event.target.value)} className={`min-h-[220px] w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-relaxed text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)] ${className}`} placeholder="Tulis isi teks di sini..." />
      <p className="text-[11px] leading-relaxed text-[var(--muted)]">Pilih teks lalu gunakan toolbar. Baris kosong menjadi paragraf baru; format aman seperti tebal, subjudul, bullet, nomor, dan kutipan akan tampil di halaman publik.</p>
    </div>
  );
};

const getYouTubeVideoId = (value: unknown) => {
  const url = safeHref(value);
  if (!url) return '';
  try {
    const parsed = new URL(url, window.location.origin);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (hostname === 'youtu.be') {
      return decodeURIComponent(parsed.pathname.split('/').filter(Boolean)[0] || '');
    }
    if (hostname.endsWith('youtube.com')) {
      if (parsed.pathname === '/watch') return parsed.searchParams.get('v') || '';
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (['embed', 'shorts', 'live'].includes(pathParts[0])) return pathParts[1] || '';
    }
  } catch {
    return '';
  }
  return '';
};

const getVideoEmbedUrl = (value: unknown, startSeconds = 0, endSeconds: number | null = null) => {
  const videoId = getYouTubeVideoId(value);
  if (!videoId) return '';
  const params = new URLSearchParams({ rel: '0', modestbranding: '1' });
  const start = normalizeVideoSeconds(startSeconds, 0);
  const end = endSeconds !== null ? normalizeVideoSeconds(endSeconds, 0) : null;
  if (start > 0) params.set('start', String(start));
  if (end !== null && end > start) params.set('end', String(end));
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
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

const formatVideoSeconds = (value: number) => {
  const seconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
};

const UploadedVideoPreview: React.FC<{ item: LandingVideoItem; title: string }> = ({ item, title }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const seekToStart = () => {
    if (videoRef.current && item.startSeconds > 0) videoRef.current.currentTime = item.startSeconds;
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const handleTimeUpdate = () => {
      if (item.endSeconds !== null && video.currentTime >= item.endSeconds) {
        video.pause();
        video.currentTime = item.startSeconds;
      }
    };
    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [item.endSeconds, item.startSeconds]);

  return <video ref={videoRef} src={item.fileUrl} title={title} className="h-full w-full bg-black object-contain" controls controlsList="nodownload noplaybackrate noremoteplayback" disablePictureInPicture preload="metadata" onLoadedMetadata={seekToStart} onContextMenu={event => event.preventDefault()} />;
};

const LandingVideoGalleryBlock: React.FC<{ data: Record<string, any> }> = ({ data }) => {
  const items = normalizeVideoItems(data.videos, data).filter(item => item.sourceType === 'upload' ? Boolean(item.fileUrl) : Boolean(getYouTubeVideoId(item.url)));
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(current => Math.min(current, Math.max(0, items.length - 1)));
  }, [items.length]);

  if (!items.length) {
    return <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] text-center text-sm text-[var(--muted)]">Tambahkan satu atau beberapa link YouTube untuk menampilkan galeri video.</div>;
  }

  const layout = normalizeVideoLayout(data.layout);
  const renderVideoCard = (item: LandingVideoItem, index: number, className = '') => {
    const title = item.title.trim() || `Video ${index + 1}`;
    const caption = item.caption.trim();
    const hasClip = item.startSeconds > 0 || item.endSeconds !== null;
    const clipLabel = hasClip
      ? `Preview ${formatVideoSeconds(item.startSeconds)}${item.endSeconds !== null ? `–${formatVideoSeconds(item.endSeconds)}` : '+'}`
      : '';
    return (
      <article key={`${item.id}-${index}`} className={`overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm ${className}`}>
        <div className="aspect-video bg-black">
          {item.sourceType === 'upload' ? <UploadedVideoPreview item={item} title={title} /> : <iframe title={title} src={getVideoEmbedUrl(item.url, item.startSeconds, item.endSeconds)} className="h-full w-full" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />}
        </div>
        <div className="space-y-1.5 p-4">
          <h3 className="font-semibold text-[var(--text)]">{title}</h3>
          {caption && <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">{caption}</p>}
          {clipLabel && <p className="text-[11px] font-semibold text-[var(--accent-strong)]">{clipLabel}</p>}
        </div>
      </article>
    );
  };

  return layout === 'slider' ? (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 shadow-sm" aria-label="Galeri video">
      <div className="relative">
        {renderVideoCard(items[activeIndex], activeIndex, 'rounded-xl')}
        {items.length > 1 && (
          <>
            <button type="button" onClick={() => setActiveIndex((activeIndex - 1 + items.length) % items.length)} aria-label="Video sebelumnya" title="Video sebelumnya" className="absolute left-3 top-[calc(50%-1.75rem)] -translate-y-1/2 rounded-full bg-slate-950/70 p-2 text-white transition-colors hover:bg-slate-800"><ChevronLeft size={18} /></button>
            <button type="button" onClick={() => setActiveIndex((activeIndex + 1) % items.length)} aria-label="Video berikutnya" title="Video berikutnya" className="absolute right-3 top-[calc(50%-1.75rem)] -translate-y-1/2 rounded-full bg-slate-950/70 p-2 text-white transition-colors hover:bg-slate-800"><ChevronRight size={18} /></button>
          </>
        )}
      </div>
      {items.length > 1 && <div className="flex items-center justify-center gap-1.5 px-2 pt-3" aria-label="Pilih video">{items.map((item, index) => <button key={`${item.id}-dot-${index}`} type="button" onClick={() => setActiveIndex(index)} aria-label={`Tampilkan video ${index + 1}`} aria-current={index === activeIndex ? 'true' : undefined} className={`h-2 w-2 rounded-full transition-colors ${index === activeIndex ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)] hover:bg-[var(--muted)]'}`} />)}</div>}
    </section>
  ) : layout === 'row' ? (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 shadow-sm">
      <div className="flex min-w-max gap-3">
        {items.map((item, index) => renderVideoCard(item, index, 'w-[min(320px,82vw)] shrink-0'))}
      </div>
      <p className="px-1 pb-1 pt-3 text-xs text-[var(--muted)]">Galeri video satu baris. Geser untuk melihat video lainnya.</p>
    </div>
  ) : (
    <div className="grid gap-4 md:grid-cols-2" aria-label="Galeri video">
      {items.map((item, index) => renderVideoCard(item, index))}
    </div>
  );
};

const LandingTopicsBlock: React.FC<{ data: Record<string, any> }> = ({ data }) => {
  const categories = normalizeTopicCategories(data.categories, []).filter(category => category.title.trim() || category.items.some(item => item.trim()));
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm md:p-8" aria-label="Topik bahasan">
      <h2 className="text-2xl font-bold md:text-3xl" style={{ color: headingColorValue(data.headingColor) }}>{asText(data.heading, 'Hal yang Bisa Kita Bahas')}</h2>
      {asText(data.intro).trim() && <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">{asText(data.intro)}</p>}
      {categories.length ? (
        <div className="mt-7 space-y-7">
          {categories.map((category, index) => {
            const points = category.items.map(item => item.trim()).filter(Boolean);
            return (
              <div key={`${category.id}-${index}`}>
                {category.title.trim() && <h3 className="text-xl font-bold leading-tight md:text-2xl">{category.title.trim()}</h3>}
                {points.length > 0 && <ul className="mt-4 list-disc space-y-2 pl-6 text-sm leading-relaxed text-[var(--muted)] md:text-base">{points.map((point, pointIndex) => <li key={`${category.id}-point-${pointIndex}`}>{point}</li>)}</ul>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] px-4 py-8 text-center text-sm text-[var(--muted)]">Tambahkan kategori dan poin pembahasan dari pengaturan blok.</div>
      )}
    </section>
  );
};

const LandingWorkflowBlock: React.FC<{ data: Record<string, any> }> = ({ data }) => {
  const steps = normalizeWorkflowSteps(data.steps, []).filter(step => step.label.trim() || step.title.trim() || step.description.trim());
  const layout = normalizeWorkflowLayout(data.layout);
  const heading = asText(data.heading, 'Bagaimana prosesnya?');
  const intro = asText(data.intro).trim();

  if (!steps.length) {
    return <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] text-center text-sm text-[var(--muted)]">Tambahkan tahapan workflow dari pengaturan blok.</div>;
  }

  const renderStepContent = (step: LandingWorkflowStep, index: number, horizontal = false) => {
    const marker = <div className={`flex shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] font-bold text-white shadow-sm ${horizontal ? 'h-14 w-14 text-sm' : 'h-11 w-11 text-xs'}`} aria-label={`Tahap ${index + 1}`}>{step.label.trim() || String(index + 1).padStart(2, '0')}</div>;
    const copy = <div className={horizontal ? 'mt-4' : 'min-w-0'}>
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--accent-strong)]">Tahap {index + 1}</p>
      <h3 className={`${horizontal ? 'mt-2 text-base' : 'mt-1 text-lg'} font-bold leading-tight`}>{step.title.trim() || `Langkah ${index + 1}`}</h3>
      {step.description.trim() && <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{step.description.trim()}</p>}
    </div>;
    return horizontal ? <div className="flex flex-col items-center text-center">{marker}{copy}</div> : <>{marker}{copy}</>;
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm md:p-8" aria-label="Workflow">
      <h2 className="text-2xl font-bold md:text-3xl" style={{ color: headingColorValue(data.headingColor) }}>{heading}</h2>
      {intro && <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">{intro}</p>}
      {layout === 'horizontal' ? (
        <div className="mt-8 overflow-x-auto pb-2">
          <div className="flex min-w-max items-start">
            {steps.map((step, index) => (
              <div key={`${step.id}-${index}`} className="relative min-w-[210px] flex-1 px-4 first:pl-0 last:pr-0 sm:min-w-[240px]">
                {renderStepContent(step, index, true)}
                {index < steps.length - 1 && <span className="absolute left-[calc(50%+2rem)] right-[-1rem] top-7 h-px bg-[var(--border-strong)]" aria-hidden="true" />}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-0">
          {steps.map((step, index) => (
            <div key={`${step.id}-${index}`} className="relative flex gap-4 pb-8 last:pb-0">
              {index < steps.length - 1 && <span className="absolute bottom-0 left-[1.35rem] top-11 w-px -translate-x-1/2 bg-[var(--border-strong)]" aria-hidden="true" />}
              {renderStepContent(step, index)}
            </div>
          ))}
        </div>
      )}
    </section>
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

const LandingProfileBlock: React.FC<{ data: Record<string, any> }> = ({ data }) => {
  const layout = normalizeProfileLayout(data.layout);
  const heading = asText(data.heading).trim();
  const eyebrow = asText(data.eyebrow, 'Profil').trim();
  const name = asText(data.name, 'Nama Anda').trim() || 'Nama Anda';
  const role = asText(data.role).trim();
  const bio = asText(data.bio).trim();
  const photoUrl = asText(data.photoUrl).trim();
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'P';
  const isCentered = layout === 'centered';

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm md:p-8" aria-label={heading || 'Profil'}>
      {heading && <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-strong)]">{eyebrow}</p><h2 className="mt-2 text-2xl font-bold" style={{ color: headingColorValue(data.headingColor) }}>{heading}</h2></div>}
      <div className={`${isCentered ? 'mx-auto max-w-2xl text-center' : 'grid gap-6 md:grid-cols-[150px_minmax(0,1fr)] md:items-center'}`}>
        <div className={`${isCentered ? 'mx-auto h-36 w-36 md:h-44 md:w-44' : 'mx-auto h-32 w-32 md:mx-0 md:h-36 md:w-36'} overflow-hidden rounded-full border-4 border-[var(--accent-soft)] bg-[var(--surface-soft)] shadow-sm`}>
          {photoUrl ? <img src={photoUrl} alt={asText(data.photoAlt, `Foto ${name}`)} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-[var(--accent-strong)]" aria-label={`Inisial ${name}`}>{initials}</div>}
        </div>
        <div className={isCentered ? 'mt-5' : 'min-w-0'}>
          <h3 className="text-2xl font-bold">{name}</h3>
          {role && <p className="mt-1 text-sm font-semibold text-[var(--accent-strong)]">{role}</p>}
          {bio && <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">{renderRichText(bio)}</div>}
        </div>
      </div>
    </section>
  );
};

export const LandingBlockRenderer: React.FC<{
  block: LandingBlock;
  pageTitle?: string;
  onCtaClick?: (label: string) => void;
  selectedPackage?: LandingPricingPackage | null;
  onSelectPackage?: (item: LandingPricingPackage) => void;
  hasPricingBlock?: boolean;
}> = ({ block, pageTitle = 'produk ini', onCtaClick, selectedPackage, onSelectPackage, hasPricingBlock = false }) => {
  const data = block.data || {};
  const textBody = asText(data.body);
  const sectionHeadingColor = headingColorValue(data.headingColor);
  switch (block.type) {
    case 'hero':
      const heroImageBoxScale = normalizeHeroImageScale(data.imageBoxScale, 1);
      const heroImageBoxOffsetX = normalizeHeroImageBoxOffset(data.imageBoxOffsetX);
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
              <ActionLink label={asText(data.buttonLabel, 'Pelajari lebih lanjut')} href={asText(data.buttonUrl)} onClick={() => onCtaClick?.('hero')} className="mt-6" />
            </div>
            {asText(data.imageUrl) ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[var(--surface-soft)] shadow-sm transition-transform duration-200 ease-out" style={{ transform: `translateX(${heroImageBoxOffsetX}%) scale(${heroImageBoxScale})`, transformOrigin: 'center right' }}>
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
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-[var(--muted)]">{renderRichText(textBody || 'Tambahkan penjelasan produk Anda.')}</div>
        </section>
      );
    case 'image':
      return <LandingImageGalleryBlock data={data} />;
    case 'video':
      return <LandingVideoGalleryBlock data={data} />;
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
    case 'topics':
      return <LandingTopicsBlock data={data} />;
    case 'workflow':
      return <LandingWorkflowBlock data={data} />;
    case 'pricing':
      const pricingPackages = normalizePricingPackages(data.packages, data);
      const pricingButtonLabel = asText(data.buttonLabel, 'Pilih paket');
      return (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-bold" style={{ color: sectionHeadingColor }}>{asText(data.heading, 'Pilihan paket')}</h2>
          {textBody && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">{textBody}</p>}
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pricingPackages.map((item, index) => {
              const isSelected = selectedPackage?.id === item.id;
              return (
                <article key={`${item.id}-${index}`} className={`flex h-full flex-col rounded-2xl border p-5 shadow-sm transition-colors ${isSelected ? 'border-[var(--accent)] bg-[var(--accent-soft)] ring-2 ring-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--surface-soft)]'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--accent-strong)]">Paket {index + 1}</p>
                      <h3 className="mt-2 text-lg font-bold">{item.name || `Paket ${index + 1}`}</h3>
                    </div>
                    {isSelected && <Badge color="var(--success-soft)">Dipilih</Badge>}
                  </div>
                  {item.description && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">{item.description}</p>}
                  <div className="mt-5 flex flex-wrap items-baseline gap-2">
                    {item.originalPrice && <span className="text-sm font-semibold text-[var(--muted)] line-through">{item.originalPrice}</span>}
                    <p className="text-2xl font-bold text-[var(--accent-strong)]">{item.price || 'Hubungi kami'}</p>
                  </div>
                  {item.features.length > 0 && <ul className="mt-5 flex-1 space-y-2 text-sm text-[var(--muted)]">{item.features.map((feature, featureIndex) => <li key={`${feature}-${featureIndex}`} className="flex items-start gap-2"><Check size={16} className="mt-0.5 shrink-0 text-[var(--success-text)]" /> <span>{feature}</span></li>)}</ul>}
                  <button type="button" onClick={() => { onSelectPackage?.(item); onCtaClick?.(`pricing:${item.name || `Paket ${index + 1}`}`); }} className={`mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${isSelected ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]' : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--border-strong)]'}`}>
                    {isSelected ? 'Paket dipilih' : pricingButtonLabel}
                  </button>
                </article>
              );
            })}
          </div>
          {safeHref(data.buttonUrl) && <ActionLink label={pricingButtonLabel} href={asText(data.buttonUrl)} onClick={() => onCtaClick?.('pricing')} className="mt-6" />}
        </section>
      );
    case 'testimonial':
      return <LandingTestimonialGridBlock data={data} />;
    case 'profile':
      return <LandingProfileBlock data={data} />;
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
      const confirmationHref = hasPricingBlock
        ? selectedPackage ? whatsappHref(data.whatsapp, pageTitle, asText(data.amount), selectedPackage, asText(data.accountNumber)) : ''
        : whatsappHref(data.whatsapp, pageTitle, asText(data.amount), null, asText(data.accountNumber)) || safeHref(data.buttonUrl);
      const ctaBeforePrice = asText(data.ctaBeforePrice).trim();
      const originalAmount = asText(data.originalAmount).trim();
      const selectedAmount = selectedPackage?.price.trim() || asText(data.amount);
      const selectedOriginalAmount = selectedPackage?.originalPrice.trim() || originalAmount;
      return (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-6 shadow-sm md:p-8">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_230px] md:items-center">
            <div>
              {ctaBeforePrice && <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-strong)]">{ctaBeforePrice}</p>}
              <h2 className="text-2xl font-bold" style={{ color: sectionHeadingColor }}>{asText(data.heading, 'Informasi pembayaran')}</h2>
              {hasPricingBlock && !selectedPackage ? <p className="mt-3 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-3 text-sm leading-relaxed text-[var(--muted)]">Pilih salah satu paket di atas untuk melihat total pembayaran dan melanjutkan konfirmasi.</p> : <>{selectedPackage && <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Paket dipilih</p><p className="mt-1 font-semibold">{selectedPackage.name || 'Paket pilihan'}</p>{selectedPackage.features.length > 0 && <ul className="mt-2 space-y-1 text-xs leading-relaxed text-[var(--muted)]">{selectedPackage.features.map((feature, index) => <li key={`${feature}-${index}`} className="flex items-start gap-2"><Check size={13} className="mt-0.5 shrink-0 text-[var(--success-text)]" /> <span>{feature}</span></li>)}</ul>}</div>}{(selectedOriginalAmount || selectedAmount) && <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">{selectedOriginalAmount && <span className="text-base font-semibold text-[var(--muted)] line-through">{selectedOriginalAmount}</span>}{selectedAmount && <p className="text-2xl font-bold text-[var(--accent-strong)]">{selectedAmount}</p>}</div>}</>}
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">{asText(data.instructions, 'Tambahkan instruksi pembayaran.')}</p>
              {asText(data.accountNumber) && <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Nomor rekening</p><p className="mt-1 break-words text-sm font-semibold">{asText(data.accountNumber)}</p></div>}
              {confirmationHref ? <a href={confirmationHref} onClick={() => onCtaClick?.('payment')} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#128c7e] px-5 py-3 text-sm font-semibold text-white hover:brightness-95">{asText(data.buttonLabel, 'Konfirmasi melalui WhatsApp')} <ExternalLink size={15} /></a> : selectedPackage && <p className="mt-4 text-xs leading-relaxed text-[var(--muted)]">Nomor WhatsApp konfirmasi belum diatur oleh penyelenggara.</p>}
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-center">
              <p className="mb-3 text-xs font-semibold text-[var(--muted)]">QR Code pembayaran</p>
              {asText(data.qrCode) ? <img src={asText(data.qrCode)} alt="QR Code pembayaran" className="mx-auto aspect-square w-full max-w-[190px] object-contain" /> : <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-[var(--border-strong)] px-4 text-xs leading-relaxed text-[var(--muted)]">Upload QR Code dari pengaturan blok.</div>}
            </div>
          </div>
        </section>
      );
    }
    case 'bonus': {
      const bonusItems = normalizeBonusItems(data.items, data);
      return (
        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-6 shadow-sm md:p-8">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent-strong)]">Bonus</p>
            <h2 className="mt-3 text-2xl font-bold" style={{ color: sectionHeadingColor }}>{asText(data.heading, 'Bonus spesial untuk Anda')}</h2>
          </div>
          {bonusItems.length ? (
            <div className="space-y-4">
              {bonusItems.map((item, index) => (
                <article key={`${item.title}-${index}`} className="grid overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm sm:grid-cols-[minmax(150px,220px)_minmax(0,1fr)]">
                  <div className="min-h-[180px] bg-[var(--accent-soft)] sm:min-h-full">
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.imageAlt || `Visual bonus ${index + 1}`} className="h-full w-full object-cover" /> : <div className="flex h-full min-h-[180px] items-center justify-center px-4 text-center text-xs leading-relaxed text-[var(--muted)]">Tambahkan foto bonus dari pengaturan blok.</div>}
                  </div>
                  <div className="flex min-w-0 flex-col justify-center space-y-2 p-5 sm:py-6 sm:pr-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Bonus {index + 1}</p>
                    <h3 className="text-lg font-semibold">{item.title || `Bonus tambahan ${index + 1}`}</h3>
                    {item.body && <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">{item.body}</p>}
                    {item.caption && <p className="border-t border-[var(--border)] pt-2 text-xs leading-relaxed text-[var(--muted)]">{item.caption}</p>}
                  </div>
                </article>
              ))}
            </div>
          ) : <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--muted)]">Belum ada bonus yang ditampilkan.</div>}
        </section>
      );
    }
    case 'cta':
      return (
        <section className="rounded-2xl bg-[var(--accent)] p-7 text-white shadow-sm md:flex md:items-center md:justify-between md:gap-8 md:p-9">
          <div><h2 className="text-2xl font-bold" style={{ color: isHexColor(data.headingColor) ? asText(data.headingColor).trim() : 'white' }}>{asText(data.heading, 'Siap mulai?')}</h2><p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-white/80">{asText(data.body)}</p></div>
          <ActionLink label={asText(data.buttonLabel, 'Hubungi kami')} href={asText(data.buttonUrl)} onClick={() => onCtaClick?.('cta')} className="mt-5 shrink-0 bg-white text-[var(--accent-strong)] hover:bg-white/90 md:mt-0" />
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

const LandingPagePreview: React.FC<{ page: LandingPage; editable?: boolean; selectedBlockId?: string; onSelect?: (id: string) => void; onDrop?: (event: React.DragEvent, index: number) => void; onDragStart?: (event: React.DragEvent, blockId: string) => void; onMove?: (index: number, direction: -1 | 1) => void; onRemove?: (id: string) => void }> = ({ page, editable = false, selectedBlockId, onSelect, onDrop, onDragStart, onMove, onRemove }) => {
  const [selectedPackage, setSelectedPackage] = useState<LandingPricingPackage | null>(null);
  const hasPricingBlock = page.blocks.some(block => block.type === 'pricing');

  useEffect(() => {
    const packages = getPricingPackagesForPage(page);
    setSelectedPackage(current => current ? packages.find(item => item.id === current.id) || packages[0] || null : packages[0] || null);
  }, [page]);

  return (
    <LandingPageShell page={page} preview={editable}>
      {page.blocks.length === 0 && editable ? <div onDragOver={event => event.preventDefault()} onDrop={event => onDrop?.(event, 0)} className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-[var(--border-strong)] text-sm text-[var(--muted)]">Tarik elemen ke sini atau pilih elemen dari panel kiri.</div> : page.blocks.map((block, index) => (
        <div key={block.id} draggable={editable} onDragStart={event => onDragStart?.(event, block.id)} onDragOver={event => { if (editable) event.preventDefault(); }} onDrop={event => onDrop?.(event, index)} onClick={event => { if (!editable) return; event.preventDefault(); onSelect?.(block.id); }} className={`group relative rounded-3xl transition-shadow ${editable ? `cursor-grab ${selectedBlockId === block.id ? 'ring-2 ring-[var(--accent)] ring-offset-2' : 'hover:ring-2 hover:ring-[var(--accent-soft)]'}` : ''}`}>
          {editable && <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)]/95 p-1 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <span className="px-1 text-[var(--muted)]" title="Tarik untuk mengurutkan"><GripVertical size={15} /></span>
            <button type="button" aria-label={`Naikkan ${LANDING_BLOCK_LABELS[block.type]}`} disabled={index === 0} onClick={event => { event.stopPropagation(); onMove?.(index, -1); }} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-soft)] disabled:opacity-30"><MoveUp size={14} /></button>
            <button type="button" aria-label={`Turunkan ${LANDING_BLOCK_LABELS[block.type]}`} disabled={index === page.blocks.length - 1} onClick={event => { event.stopPropagation(); onMove?.(index, 1); }} className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-soft)] disabled:opacity-30"><MoveDown size={14} /></button>
            <button type="button" aria-label={`Hapus ${LANDING_BLOCK_LABELS[block.type]}`} onClick={event => { event.stopPropagation(); onRemove?.(block.id); }} className="rounded-lg p-1.5 text-[var(--danger-text)] hover:bg-[var(--danger-soft)]"><Trash2 size={14} /></button>
          </div>}
          <LandingBlockRenderer block={block} pageTitle={page.title} selectedPackage={selectedPackage} onSelectPackage={setSelectedPackage} hasPricingBlock={hasPricingBlock} />
        </div>
      ))}
      {editable && page.blocks.length > 0 && <div onDragOver={event => event.preventDefault()} onDrop={event => onDrop?.(event, page.blocks.length)} className="h-8 rounded-xl border border-dashed border-transparent transition-colors hover:border-[var(--border-strong)]" aria-label="Taruh elemen di bagian paling bawah" />}
    </LandingPageShell>
  );
};

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
  boxOffsetX: number;
  scale: number;
  positionX: number;
  positionY: number;
  onChange: (values: Record<string, number>) => void;
}> = ({ imageUrl, boxScale, boxOffsetX, scale, positionX, positionY, onChange }) => {
  const boxSizePercent = Math.round(normalizeHeroImageScale(boxScale, 1) * 100);
  const boxOffsetPercent = Math.round(normalizeHeroImageBoxOffset(boxOffsetX));
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
          <span className="flex items-center justify-between gap-3 text-xs font-semibold text-[var(--muted)]"><span>Geser box media</span><span className="text-[var(--text)]">{boxOffsetPercent > 0 ? `+${boxOffsetPercent}` : boxOffsetPercent}%</span></span>
          <input type="range" min="-50" max="50" step="5" value={boxOffsetPercent} onChange={event => onChange({ imageBoxOffsetX: Number(event.target.value) })} className={rangeClass} aria-label="Posisi horizontal box media Hero" />
          <span className="flex justify-between text-[10px] text-[var(--muted)]"><span>Kiri</span><span>Tengah</span><span>Kanan</span></span>
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

const LandingVideoEditor: React.FC<{
  items: LandingVideoItem[];
  layout: LandingVideoLayout;
  onChange: (items: LandingVideoItem[]) => void;
  onLayoutChange: (layout: LandingVideoLayout) => void;
}> = ({ items, layout, onChange, onLayoutChange }) => {
  const maxVideos = 12;
  const updateItem = (index: number, patch: Partial<LandingVideoItem>) => onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const addItem = () => {
    if (items.length >= maxVideos) return;
    onChange([...items, createVideoItem(items.length)]);
  };

  return (
    <div className="space-y-4">
      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-[var(--muted)]">Tampilan galeri video</span>
        <select value={layout} onChange={event => onLayoutChange(event.target.value as LandingVideoLayout)} className="min-h-[46px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]">
          {LANDING_VIDEO_LAYOUT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <span className="text-[11px] leading-relaxed text-[var(--muted)]">{LANDING_VIDEO_LAYOUT_OPTIONS.find(option => option.value === layout)?.description}</span>
      </label>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 text-[11px] leading-relaxed text-[var(--muted)]">
        Pilih <strong className="text-[var(--text)]">YouTube clip</strong> untuk preview cepat dari video YouTube, atau <strong className="text-[var(--text)]">Upload video preview</strong> agar pengunjung hanya menerima file potongan yang Anda siapkan. YouTube tetap dapat mengarahkan penonton ke sumber full.
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-[var(--muted)]">Daftar video</p>
        <span className="text-[11px] text-[var(--muted)]">{items.length}/{maxVideos} video</span>
      </div>
      {items.length ? items.map((item, index) => (
        <div key={`${item.id}-${index}`} className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Video {index + 1}</p>
            <button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Hapus video ${index + 1}`} title={`Hapus video ${index + 1}`} className="rounded-lg p-1.5 text-[var(--danger-text)] transition-colors hover:bg-[var(--danger-soft)]"><Trash2 size={16} /></button>
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-[var(--muted)]">Mode sumber video</span>
            <select value={item.sourceType} onChange={event => updateItem(index, { sourceType: event.target.value as LandingVideoSourceType })} className="min-h-[46px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]">
              <option value="youtube">YouTube clip</option>
              <option value="upload">Upload video preview</option>
            </select>
          </label>
          {item.sourceType === 'upload' ? <LandingVideoFileField value={item.fileUrl} onChange={fileUrl => updateItem(index, { fileUrl })} /> : <Input label="Link YouTube" value={item.url} onChange={event => updateItem(index, { url: event.target.value })} icon={LinkIcon} placeholder="https://youtube.com/watch?v=..." />}
          <Input label="Judul video (opsional)" value={item.title} onChange={event => updateItem(index, { title: event.target.value })} placeholder="Contoh: Cara menggunakan produk" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={item.sourceType === 'upload' ? 'Mulai pada detik (opsional)' : 'Mulai pada detik'} type="number" min="0" step="1" value={item.startSeconds} onChange={event => updateItem(index, { startSeconds: normalizeVideoSeconds(event.target.value, 0) })} />
            <Input label="Selesai pada detik (opsional)" type="number" min="1" step="1" value={item.endSeconds ?? ''} onChange={event => updateItem(index, { endSeconds: event.target.value ? normalizeVideoSeconds(event.target.value, 0) : null })} placeholder="Sampai akhir video" />
          </div>
          <Textarea label="Keterangan video (opsional)" value={item.caption} onChange={event => updateItem(index, { caption: event.target.value })} placeholder="Jelaskan isi potongan video ini." className="min-h-[90px]" />
        </div>
      )) : <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] px-4 text-center text-xs leading-relaxed text-[var(--muted)]">Belum ada video. Tambahkan link YouTube pertama untuk membuat galeri.</div>}
      <Button type="button" variant="secondary" icon={Plus} onClick={addItem} disabled={items.length >= maxVideos}>Tambah video</Button>
      <p className="text-[11px] leading-relaxed text-[var(--muted)]">Untuk preview yang tidak mengarah ke video full, gunakan mode Upload video preview dari hasil Video Clipper. File lokal dibatasi 15 MB atau gunakan URL file video langsung.</p>
    </div>
  );
};

const LandingTopicsEditor: React.FC<{ items: LandingTopicCategory[]; onChange: (items: LandingTopicCategory[]) => void }> = ({ items, onChange }) => {
  const maxCategories = 12;
  const updateItem = (index: number, patch: Partial<LandingTopicCategory>) => onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const addItem = () => {
    if (items.length >= maxCategories) return;
    onChange([...items, createTopicCategory(items.length)]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[var(--muted)]">Kategori topik</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">Setiap kategori akan tampil sebagai subjudul dengan daftar bullet di bawahnya.</p>
        </div>
        <span className="shrink-0 text-[11px] text-[var(--muted)]">{items.length}/{maxCategories}</span>
      </div>
      {items.length ? items.map((item, index) => (
        <div key={`${item.id}-${index}`} className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Kategori {index + 1}</p>
            <button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Hapus kategori ${index + 1}`} title={`Hapus kategori ${index + 1}`} className="rounded-lg p-1.5 text-[var(--danger-text)] transition-colors hover:bg-[var(--danger-soft)]"><Trash2 size={16} /></button>
          </div>
          <Input label="Nama kategori / subjudul" value={item.title} onChange={event => updateItem(index, { title: event.target.value })} placeholder="Contoh: Strategi dan Optimasi Akun" />
          <Textarea label="Poin pembahasan (satu per baris)" value={item.items.join('\n')} onChange={event => updateItem(index, { items: event.target.value.split('\n') })} placeholder={'Audit kondisi akun.\nPenentuan positioning dan target audiens.\nEvaluasi content pillar.'} className="min-h-[140px]" />
        </div>
      )) : <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] px-4 text-center text-xs leading-relaxed text-[var(--muted)]">Belum ada kategori. Tambahkan kategori pertama untuk menampilkan daftar topik.</div>}
      <Button type="button" variant="secondary" icon={Plus} onClick={addItem} disabled={items.length >= maxCategories}>Tambah kategori</Button>
    </div>
  );
};

const LandingWorkflowEditor: React.FC<{
  items: LandingWorkflowStep[];
  layout: LandingWorkflowLayout;
  onChange: (items: LandingWorkflowStep[]) => void;
  onLayoutChange: (layout: LandingWorkflowLayout) => void;
}> = ({ items, layout, onChange, onLayoutChange }) => {
  const maxSteps = 12;
  const updateItem = (index: number, patch: Partial<LandingWorkflowStep>) => onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const addItem = () => {
    if (items.length >= maxSteps) return;
    onChange([...items, createWorkflowStep(items.length)]);
  };

  return (
    <div className="space-y-4">
      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-[var(--muted)]">Tampilan workflow</span>
        <select value={layout} onChange={event => onLayoutChange(event.target.value as LandingWorkflowLayout)} className="min-h-[46px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]">
          <option value="vertical">Timeline vertikal</option>
          <option value="horizontal">Tahapan horizontal</option>
        </select>
        <span className="text-[11px] leading-relaxed text-[var(--muted)]">Timeline vertikal lebih nyaman untuk penjelasan panjang; tampilan horizontal cocok untuk alur singkat.</span>
      </label>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[var(--muted)]">Tahapan workflow</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">Urutan mengikuti posisi dari atas ke bawah.</p>
        </div>
        <span className="shrink-0 text-[11px] text-[var(--muted)]">{items.length}/{maxSteps}</span>
      </div>
      {items.length ? items.map((item, index) => (
        <div key={`${item.id}-${index}`} className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Tahap {index + 1}</p>
            <button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Hapus tahap ${index + 1}`} title={`Hapus tahap ${index + 1}`} className="rounded-lg p-1.5 text-[var(--danger-text)] transition-colors hover:bg-[var(--danger-soft)]"><Trash2 size={16} /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-[100px_minmax(0,1fr)]">
            <Input label="Label" value={item.label} onChange={event => updateItem(index, { label: event.target.value })} placeholder="01" />
            <Input label="Judul tahap" value={item.title} onChange={event => updateItem(index, { title: event.target.value })} placeholder="Contoh: Konsultasi awal" />
          </div>
          <Textarea label="Deskripsi tahap" value={item.description} onChange={event => updateItem(index, { description: event.target.value })} placeholder="Jelaskan apa yang terjadi di tahap ini." className="min-h-[100px]" />
        </div>
      )) : <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] px-4 text-center text-xs leading-relaxed text-[var(--muted)]">Belum ada tahap. Tambahkan tahap pertama untuk membuat alur kerja.</div>}
      <Button type="button" variant="secondary" icon={Plus} onClick={addItem} disabled={items.length >= maxSteps}>Tambah tahap</Button>
    </div>
  );
};

const LandingVideoFileField: React.FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    setIsProcessing(true);
    try {
      onChange(await readVideoDataUrl(file));
    } catch (uploadError: any) {
      setError(uploadError?.message || 'Video gagal diproses.');
    } finally {
      setIsProcessing(false);
    }
  };

  const inputValue = value.startsWith('data:video/') ? '' : value;
  const updateUrl = (nextValue: string) => {
    if (nextValue.trim() && !isVideoSourceUrl(nextValue)) {
      setError('Masukkan URL file video langsung (MP4/WebM), bukan URL halaman YouTube.');
      return;
    }
    setError(null);
    onChange(nextValue);
  };

  return (
    <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-[var(--muted)]">File video preview</p>
        {value && <button type="button" onClick={() => onChange('')} className="text-xs font-semibold text-[var(--danger-text)] hover:underline">Hapus video</button>}
      </div>
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-black">
        {value ? <video src={value} className="aspect-video w-full object-contain" controls controlsList="nodownload noplaybackrate noremoteplayback" disablePictureInPicture preload="metadata" /> : <div className="flex aspect-video items-center justify-center px-4 text-center text-xs text-white/70">Belum ada video preview</div>}
      </div>
      <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />
      <Button type="button" variant="secondary" icon={Upload} onClick={() => inputRef.current?.click()} isLoading={isProcessing}>Upload video preview</Button>
      <Input label="URL file video langsung (opsional)" value={inputValue} onChange={event => updateUrl(event.target.value)} placeholder="https://.../preview.webm atau .mp4" />
      <p className="text-[11px] leading-relaxed text-[var(--muted)]">Upload lokal dibatasi 15 MB agar konfigurasi landing tetap ringan. Untuk file lebih besar, gunakan URL file video langsung dari storage Anda.</p>
      {error && <p className="text-xs text-[var(--danger-text)]">{error}</p>}
    </div>
  );
};

const LandingProfileEditor: React.FC<{
  data: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
}> = ({ data, onChange }) => {
  const layout = normalizeProfileLayout(data.layout);
  const patch = (values: Record<string, any>) => onChange(values);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 text-[11px] leading-relaxed text-[var(--muted)]">Gunakan blok ini untuk memperkenalkan mentor, pemilik program, pembicara, atau orang di balik produk dengan foto dan biografi singkat.</div>
      <Input label="Judul section (opsional)" value={asText(data.heading)} onChange={event => patch({ heading: event.target.value })} placeholder="Tentang saya" />
      <Input label="Label kecil (opsional)" value={asText(data.eyebrow)} onChange={event => patch({ eyebrow: event.target.value })} placeholder="Profil" />
      <label className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-[var(--muted)]">Layout profil</span>
        <select value={layout} onChange={event => patch({ layout: event.target.value as LandingProfileLayout })} className="min-h-[46px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]">
          <option value="split">Foto di samping teks</option>
          <option value="centered">Foto di atas, teks di tengah</option>
        </select>
      </label>
      <ImageUploader label="Foto profil (opsional)" value={asText(data.photoUrl)} onChange={photoUrl => patch({ photoUrl })} />
      <Input label="Alt foto" value={asText(data.photoAlt)} onChange={event => patch({ photoAlt: event.target.value })} placeholder="Foto profil" />
      <Input label="Nama" value={asText(data.name)} onChange={event => patch({ name: event.target.value })} placeholder="Nama Anda" />
      <Input label="Jabatan / label" value={asText(data.role)} onChange={event => patch({ role: event.target.value })} placeholder="Mentor / Founder" />
      <Textarea label="Biografi singkat" value={asText(data.bio)} onChange={event => patch({ bio: event.target.value })} placeholder="Ceritakan pengalaman, keahlian, dan fokus Anda secara singkat." className="min-h-[150px]" />
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

const LandingBonusEditor: React.FC<{ items: LandingBonusItem[]; onChange: (items: LandingBonusItem[]) => void }> = ({ items, onChange }) => {
  const maxBonuses = 12;
  const updateItem = (index: number, patch: Partial<LandingBonusItem>) => onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const addItem = () => {
    if (items.length >= maxBonuses) return;
    onChange([...items, { title: '', body: '', imageUrl: '', imageAlt: 'Visual bonus', caption: '' }]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-[var(--muted)]">Daftar bonus</p>
        <span className="text-[11px] text-[var(--muted)]">{items.length}/{maxBonuses} bonus</span>
      </div>
      {items.length ? items.map((item, index) => (
        <div key={`bonus-editor-${index}`} className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Bonus {index + 1}</p>
            <button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Hapus bonus ${index + 1}`} className="rounded-lg p-1.5 text-[var(--danger-text)] transition-colors hover:bg-[var(--danger-soft)]"><Trash2 size={16} /></button>
          </div>
          <Input label="Judul bonus" value={item.title} onChange={event => updateItem(index, { title: event.target.value })} placeholder="Contoh: Template tambahan gratis" />
          <Textarea label="Keterangan bonus" value={item.body} onChange={event => updateItem(index, { body: event.target.value })} placeholder="Jelaskan isi dan manfaat bonus untuk pelanggan." />
          <ImageUploader label="Foto bonus (opsional)" value={item.imageUrl} onChange={value => updateItem(index, { imageUrl: value })} />
          <Input label="Alt foto" value={item.imageAlt} onChange={event => updateItem(index, { imageAlt: event.target.value })} placeholder="Visual bonus" />
          <Textarea label="Caption foto (opsional)" value={item.caption} onChange={event => updateItem(index, { caption: event.target.value })} className="min-h-[90px]" />
        </div>
      )) : <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] px-4 py-6 text-center text-xs leading-relaxed text-[var(--muted)]">Belum ada bonus. Tambahkan bonus pertama untuk ditampilkan di halaman publik.</div>}
      <Button type="button" variant="secondary" icon={Plus} onClick={addItem} disabled={items.length >= maxBonuses}>Tambah bonus</Button>
      <p className="text-[11px] leading-relaxed text-[var(--muted)]">Setiap bonus akan tampil sebagai card. Gunakan beberapa card untuk menjelaskan isi bonus dengan lebih jelas.</p>
    </div>
  );
};

const LandingPricingEditor: React.FC<{ items: LandingPricingPackage[]; onChange: (items: LandingPricingPackage[]) => void }> = ({ items, onChange }) => {
  const maxPackages = 12;
  const updateItem = (index: number, patch: Partial<LandingPricingPackage>) => onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const addItem = () => {
    if (items.length >= maxPackages) return;
    onChange([...items, createPricingPackage(items.length)]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[var(--muted)]">Daftar paket</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">Pengunjung memilih salah satu paket sebelum melihat total pembayaran dan QR Code.</p>
        </div>
        <span className="shrink-0 text-[11px] text-[var(--muted)]">{items.length}/{maxPackages}</span>
      </div>
      {items.length ? items.map((item, index) => (
        <div key={`pricing-editor-${item.id}-${index}`} className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Paket {index + 1}</p>
            <button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Hapus paket ${index + 1}`} className="rounded-lg p-1.5 text-[var(--danger-text)] transition-colors hover:bg-[var(--danger-soft)]"><Trash2 size={16} /></button>
          </div>
          <Input label="Nama paket" value={item.name} onChange={event => updateItem(index, { name: event.target.value })} placeholder="Contoh: Paket Pro" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Harga paket" value={item.price} onChange={event => updateItem(index, { price: event.target.value })} placeholder="Contoh: Rp 250.000" />
            <Input label="Harga coret (opsional)" value={item.originalPrice} onChange={event => updateItem(index, { originalPrice: event.target.value })} placeholder="Contoh: Rp 350.000" />
          </div>
          <Textarea label="Deskripsi paket (opsional)" value={item.description} onChange={event => updateItem(index, { description: event.target.value })} placeholder="Jelaskan paket ini cocok untuk siapa." className="min-h-[90px]" />
          <Textarea label="Benefit paket (satu per baris)" value={item.features.join('\n')} onChange={event => updateItem(index, { features: event.target.value.split('\n').map(value => value.trim()).filter(Boolean) })} placeholder={'Akses kelas selamanya\nTemplate siap pakai\nSupport grup'} className="min-h-[110px]" />
        </div>
      )) : <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] px-4 py-6 text-center text-xs leading-relaxed text-[var(--muted)]">Belum ada paket. Tambahkan paket pertama agar pengunjung dapat memilih produk.</div>}
      <Button type="button" variant="secondary" icon={Plus} onClick={addItem} disabled={items.length >= maxPackages}>Tambah paket</Button>
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
  const pricingButtonFields = <div className="space-y-2"><Input label="Label tombol pilihan paket" value={asText(data.buttonLabel)} onChange={event => patch({ buttonLabel: event.target.value })} placeholder="Contoh: Pilih paket" /><p className="text-[11px] leading-relaxed text-[var(--muted)]">Setelah memilih paket, pengunjung akan melihat total pembayaran dan QR Code di blok Pembayaran.</p></div>;
  const hasHeadingColor = ['hero', 'text', 'features', 'topics', 'workflow', 'pricing', 'profile', 'faq', 'payment', 'bonus', 'cta'].includes(block.type);
  const headingColorField = hasHeadingColor ? <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3"><div><p className="text-xs font-semibold text-[var(--muted)]">Warna judul section</p><p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">Atur warna judul bagian ini tanpa mengubah warna section lainnya.</p></div><div className="flex items-center gap-3"><input type="color" value={headingColorInputValue(data.headingColor)} onChange={event => patch({ headingColor: event.target.value })} aria-label="Warna judul section" className="h-10 w-14 cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1" /><span className="text-xs font-semibold text-[var(--text)]">{isHexColor(data.headingColor) ? asText(data.headingColor).toUpperCase() : 'Default tema'}</span></div>{isHexColor(data.headingColor) && <button type="button" onClick={() => patch({ headingColor: '' })} className="text-left text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--text)]">Gunakan warna default tema</button>}</div> : null;
  switch (block.type) {
    case 'hero':
      return <div className="space-y-4"><Input label="Eyebrow" value={asText(data.eyebrow)} onChange={event => patch({ eyebrow: event.target.value })} /><Input label="Judul utama" value={asText(data.headline)} onChange={event => patch({ headline: event.target.value })} />{headingColorField}<Textarea label="Deskripsi" value={asText(data.body)} onChange={event => patch({ body: event.target.value })} /><ImageUploader label="Visual hero (opsional)" value={asText(data.imageUrl)} onChange={value => patch({ imageUrl: value })} /><HeroImageControls imageUrl={asText(data.imageUrl)} boxScale={normalizeHeroImageScale(data.imageBoxScale, 1)} boxOffsetX={normalizeHeroImageBoxOffset(data.imageBoxOffsetX)} scale={normalizeHeroImageScale(data.imageScale)} positionX={normalizeHeroImagePosition(data.imagePositionX)} positionY={normalizeHeroImagePosition(data.imagePositionY)} onChange={values => patch(values)} /><Input label="Alt visual" value={asText(data.imageAlt)} onChange={event => patch({ imageAlt: event.target.value })} />{commonButtonFields}</div>;
    case 'text':
      return <div className="space-y-4"><Input label="Judul bagian" value={asText(data.heading)} onChange={event => patch({ heading: event.target.value })} />{headingColorField}<RichTextEditor label="Isi teks" value={asText(data.body)} onChange={body => patch({ body })} /></div>;
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
    case 'video': {
      const items = normalizeVideoItems(data.videos, data);
      const layout = normalizeVideoLayout(data.layout);
      const updateItems = (nextItems: LandingVideoItem[]) => {
        const first = nextItems[0];
        patch({
          videos: nextItems,
          sourceType: first?.sourceType || 'youtube',
          url: first?.url || '',
          fileUrl: first?.fileUrl || '',
          title: first?.title || '',
          caption: first?.caption || '',
          startSeconds: first?.startSeconds || 0,
          endSeconds: first?.endSeconds ?? null
        });
      };
      return <LandingVideoEditor items={items} layout={layout} onChange={updateItems} onLayoutChange={nextLayout => patch({ layout: nextLayout })} />;
    }
    case 'features':
      return <div className="space-y-4"><Input label="Judul bagian" value={asText(data.heading)} onChange={event => patch({ heading: event.target.value })} />{headingColorField}<Textarea label="Manfaat (satu per baris, format: Judul | Deskripsi)" value={pipeItemsToText(normalizeLineItems(data.items, []))} onChange={event => patch({ items: textToPipeItems(event.target.value) })} className="min-h-[180px]" /></div>;
    case 'topics': {
      const items = normalizeTopicCategories(data.categories, []);
      return <div className="space-y-4"><Input label="Judul bagian" value={asText(data.heading)} onChange={event => patch({ heading: event.target.value })} />{headingColorField}<Textarea label="Pembuka (opsional)" value={asText(data.intro)} onChange={event => patch({ intro: event.target.value })} placeholder="Jelaskan secara singkat topik yang akan dibahas." className="min-h-[90px]" /><LandingTopicsEditor items={items} onChange={categories => patch({ categories })} /></div>;
    }
    case 'workflow': {
      const items = normalizeWorkflowSteps(data.steps, []);
      const layout = normalizeWorkflowLayout(data.layout);
      return <div className="space-y-4"><Input label="Judul bagian" value={asText(data.heading)} onChange={event => patch({ heading: event.target.value })} />{headingColorField}<Textarea label="Pembuka (opsional)" value={asText(data.intro)} onChange={event => patch({ intro: event.target.value })} placeholder="Jelaskan secara singkat alur yang akan diikuti." className="min-h-[90px]" /><LandingWorkflowEditor items={items} layout={layout} onChange={steps => patch({ steps })} onLayoutChange={nextLayout => patch({ layout: nextLayout })} /></div>;
    }
    case 'pricing': {
      const items = normalizePricingPackages(data.packages, data);
      const updateItems = (nextItems: LandingPricingPackage[]) => {
        const first = nextItems[0];
        patch({
          packages: nextItems,
          price: first?.price || '',
          body: first?.description || asText(data.body),
          features: first?.features || []
        });
      };
      return <div className="space-y-4"><Input label="Judul bagian" value={asText(data.heading)} onChange={event => patch({ heading: event.target.value })} />{headingColorField}<Textarea label="Deskripsi bagian (opsional)" value={asText(data.body)} onChange={event => patch({ body: event.target.value })} placeholder="Arahkan pengunjung untuk memilih paket yang paling sesuai." className="min-h-[90px]" /><LandingPricingEditor items={items} onChange={updateItems} />{pricingButtonFields}</div>;
    }
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
    case 'profile':
      return <div className="space-y-4"><LandingProfileEditor data={data} onChange={patch} />{headingColorField}</div>;
    case 'faq':
      return <div className="space-y-4"><Input label="Judul bagian" value={asText(data.heading)} onChange={event => patch({ heading: event.target.value })} />{headingColorField}<Textarea label="FAQ (satu per baris, format: Pertanyaan | Jawaban)" value={faqItemsToText(normalizeFaqItems(data.items, []))} onChange={event => patch({ items: textToFaqItems(event.target.value) })} className="min-h-[200px]" /></div>;
    case 'payment':
      return <div className="space-y-4"><Input label="Judul bagian" value={asText(data.heading)} onChange={event => patch({ heading: event.target.value })} />{headingColorField}<p className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 text-[11px] leading-relaxed text-[var(--muted)]">Gunakan blok ini setelah blok Harga/Paket. Setelah pengunjung memilih paket, total dan benefitnya akan tampil di sini sebelum konfirmasi WhatsApp.</p><Input label="CTA sebelum harga (opsional)" value={asText(data.ctaBeforePrice)} onChange={event => patch({ ctaBeforePrice: event.target.value })} placeholder="Contoh: Selesaikan pembayaran" /><Input label="Harga coret (opsional)" value={asText(data.originalAmount)} onChange={event => patch({ originalAmount: event.target.value })} placeholder="Contoh: Rp 350.000" /><Input label="Nominal pembayaran" value={asText(data.amount)} onChange={event => patch({ amount: event.target.value })} placeholder="Dipakai jika tidak ada paket" /><Textarea label="Instruksi pembayaran" value={asText(data.instructions)} onChange={event => patch({ instructions: event.target.value })} placeholder="Pilih paket, bayar melalui QR Code/rekening, lalu kirim bukti pembayaran melalui WhatsApp." /><Input label="Nomor rekening (opsional)" value={asText(data.accountNumber)} onChange={event => patch({ accountNumber: event.target.value })} /><Input label="WhatsApp konfirmasi (opsional)" value={asText(data.whatsapp)} onChange={event => patch({ whatsapp: event.target.value })} placeholder="62812xxxxxxx" /><Input label="Label tombol" value={asText(data.buttonLabel)} onChange={event => patch({ buttonLabel: event.target.value })} /><ImageUploader label="QR Code pembayaran" value={asText(data.qrCode)} onChange={value => patch({ qrCode: value })} preservePng /><Input label="URL QR Code (opsional)" value={asText(data.qrCode).startsWith('data:') ? '' : asText(data.qrCode)} onChange={event => patch({ qrCode: event.target.value })} placeholder="https://.../qr.png" /></div>;
    case 'bonus': {
      const items = normalizeBonusItems(data.items, data);
      const updateItems = (nextItems: LandingBonusItem[]) => {
        const first = nextItems[0];
        patch({
          items: nextItems,
          title: first?.title || '',
          body: first?.body || '',
          imageUrl: first?.imageUrl || '',
          imageAlt: first?.imageAlt || 'Visual bonus',
          caption: first?.caption || ''
        });
      };
      return <div className="space-y-4"><Input label="Judul bagian" value={asText(data.heading)} onChange={event => patch({ heading: event.target.value })} />{headingColorField}<LandingBonusEditor items={items} onChange={updateItems} /></div>;
    }
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

const LandingInsightModal: React.FC<{
  page: LandingPage | null;
  client: any;
  onClose: () => void;
}> = ({ page, client, onClose }) => {
  const [days, setDays] = useState(30);
  const [detail, setDetail] = useState<LandingInsightDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!page || !client) {
      setDetail(null);
      setError(null);
      return undefined;
    }

    let isActive = true;
    setIsLoading(true);
    setDetail(null);
    setError(null);
    client.rpc('get_landing_page_insight', { p_landing_page_id: page.id, p_days: days }).then((response: any) => {
      if (!isActive) return;
      if (response?.error) {
        setError(errorMessage(response.error));
        return;
      }
      const value = response?.data;
      if (!value || typeof value !== 'object') {
        setDetail(emptyLandingInsight(page.id));
        return;
      }
      setDetail({
        landingPageId: asText(value.landingPageId, page.id),
        totalViews: insightCount(value.totalViews),
        uniqueVisitors: insightCount(value.uniqueVisitors),
        ctaClicks: insightCount(value.ctaClicks),
        conversionRate: insightCount(value.conversionRate),
        daily: Array.isArray(value.daily) ? value.daily.map((item: any) => ({
          date: asText(item?.date),
          views: insightCount(item?.views),
          ctaClicks: insightCount(item?.ctaClicks)
        })) : [],
        devices: Array.isArray(value.devices) ? value.devices.map((item: any) => ({
          device: asText(item?.device, 'Lainnya'),
          count: insightCount(item?.count)
        })) : [],
        sources: Array.isArray(value.sources) ? value.sources.map((item: any) => ({
          source: asText(item?.source, 'direct'),
          count: insightCount(item?.count)
        })) : []
      });
    }).catch((requestError: any) => {
      if (isActive) setError(errorMessage(requestError));
    }).finally(() => {
      if (isActive) setIsLoading(false);
    });

    return () => { isActive = false; };
  }, [client, days, page?.id]);

  useEffect(() => {
    if (!page) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, page]);

  if (!page || typeof document === 'undefined') return null;

  const insight = detail || emptyLandingInsight(page.id);
  const metricItems: Array<{ label: string; value: string; icon: React.ComponentType<any> }> = [
    { label: 'Views', value: formatInsightCount(insight.totalViews), icon: Eye },
    { label: 'Pengunjung unik', value: formatInsightCount(insight.uniqueVisitors), icon: Users },
    { label: 'Klik CTA', value: formatInsightCount(insight.ctaClicks), icon: MousePointerClick },
    { label: 'Konversi CTA', value: `${insight.conversionRate.toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`, icon: BarChart3 }
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="landing-insight-title"
      onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[min(90vh,780px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4 md:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Insight landing page</p>
            <h2 id="landing-insight-title" className="mt-1 truncate text-xl font-bold">{page.title}</h2>
            <p className="mt-1 break-all text-xs text-[var(--muted)]">/landing/{page.slug} · {days} hari terakhir</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <select value={days} onChange={event => setDays(Number(event.target.value))} aria-label="Periode insight" className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-xs font-semibold outline-none focus:border-[var(--accent)]">
              <option value={7}>7 hari</option>
              <option value={30}>30 hari</option>
              <option value={90}>90 hari</option>
            </select>
            <button type="button" onClick={onClose} aria-label="Tutup insight" title="Tutup" className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--text)]"><X size={18} /></button>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 md:p-6">
          {isLoading && <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] py-10 text-sm text-[var(--muted)]"><Loader2 size={17} className="animate-spin" /> Memuat insight...</div>}
          {error && !isLoading && <div className="rounded-xl border border-[var(--border)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger-text)]">{error}</div>}
          {!error && !isLoading && <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {metricItems.map(item => { const Icon = item.icon; return <div key={item.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4"><div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]"><Icon size={15} /> {item.label}</div><p className="mt-2 text-2xl font-bold text-[var(--text)]">{item.value}</p></div>; })}
            </div>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <section className="min-w-0 rounded-xl border border-[var(--border)]">
                <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3"><h3 className="text-sm font-bold">Tren harian</h3><span className="text-[11px] text-[var(--muted)]">Views · CTA</span></div>
                {insight.daily.length ? <div className="max-h-64 overflow-y-auto"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-[var(--surface-soft)] text-[var(--muted)]"><tr><th className="px-4 py-2 font-semibold">Tanggal</th><th className="px-4 py-2 text-right font-semibold">Views</th><th className="px-4 py-2 text-right font-semibold">CTA</th></tr></thead><tbody>{insight.daily.map(day => <tr key={day.date} className="border-t border-[var(--border)]"><td className="px-4 py-2.5 text-[var(--muted)]">{formatInsightDate(day.date)}</td><td className="px-4 py-2.5 text-right font-semibold">{formatInsightCount(day.views)}</td><td className="px-4 py-2.5 text-right font-semibold">{formatInsightCount(day.ctaClicks)}</td></tr>)}</tbody></table></div> : <p className="px-4 py-8 text-center text-xs text-[var(--muted)]">Belum ada kunjungan pada periode ini.</p>}
              </section>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
                <InsightBreakdown title="Perangkat" items={insight.devices.map(item => ({ label: item.device, count: item.count }))} emptyLabel="Belum ada data perangkat." />
                <InsightBreakdown title="Sumber kunjungan" items={insight.sources.map(item => ({ label: item.source, count: item.count }))} emptyLabel="Belum ada data sumber." />
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-[var(--muted)]">Views dihitung satu kali per pengunjung dalam jeda singkat. Pengunjung unik memakai ID anonim di browser, sedangkan konversi CTA menunjukkan persentase klik CTA dibanding views.</p>
          </>}
        </div>
      </div>
    </div>,
    document.body
  );
};

const InsightBreakdown: React.FC<{
  title: string;
  items: Array<{ label: string; count: number }>;
  emptyLabel: string;
}> = ({ title, items, emptyLabel }) => (
  <section className="rounded-xl border border-[var(--border)] p-4">
    <h3 className="text-sm font-bold">{title}</h3>
    {items.length ? <div className="mt-3 space-y-2">{items.map(item => <div key={item.label} className="flex items-center justify-between gap-3 text-xs"><span className="truncate text-[var(--muted)]">{item.label}</span><span className="font-semibold">{formatInsightCount(item.count)}</span></div>)}</div> : <p className="mt-3 text-xs text-[var(--muted)]">{emptyLabel}</p>}
  </section>
);

type LandingPagesPageViewProps = {
  client: any;
  navigate: (to: string) => void;
  pages: LandingPage[];
  insights: Record<string, LandingInsightSummary>;
  isLoading: boolean;
  isCreating: boolean;
  notice: Notice | null;
  loadError: string | null;
  copiedSlug: string | null;
  deleteTarget: LandingPage | null;
  isDeleting: boolean;
  insightTarget: LandingPage | null;
  onCreate: () => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
  onCopy: (page: LandingPage) => void | Promise<void>;
  onOpenInsight: (page: LandingPage) => void;
  onDeleteTarget: (page: LandingPage) => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void | Promise<void>;
  onCloseInsight: () => void;
};

const LandingPagesPageView: React.FC<LandingPagesPageViewProps> = ({
  client,
  navigate,
  pages,
  insights,
  isLoading,
  isCreating,
  notice,
  loadError,
  copiedSlug,
  deleteTarget,
  isDeleting,
  insightTarget,
  onCreate,
  onRefresh,
  onCopy,
  onOpenInsight,
  onDeleteTarget,
  onCancelDelete,
  onConfirmDelete,
  onCloseInsight
}) => (
  <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <Link to="/admin" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent-strong)]"><ArrowLeft size={14} /> Semua Space</Link>
        <h1 className="text-3xl font-bold">{LANDING_PAGE_SPACE_LABEL}</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">Buat halaman promosi produk dengan blok drag-and-drop, CTA pendaftaran, dan informasi pembayaran.</p>
      </div>
      <Button icon={Plus} onClick={() => void onCreate()} isLoading={isCreating}>Buat Landing Page</Button>
    </div>
    <NoticeBanner notice={notice} />
    {isLoading ? (
      <Card className="flex items-center justify-center gap-3 py-14 text-sm text-[var(--muted)]"><Loader2 size={18} className="animate-spin" /> Memuat landing page...</Card>
    ) : loadError ? (
      <Card className="space-y-4 py-12 text-center"><XCircle size={30} className="mx-auto text-[var(--danger-text)]" /><p className="text-sm text-[var(--danger-text)]">{loadError}</p><Button variant="secondary" onClick={() => void onRefresh()}>Coba Lagi</Button></Card>
    ) : pages.length === 0 ? (
      <Card className="space-y-4 py-14 text-center"><Layout size={34} className="mx-auto text-[var(--muted)]" /><p className="font-semibold">Belum ada landing page</p><p className="text-sm text-[var(--muted)]">Buat halaman pertama untuk mempromosikan produk Anda.</p><Button onClick={() => void onCreate()} icon={Plus} className="mx-auto">Buat Landing Page Pertama</Button></Card>
    ) : (
      <div className="grid gap-5 md:grid-cols-2">
        {pages.map(page => {
          const insight = insights[page.id];
          return <Card key={page.id} className="flex h-full flex-col gap-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><Badge color="var(--accent-soft)">{LANDING_PAGE_SPACE_LABEL}</Badge><span className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${page.status === 'published' ? 'bg-[var(--success-soft)] text-[var(--success-text)]' : page.status === 'archived' ? 'bg-[var(--danger-soft)] text-[var(--danger-text)]' : 'bg-[var(--surface-soft)] text-[var(--muted)]'}`}>{page.status === 'published' ? 'Publik' : page.status === 'archived' ? 'Arsip' : 'Draft'}</span></div>
                <h2 className="mt-3 truncate text-xl font-bold">{page.title}</h2>
                <p className="mt-1 break-all text-xs text-[var(--muted)]">/landing/{page.slug}</p>
              </div>
              <Layout className="shrink-0 text-[var(--accent-strong)]" size={24} />
            </div>
            <p className="line-clamp-2 text-sm leading-relaxed text-[var(--muted)]">{page.description || 'Belum ada deskripsi landing page.'}</p>
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
              <div className="min-w-0"><span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--muted)]"><Eye size={13} /> Views</span><strong className="mt-1 block text-sm">{formatInsightCount(insight?.total_views)}</strong></div>
              <div className="min-w-0"><span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--muted)]"><Users size={13} /> Unik</span><strong className="mt-1 block text-sm">{formatInsightCount(insight?.unique_visitors)}</strong></div>
              <div className="min-w-0"><span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--muted)]"><MousePointerClick size={13} /> CTA</span><strong className="mt-1 block text-sm">{formatInsightCount(insight?.cta_clicks)}</strong></div>
            </div>
            <p className="-mt-3 text-[10px] text-[var(--muted)]">Ringkasan 30 hari terakhir</p>
            <div className="grid grid-cols-2 gap-3 text-xs text-[var(--muted)]"><span>{page.blocks.length} blok konten</span><span className="text-right">Tema {FORM_THEME_OPTIONS.find(option => option.value === page.theme)?.label || 'Navy'}</span></div>
            <div className="mt-auto grid grid-cols-2 gap-2 pt-2 sm:grid-cols-3">
              <Button variant="secondary" className="px-2 text-xs" onClick={() => navigate(`/admin/landing-pages/${page.id}`)}>Edit Page</Button>
              <Button variant="secondary" className="px-2 text-xs" icon={BarChart3} onClick={() => onOpenInsight(page)}>Lihat insight</Button>
              <Button variant={copiedSlug === page.slug ? 'green' : 'secondary'} className="px-2 text-xs" icon={copiedSlug === page.slug ? Check : Copy} onClick={() => void onCopy(page)}>{copiedSlug === page.slug ? 'Tersalin' : 'Copy Link'}</Button>
              <Button className="px-2 text-xs" icon={ExternalLink} disabled={page.status !== 'published'} onClick={() => window.open(createLandingShareLink(page.slug), '_blank', 'noopener,noreferrer')}>Buka Publik</Button>
              <Button type="button" variant="danger" className="px-2 text-xs" icon={Trash2} onClick={() => onDeleteTarget(page)}>Hapus</Button>
            </div>
          </Card>;
        })}
      </div>
    )}
    <LandingInsightModal page={insightTarget} client={client} onClose={onCloseInsight} />
    <ConfirmModal open={Boolean(deleteTarget)} title="Hapus landing page ini?" description={deleteTarget ? <>Landing page <strong className="text-[var(--text)]">{deleteTarget.title}</strong> akan dihapus permanen.</> : null} confirmLabel="Hapus Page" isLoading={isDeleting} onCancel={onCancelDelete} onConfirm={() => void onConfirmDelete()} />
  </div>
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
  const [insights, setInsights] = useState<Record<string, LandingInsightSummary>>({});
  const [insightTarget, setInsightTarget] = useState<LandingPage | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!client) return;
    let response: any;
    try {
      response = await client.rpc('get_landing_page_insights', { p_days: 30 });
    } catch {
      setInsights({});
      return;
    }
    const { data, error } = response || {};
    if (error || !Array.isArray(data)) {
      setInsights({});
      return;
    }
    const nextInsights: Record<string, LandingInsightSummary> = {};
    data.forEach((row: any) => {
      const landingPageId = asText(row?.landing_page_id);
      if (!landingPageId) return;
      nextInsights[landingPageId] = {
        landing_page_id: landingPageId,
        total_views: insightCount(row?.total_views),
        unique_visitors: insightCount(row?.unique_visitors),
        cta_clicks: insightCount(row?.cta_clicks),
        conversion_rate: insightCount(row?.conversion_rate),
        last_viewed_at: row?.last_viewed_at || null
      };
    });
    setInsights(nextInsights);
  }, [client]);

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
      setPages([]);
      setInsights({});
    } else {
      setPages((data || []).map(mapLandingRow));
      setLoadError(null);
      void fetchInsights();
    }
    setIsLoading(false);
  }, [client, fetchInsights]);

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
    const url = createLandingShareLink(page.slug, page.updatedAt);
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
      setInsights(current => {
        const next = { ...current };
        delete next[target.id];
        return next;
      });
      setDeleteTarget(null);
      setNotice({ tone: 'success', message: `Landing page “${target.title}” berhasil dihapus.` });
    }
    setIsDeleting(false);
  };

  return <LandingPagesPageView
    client={client}
    navigate={navigate}
    pages={pages}
    insights={insights}
    isLoading={isLoading}
    isCreating={isCreating}
    notice={notice}
    loadError={loadError}
    copiedSlug={copiedSlug}
    deleteTarget={deleteTarget}
    isDeleting={isDeleting}
    insightTarget={insightTarget}
    onCreate={handleCreate}
    onRefresh={fetchPages}
    onCopy={handleCopy}
    onOpenInsight={setInsightTarget}
    onDeleteTarget={setDeleteTarget}
    onCancelDelete={() => { if (!isDeleting) setDeleteTarget(null); }}
    onConfirmDelete={handleDelete}
    onCloseInsight={() => setInsightTarget(null)}
  />;
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

  return <div className="mx-auto flex max-w-[1600px] flex-col gap-6 p-4 pb-28 md:p-8 xl:h-[100dvh] xl:gap-5 xl:overflow-hidden xl:overscroll-none xl:pb-8"><div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center"><div><Link to="/admin/landing-pages" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent-strong)]"><ArrowLeft size={14} /> {LANDING_PAGE_SPACE_LABEL}</Link><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold">Editor Landing Page</h1><Badge color={page.status === 'published' ? 'var(--success-soft)' : 'var(--surface-soft)'}>{page.status === 'published' ? 'Publik' : page.status === 'archived' ? 'Arsip' : 'Draft'}</Badge></div><p className="mt-2 text-sm text-[var(--muted)]">Tarik blok ke canvas, klik blok untuk mengedit, lalu simpan dan publikasikan.</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" icon={ExternalLink} disabled={page.status !== 'published'} onClick={() => window.open(createLandingShareLink(page.slug), '_blank', 'noopener,noreferrer')}>Preview publik</Button><Button icon={Save} onClick={() => void handleSave()} isLoading={isSaving}>Simpan Page</Button></div></div><NoticeBanner notice={notice} /><div className="grid gap-5 xl:min-h-0 xl:flex-1 xl:items-stretch xl:overflow-hidden xl:overscroll-none xl:grid-cols-[230px_minmax(0,1fr)_300px]"><Card className="space-y-4 xl:sticky xl:top-0 xl:h-full xl:max-h-full xl:min-h-0 xl:self-start xl:overflow-y-auto xl:overscroll-contain"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Elemen</p><h2 className="mt-2 text-lg font-bold">Tambah blok</h2><p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">Tarik ke posisi yang diinginkan atau klik untuk menambah di bagian bawah.</p></div><div className="space-y-2">{LANDING_BLOCK_OPTIONS.map(option => { const Icon = option.icon; return <button key={option.value} type="button" draggable onDragStart={event => { event.dataTransfer.effectAllowed = 'copy'; event.dataTransfer.setData('application/x-landing-block-type', option.value); }} onClick={() => addBlock(option.value)} className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-strong)]"><Icon size={16} /></span><span className="min-w-0"><span className="block text-sm font-semibold">{option.label}</span><span className="mt-0.5 block text-[10px] leading-snug text-[var(--muted)]">{option.description}</span></span><GripVertical size={14} className="ml-auto shrink-0 text-[var(--muted)]" /></button>; })}</div></Card><div className="min-w-0 xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain"><LandingPagePreview page={page} editable selectedBlockId={selectedBlockId || undefined} onSelect={setSelectedBlockId} onDrop={handleDrop} onDragStart={(event, blockId) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-landing-block-id', blockId); }} onMove={moveBlock} onRemove={removeBlock} /></div><Card className="space-y-5 xl:sticky xl:top-0 xl:h-full xl:max-h-full xl:min-h-0 xl:self-start xl:overflow-y-auto xl:overscroll-contain"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Pengaturan</p><h2 className="mt-2 text-lg font-bold">{selectedBlock ? LANDING_BLOCK_LABELS[selectedBlock.type] : 'Landing page'}</h2></div><Palette size={20} className="text-[var(--accent-strong)]" /></div>{selectedBlock ? <><button type="button" onClick={() => setSelectedBlockId(null)} className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)]">← Kembali ke pengaturan page</button><BlockInspector block={selectedBlock} onChange={data => setPage(current => current ? { ...current, blocks: current.blocks.map(block => block.id === selectedBlock.id ? { ...block, data } : block) } : current)} /></> : <PageSettingsPanel page={page} onChange={updatePage} />}</Card></div></div>;
};

export const PublicLandingPageView: React.FC<{ client: any; slugOverride?: string }> = ({ client, slugOverride }) => {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const slug = slugOverride || routeSlug;
  const [page, setPage] = useState<LandingPage | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<LandingPricingPackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const trackedViewRef = useRef<string | null>(null);

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
      const mappedPage = mapLandingRow(data);
      setPage(mappedPage);
      setSelectedPackage(getFirstPricingPackage(mappedPage));
      setLoadError(null);
    }
    setIsLoading(false);
  }, [client, slug]);

  useEffect(() => { void fetchPage(); }, [fetchPage]);
  useEffect(() => {
    if (!page) return;
    setPublicMetadata({
      title: page.title,
      description: page.description || asText(page.blocks.find(block => block.type === 'hero')?.data?.body),
      image: getLandingPreviewImage(page),
      imageAlt: page.title
    });
  }, [page]);

  useEffect(() => {
    if (!page || trackedViewRef.current === page.id) return;
    trackedViewRef.current = page.id;
    void trackPublicLandingEvent(client, page.slug, 'view');
  }, [client, page]);

  const handleCtaClick = useCallback((label: string) => {
    if (!page) return;
    void trackPublicLandingEvent(client, page.slug, 'cta_click', label);
  }, [client, page]);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center gap-3 bg-[var(--app-bg)] text-sm text-[var(--muted)]"><Loader2 size={18} className="animate-spin" /> Memuat landing page...</div>;
  if (loadError || !page) return <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] p-6"><Card className="w-full max-w-md space-y-5 py-10 text-center"><XCircle size={34} className="mx-auto text-[var(--danger-text)]" /><div><h1 className="text-xl font-bold">Landing page tidak dapat dibuka</h1><p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{loadError}</p></div><Button icon={Loader2} onClick={() => void fetchPage()} className="mx-auto w-full">Coba Lagi</Button></Card></div>;
  const hasPricingBlock = page.blocks.some(block => block.type === 'pricing');
  return <LandingPageShell page={page}><>{page.blocks.map(block => <LandingBlockRenderer key={block.id} block={block} pageTitle={page.title} onCtaClick={handleCtaClick} selectedPackage={selectedPackage} onSelectPackage={setSelectedPackage} hasPricingBlock={hasPricingBlock} />)}</></LandingPageShell>;
};

export { createLandingShareLink };
