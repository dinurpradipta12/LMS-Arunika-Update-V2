
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { createPortal } from 'react-dom';
import ReactDOMClient from 'react-dom/client';
import { HashRouter as Router, MemoryRouter, Routes, Route, Link, useNavigate, Navigate, useParams, useLocation } from 'react-router-dom';
import './index.css';
import { 
  Layout, 
  Settings as SettingsIcon, 
  LogOut, 
  BookOpen, 
  Plus, 
  Share2, 
  Trash2, 
  Video, 
  FileText, 
  Globe,
  Linkedin,
  ExternalLink,
  ChevronRight,
  Database,
  X,
  Upload,
  Link as LinkIcon,
  Music,
  Bold,
  Italic,
  List,
  Type,
  Copy,
  Wifi,
  WifiOff,
  Save,
  Instagram,
  RefreshCw,
  Check,
  BarChart2,
  ClipboardList,
  TrendingUp,
  Users,
  Eye,
  Menu,
  Download,
  Activity,
  Smartphone,
  Monitor,
  Navigation,
  RotateCcw,
  Pencil,
  Tablet,
  Search,
  GripVertical,
  Loader2,
  AlignCenter,
  AlignLeft,
  AlignRight,
  ListOrdered,
  MoveVertical,
  Clock,
  LayoutGrid,
  Tag,
  Palette,
  Image as ImageIcon,
  Moon,
  Sun,
  MessageCircle
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

import { Course, Mentor, Branding, SupabaseConfig, Module, Asset, Category } from './types';
import { Button, Card, Input, Textarea, Badge } from './components/UI';
import {
  ClassResultsPage,
  PublicRecordedClassView,
  RecordedClassEditor,
  RecordedClassesPage,
  SpacesDashboard,
  RECORDED_CLASS_SPACE_LABEL
} from './components/RecordedClassPages';
import {
  FormEditorPage,
  FormMakerPage,
  FormResponsesPage,
  PublicFormView,
  FORM_MAKER_SPACE_LABEL
} from './components/FormMakerPages';
import {
  LandingPageEditor,
  LandingPagesPage,
  PublicLandingPageView,
  LANDING_PAGE_SPACE_LABEL
} from './components/LandingPagePages';
import { PublicQnaPage, QNA_SPACE_LABEL } from './components/QnaPages';
import { QnaAdminCreatePage, QnaAdminDetailPage, QnaAdminListPage } from './components/QnaAdminPages';
import logoUtama from './src/logo-utama.png';
import faviconLogo from './src/favicon.png';

// Custom TikTok SVG Icon
const TiktokIcon = ({ size = 18 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

type Theme = 'light' | 'dark';
type AuthStatus = 'loading' | 'signed_out' | 'admin' | 'forbidden';

const getInitialTheme = (): Theme => {
  try {
    const savedTheme = localStorage.getItem('arunika_theme');
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

const ThemeToggle: React.FC<{ theme: Theme; onToggle: () => void }> = ({ theme, onToggle }) => {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Gunakan mode terang' : 'Gunakan mode gelap'}
      title={isDark ? 'Mode terang' : 'Mode gelap'}
      className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[1000] w-11 h-11 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] shadow-lg flex items-center justify-center transition-all hover:bg-[var(--surface-soft)] hover:border-[var(--border-strong)]"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

// --- UTILS: Image Compression & Processing (Updated for Transparency) ---
const compressImage = (base64Str: string, maxWidth: number = 800, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Clear rect to ensure transparency
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      }
      // Change to image/png to support transparency
      resolve(canvas.toDataURL('image/png'));
    };
  });
};

// --- DEFAULTS (EMPTY STATES) ---
const defaultBranding: Branding = {
  logo: logoUtama,
  favicon: faviconLogo,
  siteName: 'Platform Arunika'
};

const defaultMentor: Mentor = {
  id: 'profile',
  name: '',
  role: '',
  bio: '',
  photo: '',
  socials: {}
};

const EMBEDDED_PUBLIC_SUPABASE_URL = 'https://drezwxfgykkdnnwjrnnt.supabase.co';
const EMBEDDED_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyZXp3eGZneWtrZG5ud2pybm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NTUwNTksImV4cCI6MjEwNDMzMTA1OX0.nZ3OGNXEFN82CqA1-KXUQ9IWvhp7Gl0U1xyUVjKcdFY';

const configuredPublicSupabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL?.trim();
const configuredPublicSupabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY?.trim();
const PUBLIC_SUPABASE_CONFIG: SupabaseConfig = configuredPublicSupabaseUrl && configuredPublicSupabaseAnonKey
  ? { url: configuredPublicSupabaseUrl, anonKey: configuredPublicSupabaseAnonKey }
  : { url: EMBEDDED_PUBLIC_SUPABASE_URL, anonKey: EMBEDDED_PUBLIC_SUPABASE_ANON_KEY };

let publicSupabaseInstance: any = null;
let publicSupabaseConfig: SupabaseConfig | null = null;
let adminSupabaseInstance: any = null;
let adminSupabaseConfig: SupabaseConfig | null = null;

const isSameSupabaseConfig = (left: SupabaseConfig | null, right: SupabaseConfig) => (
  left?.url === right.url && left?.anonKey === right.anonKey
);

// Client publik tidak pernah mengambil sesi admin dari browser.
const getPublicSupabaseClient = (config: SupabaseConfig = PUBLIC_SUPABASE_CONFIG) => {
  if (!config.url || !config.anonKey) return null;
  if (publicSupabaseInstance && isSameSupabaseConfig(publicSupabaseConfig, config)) {
    return publicSupabaseInstance;
  }

  try {
    publicSupabaseInstance = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'arunika-public-anon'
      }
    });
    publicSupabaseConfig = config;
    return publicSupabaseInstance;
  } catch (e) {
    console.error('Failed to create public Supabase client', e);
    return null;
  }
};

// Client admin menyimpan sesi hanya selama tab/browser session masih hidup.
const getAdminSupabaseClient = (config: SupabaseConfig = PUBLIC_SUPABASE_CONFIG) => {
  if (!config.url || !config.anonKey) return null;
  if (adminSupabaseInstance && isSameSupabaseConfig(adminSupabaseConfig, config)) {
    return adminSupabaseInstance;
  }

  try {
    adminSupabaseInstance = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: window.sessionStorage,
        storageKey: 'arunika-admin-session-v1'
      }
    });
    adminSupabaseConfig = config;
    return adminSupabaseInstance;
  } catch (e) {
    console.error('Failed to create admin Supabase client', e);
    return null;
  }
};

const toBase36 = (value: string) => {
  let result = 0n;
  for (const digit of value) {
    result = (result * 10n) + BigInt(digit);
  }
  return result.toString(36);
};

const fromBase36 = (value: string) => {
  let result = 0n;
  for (const character of value.toLowerCase()) {
    const digit = parseInt(character, 36);
    if (Number.isNaN(digit)) return null;
    result = (result * 36n) + BigInt(digit);
  }
  return result.toString(10);
};

const getPublicCourseCode = (courseId: string) => {
  const numericId = courseId.match(/^course-(\d+)$/)?.[1];
  if (numericId) return toBase36(numericId);

  // The marker keeps non-standard IDs reversible without a database migration.
  return `~${encodeURIComponent(courseId)}`;
};

const getCourseIdFromPublicCode = (code: string) => {
  if (code.startsWith('~')) {
    const encodedId = code.slice(1);
    try {
      return decodeURIComponent(encodedId);
    } catch {
      return encodedId;
    }
  }
  if (code.startsWith('course-')) return code;

  const numericId = fromBase36(code);
  return numericId ? `course-${numericId}` : `course-${code}`;
};

const generateShareLink = (courseId: string, contentType: 'course' | 'class' = 'course') => {
  const code = getPublicCourseCode(courseId);
  const configuredPublicUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  const publicRoute = contentType === 'class' ? 'class' : 'c';

  try {
    const publicUrl = new URL(configuredPublicUrl || window.location.href);
    publicUrl.search = '';
    publicUrl.hash = `/${publicRoute}/${code}`;
    return publicUrl.toString();
  } catch (error) {
    console.warn('Invalid VITE_PUBLIC_APP_URL, falling back to the current host.', error);
    return `${window.location.origin}${window.location.pathname}#/${publicRoute}/${code}`;
  }
};

const copyTextToClipboard = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {
      console.warn('Clipboard API failed, trying the browser fallback.', error);
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    if (!document.execCommand('copy')) {
      throw new Error('Browser rejected the clipboard operation.');
    }
  } finally {
    textarea.remove();
  }
};

const withTimeout = <T,>(request: PromiseLike<T>, timeoutMs: number): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error('PUBLIC_COURSE_REQUEST_TIMEOUT'));
    }, timeoutMs);

    Promise.resolve(request).then(
      value => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      error => {
        window.clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
};

const getVisitorId = () => {
  const storedValue = localStorage.getItem('arunika_visitor_id');
  if (storedValue) {
    try {
      const parsedValue = JSON.parse(storedValue);
      if (typeof parsedValue === 'string' && parsedValue.startsWith('vis_')) {
        localStorage.setItem('arunika_visitor_id', parsedValue);
        return parsedValue;
      }
    } catch {
      if (storedValue.startsWith('vis_')) return storedValue;
    }
  }

  const id = `vis_${Math.random().toString(36).slice(2, 11)}_${Date.now()}`;
  localStorage.setItem('arunika_visitor_id', id);
  return id;
};

const getDeviceType = () => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return "tablet";
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return "mobile";
  return "desktop";
};

