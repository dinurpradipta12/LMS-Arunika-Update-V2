
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter as Router, Routes, Route, Link, useNavigate, Navigate, useParams, useLocation } from 'react-router-dom';
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
  Pencil
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

import { Course, Mentor, Branding, SupabaseConfig, Module, Asset } from './types';
import { Button, Card, Input, Textarea, Badge } from './components/UI';

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

// --- DEFAULTS (EMPTY STATES) ---
const defaultBranding: Branding = {
  logo: '',
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

// --- Storage & Analytics Helpers ---
const getStorageItem = <T,>(key: string, defaultValue: T): T => {
  const saved = localStorage.getItem(key);
  try {
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const setStorageItem = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e: any) {
    if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      console.warn(`Storage quota exceeded for key "${key}".`);
    } else {
      console.error(`Error saving ${key}:`, e);
    }
  }
};

// Singleton Supabase Client
let supabaseInstance: any = null;
let lastSupabaseConfig: SupabaseConfig | null = null;

const getSupabaseClient = (config: SupabaseConfig) => {
  if (!config.url || !config.anonKey) return null;
  
  if (supabaseInstance && lastSupabaseConfig && 
      lastSupabaseConfig.url === config.url && 
      lastSupabaseConfig.anonKey === config.anonKey) {
    return supabaseInstance;
  }
  
  try {
    supabaseInstance = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
    lastSupabaseConfig = config;
    return supabaseInstance;
  } catch (e) {
    console.error("Failed to create Supabase client", e);
    return null;
  }
};

const generateShareLink = (courseId: string, supabase: SupabaseConfig) => {
   const baseUrl = `${window.location.origin}${window.location.pathname}#/course/${courseId}`;
   if (supabase.url && supabase.anonKey) {
      const configStr = JSON.stringify({ u: supabase.url, k: supabase.anonKey });
      const encoded = btoa(configStr);
      return `${baseUrl}?cfg=${encoded}`;
   }
   return baseUrl;
};

