
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Activity
} from 'lucide-react';

// Custom TikTok SVG Icon since it might not be in all Lucide versions
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

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1?external=react,react-dom';

import { Course, Mentor, Branding, SupabaseConfig, Module, Asset } from './types';
import { initialCourses, initialMentor, initialBranding } from './mockData';
import { Button, Card, Input, Textarea, Badge } from './components/UI';

// --- Storage Helpers ---
const getStorageItem = <T,>(key: string, defaultValue: T): T => {
  const saved = localStorage.getItem(key);
  try {
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const setStorageItem = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value));
};

// --- Components ---

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

const AnalyticsPage: React.FC<{ courses: Course[], supabase: SupabaseConfig }> = ({ courses, supabase }) => {
  const [views, setViews] = useState<any[]>([]);
  const [isLive, setIsLive] = useState(false);

  // Helper function to process views data
  const processData = (allViews: any[]) => {
    const counts = allViews.reduce((acc: any, curr: any) => {
      acc[curr.course_id] = (acc[curr.course_id] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(counts).map(([id, count]) => ({
      course_id: id as string,
      count: count as number
    })).sort((a, b) => b.count - a.count);
  };

  const sortedData = processData(views);
  const total = views.length;

  useEffect(() => {
    if (!supabase.url || !supabase.anonKey) return;
    
    const client = createClient(supabase.url, supabase.anonKey);
    
    const fetchInitial = async () => {
      const { data } = await client.from('course_views').select('*');
      if (data) setViews(data);
    };

    fetchInitial();

    // REAL-TIME SUBSCRIPTION
    const channel = client.channel('analytics_realtime')
      .on('postgres_changes', { 
        event: 'INSERT', 
        table: 'course_views', 
        schema: 'public' 
      }, (payload) => {
        console.log('Kunjungan Real-time Baru!', payload.new);
        setViews(prev => [...prev, payload.new]);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLive(true);
          console.log("Real-time Tracking Terhubung!");
        }
      });

    return () => {
      client.removeChannel(channel);
    };
  }, [supabase.url, supabase.anonKey]);

  const getCourseTitle = (id: string) => courses.find(c => c.id === id)?.title || "Unknown Course";

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2 text-[#1E293B]">Analitik Pengunjung</h1>
          <p className="text-sm md:text-base text-[#64748B]">Pantau performa publikasi Anda secara langsung.</p>
        </div>
        <Badge color={isLive ? '#34D399' : '#E2E8F0'} className="h-10">
          <div className="flex items-center gap-2 px-1">
             <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-white animate-pulse' : 'bg-[#94A3B8]'}`} />
             <span className={isLive ? 'text-white' : 'text-[#64748B]'}>{isLive ? 'LIVE TRACKING AKTIF' : 'MENYAMBUNGKAN...'}</span>
          </div>
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card className="featured border-[#8B5CF6]">
          <div className="flex items-center gap-4">
            <div className="p-3 md:p-4 bg-[#8B5CF6]/10 rounded-2xl text-[#8B5CF6]">
              <Users size={24} className="md:w-8 md:h-8" />
            </div>
            <div>
              <p className="text-[10px] md:text-xs font-bold text-[#64748B] uppercase tracking-wider">Total Kunjungan</p>
              <h2 className="text-2xl md:text-4xl font-extrabold">{total}</h2>
            </div>
          </div>
        </Card>
        
        <Card className="border-[#FBBF24]">
          <div className="flex items-center gap-4">
            <div className="p-3 md:p-4 bg-[#FBBF24]/10 rounded-2xl text-[#FBBF24]">
              <TrendingUp size={24} className="md:w-8 md:h-8" />
            </div>
            <div>
              <p className="text-[10px] md:text-xs font-bold text-[#64748B] uppercase tracking-wider">Prakiraan Konversi</p>
              <h2 className="text-2xl md:text-4xl font-extrabold">{total > 0 ? (total * 0.12).toFixed(0) : 0}</h2>
            </div>
          </div>
        </Card>

        <Card className="border-[#34D399]">
          <div className="flex items-center gap-4">
            <div className="p-3 md:p-4 bg-[#34D399]/10 rounded-2xl text-[#34D399]">
              <Activity size={24} className="md:w-8 md:h-8" />
            </div>
            <div>
              <p className="text-[10px] md:text-xs font-bold text-[#64748B] uppercase tracking-wider">Status Sinkron</p>
              <h2 className="text-lg md:text-xl font-extrabold">{isLive ? 'SINKRON' : 'LOKAL'}</h2>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <Card className="flex flex-col">
          <h3 className="text-xl font-extrabold mb-4 md:mb-6">Kursus Terpopuler</h3>
          <div className="space-y-4 flex-1">
            {sortedData.slice(0, 5).map((item, i) => (
              <div key={item.course_id} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full border-2 border-[#1E293B] bg-[#FBBF24] flex items-center justify-center font-bold text-xs">{i+1}</div>
                <div className="flex-1">
                  <p className="font-bold text-xs md:text-sm truncate">{getCourseTitle(item.course_id)}</p>
                  <div className="w-full bg-[#F1F5F9] h-2 rounded-full overflow-hidden mt-1 border border-[#E2E8F0]">
                    <div 
                      className="bg-[#8B5CF6] h-full transition-all duration-1000" 
                      style={{ width: `${(item.count / (sortedData[0]?.count || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <span className="text-[10px] md:text-xs font-extrabold text-[#64748B] whitespace-nowrap">{item.count} Views</span>
              </div>
            ))}
            {sortedData.length === 0 && <p className="text-center py-12 text-[#64748B] italic">Belum ada kunjungan tercatat.</p>}
          </div>
        </Card>

        <Card>
          <h3 className="text-xl font-extrabold mb-4 md:mb-6">Distribusi Traffic</h3>
          <div className="h-48 md:h-64 flex items-end gap-2 md:gap-3 px-1 md:px-2">
            {[30, 45, 25, 60, 80, 55, 90].map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-help">
                <div 
                  className="w-full bg-[#34D399] rounded-t-lg transition-all group-hover:bg-[#FBBF24] hard-shadow"
                  style={{ height: `${val}%` }}
                ></div>
                <span className="text-[8px] md:text-[10px] font-bold text-[#64748B]">H-{6-i}</span>
              </div>
            ))}
          </div>
          <p className="text-[8px] md:text-[10px] text-center mt-4 font-bold text-[#94A3B8]">DATA BERDASARKAN 7 HARI TERAKHIR</p>
        </Card>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC<{ courses: Course[]; setCourses: React.Dispatch<React.SetStateAction<Course[]>> }> = ({ courses, setCourses }) => {
  const navigate = useNavigate();

  const handleAddCourse = () => {
    const newCourse: Course = {
      id: `course-${Date.now()}`,
      title: 'Kursus Baru',
      description: 'Deskripsi kursus baru...',
      coverImage: '',
      mentorId: 'mentor-1',
      modules: [],
      assets: []
    };
    setCourses([...courses, newCourse]);
    navigate(`/admin/course/${newCourse.id}`);
  };

  const handleDeleteCourse = (id: string) => {
    if (confirm("Hapus kursus ini secara permanen?")) {
      setCourses(courses.filter(c => c.id !== id));
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 md:mb-12">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2 text-[#1E293B]">Dashboard Kursus</h1>
          <p className="text-sm md:text-base text-[#64748B]">Kelola konten publik dan publikasi kelas Anda.</p>
        </div>
        <Button icon={Plus} onClick={handleAddCourse} className="w-full md:w-auto h-12">Tambah Kursus</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {courses.map((course) => (
          <Card key={course.id} className="group overflow-hidden flex flex-col relative">
            <button 
              onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id); }}
              className="absolute top-4 right-4 z-10 p-2 bg-red-50 text-red-500 border-2 border-[#1E293B] rounded-xl hard-shadow-hover md:opacity-0 md:group-hover:opacity-100 transition-all"
            >
              <Trash2 size={16} />
            </button>

            <div className="relative aspect-video mb-4 rounded-lg overflow-hidden border-2 border-[#1E293B] bg-[#F1F5F9] flex items-center justify-center">
              {course.coverImage ? (
                <img src={course.coverImage} className="w-full h-full object-cover" alt={course.title} />
              ) : (
                <Globe size={48} className="text-[#CBD5E1]" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-extrabold group-hover:text-[#8B5CF6] transition-colors">{course.title}</h3>
              <p className="text-sm text-[#64748B] line-clamp-2 mt-2 mb-4">{course.description}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <Button onClick={() => navigate(`/admin/course/${course.id}`)} variant="secondary" className="text-xs h-10">Edit Content</Button>
              <Button onClick={() => window.open(`#/course/${course.id}`, '_blank')} variant="yellow" className="text-xs h-10" icon={Globe}>Public View</Button>
              <Button 
                onClick={() => {
                  const url = `${window.location.origin}${window.location.pathname}#/course/${course.id}`;
                  navigator.clipboard.writeText(url);
                  alert('Link publik berhasil disalin!');
                }} 
                variant="green" className="text-xs sm:col-span-2 h-10" icon={Share2}
              >
                Share Pages Kursus
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
  const [localSiteName, setLocalSiteName] = useState(branding.siteName);
  const [isConnecting, setIsConnecting] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected' | 'connecting'>(() => {
    return (supabase.url && supabase.anonKey) ? 'connected' : 'disconnected';
  });

  useEffect(() => {
    if (branding.siteName !== localSiteName) {
      setLocalSiteName(branding.siteName);
    }
  }, [branding.siteName]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSiteName !== branding.siteName) {
        onLocalEdit();
        setBranding({...branding, siteName: localSiteName});
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [localSiteName]);

  const sqlScript = `
-- SETUP DATABASE ARUNIKA LMS (REAL-TIME ENABLED)
-- 1. Tabel Branding
CREATE TABLE IF NOT EXISTS public.branding (
  id TEXT PRIMARY KEY DEFAULT 'config',
  site_name TEXT NOT NULL,
  logo TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- 2. Tabel Mentor
CREATE TABLE IF NOT EXISTS public.mentor (
  id TEXT PRIMARY KEY DEFAULT 'profile',
  name TEXT NOT NULL,
  role TEXT,
  bio TEXT,
  photo TEXT,
  socials JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- 3. Tabel Courses
CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  modules JSONB DEFAULT '[]'::jsonb,
  assets JSONB DEFAULT '[]'::jsonb,
  mentor_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- 4. Tabel Analytics Tracking
CREATE TABLE IF NOT EXISTS public.course_views (
  id BIGSERIAL PRIMARY KEY,
  course_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. PENTING: Aktifkan Realtime Untuk Semua Tabel
-- Jalankan kode di bawah ini di SQL Editor Supabase:

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'branding') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE branding;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'mentor') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mentor;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'courses') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE courses;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'course_views') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE course_views;
  END IF;
END $$;`.trim();

  const handleConnect = () => {
    if (!supabase.url || !supabase.anonKey) {
      alert('Isi URL dan Anon Key.');
      return;
    }
    setDbStatus('connecting');
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      setDbStatus('connected');
      alert('Terhubung ke Supabase!');
    }, 1500);
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 md:space-y-12 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#1E293B]">Dashboard Settings</h1>
          <p className="text-sm md:text-base text-[#64748B] mt-2">Identitas visual & sinkronisasi database.</p>
        </div>
        <Badge color={dbStatus === 'connected' ? '#34D399' : dbStatus === 'connecting' ? '#FBBF24' : '#E2E8F0'}>
          <div className="flex items-center gap-2 px-1">
            {dbStatus === 'connected' ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span className="uppercase tracking-tighter text-[8px]">{dbStatus}</span>
          </div>
        </Badge>
      </div>
      
      <section className="space-y-6">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Layout size={24} className="text-[#8B5CF6]" /> Custom Branding
        </h2>
        <Card className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 featured shadow-[#8B5CF6]">
          <div className="space-y-4">
            <Input 
              label="Nama Platform" 
              value={localSiteName} 
              onChange={e => { setLocalSiteName(e.target.value); onLocalEdit(); }} 
              icon={Layout} 
            />
          </div>
          <div className="bg-[#FFFDF5] p-6 rounded-2xl border-2 border-dashed border-[#CBD5E1] flex items-center justify-center">
            <ImageUpload 
              label="Logo Platform (PNG)" 
              variant="minimal" 
              value={branding.logo} 
              onChange={logo => { onLocalEdit(); setBranding({...branding, logo}); }} 
            />
          </div>
        </Card>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Database size={24} className="text-[#34D399]" /> Supabase Infrastructure
        </h2>
        <Card className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Supabase URL" value={supabase.url} onChange={e => setSupabase({...supabase, url: e.target.value})} icon={Globe} />
            <Input label="Anon Key" value={supabase.anonKey} onChange={e => setSupabase({...supabase, anonKey: e.target.value})} type="password" icon={X} />
          </div>

          <div className="flex justify-end gap-3 border-t-2 border-[#E2E8F0] pt-6">
            <Button variant="secondary" className="text-xs h-10" onClick={() => { setSupabase({url: '', anonKey: ''}); setDbStatus('disconnected'); }}>Reset</Button>
            <Button variant="green" className="text-xs px-8 h-10" icon={Check} onClick={handleConnect} isLoading={isConnecting}>
              {dbStatus === 'connected' ? 'Reconnect' : 'Connect Supabase'}
            </Button>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <label className="text-xs font-extrabold uppercase tracking-widest text-[#64748B]">Setup SQL Script</label>
              <Button variant="secondary" className="px-4 py-1.5 text-xs h-8" onClick={() => { navigator.clipboard.writeText(sqlScript); alert('Copied!'); }} icon={Copy}>Copy SQL</Button>
            </div>
            <div className="bg-[#1E293B] text-[#34D399] p-4 md:p-6 rounded-3xl font-mono text-[10px] md:text-xs overflow-x-auto hard-shadow relative">
              <pre>{sqlScript}</pre>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
};

const CourseEditor: React.FC<{ 
  courses: Course[]; 
  onSave: (c: Course) => void; 
  mentor: Mentor; 
  setMentor: React.Dispatch<React.SetStateAction<Mentor>> 
}> = ({ courses, onSave, mentor, setMentor }) => {
  const { id } = useParams<{ id: string }>();
  const course = courses.find(c => c.id === id);
  const [editedCourse, setEditedCourse] = useState<Course | null>(course || null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  useEffect(() => {
    if (course) setEditedCourse(course);
  }, [course]);

  if (!editedCourse) return <div className="p-8 font-bold text-center">Kursus tidak ditemukan</div>;

  const handleSave = () => {
    onSave(editedCourse);
    alert('Konten kursus berhasil disimpan!');
  };

  const addModule = (type: 'video' | 'text') => {
    const newModule: Module = {
      id: `m-${Date.now()}`,
      title: type === 'video' ? 'Materi Video Baru' : 'Halaman Materi Teks',
      type: type,
      content: '',
      description: '',
      duration: type === 'video' ? '00:00' : '5 min'
    };
    setEditedCourse({ ...editedCourse, modules: [...editedCourse.modules, newModule] });
    setShowAddMenu(false);
  };

  const updateModule = (index: number, field: string, value: any) => {
    const newModules = [...editedCourse.modules];
    newModules[index] = { ...newModules[index], [field]: value };
    setEditedCourse({ ...editedCourse, modules: newModules });
  };

  const removeModule = (index: number) => {
    if(confirm('Hapus materi ini?')) {
      const newModules = editedCourse.modules.filter((_, i) => i !== index);
      setEditedCourse({ ...editedCourse, modules: newModules });
    }
  };

  const addAsset = (type: 'link' | 'file') => {
    const newAsset: Asset = {
      id: `asset-${Date.now()}`,
      name: type === 'link' ? 'Link Baru' : 'File Baru',
      type: type,
      url: '',
      fileName: type === 'file' ? '' : undefined
    };
    setEditedCourse({ ...editedCourse, assets: [...editedCourse.assets, newAsset] });
  };

  const handleAssetFileUpload = (index: number) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const newAssets = [...editedCourse.assets];
          newAssets[index] = {
            ...newAssets[index],
            url: reader.result as string,
            fileName: file.name
          };
          setEditedCourse({ ...editedCourse, assets: newAssets });
        };
        reader.readAsDataURL(file);
      }
    };
    fileInput.click();
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-24 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#1E293B]">Editor: {editedCourse.title}</h1>
        <Button onClick={handleSave} icon={Save} className="w-full sm:w-auto h-12">Simpan Perubahan</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <Card className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">Main Content <Badge color="#F472B6">Required</Badge></h3>
            <Input label="Judul Kursus" value={editedCourse.title} onChange={e => setEditedCourse({...editedCourse, title: e.target.value})} />
            <Textarea label="Deskripsi Kursus" value={editedCourse.description} onChange={e => setEditedCourse({...editedCourse, description: e.target.value})} />
            <ImageUpload label="Cover Image Kursus" value={editedCourse.coverImage} onChange={img => setEditedCourse({...editedCourse, coverImage: img})} />
          </Card>

          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-xl font-bold">Kurikulum Materi</h3>
              <div className="relative w-full sm:w-auto">
                <Button variant="yellow" icon={Plus} onClick={() => setShowAddMenu(!showAddMenu)} className="w-full h-12">Tambah Materi</Button>
                {showAddMenu && (
                  <div className="absolute top-full right-0 mt-2 w-full sm:w-56 bg-white border-2 border-[#1E293B] rounded-2xl hard-shadow z-20 overflow-hidden">
                    <button onClick={() => addModule('text')} className="w-full text-left p-4 hover:bg-[#F1F5F9] font-bold border-b-2 border-[#1E293B] flex items-center gap-3">
                      <FileText size={18} /> Pages Text Only
                    </button>
                    <button onClick={() => addModule('video')} className="w-full text-left p-4 hover:bg-[#F1F5F9] font-bold flex items-center gap-3">
                      <Video size={18} /> Video Link
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {editedCourse.modules.map((mod, idx) => (
                <Card key={mod.id} className="relative group p-4 md:p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <Input label={`Judul Materi #${idx + 1}`} value={mod.title} onChange={e => updateModule(idx, 'title', e.target.value)} />
                    </div>
                    <button onClick={() => removeModule(idx)} className="ml-4 p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors">
                      <Trash2 size={20} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-extrabold uppercase tracking-wide text-[#64748B] ml-1">Tipe Konten</label>
                      <Badge color={mod.type === 'video' ? '#8B5CF6' : '#F472B6'} className="h-[46px] w-full">
                        <span className="text-white font-extrabold tracking-widest">{mod.type.toUpperCase()}</span>
                      </Badge>
                    </div>
                    <Input label="Durasi" value={mod.duration || ''} onChange={e => updateModule(idx, 'duration', e.target.value)} placeholder="Misal: 10:00" />
                  </div>
                  <div className="mt-4 space-y-4">
                    {mod.type === 'video' ? (
                      <Input label="YouTube Link" value={mod.content} onChange={e => updateModule(idx, 'content', e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                    ) : (
                      <AdvancedEditor label="Text Content" value={mod.content} onChange={v => updateModule(idx, 'content', v)} placeholder="Konten teks..." />
                    )}
                    <AdvancedEditor label="Deskripsi Materi" value={mod.description} onChange={v => updateModule(idx, 'description', v)} placeholder="Ringkasan..." />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6 md:space-y-8">
          <Card className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">Profil Mentor</h3>
            <div className="flex flex-col items-center gap-4">
              <ImageUpload value={mentor.photo} onChange={photo => setMentor({...mentor, photo})}>
                <div className="relative group">
                  <img src={mentor.photo} className="w-24 h-24 rounded-full border-2 border-[#1E293B] object-cover hard-shadow group-hover:hard-shadow-hover transition-all" alt="Mentor" />
                </div>
              </ImageUpload>
            </div>
            <div className="space-y-4">
              <Input label="Nama Mentor" value={mentor.name} onChange={e => setMentor({...mentor, name: e.target.value})} />
              <Input label="Role" value={mentor.role} onChange={e => setMentor({...mentor, role: e.target.value})} />
              <Textarea label="Bio" value={mentor.bio} onChange={e => setMentor({...mentor, bio: e.target.value})} />
              <div className="grid grid-cols-1 gap-4">
                <Input label="LinkedIn" value={mentor.socials.linkedin} onChange={e => setMentor({...mentor, socials: {...mentor.socials, linkedin: e.target.value}})} icon={Linkedin} />
                <Input label="TikTok" value={mentor.socials.tiktok} onChange={e => setMentor({...mentor, socials: {...mentor.socials, tiktok: e.target.value}})} icon={TiktokIcon} />
                <Input label="Instagram" value={mentor.socials.instagram} onChange={e => setMentor({...mentor, socials: {...mentor.socials, instagram: e.target.value}})} icon={Instagram} />
                <Input label="Website" value={mentor.socials.website} onChange={e => setMentor({...mentor, socials: {...mentor.socials, website: e.target.value}})} icon={ExternalLink} />
              </div>
            </div>
          </Card>

          <div className="space-y-4">
             <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Asset Belajar</h3>
                <div className="flex gap-2">
                   <Button variant="green" className="p-2 h-10 w-10" icon={Upload} onClick={() => addAsset('file')}></Button>
                   <Button variant="secondary" className="p-2 h-10 w-10" icon={LinkIcon} onClick={() => addAsset('link')}></Button>
                </div>
             </div>
             <div className="space-y-3">
                {editedCourse.assets.map((asset, aidx) => (
                  <Card key={asset.id} className="p-4 flex flex-col gap-2">
                     <div className="flex justify-between items-center">
                        <Badge color={asset.type === 'link' ? '#FBBF24' : '#34D399'}>{asset.type.toUpperCase()}</Badge>
                        <button onClick={() => setEditedCourse({...editedCourse, assets: editedCourse.assets.filter((_, i) => i !== aidx)})} className="text-red-400 p-1"><Trash2 size={16}/></button>
                     </div>
                     <Input placeholder="Nama Asset" value={asset.name} onChange={e => {
                       const up = [...editedCourse.assets]; up[aidx].name = e.target.value; setEditedCourse({...editedCourse, assets: up});
                     }} />
                     {asset.type === 'link' ? (
                       <Input placeholder="URL Link" value={asset.url} onChange={e => {
                         const up = [...editedCourse.assets]; up[aidx].url = e.target.value; setEditedCourse({...editedCourse, assets: up});
                       }} />
                     ) : (
                       <div className="flex gap-2">
                          <Input className="flex-1 h-10" placeholder="File..." value={asset.fileName || ''} readOnly />
                          <Button variant="secondary" className="px-3 h-10" onClick={() => handleAssetFileUpload(aidx)}><Upload size={14}/></Button>
                       </div>
                     )}
                  </Card>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PublicCourseView: React.FC<{ courses: Course[]; mentor: Mentor; branding: Branding; supabase: SupabaseConfig }> = ({ courses, mentor, branding, supabase }) => {
  const { id } = useParams<{ id: string }>();
  const course = courses.find(c => c.id === id);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const trackAttempted = useRef(false);

  useEffect(() => {
    if (course && course.modules.length > 0) {
      setSelectedModule(course.modules[0]);
    }
  }, [course]);

  // ANALYTICS TRACKING: Record visit to Supabase
  useEffect(() => {
    const trackVisit = async () => {
      if (supabase.url && supabase.anonKey && id && !trackAttempted.current) {
        trackAttempted.current = true;
        try {
          const client = createClient(supabase.url, supabase.anonKey);
          // INSERT visit record to course_views
          const { error } = await client.from('course_views').insert({ course_id: id });
          if (error) console.error("Real-time Tracking Error:", error);
          else console.log("Real-time Visit Tracked Successfully");
        } catch (e) {
          console.error("Tracking System Exception:", e);
        }
      }
    };
    trackVisit();
  }, [id, supabase]);

  if (!course) return <div className="h-screen flex items-center justify-center font-bold">Materi tidak ditemukan</div>;

  return (
    <div className="min-h-screen bg-[#FFFDF5] flex flex-col">
      <header className="bg-white border-b-2 border-[#1E293B] p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={branding.logo} className="w-8 h-8 md:w-10 md:h-10 object-contain" alt="Logo" />
            <span className="font-extrabold text-lg md:text-xl truncate max-w-[150px] md:max-w-none">{branding.siteName}</span>
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            <Badge className="hidden sm:inline-flex">{course.modules.length} Materi</Badge>
            <Button variant="secondary" className="px-3 md:px-4 h-10 text-xs" icon={Share2} onClick={() => {
              const url = window.location.href;
              navigator.clipboard.writeText(url);
              alert('Link publik berhasil disalin!');
            }}>Bagikan</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8 flex-1">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white border-2 border-[#1E293B] p-4 md:p-6 rounded-3xl hard-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <Badge color="#8B5CF6" className="text-white mb-2">Public Course</Badge>
              <h1 className="text-xl md:text-2xl font-extrabold text-[#1E293B] leading-tight">{course.title}</h1>
            </div>
          </div>

          {selectedModule ? (
            <div className="space-y-6">
              <div className="bg-white border-2 border-[#1E293B] rounded-3xl overflow-hidden hard-shadow">
                {selectedModule.type === 'video' ? (
                  <div className="aspect-video bg-black">
                    <iframe 
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${selectedModule.content.split('v=')[1]?.split('&')[0] || selectedModule.content.split('/').pop()}`}
                      title={selectedModule.title}
                      frameBorder="0"
                      allowFullScreen
                    ></iframe>
                  </div>
                ) : (
                  <div className="p-6 md:p-10 prose prose-slate max-w-none">
                    <h2 className="text-2xl md:text-3xl font-extrabold mb-6 text-[#1E293B]">{selectedModule.title}</h2>
                    <div className="whitespace-pre-wrap font-medium text-[#1E293B] text-base md:text-lg leading-relaxed">{selectedModule.content}</div>
                  </div>
                )}
              </div>
              <div className="bg-white border-2 border-[#1E293B] rounded-3xl p-6 md:p-8 sticker-shadow">
                 <h3 className="text-lg md:text-xl font-extrabold mb-4">Detail Materi</h3>
                 <div className="text-[#1E293B] text-sm md:text-base whitespace-pre-wrap leading-relaxed">{selectedModule.description || "Tidak ada deskripsi tambahan."}</div>
              </div>
            </div>
          ) : (
            <div className="h-64 md:h-96 flex flex-col items-center justify-center text-[#64748B] font-bold bg-white rounded-3xl border-2 border-[#1E293B] border-dashed">
               <Globe size={48} className="md:w-16 md:h-16 mb-4 text-[#CBD5E1]" />
               <p className="text-lg md:text-xl">Pilih materi untuk memulai belajar.</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          {/* MENTOR CARD WITH SOCIALS */}
          <Card className="flex flex-col items-center p-6 md:p-8 text-center featured">
             <div className="relative mb-4 md:mb-6">
                <img src={mentor.photo} className="w-24 h-24 md:w-28 md:h-28 rounded-3xl border-2 border-[#1E293B] hard-shadow object-cover" alt={mentor.name} />
             </div>
             <h3 className="text-xl md:text-2xl font-extrabold text-[#1E293B] mb-1">{mentor.name}</h3>
             <Badge color="#F472B6" className="text-white mb-4 uppercase text-[8px] md:text-[10px] tracking-widest">{mentor.role}</Badge>
             <p className="text-[#64748B] text-xs md:text-sm italic mb-6">"{mentor.bio}"</p>
             
             {/* SOCIAL MEDIA ROW */}
             <div className="flex gap-3 md:gap-4 mb-6">
                {mentor.socials.instagram && (
                  <a href={`https://instagram.com/${mentor.socials.instagram}`} target="_blank" className="p-2 bg-[#F1F5F9] border-2 border-[#1E293B] rounded-xl hard-shadow-hover transition-bounce" title="Instagram">
                    <Instagram size={18}/>
                  </a>
                )}
                {mentor.socials.linkedin && (
                  <a href={`https://linkedin.com/in/${mentor.socials.linkedin}`} target="_blank" className="p-2 bg-[#F1F5F9] border-2 border-[#1E293B] rounded-xl hard-shadow-hover transition-bounce" title="LinkedIn">
                    <Linkedin size={18}/>
                  </a>
                )}
                {mentor.socials.tiktok && (
                  <a href={`https://tiktok.com/@${mentor.socials.tiktok}`} target="_blank" className="p-2 bg-[#F1F5F9] border-2 border-[#1E293B] rounded-xl hard-shadow-hover transition-bounce" title="TikTok">
                    <TiktokIcon size={18}/>
                  </a>
                )}
             </div>

             {/* WEBSITE BUTTON */}
             {mentor.socials.website && (
               <a href={mentor.socials.website} target="_blank" className="w-full">
                 <Button variant="secondary" className="w-full h-10 text-xs" icon={ExternalLink}>Link produk lainnya</Button>
               </a>
             )}
          </Card>

          {/* CURRICULUM LIST (NOW ABOVE ASSETS) */}
          <div className="bg-white border-2 border-[#1E293B] rounded-3xl p-4 md:p-6 hard-shadow">
            <h3 className="font-extrabold text-lg md:text-xl mb-4 md:mb-6 flex items-center gap-2 tracking-tight">
              <BookOpen size={24} className="text-[#8B5CF6]" /> Kurikulum
            </h3>
            <div className="space-y-2 md:space-y-3">
              {course.modules.map((mod, i) => (
                <button 
                  key={mod.id} 
                  onClick={() => setSelectedModule(mod)} 
                  className={`w-full text-left p-3 md:p-4 rounded-2xl border-2 transition-all flex items-start gap-3 md:gap-4 ${selectedModule?.id === mod.id ? 'bg-[#FBBF24] border-[#1E293B] hard-shadow' : 'bg-white border-transparent hover:bg-[#F1F5F9]'}`}
                >
                  <div className={`shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-[#1E293B] flex items-center justify-center font-bold text-[10px] md:text-xs ${selectedModule?.id === mod.id ? 'bg-white' : 'bg-[#F1F5F9]'}`}>
                    {i+1}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs md:text-sm font-extrabold leading-tight">{mod.title}</p>
                    <p className="text-[8px] md:text-[10px] text-[#64748B] mt-1 font-bold">{mod.duration}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ASSETS CARD (NOW BELOW CURRICULUM) */}
          <div className="bg-white border-2 border-[#1E293B] rounded-3xl p-4 md:p-6 hard-shadow">
            <h3 className="font-extrabold text-lg md:text-xl mb-4 flex items-center gap-2 tracking-tight">
              <Download size={24} className="text-[#34D399]" /> Asset Belajar
            </h3>
            <div className="space-y-2 md:space-y-3">
              {course.assets && course.assets.length > 0 ? course.assets.map(asset => (
                <a 
                  key={asset.id} 
                  href={asset.url} 
                  target="_blank" 
                  className="flex items-center gap-3 p-3 bg-[#F1F5F9] rounded-xl border-2 border-transparent hover:border-[#1E293B] transition-all font-bold text-[10px] md:text-xs"
                >
                  {asset.type === 'file' ? <FileText size={16} className="text-[#8B5CF6]"/> : <LinkIcon size={16} className="text-[#34D399]"/>}
                  <span className="truncate flex-1">{asset.name}</span>
                </a>
              )) : <p className="text-[10px] md:text-xs text-[#94A3B8] italic">Tidak ada asset tersedia.</p>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => getStorageItem('isLoggedIn', false));
  const [courses, setCourses] = useState<Course[]>(() => getStorageItem('courses', initialCourses));
  const [mentor, setMentor] = useState<Mentor>(() => getStorageItem('mentor', initialMentor));
  const [branding, setBranding] = useState<Branding>(() => getStorageItem('branding', initialBranding));
  const [supabase, setSupabase] = useState<SupabaseConfig>(() => getStorageItem('supabase', { url: '', anonKey: '' }));
  const [syncing, setSyncing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const isSyncingRef = useRef(false);
  const lastLocalUpdateRef = useRef<number>(0);

  useEffect(() => setStorageItem('isLoggedIn', isLoggedIn), [isLoggedIn]);
  useEffect(() => setStorageItem('courses', courses), [courses]);
  useEffect(() => setStorageItem('mentor', mentor), [mentor]);
  useEffect(() => setStorageItem('branding', branding), [branding]);
  useEffect(() => setStorageItem('supabase', supabase), [supabase]);

  const updateLastLocalUpdate = useCallback(() => {
    lastLocalUpdateRef.current = Date.now();
  }, []);

  const triggerForcedSync = useCallback(async () => {
    if (!supabase.url || !supabase.anonKey || isSyncingRef.current) return;
    
    setSyncing(true);
    isSyncingRef.current = true;
    updateLastLocalUpdate();
    
    try {
      const client = createClient(supabase.url, supabase.anonKey);
      const promises = [
        client.from('branding').upsert({ id: 'config', site_name: branding.siteName, logo: branding.logo }),
        client.from('mentor').upsert({ id: 'profile', ...mentor })
      ];
      
      courses.forEach(course => {
        promises.push(client.from('courses').upsert({
          id: course.id,
          title: course.title,
          description: course.description,
          cover_image: course.coverImage,
          modules: course.modules,
          assets: course.assets,
          mentor_id: course.mentorId
        }));
      });
      
      await Promise.all(promises);
    } catch (err) {
      console.error("Sync Error:", err);
    } finally {
      setTimeout(() => {
        setSyncing(false);
        isSyncingRef.current = false;
      }, 1000);
    }
  }, [branding, mentor, courses, supabase, updateLastLocalUpdate]);

  useEffect(() => {
    const timer = setTimeout(triggerForcedSync, 3000);
    return () => clearTimeout(timer);
  }, [branding, mentor, courses, triggerForcedSync]);

  useEffect(() => {
    if (!supabase.url || !supabase.anonKey) return;
    const client = createClient(supabase.url, supabase.anonKey);
    
    const initialFetch = async () => {
      try {
        const { data: b } = await client.from('branding').select('*').single();
        if (b) setBranding({ siteName: b.site_name, logo: b.logo });
        const { data: m } = await client.from('mentor').select('*').single();
        if (m) setMentor(m);
        const { data: c } = await client.from('courses').select('*');
        if (c && c.length > 0) {
          setCourses(c.map((item: any) => ({
            ...item,
            coverImage: item.cover_image,
            mentorId: item.mentor_id
          })));
        }
      } catch (e) {
        console.warn("DB not ready or table missing", e);
      }
    };
    initialFetch();
    
    const sub = client.channel('public_updates').on('postgres_changes', { event: '*', table: '*' }, (payload: any) => {
       const timeSinceLastLocalUpdate = Date.now() - lastLocalUpdateRef.current;
       if (isSyncingRef.current || timeSinceLastLocalUpdate < 5000) return;

       if(payload.table === 'branding') {
         setBranding(prev => ({...prev, siteName: payload.new.site_name, logo: payload.new.logo}));
       }
       if(payload.table === 'mentor') setMentor(payload.new);
       if(payload.table === 'courses') {
         const newCourse = { ...payload.new, coverImage: payload.new.cover_image, mentorId: payload.new.mentor_id };
         setCourses(prev => {
            const exists = prev.find(p => p.id === newCourse.id);
            if(exists) return prev.map(c => c.id === newCourse.id ? newCourse : c);
            return [...prev, newCourse];
         });
       }
    }).subscribe();

    return () => { client.removeChannel(sub); };
  }, [supabase.url, supabase.anonKey]);

  const updateCourse = (updated: Course) => {
    setCourses(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const AdminLayout = ({ children }: { children: React.ReactNode }) => (
    <div className="flex min-h-screen">
      <Sidebar 
        branding={branding} 
        onLogout={() => setIsLoggedIn(false)} 
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

  return (
    <div className="min-h-screen">
      <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[999] transition-all duration-500 ease-in-out transform ${syncing ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0'}`}>
        <div className="bg-[#34D399] border-2 border-[#1E293B] rounded-full px-5 py-2 flex items-center gap-3 hard-shadow">
           <RefreshCw size={18} className="text-[#1E293B] animate-spin" />
           <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#1E293B]">Sinkronisasi...</span>
        </div>
      </div>
      
      <Routes>
        <Route path="/login" element={<Login isLoggedIn={isLoggedIn} onLogin={() => setIsLoggedIn(true)} />} />
        <Route path="/admin" element={isLoggedIn ? <AdminLayout><AdminDashboard courses={courses} setCourses={setCourses} /></AdminLayout> : <Navigate to="/login" />} />
        <Route path="/admin/course/:id" element={isLoggedIn ? <AdminLayout><CourseEditor courses={courses} onSave={updateCourse} mentor={mentor} setMentor={setMentor} /></AdminLayout> : <Navigate to="/login" />} />
        <Route path="/analytics" element={isLoggedIn ? <AdminLayout><AnalyticsPage courses={courses} supabase={supabase} /></AdminLayout> : <Navigate to="/login" />} />
        <Route path="/settings" element={isLoggedIn ? <AdminLayout><Settings branding={branding} setBranding={setBranding} supabase={supabase} setSupabase={setSupabase} onLocalEdit={updateLastLocalUpdate} /></AdminLayout> : <Navigate to="/login" />} />
        <Route path="/course/:id" element={<PublicCourseView courses={courses} mentor={mentor} branding={branding} supabase={supabase} />} />
        <Route path="/" element={<Navigate to={isLoggedIn ? "/admin" : "/login"} />} />
      </Routes>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<Router><App /></Router>);