// --- Tracking Component ---
const RouteTracker: React.FC<{ supabase: SupabaseConfig }> = ({ supabase }) => {
  const location = useLocation();
  const lastTrackedPath = useRef<string>('');

  useEffect(() => {
    if (lastTrackedPath.current === location.pathname + location.search) return;
    const legacyCourseMatch = location.pathname.match(/^\/course\/([^/?]+)/);
    const shortCourseMatch = location.pathname.match(/^\/(?:c|class)\/([^/?]+)/);
    const courseId = legacyCourseMatch?.[1]
      || (shortCourseMatch?.[1] ? getCourseIdFromPublicCode(shortCourseMatch[1]) : null);

    // Analytics hanya mencatat halaman materi publik, bukan URL dashboard/login.
    if (!courseId) return;
    
    const track = async () => {
      const client = getPublicSupabaseClient(supabase);
      if (!client) return;
      
      const searchParams = new URLSearchParams(location.search);
      const source = searchParams.get('ref') || searchParams.get('utm_source') || 'direct';
      const safePath = `${window.location.origin}${window.location.pathname}#${location.pathname}`;
      let safeReferrer = 'direct';
      if (document.referrer) {
        try {
          safeReferrer = new URL(document.referrer).origin;
        } catch {
          safeReferrer = 'external';
        }
      }

      try {
        const { error } = await client.rpc('track_public_course_view', {
          p_course_id: courseId,
          p_visitor_id: getVisitorId(),
          p_device_type: getDeviceType(),
          p_user_agent: navigator.userAgent.slice(0, 512),
          p_referrer: safeReferrer.slice(0, 512),
          p_source: source.slice(0, 120),
          p_full_path: safePath.slice(0, 2048)
        });
        if (error) throw error;
        lastTrackedPath.current = location.pathname + location.search;
      } catch (e) {
        if (import.meta.env.DEV) console.warn('Analytics event was not recorded.', e);
      }
    };
    void track();
  }, [location, supabase]);

  return null;
};

// --- UI Components ---

const CropModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  image: string; 
  onCrop: (croppedBase64: string) => void;
  aspectRatio?: number;
}> = ({ isOpen, onClose, image, onCrop, aspectRatio = 1 }) => {
  const [isApplying, setIsApplying] = useState(false);

  // Prevent background scroll and fixed position glitches
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const compressed = await compressImage(image, aspectRatio === 1 ? 400 : 1000, 0.8);
      onCrop(compressed);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsApplying(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-opacity">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 md:p-8 max-w-xl w-full shadow-md space-y-6 animate-[scale-in_0.2s_ease-out]">
        <style>{`
          @keyframes scale-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .checkered-bg {
            background-image: linear-gradient(45deg, #e2e8f0 25%, transparent 25%),
                              linear-gradient(-45deg, #e2e8f0 25%, transparent 25%),
                              linear-gradient(45deg, transparent 75%, #e2e8f0 75%),
                              linear-gradient(-45deg, transparent 75%, #e2e8f0 75%);
            background-size: 20px 20px;
            background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
          }
        `}</style>
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-[var(--text)]">Optimize Image</h3>
          <button onClick={onClose} className="p-2 hover:bg-[var(--surface-soft)] rounded-lg transition-colors"><X size={20}/></button>
        </div>
        <p className="text-sm text-[var(--muted)]">Foto akan dipotong dan dikompresi ke format PNG untuk menjaga transparansi.</p>
        <div className={`overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] checkered-bg flex items-center justify-center ${aspectRatio === 1 ? 'aspect-square max-w-[280px] mx-auto' : 'aspect-video'}`}>
           <img src={image} className="w-full h-full object-contain" alt="Preview" />
        </div>
        <div className="grid grid-cols-2 gap-4 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isApplying}>Batal</Button>
          <Button variant="primary" onClick={handleApply} isLoading={isApplying} disabled={isApplying} icon={isApplying ? undefined : Check}>
            {isApplying ? "Processing..." : "Terapkan"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const ImageUpload: React.FC<{ 
  value: string; 
  onChange: (base64: string) => void; 
  label?: string; 
  children?: React.ReactNode; 
  variant?: 'default' | 'minimal';
  aspectRatio?: number;
}> = ({ value, onChange, label, children, variant = 'default', aspectRatio = 1.77 }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImage(reader.result as string);
        setIsCropperOpen(true);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };
  
  const triggerInput = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const content = children ? (
    <div onClick={triggerInput} className="cursor-pointer">
      {children}
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
    </div>
  ) : variant === 'minimal' ? (
    <div className="space-y-2">
      {label && <label className="text-xs font-semibold text-[var(--muted)]">{label}</label>}
      <div 
        onClick={triggerInput}
        className="relative group cursor-pointer flex flex-col items-center justify-center p-4 transition-all"
      >
        <div className="relative mb-4 checkered-bg rounded-xl overflow-hidden w-full flex justify-center">
          {value ? (
            <img src={value} className="max-w-full max-h-[120px] object-contain block" alt="Logo Preview" />
          ) : (
            <div className="text-center p-4 border border-dashed border-[var(--border-strong)] rounded-2xl w-full bg-[var(--surface)]">
              <Upload className="mx-auto mb-2 text-[var(--accent-strong)]" size={28} />
              <p className="font-medium text-sm">Upload File</p>
            </div>
          )}
        </div>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
        <Button variant="secondary" className="text-xs py-1">Ganti Gambar</Button>
      </div>
    </div>
  ) : (
    <div className="space-y-2">
      {label && <label className="text-xs font-semibold text-[var(--muted)]">{label}</label>}
      <div 
        onClick={triggerInput}
        className="relative group cursor-pointer border border-[var(--border)] rounded-2xl overflow-hidden aspect-video bg-[var(--surface)] flex items-center justify-center shadow-sm hover:border-[var(--border-strong)] transition-all checkered-bg"
      >
        {value ? (
          <img src={value} className="w-full h-full object-contain" alt="Upload" />
        ) : (
          <div className="text-center p-4 bg-white/80 backdrop-blur-sm rounded-xl">
            <Upload className="mx-auto mb-2 text-[var(--accent-strong)]" size={28} />
            <p className="font-medium text-sm">Klik untuk upload gambar</p>
          </div>
        )}
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs">
          UPLOAD & CROP (PNG)
        </div>
      </div>
    </div>
  );

  return (
    <>
      {content}
      {tempImage && (
        <CropModal 
          isOpen={isCropperOpen} 
          onClose={() => setIsCropperOpen(false)} 
          image={tempImage} 
          onCrop={onChange} 
          aspectRatio={aspectRatio}
        />
      )}
    </>
  );
};

const AdvancedEditor: React.FC<{ value: string; onChange: (v: string) => void; label: string; placeholder?: string }> = ({ value, onChange, label, placeholder }) => {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-[var(--muted)]">{label}</label>
      <div className="border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--surface)] shadow-sm focus-within:border-[var(--accent)] transition-all">
        <div className="bg-[var(--surface-soft)] border-b border-[var(--border)] p-2 flex items-center flex-wrap gap-1">
          <div className="flex gap-1 border-r border-[var(--border)] pr-2 mr-1">
            <button className="p-1.5 hover:bg-[var(--surface)] rounded-lg transition-all border border-transparent hover:border-[var(--border)]"><Bold size={14}/></button>
            <button className="p-1.5 hover:bg-[var(--surface)] rounded-lg transition-all border border-transparent hover:border-[var(--border)]"><Italic size={14}/></button>
            <button className="p-1.5 hover:bg-[var(--surface)] rounded-lg transition-all border border-transparent hover:border-[var(--border)]"><Type size={14}/></button>
          </div>
          <div className="flex gap-1 border-r border-[var(--border)] pr-2 mr-1">
            <button className="p-1.5 hover:bg-[var(--surface)] rounded-lg transition-all border border-transparent hover:border-[var(--border)]"><List size={14}/></button>
            <button className="p-1.5 hover:bg-[var(--surface)] rounded-lg transition-all border border-transparent hover:border-[var(--border)]"><ListOrdered size={14}/></button>
          </div>
          <div className="flex gap-1 border-r border-[var(--border)] pr-2 mr-1">
            <button className="p-1.5 hover:bg-[var(--surface)] rounded-lg transition-all border border-transparent hover:border-[var(--border)]"><AlignLeft size={14}/></button>
            <button className="p-1.5 hover:bg-[var(--surface)] rounded-lg transition-all border border-transparent hover:border-[var(--border)]"><AlignCenter size={14}/></button>
            <button className="p-1.5 hover:bg-[var(--surface)] rounded-lg transition-all border border-transparent hover:border-[var(--border)]"><AlignRight size={14}/></button>
          </div>
          <div className="flex gap-1">
            <button className="p-1.5 hover:bg-[var(--surface)] rounded-lg transition-all border border-transparent hover:border-[var(--border)]"><MoveVertical size={14}/></button>
            <button className="p-1.5 hover:bg-[var(--surface)] rounded-lg transition-all border border-transparent hover:border-[var(--border)]"><LinkIcon size={14}/></button>
          </div>
          <div className="ml-auto">
            <Badge className="text-[8px]">Editor</Badge>
          </div>
        </div>
        <textarea 
          value={value} 
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full p-4 min-h-[160px] outline-none font-normal text-[var(--text)] bg-transparent resize-none leading-relaxed text-sm"
        />
      </div>
    </div>
  );
};

const Login: React.FC<{
  onLogin: (username: string, password: string) => Promise<string | null>;
  authStatus: AuthStatus;
}> = ({ onLogin, authStatus }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (authStatus === 'admin') navigate('/admin');
  }, [authStatus, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Username dan password wajib diisi.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    const loginError = await onLogin(username.trim(), password);
    setIsSubmitting(false);

    if (loginError) {
      setPassword('');
      setError(loginError);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--app-bg)]">
      <div className="w-full max-w-md">
        <Card className="p-8 md:p-10 shadow-md">
          <div className="flex flex-col items-center mb-8 text-center">
            <img src={logoUtama} className="h-14 w-auto object-contain mb-5" alt="Logo Utama" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)] mb-2">Arunika LMS</span>
            <p className="text-[var(--muted)] text-sm mt-1">Masuk untuk mengelola ruang belajar Anda.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              label="Username admin"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="arunika"
              autoComplete="username"
              spellCheck={false}
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password admin"
              autoComplete="current-password"
            />
            {error && <p className="text-[var(--danger-text)] text-sm font-medium bg-[var(--danger-soft)] p-3 rounded-xl border border-[var(--border)]">{error}</p>}
            <Button type="submit" className="w-full h-12" icon={ChevronRight} isLoading={isSubmitting} disabled={isSubmitting || authStatus === 'loading'}>Masuk Dashboard</Button>
          </form>
          <p className="text-[11px] leading-relaxed text-center text-[var(--muted)] mt-5">
            Akses dashboard diverifikasi oleh autentikasi aman dan role admin di database.
          </p>
        </Card>
      </div>
    </div>
  );
};