const getVisitorId = () => {
  let id = localStorage.getItem('arunika_visitor_id');
  if (!id) {
    id = `vis_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
    setStorageItem('arunika_visitor_id', id);
  }
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
    
    const track = async () => {
      const client = getSupabaseClient(supabase);
      if (!client) return;
      
      const searchParams = new URLSearchParams(location.search);
      const source = searchParams.get('ref') || searchParams.get('utm_source') || 'direct';
      const courseMatch = location.pathname.match(/^\/course\/([^/?]+)/);
      const courseId = courseMatch ? courseMatch[1] : null;

      try {
        await client.from('events').insert({
          event_name: 'course_view',
          course_id: courseId,
          visitor_id: getVisitorId(),
          device_type: getDeviceType(),
          user_agent: navigator.userAgent,
          referrer: document.referrer || 'direct',
          source: source,
          full_path: window.location.href,
          created_at: new Date().toISOString()
        });
        lastTrackedPath.current = location.pathname + location.search;
      } catch (e) {
        console.error("Tracking failed", e);
      }
    };
    track();
  }, [location, supabase]);

  return null;
};

// --- UI Components ---

const ImageUpload: React.FC<{ value: string; onChange: (base64: string) => void; label?: string; children?: React.ReactNode; variant?: 'default' | 'minimal' }> = ({ value, onChange, label, children, variant = 'default' }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => onChange(reader.result as string);
      reader.readAsDataURL(file);
    }
  };
  
  if (children) {
    return (
      <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
        {children}
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div className="space-y-2">
        {label && <label className="text-xs font-extrabold uppercase tracking-wide text-[#64748B] ml-1">{label}</label>}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="relative group cursor-pointer flex flex-col items-center justify-center p-4 transition-all"
        >
          {value ? (
            <img src={value} className="max-w-[120px] max-h-[120px] object-contain mb-4" alt="Logo Preview" />
          ) : (
            <div className="text-center p-4 border-2 border-dashed border-[#CBD5E1] rounded-2xl w-full">
              <Upload className="mx-auto mb-2 text-[#8B5CF6]" size={32} />
              <p className="font-bold text-sm">Upload PNG Logo</p>
            </div>
          )}
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
          <Button variant="secondary" className="text-xs py-1">Ganti Logo</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && <label className="text-xs font-extrabold uppercase tracking-wide text-[#64748B] ml-1">{label}</label>}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="relative group cursor-pointer border-2 border-[#1E293B] rounded-2xl overflow-hidden aspect-video bg-white flex items-center justify-center hard-shadow hover:hard-shadow-hover transition-all"
      >
        {value ? (
          <img src={value} className="w-full h-full object-cover" alt="Upload" />
        ) : (
          <div className="text-center p-4">
            <Upload className="mx-auto mb-2 text-[#8B5CF6]" size={32} />
            <p className="font-bold text-sm">Klik untuk upload gambar</p>
          </div>
        )}
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold">
          Ganti Gambar
        </div>
      </div>
    </div>
  );
};

const AdvancedEditor: React.FC<{ value: string; onChange: (v: string) => void; label: string; placeholder?: string }> = ({ value, onChange, label, placeholder }) => {
  return (
    <div className="space-y-2">
      <label className="text-xs font-extrabold uppercase tracking-wide text-[#64748B] ml-1">{label}</label>
      <div className="border-2 border-[#1E293B] rounded-2xl overflow-hidden bg-white hard-shadow focus-within:hard-shadow-hover transition-all">
        <div className="bg-[#F1F5F9] border-b-2 border-[#1E293B] p-2 flex gap-2">
          <div className="p-1.5 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-[#1E293B] cursor-pointer"><Bold size={14}/></div>
          <div className="p-1.5 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-[#1E293B] cursor-pointer"><Italic size={14}/></div>
          <div className="p-1.5 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-[#1E293B] cursor-pointer"><List size={14}/></div>
          <div className="p-1.5 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-[#1E293B] cursor-pointer"><Type size={14}/></div>
          <div className="flex-1"></div>
          <Badge className="text-[10px]" color="#8B5CF6"><span className="text-white">PRO EDITOR</span></Badge>
        </div>
        <textarea 
          value={value} 
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full p-4 min-h-[120px] outline-none font-medium text-[#1E293B] bg-transparent resize-none"
        />
      </div>
    </div>
  );
};

const Login: React.FC<{ onLogin: () => void; isLoggedIn: boolean }> = ({ onLogin, isLoggedIn }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn) navigate('/admin');
  }, [isLoggedIn, navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'arunika' && password === 'ar4925') {
      onLogin();
      navigate('/admin');
    } else {
      setError('Username atau password salah (Gunakan arunika / ar4925)');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-[#8B5CF6] rounded-full border-2 border-[#1E293B] hard-shadow flex items-center justify-center mb-4">
              <Layout className="text-white" size={40} />
            </div>
            <h1 className="text-3xl font-extrabold text-[#1E293B]">Admin Login</h1>
            <p className="text-[#64748B]">SaaS LMS Arunika Edition</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <Input label="Username" value={username} onChange={e => setUsername(e.target.value)} placeholder="arunika" />
            <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            {error && <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>}
            <Button type="submit" className="w-full h-12" icon={ChevronRight}>Masuk Dashboard</Button>
          </form>
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
        fixed inset-y-0 left-0 z-[101] w-64 bg-white border-r-2 border-[#1E293B] flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0 md:flex
      `}>
        <div className="p-6 border-b-2 border-[#1E293B] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={branding.logo} className="w-10 h-10 object-contain" alt="Logo" />
            <span className="font-extrabold text-xl truncate">{branding.siteName}</span>
          </div>
          <button onClick={onClose} className="md:hidden p-2 text-[#1E293B] hover:bg-[#F1F5F9] rounded-lg">
            <X size={20} />
          </button>
        </div>
        
        <nav className="p-4 flex-1 space-y-2">
          <Link 
            to="/admin" 
            onClick={() => { if(window.innerWidth < 768) onClose(); }}
            className={`flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${location.pathname === '/admin' ? 'bg-[#8B5CF6] text-white hard-shadow' : 'text-[#1E293B] hover:bg-[#F1F5F9]'}`}
          >
            <BookOpen size={20} /> Kursus Saya
          </Link>
          <Link 
            to="/analytics" 
            onClick={() => { if(window.innerWidth < 768) onClose(); }}
            className={`flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${location.pathname === '/analytics' ? 'bg-[#8B5CF6] text-white hard-shadow' : 'text-[#1E293B] hover:bg-[#F1F5F9]'}`}
          >
            <BarChart2 size={20} /> Analitik Pengunjung
          </Link>
          <Link 
            to="/settings" 
            onClick={() => { if(window.innerWidth < 768) onClose(); }}
            className={`flex items-center gap-3 p-3 rounded-xl font-bold transition-all ${location.pathname === '/settings' ? 'bg-[#8B5CF6] text-white hard-shadow' : 'text-[#1E293B] hover:bg-[#F1F5F9]'}`}
          >
            <SettingsIcon size={20} /> Branding & Settings
          </Link>
        </nav>
        
        <div className="p-4 border-t-2 border-[#1E293B]">
          <Button variant="secondary" className="w-full justify-start h-12" onClick={() => { onLogout(); onClose(); }}>
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
    <main className="flex-1 min-w-0 bg-[#FFFDF5] dot-grid flex flex-col">
      <header className="md:hidden bg-white border-b-2 border-[#1E293B] p-4 flex items-center justify-between sticky top-0 z-30 h-16">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-[#1E293B] hover:bg-[#F1F5F9] rounded-xl transition-colors">
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2">
          <img src={branding.logo} className="w-8 h-8 object-contain" alt="Logo" />
          <span className="font-extrabold text-sm truncate max-w-[120px]">{branding.siteName}</span>
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
      if (curr.course_id) acc[curr.course_id] = (acc[curr.course_id] || 0) + 1;
      return acc;
    }, {});
    const deviceBreakdown = events.reduce((acc: any, curr: any) => {
      acc[curr.device_type] = (acc[curr.device_type] || 0) + 1;
      return acc;
    }, {});
    const sourceBreakdown = events.reduce((acc: any, curr: any) => {
      const src = curr.source || 'direct';
      acc[src] = (acc[src] || 0) + 1;
      return acc;
    }, {});
    return { totalViews, uniqueVisitors, courseViews, deviceBreakdown, sourceBreakdown };
  }, [events]);

  useEffect(() => {
    const client = getSupabaseClient(supabase);
    if (!client) return;
    
    const fetchInitial = async () => {
      const { data } = await client.from('events').select('*').order('created_at', { ascending: false });
      if (data) setEvents(data);
    };
    fetchInitial();

    const channel = client.channel('analytics_realtime')
      .on('postgres_changes', { event: 'INSERT', table: 'events', schema: 'public' }, (payload: any) => {
        setEvents(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => { client.removeChannel(channel); };
  }, [supabase]);

  const handleResetData = async () => {
    if (!confirm("Hapus semua data analitik?")) return;
    const client = getSupabaseClient(supabase);
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
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1E293B]">Analytics</h1>
          <p className="text-[#64748B]">Data real-time pengunjung.</p>
        </div>
        <Button variant="secondary" onClick={handleResetData} isLoading={isResetting} icon={RotateCcw}>Reset</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="featured border-[#8B5CF6]">
          <p className="text-xs font-bold text-[#64748B] uppercase">Total Views</p>
          <h2 className="text-3xl font-extrabold">{stats.totalViews}</h2>
        </Card>
        <Card className="border-[#F472B6]">
          <p className="text-xs font-bold text-[#64748B] uppercase">Visitors</p>
          <h2 className="text-3xl font-extrabold">{stats.uniqueVisitors}</h2>
        </Card>
        <Card className="border-[#34D399]">
          <p className="text-xs font-bold text-[#64748B] uppercase">Uptime</p>
          <h2 className="text-3xl font-extrabold">100%</h2>
        </Card>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC<{ courses: Course[]; setCourses: React.Dispatch<React.SetStateAction<Course[]>>; supabase: SupabaseConfig }> = ({ courses, setCourses, supabase }) => {
  const navigate = useNavigate();

  const handleAddCourse = () => {
    const newCourse: Course = {
      id: `course-${Date.now()}`,
      title: 'Kursus Baru',
      description: 'Deskripsi kursus...',
      coverImage: '',
      mentorId: 'profile',
      modules: [],
      assets: []
    };
    setCourses([...courses, newCourse]);
    navigate(`/admin/course/${newCourse.id}`);
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm("Hapus kursus ini?")) return;
    const client = getSupabaseClient(supabase);
    setCourses(courses.filter(c => c.id !== id));
    if (client) {
      await client.from('courses').delete().eq('id', id);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold">Kursus Saya</h1>
        <Button icon={Plus} onClick={handleAddCourse}>Tambah Kursus</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map(course => (
          <Card key={course.id} className="group relative">
            <button onClick={() => handleDeleteCourse(course.id)} className="absolute top-4 right-4 z-10 p-2 bg-red-50 text-red-500 rounded-xl hard-shadow-hover opacity-0 group-hover:opacity-100 transition-all">
              <Trash2 size={16} />
            </button>
            <div className="aspect-video mb-4 rounded-xl overflow-hidden border-2 border-[#1E293B] bg-[#F1F5F9]">
              {course.coverImage && <img src={course.coverImage} className="w-full h-full object-cover" />}
            </div>
            <h3 className="text-xl font-bold mb-4">{course.title}</h3>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate(`/admin/course/${course.id}`)} variant="secondary" className="text-xs h-10">Edit Content</Button>
              <Button 
                onClick={() => {
                  const url = generateShareLink(course.id, supabase);
                  navigator.clipboard.writeText(url);
                  window.open(url, '_blank');
                }} 
                variant="green" className="text-xs h-10" icon={Share2}
              >
                Share
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const Settings: React.FC<{ 
  branding: Branding; 
  setBranding: React.Dispatch<React.SetStateAction<Branding>>;
  supabase: SupabaseConfig;
  setSupabase: React.Dispatch<React.SetStateAction<SupabaseConfig>>;
  onLocalEdit: () => void;
}> = ({ branding, setBranding, supabase, setSupabase, onLocalEdit }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  
  const handleConnect = async () => {
    if (!supabase.url || !supabase.anonKey) return;
    setIsConnecting(true);
    const client = createClient(supabase.url, supabase.anonKey);
    try {
      const { error } = await client.from('branding').select('id').limit(1);
      if (error) throw error;
      alert('Koneksi Supabase Berhasil!');
    } catch (e: any) {
      alert('Koneksi Gagal: ' + e.message);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-12">
      <h1 className="text-3xl font-extrabold">Settings</h1>
      
      <section className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2"><Layout size={20}/> Branding</h2>
        <Card className="grid md:grid-cols-2 gap-8">
          <Input label="Site Name" value={branding.siteName} onChange={e => { onLocalEdit(); setBranding({...branding, siteName: e.target.value}) }} />
          <ImageUpload label="Logo" variant="minimal" value={branding.logo} onChange={logo => { onLocalEdit(); setBranding({...branding, logo}) }} />
        </Card>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2"><Database size={20}/> Infrastructure</h2>
        <Card className="space-y-6">
          <Input label="Supabase URL" value={supabase.url} onChange={e => setSupabase({...supabase, url: e.target.value})} />
          <Input label="Anon Key" value={supabase.anonKey} type="password" onChange={e => setSupabase({...supabase, anonKey: e.target.value})} />
          <Button variant="green" onClick={handleConnect} isLoading={isConnecting}>Verify & Connect</Button>
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

  useEffect(() => {
    if (course) setEditedCourse({ ...course });
    setLocalMentor({ ...mentor });
  }, [id, course, mentor]);

  if (!editedCourse) return <div>Loading...</div>;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editedCourse, localMentor);
      setMentor(localMentor);
      alert('Berhasil disimpan!');
    } catch (e: any) {
      console.error("Editor Save Error:", e);
      alert('Gagal menyimpan: ' + (e.message || "Pastikan Supabase terhubung."));
    } finally {
      setIsSaving(false);
    }
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
        duration: type === 'video' ? '10:00' : '5 min'
      }]
    });
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

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Link to="/admin" className="text-xs font-bold text-[#64748B] flex items-center gap-1 mb-1 hover:text-[#8B5CF6]">
            <ChevronRight size={14} className="rotate-180" /> Kembali ke Dashboard
          </Link>
          <h1 className="text-3xl font-extrabold">Course Editor</h1>
        </div>
        <Button onClick={handleSave} icon={Save} isLoading={isSaving} className="w-full md:w-auto">Simpan Perubahan</Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Section: Utama */}
          <Card className="space-y-6">
            <h3 className="font-extrabold text-xl flex items-center gap-2"><Pencil size={20} className="text-[#8B5CF6]"/> Informasi Utama</h3>
            <Input label="Judul Kursus" value={editedCourse.title} onChange={e => setEditedCourse({...editedCourse, title: e.target.value})} />
            <Textarea label="Deskripsi Singkat" value={editedCourse.description} onChange={e => setEditedCourse({...editedCourse, description: e.target.value})} />
            <ImageUpload label="Gambar Cover (16:9)" value={editedCourse.coverImage} onChange={img => setEditedCourse({...editedCourse, coverImage: img})} />
          </Card>

          {/* Section: Kurikulum */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-xl flex items-center gap-2"><BookOpen size={20} className="text-[#FBBF24]"/> Kurikulum Materi</h3>
              <div className="flex gap-2">
                <Button variant="yellow" className="h-10 text-xs px-4" onClick={() => addModule('video')} icon={Video}>+ Video</Button>
                <Button variant="yellow" className="h-10 text-xs px-4" onClick={() => addModule('text')} icon={FileText}>+ Teks</Button>
              </div>
            </div>
            {editedCourse.modules.length === 0 && (
              <div className="bg-white border-2 border-dashed border-[#CBD5E1] rounded-2xl p-8 text-center">
                <p className="text-[#64748B] font-bold">Belum ada materi. Tambahkan Video atau Teks.</p>
              </div>
            )}
            {editedCourse.modules.map((mod, idx) => (
              <Card key={mod.id} className="space-y-4 relative group">
                <button 
                  onClick={() => setEditedCourse({...editedCourse, modules: editedCourse.modules.filter((_, i) => i !== idx)})} 
                  className="absolute top-4 right-4 text-red-500 hover:bg-red-50 p-2 rounded-xl"
                >
                  <Trash2 size={18} />
                </button>
                <div className="flex items-center gap-2">
                  <Badge color={mod.type === 'video' ? '#8B5CF6' : '#F472B6'}>
                    <span className="text-white">{mod.type.toUpperCase()}</span>
                  </Badge>
                  <span className="font-extrabold text-sm">Materi #{idx + 1}</span>
                </div>
                <Input label="Judul Materi" value={mod.title} onChange={e => {
                  const m = [...editedCourse.modules]; m[idx].title = e.target.value; setEditedCourse({...editedCourse, modules: m});
                }} />
                {mod.type === 'video' ? (
                  <Input label="YouTube Link" icon={LinkIcon} placeholder="https://youtube.com/watch?v=..." value={mod.content} onChange={e => {
                    const m = [...editedCourse.modules]; m[idx].content = e.target.value; setEditedCourse({...editedCourse, modules: m});
                  }} />
                ) : (
                  <AdvancedEditor label="Konten Markdown" value={mod.content} onChange={v => {
                    const m = [...editedCourse.modules]; m[idx].content = v; setEditedCourse({...editedCourse, modules: m});
                  }} />
                )}
                <Textarea label="Catatan / Deskripsi Materi" placeholder="Keterangan tambahan untuk materi ini..." value={mod.description} onChange={e => {
                  const m = [...editedCourse.modules]; m[idx].description = e.target.value; setEditedCourse({...editedCourse, modules: m});
                }} />
              </Card>
            ))}
          </div>

          {/* Section: Assets */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-xl flex items-center gap-2"><Download size={20} className="text-[#34D399]"/> Asset Pendukung</h3>
              <Button variant="green" className="h-10 text-xs px-4" onClick={addAsset} icon={Plus}>Tambah Asset</Button>
            </div>
            <Card className="space-y-4">
              {editedCourse.assets.length === 0 && <p className="text-sm text-[#64748B] font-bold text-center">Belum ada asset tambahan.</p>}
              {editedCourse.assets.map((asset, idx) => (
                <div key={asset.id} className="flex flex-col md:flex-row gap-4 p-4 bg-[#F8FAFC] rounded-xl border-2 border-[#E2E8F0]">
                  <div className="flex-1 space-y-3">
                    <Input label="Nama Asset (Contoh: PDF Slide)" value={asset.name} onChange={e => {
                      const a = [...editedCourse.assets]; a[idx].name = e.target.value; setEditedCourse({...editedCourse, assets: a});
                    }} />
                    <Input label="URL Asset" icon={Globe} value={asset.url} onChange={e => {
                      const a = [...editedCourse.assets]; a[idx].url = e.target.value; setEditedCourse({...editedCourse, assets: a});
                    }} />
                  </div>
                  <button 
                    onClick={() => setEditedCourse({...editedCourse, assets: editedCourse.assets.filter((_, i) => i !== idx)})}
                    className="self-end md:self-center p-3 text-red-500 hover:bg-white rounded-xl hard-shadow-hover transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </Card>
          </div>
        </div>

        <div className="space-y-8">
          {/* Section: Profil Mentor */}
          <Card className="space-y-6 sticky top-8">
            <h3 className="font-extrabold text-xl flex items-center gap-2"><Users size={20} className="text-[#F472B6]"/> Info Mentor</h3>
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-full border-4 border-[#1E293B] overflow-hidden hard-shadow bg-[#F1F5F9]">
                <img src={localMentor.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${localMentor.name}`} className="w-full h-full object-cover" />
              </div>
              <ImageUpload value={localMentor.photo} onChange={p => { onLocalEdit(); setLocalMentor({...localMentor, photo: p}) }}>
                <Button variant="secondary" className="text-xs h-10 px-4">Upload Foto Profil</Button>
              </ImageUpload>
            </div>
            
            <Input label="Nama Lengkap" value={localMentor.name} onChange={e => { onLocalEdit(); setLocalMentor({...localMentor, name: e.target.value}) }} />
            <Input label="Role / Jabatan" placeholder="Contoh: Digital Marketer" value={localMentor.role} onChange={e => { onLocalEdit(); setLocalMentor({...localMentor, role: e.target.value}) }} />
            <Textarea label="Bio Mentor" placeholder="Tuliskan pengalaman singkat..." value={localMentor.bio} onChange={e => { onLocalEdit(); setLocalMentor({...localMentor, bio: e.target.value}) }} />
            
            <div className="space-y-4 pt-4 border-t-2 border-[#F1F5F9]">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#64748B]">Social Media</h4>
              <Input label="Instagram" icon={Instagram} placeholder="@username" value={localMentor.socials.instagram || ''} onChange={e => setLocalMentor({...localMentor, socials: {...localMentor.socials, instagram: e.target.value}})} />
              <Input label="LinkedIn" icon={Linkedin} placeholder="profile-id" value={localMentor.socials.linkedin || ''} onChange={e => setLocalMentor({...localMentor, socials: {...localMentor.socials, linkedin: e.target.value}})} />
              <Input label="TikTok" icon={TiktokIcon} placeholder="@username" value={localMentor.socials.tiktok || ''} onChange={e => setLocalMentor({...localMentor, socials: {...localMentor.socials, tiktok: e.target.value}})} />
              <Input label="Website" icon={Globe} placeholder="https://..." value={localMentor.socials.website || ''} onChange={e => setLocalMentor({...localMentor, socials: {...localMentor.socials, website: e.target.value}})} />
            </div>
          </Card>
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
}> = ({ courses, mentor: initialMentor, branding: initialBranding, supabase, setBranding, setMentor, setCourses }) => {
  const { id } = useParams<{ id: string }>();
  const [course, setLocalCourse] = useState<Course | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);

  const fetchLatest = useCallback(async () => {
    const client = getSupabaseClient(supabase);
    if (!client) return;
    
    try {
      const { data: b } = await client.from('branding').select('*').eq('id', 'config').single();
      if (b) setBranding({ siteName: b.site_name, logo: b.logo });
      
      const { data: m } = await client.from('mentor').select('*').eq('id', 'profile').single();
      if (m) setMentor(m);
      
      const { data: c } = await client.from('courses').select('*').eq('id', id).single();
      if (c) {
        const full: Course = { ...c, coverImage: c.cover_image, mentorId: c.mentor_id, assets: c.assets || [], modules: c.modules || [] };
        setLocalCourse(full);
        if (!selectedModule && full.modules.length > 0) setSelectedModule(full.modules[0]);
      }
    } catch (e) {
      console.error(e);
    }
  }, [id, supabase]);

  useEffect(() => { fetchLatest(); }, [fetchLatest]);

  if (!course) return <div className="h-screen flex items-center justify-center font-bold">Mencari Materi...</div>;

  return (
    <div className="min-h-screen bg-[#FFFDF5] flex flex-col">
      <header className="bg-white border-b-2 border-[#1E293B] p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={initialBranding.logo} className="w-10 h-10 object-contain" />
            <span className="font-extrabold text-xl">{initialBranding.siteName}</span>
          </div>
          <Badge>{course.modules.length} Materi</Badge>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-4 md:p-8 grid lg:grid-cols-4 gap-8 flex-1">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <h1 className="text-2xl font-extrabold">{course.title}</h1>
            <p className="text-[#64748B] mt-2">{course.description}</p>
          </Card>
          {selectedModule && (
            <div className="space-y-6">
              <Card className="p-0 overflow-hidden">
                {selectedModule.type === 'video' ? (
                  <iframe 
                    className="w-full aspect-video" 
                    src={`https://www.youtube.com/embed/${selectedModule.content.split('v=')[1]?.split('&')[0] || selectedModule.content.split('/').pop()}`} 
                    frameBorder="0" 
                    allowFullScreen 
                  />
                ) : (
                  <div className="p-8 prose max-w-none whitespace-pre-wrap font-medium leading-relaxed">{selectedModule.content}</div>
                )}
              </Card>
              {selectedModule.description && (
                <Card className="border-l-4 border-l-[#8B5CF6]">
                  <h4 className="font-extrabold text-sm uppercase tracking-wide mb-2">Penjelasan Materi:</h4>
                  <p className="text-[#1E293B] text-sm md:text-base">{selectedModule.description}</p>
                </Card>
              )}
            </div>
          )}
          
          {course.assets && course.assets.length > 0 && (
            <div className="space-y-4 pt-6">
               <h3 className="font-extrabold text-xl">Asset & File Pendukung</h3>
               <div className="grid md:grid-cols-2 gap-4">
                 {course.assets.map(asset => (
                   <a 
                    key={asset.id} 
                    href={asset.url} 
                    target="_blank" 
                    className="bg-white border-2 border-[#1E293B] p-4 rounded-xl hard-shadow-hover flex items-center justify-between group transition-all"
                   >
                     <div className="flex items-center gap-3">
                       <div className="bg-[#34D399] p-2 rounded-lg border border-[#1E293B]">
                         <Download size={18} className="text-[#1E293B]" />
                       </div>
                       <span className="font-bold text-sm">{asset.name}</span>
                     </div>
                     <ExternalLink size={16} className="text-[#64748B] group-hover:text-[#8B5CF6]" />
                   </a>
                 ))}
               </div>
            </div>
          )}
        </div>
        <div className="lg:col-span-1 space-y-6">
          <Card className="text-center">
            <img src={initialMentor.photo} className="w-24 h-24 mx-auto rounded-full border-2 border-[#1E293B] mb-4 object-cover" />
            <h3 className="font-bold">{initialMentor.name}</h3>
            <p className="text-xs text-[#64748B] mb-4">{initialMentor.role}</p>
            <p className="text-xs text-[#64748B] line-clamp-3">{initialMentor.bio}</p>
          </Card>
          <div className="bg-white border-2 border-[#1E293B] rounded-2xl p-4 hard-shadow space-y-2">
            <h4 className="font-extrabold mb-4 flex items-center gap-2">
              <List size={18} className="text-[#8B5CF6]"/> Kurikulum
            </h4>
            {course.modules.map((m, i) => (
              <button key={m.id} onClick={() => setSelectedModule(m)} className={`w-full text-left p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${selectedModule?.id === m.id ? 'bg-[#FBBF24] border-[#1E293B]' : 'border-transparent hover:bg-[#F1F5F9]'}`}>
                <span className="w-6 h-6 rounded-full bg-white border border-[#1E293B] flex-shrink-0 flex items-center justify-center text-[10px] font-bold">{i+1}</span>
                <span className="text-xs font-bold truncate">{m.title}</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const EMBEDDED_SUPABASE_URL = "https://mhuqqbbqlovdiquaktzd.supabase.co"; 
  const EMBEDDED_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odXFxYmJxbG92ZGlxdWFrdHpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4OTQxNTksImV4cCI6MjA4NjQ3MDE1OX0.pJud95i77m-01lce_Pq6q2FovPxapUy-gKTYne6PZ18"; 

  const [isLoggedIn, setIsLoggedIn] = useState(() => getStorageItem('isLoggedIn', false));
  const [courses, setCourses] = useState<Course[]>(() => getStorageItem('courses', []));
  const [mentor, setMentor] = useState<Mentor>(() => getStorageItem('mentor', defaultMentor));
  const [branding, setBranding] = useState<Branding>(() => getStorageItem('branding', defaultBranding));
  const [supabase, setSupabase] = useState<SupabaseConfig>(() => {
    const saved = localStorage.getItem('supabase');
    if (saved) { try { return JSON.parse(saved); } catch(e) {} }
    return { url: EMBEDDED_SUPABASE_URL, anonKey: EMBEDDED_ANON_KEY };
  });

  const [syncing, setSyncing] = useState(false);
  const isSyncingRef = useRef(false);
  const lastLocalUpdateRef = useRef<number>(0);

  useEffect(() => {
    setStorageItem('isLoggedIn', isLoggedIn);
    setStorageItem('courses', courses);
    setStorageItem('mentor', mentor);
    setStorageItem('branding', branding);
    setStorageItem('supabase', supabase);
  }, [isLoggedIn, courses, mentor, branding, supabase]);

  const updateLastLocalUpdate = useCallback(() => { lastLocalUpdateRef.current = Date.now(); }, []);

  useEffect(() => {
    const client = getSupabaseClient(supabase);
    if (!client) return;
    
    const initialFetch = async () => {
      try {
        const { data: b } = await client.from('branding').select('*').eq('id', 'config').single();
        if (b) setBranding({ siteName: b.site_name, logo: b.logo });
        const { data: m } = await client.from('mentor').select('*').eq('id', 'profile').single();
        if (m) setMentor(m);
        const { data: c } = await client.from('courses').select('*');
        if (c) setCourses(c.map((item: any) => ({ ...item, coverImage: item.cover_image, mentorId: item.mentor_id, assets: item.assets || [], modules: item.modules || [] })));
      } catch (e) { console.warn("Supabase init fetch warn", e); }
    };
    initialFetch();
    
    const sub = client.channel('global_updates').on('postgres_changes', { event: '*', table: '*' }, (payload: any) => {
       if (isSyncingRef.current || (Date.now() - lastLocalUpdateRef.current < 2000)) return;
       if(payload.table === 'branding' && payload.new) setBranding({siteName: payload.new.site_name, logo: payload.new.logo});
       if(payload.table === 'mentor' && payload.new) setMentor(payload.new);
    }).subscribe();
    return () => { client.removeChannel(sub); };
  }, [supabase]);

  const handleUpdateCourse = async (updatedCourse: Course, updatedMentor?: Mentor) => {
     const client = getSupabaseClient(supabase);
     if (!client) throw new Error("Database belum terhubung. Periksa Settings.");

     isSyncingRef.current = true;
     setSyncing(true);

     try {
        // Pembersihan data null/undefined
        const courseData = {
           id: updatedCourse.id,
           title: updatedCourse.title || "Untitled",
           description: updatedCourse.description || "",
           cover_image: updatedCourse.coverImage || "",
           modules: updatedCourse.modules || [],
           assets: updatedCourse.assets || [],
           mentor_id: updatedCourse.mentorId || "profile",
           updated_at: new Date().toISOString()
        };

        const { error: cErr } = await client.from('courses').upsert(courseData, { onConflict: 'id' });
        if (cErr) throw cErr;

        if (updatedMentor) {
          const mentorData = {
            id: 'profile',
            name: updatedMentor.name || "",
            role: updatedMentor.role || "",
            bio: updatedMentor.bio || "",
            photo: updatedMentor.photo || "",
            socials: updatedMentor.socials || {},
            updated_at: new Date().toISOString()
          };
          const { error: mErr } = await client.from('mentor').upsert(mentorData, { onConflict: 'id' });
          if (mErr) throw mErr;
        }

        // Update Local State Optimistically
        setCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
        if (updatedMentor) setMentor(updatedMentor);

     } catch (err: any) {
        console.error("DB Sync Error:", err);
        throw err;
     } finally {
        setTimeout(() => {
          isSyncingRef.current = false;
          setSyncing(false);
        }, 800);
     }
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <RouteTracker supabase={supabase} />
      {syncing && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[999] bg-[#34D399] border-2 border-[#1E293B] rounded-full px-5 py-2 flex items-center gap-3 hard-shadow animate-bounce">
           <RefreshCw size={18} className="animate-spin" />
           <span className="text-[10px] font-black uppercase tracking-widest">SINKRONISASI...</span>
        </div>
      )}
      <Routes>
        <Route path="/login" element={<Login isLoggedIn={isLoggedIn} onLogin={() => setIsLoggedIn(true)} />} />
        <Route path="/admin" element={isLoggedIn ? <AdminLayout branding={branding} onLogout={() => setIsLoggedIn(false)} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}><AdminDashboard courses={courses} setCourses={setCourses} supabase={supabase} /></AdminLayout> : <Navigate to="/login" />} />
        <Route path="/admin/course/:id" element={isLoggedIn ? <AdminLayout branding={branding} onLogout={() => setIsLoggedIn(false)} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}><CourseEditor courses={courses} onSave={handleUpdateCourse} mentor={mentor} setMentor={setMentor} onLocalEdit={updateLastLocalUpdate} /></AdminLayout> : <Navigate to="/login" />} />
        <Route path="/analytics" element={isLoggedIn ? <AdminLayout branding={branding} onLogout={() => setIsLoggedIn(false)} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}><AnalyticsPage courses={courses} supabase={supabase} /></AdminLayout> : <Navigate to="/login" />} />
        <Route path="/settings" element={isLoggedIn ? <AdminLayout branding={branding} onLogout={() => setIsLoggedIn(false)} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}><Settings branding={branding} setBranding={setBranding} supabase={supabase} setSupabase={setSupabase} onLocalEdit={updateLastLocalUpdate} /></AdminLayout> : <Navigate to="/login" />} />
        <Route path="/course/:id" element={<PublicCourseView courses={courses} mentor={mentor} branding={branding} supabase={supabase} setBranding={setBranding} setMentor={setMentor} setCourses={setCourses} />} />
        <Route path="/" element={<Navigate to={isLoggedIn ? "/admin" : "/login"} />} />
      </Routes>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<Router><App /></Router>);