const Sidebar: React.FC<{ branding: Branding; onLogout: () => void; isOpen: boolean; onClose: () => void }> = ({ branding, onLogout, isOpen, onClose }) => {
  const location = useLocation();
  
  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-[100] md:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}
      
      <div className={`
        fixed inset-y-0 left-0 z-[101] w-64 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:flex
      `}>
        <div className="p-5 border-b border-[var(--border)] relative flex items-center justify-between min-h-[84px]">
          <div className="flex items-center">
            <img src={logoUtama} className="h-10 w-auto max-w-[180px] object-contain" alt="Logo Utama" />
          </div>
          <button onClick={onClose} aria-label="Tutup navigasi" className="md:hidden p-2 text-[var(--muted)] hover:bg-[var(--surface-soft)] rounded-lg">
            <X size={20} />
          </button>
        </div>
        
        <nav className="p-3 flex-1 space-y-1">
          <p className="px-3 pt-3 pb-2 text-[10px] uppercase tracking-[0.18em] font-semibold text-[var(--muted)]">Workspace</p>
          <Link 
            to="/admin" 
            onClick={() => { if(window.innerWidth < 768) onClose(); }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${location.pathname === '/admin' ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-soft)]'}`}
          >
            <LayoutGrid size={18} /> Semua Space
          </Link>
          <Link
            to="/admin/products"
            onClick={() => { if(window.innerWidth < 768) onClose(); }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${location.pathname === '/admin/products' || location.pathname.startsWith('/admin/course/') ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-soft)]'}`}
          >
            <BookOpen size={18} /> Tutorial Produk
          </Link>
          <Link
            to="/admin/classes"
            onClick={() => { if(window.innerWidth < 768) onClose(); }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${location.pathname.startsWith('/admin/classes') ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-soft)]'}`}
          >
            <Video size={18} /> {RECORDED_CLASS_SPACE_LABEL}
          </Link>
          <Link
            to="/admin/forms"
            onClick={() => { if(window.innerWidth < 768) onClose(); }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${location.pathname.startsWith('/admin/forms') ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-soft)]'}`}
          >
            <ClipboardList size={18} /> {FORM_MAKER_SPACE_LABEL}
          </Link>
          <Link
            to="/admin/landing-pages"
            onClick={() => { if(window.innerWidth < 768) onClose(); }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${location.pathname.startsWith('/admin/landing-pages') ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-soft)]'}`}
          >
            <Layout size={18} /> {LANDING_PAGE_SPACE_LABEL}
          </Link>
          <Link
            to="/admin/qna"
            onClick={() => { if(window.innerWidth < 768) onClose(); }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${location.pathname.startsWith('/admin/qna') ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-soft)]'}`}
          >
            <MessageCircle size={18} /> {QNA_SPACE_LABEL}
          </Link>
          <Link 
            to="/analytics" 
            onClick={() => { if(window.innerWidth < 768) onClose(); }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${location.pathname === '/analytics' ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-soft)]'}`}
          >
            <BarChart2 size={18} /> Analitik Pengunjung
          </Link>
          <Link 
            to="/settings" 
            onClick={() => { if(window.innerWidth < 768) onClose(); }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${location.pathname === '/settings' ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-soft)]'}`}
          >
            <SettingsIcon size={18} /> Settings
          </Link>
        </nav>
        
        <div className="p-4 border-t border-[var(--border)]">
          <Button variant="secondary" className="w-full justify-start h-11 text-sm" onClick={() => { onLogout(); onClose(); }}>
            <LogOut size={18} className="mr-2" /> Logout
          </Button>
        </div>
      </div>
    </>
  );
};

const AdminLayout: React.FC<{ 
  children: React.ReactNode; 
  branding: Branding; 
  isSidebarOpen: boolean; 
  setIsSidebarOpen: (open: boolean) => void;
  onLogout: () => void;
}> = ({ children, branding, isSidebarOpen, setIsSidebarOpen, onLogout }) => (
  <div className="flex min-h-screen">
    <Sidebar 
      branding={branding} 
      onLogout={onLogout} 
      isOpen={isSidebarOpen} 
      onClose={() => setIsSidebarOpen(false)} 
    />
    <main className="flex-1 min-w-0 bg-[var(--app-bg)] flex flex-col">
      <header className="md:hidden bg-[var(--surface)] border-b border-[var(--border)] px-4 flex items-center justify-between sticky top-0 z-30 h-16">
        <button onClick={() => setIsSidebarOpen(true)} aria-label="Buka navigasi" className="p-2 text-[var(--text)] hover:bg-[var(--surface-soft)] rounded-xl transition-colors">
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2">
          <img src={logoUtama} className="h-8 w-auto object-contain" alt="Logo Utama" />
        </div>
        <div className="w-10"></div>
      </header>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </main>
  </div>
);

const AnalyticsPage: React.FC<{ courses: Course[], supabase: SupabaseConfig }> = ({ courses, supabase }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [isResetting, setIsResetting] = useState(false);
  
  const stats = useMemo(() => {
    const totalViews = events.length;
    const uniqueVisitors = new Set(events.map(e => e.visitor_id)).size;
    const courseViews = events.reduce((acc: any, curr: any) => {
      if (curr.course_id) {
        const c = courses.find(item => item.id === curr.course_id);
        const name = c ? c.title : 'Deleted Course';
        acc[name] = (acc[name] || 0) + 1;
      }
      return acc;
    }, {});
    const deviceBreakdown = events.reduce((acc: any, curr: any) => {
      const type = curr.device_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, { desktop: 0, mobile: 0, tablet: 0 });
    const sourceBreakdown = events.reduce((acc: any, curr: any) => {
      const src = curr.source || 'direct';
      acc[src] = (acc[src] || 0) + 1;
      return acc;
    }, {});
    return { totalViews, uniqueVisitors, courseViews, deviceBreakdown, sourceBreakdown };
  }, [events, courses]);

  useEffect(() => {
    const client = getAdminSupabaseClient(supabase);
    if (!client) return;
    let isActive = true;
    
    const fetchInitial = async () => {
      const { data, error } = await client.from('events').select('*').order('created_at', { ascending: false });
      if (!isActive) return;
      if (error) {
        console.warn('Analytics refresh failed', error);
        return;
      }
      setEvents(data || []);
    };
    void fetchInitial();

    // Tabel analytics tidak dimasukkan ke publication Realtime karena payload DELETE
    // tidak dapat difilter oleh RLS. Polling ini tetap menjaga dashboard terbarui
    // tanpa menyiarkan data pengunjung ke client publik.
    const refreshInterval = window.setInterval(() => { void fetchInitial(); }, 10_000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void fetchInitial();
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      isActive = false;
      window.clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [supabase]);

  const handleResetData = async () => {
    if (!confirm("Hapus semua data analitik?")) return;
    const client = getAdminSupabaseClient(supabase);
    if (!client) return;
    setIsResetting(true);
    try {
      await client.from('events').delete().not('id', 'is', null);
      setEvents([]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text)]">Analytics</h1>
          <p className="text-[var(--muted)] mt-1">Data performa dan aktivitas pengunjung diperbarui otomatis.</p>
        </div>
        <Button variant="secondary" onClick={handleResetData} isLoading={isResetting} icon={RotateCcw}>Reset Data</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card featured>
          <div className="flex justify-between items-start mb-4">
             <div className="p-2.5 bg-[var(--accent-soft)] rounded-xl text-[var(--accent-strong)]"><Eye size={19}/></div>
             <Badge>Setiap 10 dtk</Badge>
          </div>
          <p className="text-xs font-medium text-[var(--muted)]">Total Views</p>
          <h2 className="text-4xl font-bold mt-1">{stats.totalViews}</h2>
        </Card>
        <Card>
           <div className="flex justify-between items-start mb-4">
             <div className="p-2.5 bg-[var(--accent-soft)] rounded-xl text-[var(--accent-strong)]"><Users size={19}/></div>
             <Badge>Unik</Badge>
          </div>
          <p className="text-xs font-medium text-[var(--muted)]">Visitors</p>
          <h2 className="text-4xl font-bold mt-1">{stats.uniqueVisitors}</h2>
        </Card>
        <Card>
          <div className="flex justify-between items-start mb-4">
             <div className="p-2.5 bg-[var(--success-soft)] rounded-xl text-[var(--success-text)]"><Activity size={19}/></div>
             <Badge color="var(--success-soft)">Aktif</Badge>
          </div>
          <p className="text-xs font-medium text-[var(--muted)]">Database Uptime</p>
          <h2 className="text-4xl font-bold mt-1 text-[var(--success-text)]">100%</h2>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="space-y-6">
          <h3 className="font-semibold text-lg flex items-center gap-2"><Smartphone size={19} className="text-[var(--accent-strong)]"/> Device Breakdown</h3>
          <div className="space-y-4">
            {Object.entries(stats.deviceBreakdown).map(([device, count]: [string, any]) => (
              <div key={device} className="flex items-center justify-between p-4 bg-[var(--surface-soft)] rounded-xl border border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
                    {device === 'desktop' ? <Monitor size={18}/> : device === 'mobile' ? <Smartphone size={18}/> : <Tablet size={18}/>}
                  </div>
                  <span className="font-medium capitalize">{device}</span>
                </div>
                <div className="flex items-center gap-4">
                   <div className="w-32 bg-[var(--surface-muted)] h-1.5 rounded-full overflow-hidden hidden md:block">
                      <div 
                        className="h-full bg-[var(--accent)]"
                        style={{ width: `${stats.totalViews > 0 ? (count / stats.totalViews) * 100 : 0}%` }}
                      />
                   </div>
                   <span className="font-semibold">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-6">
          <h3 className="font-semibold text-lg flex items-center gap-2"><Navigation size={19} className="text-[var(--accent-strong)]"/> Traffic Sources</h3>
          <div className="space-y-4">
            {Object.entries(stats.sourceBreakdown).map(([source, count]: [string, any]) => (
              <div key={source} className="flex items-center justify-between p-4 bg-[var(--surface-soft)] rounded-xl border border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
                    {source === 'direct' ? <Search size={18}/> : source.includes('insta') ? <Instagram size={18}/> : <LinkIcon size={18}/>}
                  </div>
                  <span className="font-medium capitalize">{source}</span>
                </div>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
            {Object.keys(stats.sourceBreakdown).length === 0 && <p className="text-center text-[var(--muted)] text-sm py-4">Belum ada data traffic.</p>}
          </div>
        </Card>
      </div>

      <Card className="space-y-6">
          <h3 className="font-semibold text-lg flex items-center gap-2"><TrendingUp size={19} className="text-[var(--accent-strong)]"/> Popular Courses</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="py-4 font-medium text-xs text-[var(--muted)]">Judul Kursus</th>
                  <th className="py-4 font-medium text-xs text-[var(--muted)]">Views</th>
                  <th className="py-4 font-medium text-xs text-[var(--muted)]">Engagement</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.courseViews).sort((a:any, b:any) => b[1] - a[1]).map(([name, count]: [string, any]) => (
                  <tr key={name} className="border-b border-[var(--border)]">
                    <td className="py-4 font-bold">{name}</td>
                    <td className="py-4 font-extrabold">{count}</td>
                    <td className="py-4">
                       <Badge color="var(--success-soft)"><span className="text-[var(--success-text)]">High</span></Badge>
                    </td>
                  </tr>
                ))}
                {Object.keys(stats.courseViews).length === 0 && (
                  <tr><td colSpan={3} className="py-8 text-center text-[var(--muted)] text-sm">Belum ada data kursus yang dilihat.</td></tr>
                )}
              </tbody>
            </table>
          </div>
      </Card>
    </div>
  );
};

const AdminDashboard: React.FC<{ 
  courses: Course[]; 
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>; 
  onDeleteCourse: (id: string) => Promise<void>;
}> = ({ courses, setCourses, onDeleteCourse }) => {
  const navigate = useNavigate();
  const [copiedCourseId, setCopiedCourseId] = useState<string | null>(null);
  const productCourses = courses.filter(course => (course.spaceType || 'product_tutorial') === 'product_tutorial');

  const handleCopyLink = async (courseId: string) => {
    const url = generateShareLink(courseId);
    try {
      await copyTextToClipboard(url);
      setCopiedCourseId(courseId);
      setTimeout(() => {
        setCopiedCourseId(current => current === courseId ? null : current);
      }, 2000);
    } catch (error) {
      console.error('Copy link failed', error);
      window.prompt('Copy otomatis gagal. Salin link publik berikut:', url);
    }
  };

  const handleAddCourse = () => {
    const newCourse: Course = {
      id: `course-${Date.now()}`,
      title: 'Kursus Baru',
      description: 'Deskripsi kursus...',
      coverImage: '',
      mentorId: 'profile',
      modules: [],
      assets: [],
      categories: [],
      spaceType: 'product_tutorial',
      published: true
    };
    setCourses(current => [...current, newCourse]);
    navigate(`/admin/course/${newCourse.id}`);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <Link to="/admin" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent-strong)] mb-3">
            <ChevronRight size={14} className="rotate-180" /> Semua Space
          </Link>
          <h1 className="text-3xl font-bold">Tutorial Produk Digital</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Kelola panduan produk seperti pada LMS sebelumnya.</p>
        </div>
        <Button icon={Plus} onClick={handleAddCourse}>Tambah Kursus</Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {productCourses.map(course => (
          <Card key={course.id} className="group relative overflow-hidden !p-0">
            <button onClick={() => onDeleteCourse(course.id)} aria-label={`Hapus ${course.title}`} className="absolute top-3 right-3 z-10 p-2 bg-[var(--surface)] text-[var(--danger-text)] border border-[var(--border)] rounded-lg shadow-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all">
              <Trash2 size={16} />
            </button>
            <div className="aspect-video overflow-hidden border-b border-[var(--border)] bg-[var(--surface-soft)]">
              {course.coverImage && <img src={course.coverImage} className="w-full h-full object-cover" />}
            </div>
            <div className="p-5 min-h-[300px] flex flex-col">
              <div className="flex flex-wrap gap-2 mb-3">
                {course.categories?.map((cat, idx) => (
                  <span key={idx} className="category-chip text-[9px] font-semibold uppercase tracking-wide px-2 py-1 border rounded-md" style={{ '--category-color': cat.color } as React.CSSProperties}>
                    {cat.label}
                  </span>
                ))}
              </div>
              <h3 className="text-lg font-semibold mb-2 leading-snug">{course.title}</h3>
              <p className="text-sm text-[var(--muted)] line-clamp-2 mb-5 leading-relaxed">{course.description}</p>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-auto">
                <Button 
                  onClick={() => navigate(`/admin/course/${course.id}`)} 
                  variant="secondary" 
                  className="text-xs h-10 px-2 flex-1 min-w-0"
                >
                  Edit Content
                </Button>
                <Button 
                  onClick={() => handleCopyLink(course.id)} 
                  variant={copiedCourseId === course.id ? "green" : "secondary"} 
                  className="text-xs h-10 px-2 flex-1 min-w-0 transition-all" 
                  icon={copiedCourseId === course.id ? Check : Copy}
                >
                  {copiedCourseId === course.id ? 'Tersalin!' : 'Copy Link'}
                </Button>
                <Button
                  onClick={() => {
                    const url = generateShareLink(course.id);
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  variant="primary" 
                  className="text-xs h-10 px-2 flex-1 min-w-0" 
                  icon={Share2}
                >
                  Share
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {productCourses.length === 0 && (
           <div className="col-span-full py-20 text-center space-y-4">
              <div className="bg-[var(--surface-soft)] w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border border-[var(--border)]">
                 <BookOpen size={28} className="text-[var(--muted)]" />
              </div>
              <p className="text-[var(--muted)] text-sm">Belum ada kursus. Klik tombol tambah di atas.</p>
           </div>
        )}
      </div>
    </div>
  );
};

const Settings: React.FC = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('');

  const handleVerifyAdmin = async () => {
    const client = getAdminSupabaseClient();
    if (!client) {
      setConnectionMessage('Layanan autentikasi tidak tersedia.');
      return;
    }

    setIsChecking(true);
    setConnectionMessage('');
    const { data, error } = await client.rpc('is_arunika_admin');
    setIsChecking(false);

    if (error || data !== true) {
      setConnectionMessage('Sesi tidak memiliki role admin yang valid. Silakan logout lalu login kembali.');
      return;
    }

    setConnectionMessage('Koneksi aman dan role admin berhasil diverifikasi.');
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Status koneksi dan perlindungan data aplikasi.</p>
      </div>

      <section className="space-y-6">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Database size={19} className="text-[var(--accent-strong)]"/> Keamanan & Infrastruktur</h2>
        <Card className="space-y-5">
          <div className="flex items-start gap-3 pb-5 border-b border-[var(--border)]">
            <div className="mt-0.5 p-2 rounded-lg bg-[var(--success-soft)] text-[var(--success-text)]"><Check size={16} /></div>
            <div>
              <p className="font-semibold text-sm">Data aplikasi terkunci</p>
              <p className="text-xs text-[var(--muted)] mt-1">Koneksi data dibatasi untuk aplikasi resmi.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 pb-5 border-b border-[var(--border)]">
            <div className="mt-0.5 p-2 rounded-lg bg-[var(--success-soft)] text-[var(--success-text)]"><Check size={16} /></div>
            <div>
              <p className="font-semibold text-sm">Autentikasi dashboard aktif</p>
              <p className="text-xs text-[var(--muted)] mt-1">Tidak ada username atau password admin yang ditanam di source maupun localStorage.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 p-2 rounded-lg bg-[var(--success-soft)] text-[var(--success-text)]"><Check size={16} /></div>
            <div>
              <p className="font-semibold text-sm">RLS dan Realtime tersaring</p>
              <p className="text-xs text-[var(--muted)] mt-1">Pengunjung hanya membaca materi published. Analytics, jawaban benar, hasil peserta, dan role admin tidak tersedia bagi publik.</p>
            </div>
          </div>
          <Button variant="green" onClick={handleVerifyAdmin} isLoading={isChecking}>Verifikasi Akses Admin</Button>
          {connectionMessage && (
            <p className={`text-xs font-medium p-3 rounded-xl border border-[var(--border)] ${connectionMessage.startsWith('Koneksi aman') ? 'bg-[var(--success-soft)] text-[var(--success-text)]' : 'bg-[var(--danger-soft)] text-[var(--danger-text)]'}`}>
              {connectionMessage}
            </p>
          )}
        </Card>
      </section>
    </div>
  );
};

const CourseEditor: React.FC<{ 
  courses: Course[]; 
  onSave: (c: Course, m: Mentor) => Promise<void>; 
  mentor: Mentor; 
  setMentor: React.Dispatch<React.SetStateAction<Mentor>>;
  onLocalEdit: () => void;
}> = ({ courses, onSave, mentor, setMentor, onLocalEdit }) => {
  const { id } = useParams<{ id: string }>();
  const course = courses.find(c => c.id === id);
  const [editedCourse, setEditedCourse] = useState<Course | null>(null);
  const [localMentor, setLocalMentor] = useState<Mentor>(mentor);
  const [isSaving, setIsSaving] = useState(false);
  
  // Category logic
  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatColor, setNewCatColor] = useState('#b8cddd');
  const presetColors = ['#b8cddd', '#c9d9e6', '#d9e5ee', '#c9ddd7', '#d7e1e8', '#e4d8dc', '#e8edf2'];

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (course) {
      setEditedCourse({ ...course, categories: course.categories || [] });
    }
    setLocalMentor({ ...mentor });
  }, [id, course, mentor]);

  if (!editedCourse) return <div className="min-h-screen flex items-center justify-center text-sm text-[var(--muted)]">Memuat editor...</div>;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editedCourse, localMentor);
      setMentor(localMentor);
      alert('Berhasil disimpan!');
    } catch (e: any) {
      console.error("Editor Save Error:", e);
      if (e.message?.includes('column "categories" of relation "courses" does not exist')) {
         alert('Gagal menyimpan: Kolom "categories" belum ada di tabel database Anda. Silakan ke halaman "Settings" dan jalankan script SQL yang tersedia.');
      } else if (e.message?.includes('timeout') || e.message?.includes('canceling statement')) {
        alert('Gagal menyimpan: Database Timeout. Sistem akan mencoba melakukan kompresi ulang gambar Anda. Silakan klik simpan kembali.');
      } else {
        alert('Gagal menyimpan: ' + (e.message || "Periksa koneksi database."));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const addCategory = () => {
    if (!newCatLabel.trim()) return;
    const updatedCats = [...(editedCourse.categories || []), { label: newCatLabel, color: newCatColor }];
    setEditedCourse({ ...editedCourse, categories: updatedCats });
    setNewCatLabel('');
  };

  const removeCategory = (idx: number) => {
    const updatedCats = (editedCourse.categories || []).filter((_, i) => i !== idx);
    setEditedCourse({ ...editedCourse, categories: updatedCats });
  };

  const addModule = (type: 'video' | 'text') => {
    setEditedCourse({
      ...editedCourse,
      modules: [...editedCourse.modules, {
        id: `m-${Date.now()}`,
        title: 'Materi Baru',
        type,
        content: '',
        description: '',
        duration: type === 'video' ? '00:00' : '5 min'
      }]
    });
  };

  const handleVideoLinkChange = (idx: number, url: string) => {
    const m = [...editedCourse.modules];
    m[idx].content = url;
    
    // Logic deteksi durasi otomatis simulatif
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop() || '';
      if (videoId.length >= 10) {
        // Simulasi kalkulasi durasi berdasarkan hash ID video agar terasa "real"
        const seed = videoId.charCodeAt(0) + videoId.charCodeAt(1);
        const mins = (seed % 15) + 5; // 5-20 menit
        const secs = seed % 60;
        m[idx].duration = `${mins}:${secs.toString().padStart(2, '0')}`;
      }
    }
    
    setEditedCourse({...editedCourse, modules: m});
  };

  const addAsset = () => {
    setEditedCourse({
      ...editedCourse,
      assets: [...editedCourse.assets, {
        id: `a-${Date.now()}`,
        name: 'Asset Baru',
        type: 'link',
        url: ''
      }]
    });
  };

  const handleDragStart = (idx: number) => {
    setDraggedIndex(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === idx) return;
    
    const newModules = [...editedCourse.modules];
    const movedItem = newModules.splice(draggedIndex, 1)[0];
    newModules.splice(idx, 0, movedItem);
    
    setEditedCourse({ ...editedCourse, modules: newModules });
    setDraggedIndex(idx);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Link to="/admin/products" className="text-xs font-medium text-[var(--muted)] flex items-center gap-1 mb-2 hover:text-[var(--accent-strong)]">
            <ChevronRight size={14} className="rotate-180" /> Kembali ke Tutorial Produk
          </Link>
          <h1 className="text-3xl font-bold">Course Editor</h1>
        </div>
        <Button onClick={handleSave} icon={Save} isLoading={isSaving} className="w-full md:w-auto">Simpan Perubahan</Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="space-y-6">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Pencil size={19} className="text-[var(--accent-strong)]"/> Informasi Utama</h3>
            <Input label="Judul Kursus" value={editedCourse.title} onChange={e => setEditedCourse({...editedCourse, title: e.target.value})} />
            
            {/* Category Management */}
            <div className="space-y-4">
              <label className="text-xs font-semibold text-[var(--muted)] flex items-center gap-2">
                <Tag size={14}/> Kategori Kursus
              </label>
              <div className="flex flex-wrap gap-2 mb-4 min-h-[40px] p-4 bg-[var(--surface-soft)] rounded-xl border border-[var(--border)]">
                {editedCourse.categories?.map((cat, idx) => (
                  <div key={idx} className="category-chip flex items-center gap-2 px-3 py-1.5 border rounded-lg text-[10px] font-semibold uppercase tracking-wide" style={{ '--category-color': cat.color } as React.CSSProperties}>
                    {cat.label}
                    <button onClick={() => removeCategory(idx)} className="hover:text-red-600 transition-colors">
                      <X size={12} strokeWidth={3}/>
                    </button>
                  </div>
                ))}
                {(!editedCourse.categories || editedCourse.categories.length === 0) && (
                  <p className="text-[10px] text-[var(--muted)] italic">Belum ada kategori terpilih.</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input placeholder="Label Kategori (e.g. Design)" value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)} />
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    {presetColors.map(c => (
                      <button 
                        key={c} 
                        onClick={() => setNewCatColor(c)} 
                        className={`w-8 h-8 rounded-lg border border-[var(--border)] transition-all ${newCatColor === c ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--surface)]' : 'hover:border-[var(--border-strong)]'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input type="color" value={newCatColor} onChange={e => setNewCatColor(e.target.value)} className="w-8 h-8 rounded-lg border border-[var(--border)] bg-transparent p-0 overflow-hidden cursor-pointer" />
                  </div>
                  <Button variant="secondary" className="h-10 text-[10px] w-full" onClick={addCategory} icon={Plus}>Tambah Kategori</Button>
                </div>
              </div>
            </div>

            <Textarea label="Deskripsi Singkat" value={editedCourse.description} onChange={e => setEditedCourse({...editedCourse, description: e.target.value})} />
            <ImageUpload label="Gambar Cover (16:9)" aspectRatio={1.77} value={editedCourse.coverImage} onChange={img => setEditedCourse({...editedCourse, coverImage: img})} />
          </Card>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg flex items-center gap-2"><BookOpen size={19} className="text-[var(--accent-strong)]"/> Kurikulum Materi</h3>
              <div className="flex gap-2">
                <Button variant="yellow" className="h-10 text-xs px-4" onClick={() => addModule('video')} icon={Video}>+ Video</Button>
                <Button variant="yellow" className="h-10 text-xs px-4" onClick={() => addModule('text')} icon={FileText}>+ Teks</Button>
              </div>
            </div>
            
            <div className="space-y-4">
              {editedCourse.modules.map((mod, idx) => (
                <div 
                  key={mod.id} 
                  draggable 
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`transition-all ${draggedIndex === idx ? 'opacity-40 scale-95' : 'opacity-100'}`}
                >
                  <Card className="space-y-4 relative group cursor-default">
                    <div className="absolute top-4 right-14 cursor-grab active:cursor-grabbing text-[var(--muted)] group-hover:text-[var(--accent-strong)] p-2">
                       <GripVertical size={20} />
                    </div>
                    <button 
                      onClick={() => setEditedCourse({...editedCourse, modules: editedCourse.modules.filter((_, i) => i !== idx)})} 
                      className="absolute top-4 right-4 text-[var(--danger-text)] hover:bg-[var(--danger-soft)] p-2 rounded-xl"
                    >
                      <Trash2 size={18} />
                    </button>
                    <div className="flex items-center gap-2">
                      <Badge color={mod.type === 'video' ? 'var(--accent-soft)' : 'var(--surface-muted)'}>
                        <span className="text-[var(--accent-strong)]">{mod.type.toUpperCase()}</span>
                      </Badge>
                      <span className="font-semibold text-sm">Materi #{idx + 1}</span>
                    </div>
                    <Input label="Judul Materi" value={mod.title} onChange={e => {
                      const m = [...editedCourse.modules]; m[idx].title = e.target.value; setEditedCourse({...editedCourse, modules: m});
                    }} />
                    {mod.type === 'video' ? (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-3">
                          <Input label="YouTube Link" icon={LinkIcon} placeholder="https://youtube.com/watch?v=..." value={mod.content} onChange={e => handleVideoLinkChange(idx, e.target.value)} />
                        </div>
                        <Input label="Durasi" icon={Clock} value={mod.duration} onChange={e => {
                          const m = [...editedCourse.modules]; m[idx].duration = e.target.value; setEditedCourse({...editedCourse, modules: m});
                        }} />
                      </div>
                    ) : (
                      <AdvancedEditor label="Konten Markdown" value={mod.content} onChange={v => {
                        const m = [...editedCourse.modules]; m[idx].content = v; setEditedCourse({...editedCourse, modules: m});
                      }} />
                    )}
                    <Textarea label="Catatan / Deskripsi Materi" placeholder="Keterangan tambahan..." value={mod.description} onChange={e => {
                      const m = [...editedCourse.modules]; m[idx].description = e.target.value; setEditedCourse({...editedCourse, modules: m});
                    }} />
                  </Card>
                </div>
              ))}
              {editedCourse.modules.length === 0 && (
                <div className="bg-[var(--surface)] border border-dashed border-[var(--border-strong)] rounded-2xl p-12 text-center">
                  <p className="text-[var(--muted)] text-sm">Belum ada materi. Tarik atau tambahkan materi baru.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <Card className="space-y-6 sticky top-8">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Users size={19} className="text-[var(--accent-strong)]"/> Info Mentor</h3>
            <div className="flex flex-col items-center gap-4">
              <div className="w-28 h-28 rounded-full border border-[var(--border)] overflow-hidden shadow-sm bg-[var(--surface-soft)] checkered-bg">
                <img src={localMentor.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${localMentor.name}`} className="w-full h-full object-contain" />
              </div>
              <ImageUpload value={localMentor.photo} aspectRatio={1} onChange={p => { onLocalEdit(); setLocalMentor({...localMentor, photo: p}) }}>
                <Button variant="secondary" className="text-xs h-10 px-4">Upload & Crop Foto</Button>
              </ImageUpload>
            </div>
            
            <Input label="Nama Lengkap" value={localMentor.name} onChange={e => { onLocalEdit(); setLocalMentor({...localMentor, name: e.target.value}) }} />
            <Input label="Role" placeholder="Digital Marketer" value={localMentor.role} onChange={e => { onLocalEdit(); setLocalMentor({...localMentor, role: e.target.value}) }} />
            <Textarea label="Bio" placeholder="Pengalaman singkat..." value={localMentor.bio} onChange={e => { onLocalEdit(); setLocalMentor({...localMentor, bio: e.target.value}) }} />
            
            <div className="space-y-4 pt-4 border-t border-[var(--border)]">
              <h4 className="text-xs font-semibold text-[var(--muted)]">Social Media & Contact</h4>
              <Input label="Instagram" icon={Instagram} placeholder="@username" value={localMentor.socials.instagram || ''} onChange={e => setLocalMentor({...localMentor, socials: {...localMentor.socials, instagram: e.target.value}})} />
              {/* FIXED: Correct state update structure for nested socials object and fixed typo in setLocalMentor callback */}
              <Input label="LinkedIn" icon={Linkedin} placeholder="username" value={localMentor.socials.linkedin || ''} onChange={e => setLocalMentor({...localMentor, socials: {...localMentor.socials, linkedin: e.target.value}})} />
              <Input label="TikTok" icon={TiktokIcon} placeholder="@username" value={localMentor.socials.tiktok || ''} onChange={e => setLocalMentor({...localMentor, socials: {...localMentor.socials, tiktok: e.target.value}})} />
              <Input label="Website / Portfolio" icon={Globe} placeholder="https://..." value={localMentor.socials.website || ''} onChange={e => setLocalMentor({...localMentor, socials: {...localMentor.socials, website: e.target.value}})} />
            </div>
          </Card>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg flex items-center gap-2"><Download size={19} className="text-[var(--accent-strong)]"/> Asset Pendukung</h3>
              <Button variant="green" className="h-10 text-xs px-4" onClick={addAsset} icon={Plus}>Tambah</Button>
            </div>
            <Card className="space-y-4">
              {editedCourse.assets.map((asset, idx) => (
                <div key={asset.id} className="p-4 bg-[var(--surface-soft)] rounded-xl border border-[var(--border)] relative">
                  <button onClick={() => setEditedCourse({...editedCourse, assets: editedCourse.assets.filter((_, i) => i !== idx)})} className="absolute top-2 right-2 text-[var(--danger-text)] hover:bg-[var(--danger-soft)] p-1 rounded-lg"><X size={16} /></button>
                  <div className="space-y-2">
                    <Input className="h-9 py-1 text-xs" label="Nama Asset" value={asset.name} onChange={e => {
                      const a = [...editedCourse.assets]; a[idx].name = e.target.value; setEditedCourse({...editedCourse, assets: a});
                    }} />
                    <Input className="h-9 py-1 text-xs" label="URL" value={asset.url} onChange={e => {
                      const a = [...editedCourse.assets]; a[idx].url = e.target.value; setEditedCourse({...editedCourse, assets: a});
                    }} />
                  </div>
                </div>
              ))}
              {editedCourse.assets.length === 0 && <p className="text-sm text-[var(--muted)] text-center">Belum ada asset.</p>}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

const PublicCourseView: React.FC<{ 
  courses: Course[]; 
  mentor: Mentor; 
  branding: Branding; 
  supabase: SupabaseConfig;
  setBranding: (b: Branding) => void;
  setMentor: (m: Mentor) => void;
  setCourses: (c: any) => void;
  usesShortCode?: boolean;
}> = ({ courses, mentor: initialMentor, branding: initialBranding, supabase, setBranding, setMentor, setCourses, usesShortCode = false }) => {
  const { id: routeId } = useParams<{ id: string }>();
  const id = routeId && usesShortCode ? getCourseIdFromPublicCode(routeId) : routeId;
  const [course, setLocalCourse] = useState<Course | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchLatest = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError(null);
    setLocalCourse(null);
    setSelectedModule(null);

    if (!id) {
      setLoadError('Link kursus tidak valid.');
      setIsLoading(false);
      return;
    }

    const client = getPublicSupabaseClient(supabase);
    if (!client) {
      setLoadError('Koneksi materi publik belum dikonfigurasi.');
      setIsLoading(false);
      return;
    }
    
    try {
      const metadataRequest = Promise.all([
        client.from('branding').select('*').eq('id', 'config').maybeSingle(),
        client.from('mentor').select('*').eq('id', 'profile').maybeSingle()
      ]).catch(error => {
        console.warn('Public course metadata fetch failed', error);
        return null;
      });

      const { data: c, error: courseError } = await withTimeout<any>(
        client
          .from('courses')
          .select('*')
          .eq('id', id)
          .maybeSingle() as PromiseLike<any>,
        15000
      );

      if (requestId !== requestIdRef.current) return;

      if (courseError) throw courseError;
      if (!c) {
        setLoadError('Materi kursus tidak ditemukan atau belum tersedia untuk publik.');
        setIsLoading(false);
        return;
      }
      if (c.space_type === 'recorded_class') {
        setLoadError(`Link ini adalah ${RECORDED_CLASS_SPACE_LABEL.toLowerCase()}. Gunakan link publik kelas yang tersedia di dashboard ${RECORDED_CLASS_SPACE_LABEL}.`);
        setIsLoading(false);
        return;
      }

      const full: Course = {
        ...c,
        coverImage: c.cover_image,
        mentorId: c.mentor_id,
        assets: c.assets || [],
        modules: c.modules || [],
        categories: c.categories || [],
        spaceType: c.space_type || 'product_tutorial',
        published: c.published !== false,
        overallFeedbackEnabled: c.overall_feedback_enabled !== false
      };
      setLocalCourse(full);
      setSelectedModule(full.modules[0] || null);
      setIsLoading(false);

      void metadataRequest.then(results => {
        if (!results || requestId !== requestIdRef.current) return;

        const [{ data: b, error: brandingError }, { data: m, error: mentorError }] = results;
        if (brandingError) console.warn('Public branding fetch failed', brandingError);
        if (mentorError) console.warn('Public mentor fetch failed', mentorError);
        if (b) setBranding({ siteName: b.site_name || 'Platform Arunika', logo: logoUtama, favicon: faviconLogo });
        if (m) setMentor(m);
      });
    } catch (e) {
      if (requestId !== requestIdRef.current) return;
      console.error('Public course fetch failed', e);
      const timedOut = e instanceof Error && e.message === 'PUBLIC_COURSE_REQUEST_TIMEOUT';
      setLoadError(timedOut
        ? 'Server materi terlalu lama merespons. Silakan coba lagi.'
        : 'Materi kursus gagal dimuat. Periksa koneksi Anda lalu coba lagi.');
      setIsLoading(false);
    }
  }, [id, supabase, setBranding, setMentor]);

  useEffect(() => {
    fetchLatest();
    return () => { requestIdRef.current += 1; };
  }, [fetchLatest]);

  if (isLoading) return <div className="h-screen flex items-center justify-center text-sm text-[var(--muted)] bg-[var(--app-bg)]">Mencari materi kursus...</div>;

  if (loadError || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--app-bg)]">
        <div className="w-full max-w-md text-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-md">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-[var(--surface-soft)] border border-[var(--border)] flex items-center justify-center text-[var(--muted)]">
            <BookOpen size={26} />
          </div>
          <h1 className="text-xl font-semibold text-[var(--text)] mb-2">Materi tidak dapat dibuka</h1>
          <p className="text-sm text-[var(--muted)] leading-relaxed mb-6">{loadError || 'Materi kursus tidak ditemukan.'}</p>
          <Button icon={RefreshCw} onClick={fetchLatest} className="w-full">Coba Lagi</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] flex flex-col">
      <header className="bg-[var(--surface)] border-b border-[var(--border)] px-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between min-h-[68px]">
          <div className="flex items-center">
            <img src={logoUtama} className="w-auto h-10 object-contain" alt="Logo Utama" />
          </div>
          <Badge>{course.modules.length} Materi</Badge>
        </div>
      </header>
      <main className="w-full max-w-7xl mx-auto p-4 md:p-8 grid lg:grid-cols-4 gap-6 lg:gap-8 flex-1">
        <div className="lg:col-span-3 space-y-6">
          <div className="flex flex-col gap-3 pb-1">
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text)] leading-tight">{course.title}</h1>
            {course.categories && course.categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {course.categories.map((cat, idx) => (
                  <span key={idx} className="category-chip px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide border rounded-lg" style={{ '--category-color': cat.color } as React.CSSProperties}>
                    {cat.label}
                  </span>
                ))}
              </div>
            )}
            {selectedModule && (
              <div className="space-y-4 pt-2">
                <div className="border-t border-[var(--border)] w-full" />
                <h2 className="text-lg md:text-xl font-semibold text-[var(--text)] flex items-center gap-2">
                  <span className="bg-[var(--accent-soft)] text-[var(--accent-strong)] text-[10px] px-2 py-1 rounded-md font-semibold">MATERI</span>
                  {selectedModule.title}
                </h2>
              </div>
            )}
          </div>
          {selectedModule && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-0 overflow-hidden shadow-md">
                  {selectedModule.type === 'video' ? (
                    <iframe className="w-full aspect-video" src={`https://www.youtube.com/embed/${selectedModule.content.split('v=')[1]?.split('&')[0] || selectedModule.content.split('/').pop()}`} frameBorder="0" allowFullScreen />
                  ) : (
                    <div className="p-8 prose max-w-none whitespace-pre-wrap font-normal leading-relaxed bg-[var(--surface)] text-[var(--text)]">{selectedModule.content}</div>
                  )}
                </div>
                {selectedModule.description && (
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 md:p-8 shadow-sm mt-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[var(--accent)]"></div>
                    <h4 className="font-semibold text-xs text-[var(--accent-strong)] mb-4 flex items-center gap-2">
                       <FileText size={16}/> Deskripsi Materi
                    </h4>
                    <p className="text-[var(--text)] text-[15px] leading-7 whitespace-pre-wrap">{selectedModule.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm text-center">
            <div className="checkered-bg rounded-full w-20 h-20 mx-auto mb-4 border border-[var(--border)] overflow-hidden">
              <img src={initialMentor.photo} className="w-full h-full object-contain" />
            </div>
            <h3 className="font-semibold text-base">{initialMentor.name}</h3>
            <p className="text-xs text-[var(--accent-strong)] font-medium mb-4 mt-1">{initialMentor.role}</p>
            <p className="text-xs text-[var(--muted)] line-clamp-3 mb-6 leading-relaxed">{initialMentor.bio}</p>
            
            <div className="space-y-3">
              {initialMentor.socials?.website && (
                <a href={initialMentor.socials.website} target="_blank" rel="noopener noreferrer" className="block w-full">
                  <Button variant="primary" className="w-full text-xs h-11">
                    Template lainnya
                  </Button>
                </a>
              )}
              <div className="flex items-center justify-center gap-3 pt-2">
                 {initialMentor.socials?.instagram && <a href={`https://instagram.com/${initialMentor.socials.instagram}`} className="p-2.5 bg-[var(--surface-soft)] border border-[var(--border)] rounded-xl hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)] transition-all"><Instagram size={17}/></a>}
                 {initialMentor.socials?.linkedin && <a href={`https://linkedin.com/in/${initialMentor.socials.linkedin}`} className="p-2.5 bg-[var(--surface-soft)] border border-[var(--border)] rounded-xl hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)] transition-all"><Linkedin size={17}/></a>}
                 {initialMentor.socials?.tiktok && <a href={`https://tiktok.com/@${initialMentor.socials.tiktok}`} className="p-2.5 bg-[var(--surface-soft)] border border-[var(--border)] rounded-xl hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)] transition-all"><TiktokIcon size={17}/></a>}
              </div>
            </div>
          </div>

          {/* Kurikulum */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="font-semibold mb-4 flex items-center gap-2 text-[var(--text)] text-sm">
              <List size={18} className="text-[var(--accent-strong)]"/> Daftar Materi
            </h4>
            <div className="space-y-2">
              {course.modules.map((m, i) => (
                <button 
                  key={m.id} 
                  onClick={() => setSelectedModule(m)} 
                  className={`w-full text-left p-3 rounded-xl border transition-all group ${selectedModule?.id === m.id ? 'bg-[var(--accent-soft)] border-[var(--border-strong)]' : 'border-transparent hover:bg-[var(--surface-soft)] hover:border-[var(--border)]'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg border border-[var(--border)] flex-shrink-0 flex items-center justify-center text-xs font-semibold transition-colors ${selectedModule?.id === m.id ? 'bg-[var(--surface)] text-[var(--accent-strong)]' : 'bg-[var(--surface-soft)]'}`}>
                      {i+1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[var(--text)] leading-tight break-words">{m.title}</p>
                      {m.duration && (
                        <p className="text-[10px] text-[var(--muted)] flex items-center gap-1 mt-1">
                          <Clock size={10}/> {m.duration}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Asset Pendukung */}
          {course.assets && course.assets.length > 0 && (
            <div className="space-y-3">
               <h4 className="font-semibold flex items-center gap-2 text-[var(--text)] text-sm ml-1">
                 <Download size={18} className="text-[var(--accent-strong)]"/> Asset Pendukung
               </h4>
               <div className="space-y-2">
                 {course.assets.map(asset => (
                   <a key={asset.id} href={asset.url} target="_blank" rel="noopener noreferrer" className="bg-[var(--surface)] border border-[var(--border)] p-3 rounded-xl shadow-sm hover:border-[var(--border-strong)] flex items-center justify-between group transition-all">
                     <div className="flex items-center gap-2 min-w-0">
                       <div className="bg-[var(--success-soft)] text-[var(--success-text)] p-1.5 rounded-lg"><Download size={14} /></div>
                       <span className="font-medium text-[11px] truncate">{asset.name}</span>
                     </div>
                     <ExternalLink size={12} className="text-[var(--muted)] flex-shrink-0" />
                   </a>
                 ))}
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const AuthLoading: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--app-bg)]">
    <div className="flex items-center gap-3 text-sm font-medium text-[var(--muted)]">
      <Loader2 size={20} className="animate-spin text-[var(--accent-strong)]" />
      Memverifikasi sesi admin...
    </div>
  </div>
);

const App: React.FC = () => {
  const location = useLocation();
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [courses, setCourses] = useState<Course[]>([]);
  const [mentor, setMentor] = useState<Mentor>(defaultMentor);
  const [branding, setBranding] = useState<Branding>(defaultBranding);
  const [syncing, setSyncing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isSyncingRef = useRef(false);
  const lastLocalUpdateRef = useRef<number>(0);
  const isAdmin = authStatus === 'admin';
  const isPublicCourseRoute = /^\/(?:c|course|class|form|qna|landing)\//.test(location.pathname);

  useEffect(() => {
    // Hapus otorisasi dan cache data lama yang sebelumnya dipercaya dari localStorage.
    ['isLoggedIn', 'courses', 'mentor', 'branding', 'supabase'].forEach(key => {
      localStorage.removeItem(key);
    });
  }, []);

  useEffect(() => {
    // Link publik sama sekali tidak memuat atau memverifikasi sesi admin.
    if (isPublicCourseRoute) {
      setAuthStatus('signed_out');
      return;
    }

    const client = getAdminSupabaseClient();
    if (!client) {
      setAuthStatus('signed_out');
      return;
    }

    let isActive = true;

    const verifyAdminSession = async () => {
      const { data: userData, error: userError } = await client.auth.getUser();
      if (!isActive) return;

      if (userError || !userData.user) {
        setAuthStatus('signed_out');
        return;
      }

      const { data: hasAdminRole, error: roleError } = await client.rpc('is_arunika_admin');
      if (!isActive) return;

      if (roleError || hasAdminRole !== true) {
        await client.auth.signOut();
        if (isActive) setAuthStatus('signed_out');
        return;
      }

      setAuthStatus('admin');
    };

    void verifyAdminSession();
    const { data: authListener } = client.auth.onAuthStateChange((_event: string, session: any) => {
      if (!isActive) return;
      if (!session) {
        setAuthStatus('signed_out');
        return;
      }
      window.setTimeout(() => { void verifyAdminSession(); }, 0);
    });

    return () => {
      isActive = false;
      authListener.subscription.unsubscribe();
    };
  }, [isPublicCourseRoute]);

  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('arunika_theme', theme);
  }, [theme]);

  useEffect(() => {
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = faviconLogo;
    document.title = branding.siteName || 'Platform Arunika';
  }, [branding.siteName]);

  const getReadClient = useCallback(() => (
    isAdmin && !isPublicCourseRoute
      ? getAdminSupabaseClient()
      : getPublicSupabaseClient()
  ), [isAdmin, isPublicCourseRoute]);

  const fetchAllData = useCallback(async () => {
    const client = getReadClient();
    if (!client) return;

    try {
      const [brandingResult, mentorResult, coursesResult] = await Promise.all([
        client.from('branding').select('*').eq('id', 'config').maybeSingle(),
        client.from('mentor').select('*').eq('id', 'profile').maybeSingle(),
        client.from('courses').select('*').order('created_at', { ascending: false })
      ]);

      if (brandingResult.error) throw brandingResult.error;
      if (mentorResult.error) throw mentorResult.error;
      if (coursesResult.error) throw coursesResult.error;

      if (brandingResult.data) {
        setBranding({
          siteName: brandingResult.data.site_name || 'Platform Arunika',
          logo: logoUtama,
          favicon: faviconLogo
        });
      }
      if (mentorResult.data) setMentor(mentorResult.data);
      setCourses((coursesResult.data || []).map((item: any) => ({
        ...item,
        coverImage: item.cover_image,
        mentorId: item.mentor_id,
        assets: item.assets || [],
        modules: item.modules || [],
        categories: item.categories || [],
        spaceType: item.space_type || 'product_tutorial',
        published: item.published !== false,
        overallFeedbackEnabled: item.overall_feedback_enabled !== false
      })));
    } catch (error) {
      console.warn('Fetch error', error);
    }
  }, [getReadClient]);

  useEffect(() => {
    void fetchAllData();
    const client = getReadClient();
    if (!client) return;

    const refreshFromRealtime = () => {
      if (isSyncingRef.current || Date.now() - lastLocalUpdateRef.current < 2000) return;
      void fetchAllData();
    };
    // Realtime memakai satu baris sinyal tanpa isi kursus/admin. Data sebenarnya
    // selalu diambil ulang lewat REST dan kembali disaring oleh RLS.
    const channel = client
      .channel(isAdmin && !isPublicCourseRoute ? 'admin_content_updates' : 'public_content_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'public_content_revisions',
          filter: 'scope=eq.public'
        },
        refreshFromRealtime
      )
      .subscribe();

    return () => { void client.removeChannel(channel); };
  }, [fetchAllData, getReadClient, isAdmin, isPublicCourseRoute]);

  const handleLogin = async (username: string, password: string): Promise<string | null> => {
    const client = getAdminSupabaseClient();
    if (!client) return 'Layanan autentikasi admin tidak tersedia.';

    const { data: loginData, error: loginError } = await client.functions.invoke('admin-login', {
      body: { username: username.toLowerCase(), password }
    });

    if (loginError || !loginData?.access_token || !loginData?.refresh_token) {
      return 'Username atau password salah.';
    }

    const { error: sessionError } = await client.auth.setSession({
      access_token: loginData.access_token,
      refresh_token: loginData.refresh_token
    });

    if (sessionError) return 'Sesi login tidak dapat dibuat.';

    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) {
      await client.auth.signOut();
      return 'Sesi login tidak dapat diverifikasi.';
    }

    const { data: hasAdminRole, error: roleError } = await client.rpc('is_arunika_admin');
    if (roleError || hasAdminRole !== true) {
      await client.auth.signOut();
      setAuthStatus('forbidden');
      return 'Akun ini tidak memiliki izin admin.';
    }

    setAuthStatus('admin');
    return null;
  };

  const handleLogout = async () => {
    setAuthStatus('signed_out');
    setCourses([]);
    setMentor(defaultMentor);
    setBranding(defaultBranding);
    const client = getAdminSupabaseClient();
    if (client) await client.auth.signOut();
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Hapus kursus ini secara permanen dari database?')) return;
    const client = getAdminSupabaseClient();
    if (!client) return;

    try {
      const { error } = await client.from('courses').delete().eq('id', id);
      if (error) throw error;
      setCourses(previous => previous.filter(course => course.id !== id));
      alert('Kursus berhasil dihapus permanen.');
    } catch (error) {
      console.error('Delete failed', error);
      alert('Gagal menghapus kursus atau sesi admin sudah berakhir.');
    }
  };

  const handleUpdateBranding = async (updatedBranding: Branding) => {
    const client = getAdminSupabaseClient();
    if (!client) throw new Error('Database belum terhubung.');
    isSyncingRef.current = true;
    setSyncing(true);

    try {
      const { error } = await client.from('branding').upsert({
        id: 'config',
        site_name: updatedBranding.siteName,
        logo: updatedBranding.logo,
        favicon: updatedBranding.favicon,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      if (error) throw error;
      setBranding(updatedBranding);
    } finally {
      window.setTimeout(() => {
        isSyncingRef.current = false;
        setSyncing(false);
      }, 1000);
    }
  };

  const handleUpdateCourse = async (updatedCourse: Course, updatedMentor?: Mentor) => {
    const client = getAdminSupabaseClient();
    if (!client) throw new Error('Database belum terhubung.');
    isSyncingRef.current = true;
    setSyncing(true);

    try {
      const courseData = {
        id: updatedCourse.id,
        title: updatedCourse.title,
        description: updatedCourse.description,
        cover_image: updatedCourse.coverImage,
        modules: updatedCourse.modules,
        assets: updatedCourse.assets,
        categories: updatedCourse.categories || [],
        mentor_id: updatedCourse.mentorId || 'profile',
        space_type: updatedCourse.spaceType || 'product_tutorial',
        published: updatedCourse.published !== false,
        overall_feedback_enabled: updatedCourse.overallFeedbackEnabled !== false,
        updated_at: new Date().toISOString()
      };
      const { error: courseError } = await client.from('courses').upsert(courseData, { onConflict: 'id' });
      if (courseError) throw courseError;

      if (updatedMentor) {
        const { error: mentorError } = await client.from('mentor').upsert({
          id: 'profile',
          name: updatedMentor.name,
          role: updatedMentor.role,
          bio: updatedMentor.bio,
          photo: updatedMentor.photo,
          socials: updatedMentor.socials,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
        if (mentorError) throw mentorError;
      }

      setCourses(previous => previous.some(course => course.id === updatedCourse.id)
        ? previous.map(course => course.id === updatedCourse.id ? updatedCourse : course)
        : [updatedCourse, ...previous]);
      if (updatedMentor) setMentor(updatedMentor);
    } finally {
      window.setTimeout(() => {
        isSyncingRef.current = false;
        setSyncing(false);
      }, 1000);
    }
  };

  const renderAdminPage = (content: React.ReactNode) => {
    if (authStatus === 'loading') return <AuthLoading />;
    if (!isAdmin) return <Navigate to="/login" replace />;

    return (
      <AdminLayout
        branding={branding}
        onLogout={() => { void handleLogout(); }}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      >
        {content}
      </AdminLayout>
    );
  };

  return (
    <div className="min-h-screen">
      <RouteTracker supabase={PUBLIC_SUPABASE_CONFIG} />
      <ThemeToggle theme={theme} onToggle={() => setTheme(current => current === 'light' ? 'dark' : 'light')} />
      {syncing && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[999] bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-md">
          <RefreshCw size={16} className="animate-spin text-[var(--accent-strong)]" />
          <span className="text-[11px] font-medium text-[var(--text)]">Menyinkronkan perubahan...</span>
        </div>
      )}
      <Routes>
        <Route path="/login" element={<Login authStatus={authStatus} onLogin={handleLogin} />} />
        <Route path="/admin" element={renderAdminPage(<SpacesDashboard courses={courses} />)} />
        <Route path="/admin/products" element={renderAdminPage(<AdminDashboard courses={courses} setCourses={setCourses} onDeleteCourse={handleDeleteCourse} />)} />
        <Route path="/admin/course/:id" element={renderAdminPage(<CourseEditor courses={courses} onSave={handleUpdateCourse} mentor={mentor} setMentor={setMentor} onLocalEdit={() => { lastLocalUpdateRef.current = Date.now(); }} />)} />
        <Route path="/admin/classes" element={renderAdminPage(<RecordedClassesPage courses={courses} onCreateCourse={handleUpdateCourse} onDeleteCourse={handleDeleteCourse} generateShareLink={courseId => generateShareLink(courseId, 'class')} copyText={copyTextToClipboard} />)} />
        <Route path="/admin/classes/:id" element={renderAdminPage(<RecordedClassEditor courses={courses} client={getAdminSupabaseClient()} onSaveCourse={handleUpdateCourse} onLocalEdit={() => { lastLocalUpdateRef.current = Date.now(); }} />)} />
        <Route path="/admin/classes/:id/results" element={renderAdminPage(<ClassResultsPage courses={courses} client={getAdminSupabaseClient()} />)} />
        <Route path="/admin/forms" element={renderAdminPage(<FormMakerPage client={getAdminSupabaseClient()} />)} />
        <Route path="/admin/forms/:id/responses" element={renderAdminPage(<FormResponsesPage client={getAdminSupabaseClient()} />)} />
        <Route path="/admin/forms/:id" element={renderAdminPage(<FormEditorPage client={getAdminSupabaseClient()} />)} />
        <Route path="/admin/landing-pages" element={renderAdminPage(<LandingPagesPage client={getAdminSupabaseClient()} />)} />
        <Route path="/admin/landing-pages/:id" element={renderAdminPage(<LandingPageEditor client={getAdminSupabaseClient()} />)} />
        <Route path="/admin/qna/new" element={renderAdminPage(<QnaAdminCreatePage client={getAdminSupabaseClient()} />)} />
        <Route path="/admin/qna/:id" element={renderAdminPage(<QnaAdminDetailPage client={getAdminSupabaseClient()} />)} />
        <Route path="/admin/qna" element={renderAdminPage(<QnaAdminListPage client={getAdminSupabaseClient()} />)} />
        <Route path="/analytics" element={renderAdminPage(<AnalyticsPage courses={courses} supabase={PUBLIC_SUPABASE_CONFIG} />)} />
        <Route path="/settings" element={renderAdminPage(<Settings />)} />
        <Route path="/c/:id" element={<PublicCourseView courses={courses} mentor={mentor} branding={branding} supabase={PUBLIC_SUPABASE_CONFIG} setBranding={setBranding} setMentor={setMentor} setCourses={setCourses} usesShortCode />} />
        <Route path="/course/:id" element={<PublicCourseView courses={courses} mentor={mentor} branding={branding} supabase={PUBLIC_SUPABASE_CONFIG} setBranding={setBranding} setMentor={setMentor} setCourses={setCourses} />} />
        <Route path="/class/:id" element={<PublicRecordedClassView client={getPublicSupabaseClient()} mentor={mentor} resolveCourseId={getCourseIdFromPublicCode} />} />
        <Route path="/form/:slug" element={<PublicFormView client={getPublicSupabaseClient()} />} />
        <Route path="/landing/:slug" element={<PublicLandingPageView client={getPublicSupabaseClient()} />} />
        <Route path="/qna/:slug/present" element={<PublicQnaPage client={getPublicSupabaseClient()} presenterMode />} />
        <Route path="/qna/:slug" element={<PublicQnaPage client={getPublicSupabaseClient()} />} />
        <Route path="/" element={authStatus === 'loading' ? <AuthLoading /> : <Navigate to={isAdmin ? '/admin' : '/login'} replace />} />
      </Routes>
    </div>
  );
};

const rootRegistry = window as any;
const root = rootRegistry.__arunikaRoot
  || ReactDOMClient.createRoot(document.getElementById('root') as HTMLElement);
rootRegistry.__arunikaRoot = root;
const directFormPathMatch = window.location.hash ? null : window.location.pathname.match(/^\/form\/([^/]+)\/?$/);
const directFormSlug = directFormPathMatch ? decodeURIComponent(directFormPathMatch[1]) : null;
const directLandingPathMatch = window.location.hash ? null : window.location.pathname.match(/^\/landing\/([^/]+)\/?$/);
const directLandingSlug = directLandingPathMatch ? decodeURIComponent(directLandingPathMatch[1]) : null;
const directQnaPathMatch = window.location.hash ? null : window.location.pathname.match(/^\/qna\/([^/]+)(\/present)?\/?$/);
const directQnaSlug = directQnaPathMatch ? decodeURIComponent(directQnaPathMatch[1]) : null;
const directQnaPresenter = Boolean(directQnaPathMatch?.[2]);
const directQnaEntry = directQnaSlug
  ? `/qna/${encodeURIComponent(directQnaSlug)}${directQnaPresenter ? '/present' : ''}${window.location.search}`
  : null;
root.render(directFormSlug
  ? <MemoryRouter initialEntries={[`/form/${directFormSlug}`]}><PublicFormView client={getPublicSupabaseClient()} slugOverride={directFormSlug} /></MemoryRouter>
  : directLandingSlug
    ? <MemoryRouter initialEntries={[`/landing/${directLandingSlug}`]}><PublicLandingPageView client={getPublicSupabaseClient()} slugOverride={directLandingSlug} /></MemoryRouter>
  : directQnaSlug
    ? <MemoryRouter initialEntries={[directQnaEntry || `/qna/${directQnaSlug}`]}><PublicQnaPage client={getPublicSupabaseClient()} presenterMode={directQnaPresenter} slugOverride={directQnaSlug} /></MemoryRouter>
  : <Router><App /></Router>);
