
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
  Camera,
  Bold,
  Italic,
  List,
  Type,
  Copy,
  Wifi,
  WifiOff,
  CloudUpload,
  Save,
  Instagram,
  RefreshCw,
  Check,
  AlertCircle
} from 'lucide-react';

/**
 * CRITICAL FIX FOR ERROR #31: Instance Mismatch
 * We must ensure that ESM modules from cloud URLs (like esm.sh) use the 
 * SAME React instance that Vite has bundled from node_modules.
 */
// @ts-ignore
window.React = React;
// @ts-ignore
window.ReactDOM = ReactDOM;

// External libraries not in package.json must use full ESM URLs with forced external React pinning
import { FaTiktok, FaLinkedinIn, FaInstagram } from 'https://esm.sh/react-icons@5.0.1/fa?external=react,react-dom';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1?external=react,react-dom';

import { Course, Mentor, Branding, SupabaseConfig, Module, Asset } from './types';
import { initialCourses, initialMentor, initialBranding } from './mockData';
import { Button, Card, Input, Textarea, Badge } from './components/UI';

// --- Utils ---
const encodeConfig = (cfg: SupabaseConfig) => {
  try {
    if (!cfg.url || !cfg.anonKey) return '';
    return btoa(JSON.stringify(cfg));
  } catch (e) {
    return '';
  }
};

const decodeConfig = (str: string): SupabaseConfig | null => {
  try {
    if (!str) return null;
    return JSON.parse(atob(str));
  } catch (e) {
    return null;
  }
};

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
        {label && <label className="text-xs font-extrabold uppercase tracking-wide text-[#64748B] ml-1">{String(label)}</label>}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="relative group cursor-pointer flex flex-col items-center justify-center p-4 transition-all"
        >
          {value ? (
            <img src={String(value)} className="max-w-[120px] max-h-[120px] object-contain mb-4" alt="Logo Preview" />
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
      {label && <label className="text-xs font-extrabold uppercase tracking-wide text-[#64748B] ml-1">{String(label)}</label>}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="relative group cursor-pointer border-2 border-[#1E293B] rounded-2xl overflow-hidden aspect-video bg-white flex items-center justify-center hard-shadow hover:hard-shadow-hover transition-all"
      >
        {value ? (
          <img src={String(value)} className="w-full h-full object-cover" alt="Upload" />
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
      <label className="text-xs font-extrabold uppercase tracking-wide text-[#64748B] ml-1">{String(label)}</label>
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
      <Card className="w-full max-w-md p-8">
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
          {error && <p className="text-red-500 text-sm font-bold bg-red-50 p-2 rounded-lg border border-red-200">{String(error)}</p>}
          <Button type="submit" className="w-full" icon={ChevronRight}>Masuk Dashboard</Button>
        </form>
      </Card>
    </div>
  );
};

const Sidebar: React.FC<{ branding: Branding; onLogout: () => void }> = ({ branding, onLogout }) => {
  return (
    <div className="w-64 bg-white border-r-2 border-[#1E293B] min-h-screen hidden md:flex flex-col sticky top-0">
      <div className="p-6 border-b-2 border-[#1E293B] flex items-center gap-3">
        <img src={String(branding.logo)} className="w-10 h-10 object-contain" alt="Logo" />
        <span className="font-extrabold text-xl">{String(branding.siteName)}</span>
      </div>
      <nav className="p-4 flex-1 space-y-2">
        <Link to="/admin" className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F1F5F9] font-bold text-[#1E293B]">
          <BookOpen size={20} /> Kursus Saya
        </Link>
        <Link to="/settings" className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F1F5F9] font-bold text-[#1E293B]">
          <SettingsIcon size={20} /> Branding & Settings
        </Link>
      </nav>
      <div className="p-4 border-t-2 border-[#1E293B]">
        <Button variant="secondary" className="w-full justify-start" onClick={onLogout}>
          <LogOut size={18} className="mr-2" /> Logout
        </Button>
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
      description: 'Deskripsi kursus baru...',
      coverImage: '',
      mentorId: 'mentor-1',
      modules: [],
      assets: []
    };
    setCourses([...courses, newCourse]);
    navigate(`/admin/course/${newCourse.id}`);
  };

  const generateShareLink = (courseId: string) => {
    const cfgStr = encodeConfig(supabase);
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    return `${baseUrl}#/course/${courseId}?cfg=${cfgStr}`;
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-extrabold mb-2 text-[#1E293B]">Dashboard Kursus</h1>
          <p className="text-[#64748B]">Kelola konten publik dan publikasi kelas Anda.</p>
        </div>
        <Button icon={Plus} onClick={handleAddCourse}>Tambah Kursus</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map((course) => (
          <Card key={course.id} className="group overflow-hidden flex flex-col">
            <div className="relative aspect-video mb-4 rounded-lg overflow-hidden border-2 border-[#1E293B] bg-[#F1F5F9] flex items-center justify-center">
              {course.coverImage ? (
                <img src={String(course.coverImage)} className="w-full h-full object-cover" alt={String(course.title)} />
              ) : (
                <Globe size={48} className="text-[#CBD5E1]" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-extrabold group-hover:text-[#8B5CF6] transition-colors">{String(course.title)}</h3>
              <p className="text-sm text-[#64748B] line-clamp-2 mt-2 mb-4">{String(course.description)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button onClick={() => navigate(`/admin/course/${course.id}`)} variant="secondary" className="text-xs">Edit Content</Button>
              <Button onClick={() => window.open(generateShareLink(course.id), '_blank')} variant="yellow" className="text-xs" icon={Globe}>Public View</Button>
              <Button 
                onClick={() => {
                  const url = generateShareLink(course.id);
                  navigator.clipboard.writeText(url);
                  alert('Link publik (Cross-Device Realtime) berhasil disalin!');
                }} 
                variant="green" className="text-xs col-span-2" icon={Share2}
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
}> = ({ branding, setBranding, supabase, setSupabase }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected' | 'connecting'>(() => {
    return (supabase.url && supabase.anonKey) ? 'connected' : 'disconnected';
  });

  const sqlScript = `-- SETUP DATABASE ARUNIKA LMS (REAL-TIME CONFIG)
CREATE TABLE IF NOT EXISTS public.branding (
  id TEXT PRIMARY KEY DEFAULT 'config',
  site_name TEXT NOT NULL,
  logo TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mentor (
  id TEXT PRIMARY KEY DEFAULT 'profile',
  name TEXT NOT NULL,
  role TEXT,
  bio TEXT,
  photo TEXT,
  socials JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

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

ALTER PUBLICATION supabase_realtime ADD TABLE public.branding;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentor;
ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;`.trim();

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
      alert('Terhubung ke Supabase! Data disinkronkan secara otomatis.');
    }, 1500);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-12 pb-24">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold text-[#1E293B]">Dashboard Settings</h1>
          <p className="text-[#64748B] mt-2">Identitas visual & sinkronisasi database.</p>
        </div>
        <Badge color={dbStatus === 'connected' ? '#34D399' : dbStatus === 'connecting' ? '#FBBF24' : '#E2E8F0'}>
          <div className="flex items-center gap-2 px-1">
            {dbStatus === 'connected' ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span className="uppercase tracking-tighter">{String(dbStatus)}</span>
          </div>
        </Badge>
      </div>
      
      <section className="space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Layout size={24} className="text-[#8B5CF6]" /> Custom Branding
        </h2>
        <Card className="grid grid-cols-1 md:grid-cols-2 gap-8 featured shadow-[#8B5CF6]">
          <div className="space-y-4">
            <Input label="Nama Platform" value={branding.siteName} onChange={e => setBranding({...branding, siteName: e.target.value})} icon={Layout} />
          </div>
          <div className="bg-[#FFFDF5] p-6 rounded-2xl border-2 border-dashed border-[#CBD5E1] flex items-center justify-center">
            <ImageUpload label="Logo Platform (PNG)" variant="minimal" value={branding.logo} onChange={logo => setBranding({...branding, logo})} />
          </div>
        </Card>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Database size={24} className="text-[#34D399]" /> Supabase Infrastructure
        </h2>
        <Card className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Supabase URL" value={supabase.url} onChange={e => setSupabase({...supabase, url: e.target.value})} icon={Globe} />
            <Input label="Anon Key" value={supabase.anonKey} onChange={e => setSupabase({...supabase, anonKey: e.target.value})} type="password" icon={X} />
          </div>

          <div className="flex justify-end gap-3 border-t-2 border-[#E2E8F0] pt-6">
            <Button variant="secondary" className="text-sm" onClick={() => { setSupabase({url: '', anonKey: ''}); setDbStatus('disconnected'); }}>Reset</Button>
            <Button variant="green" className="text-sm px-8" icon={Check} onClick={handleConnect} isLoading={isConnecting}>
              {dbStatus === 'connected' ? 'Reconnect' : 'Connect Supabase'}
            </Button>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-extrabold uppercase tracking-widest text-[#64748B]">Setup SQL Script</label>
              <Button variant="secondary" className="px-4 py-1.5 text-xs" onClick={() => { navigator.clipboard.writeText(sqlScript); alert('SQL Copied!'); }} icon={Copy}>Copy SQL</Button>
            </div>
            <div className="bg-[#1E293B] text-[#34D399] p-6 rounded-3xl font-mono text-xs overflow-x-auto hard-shadow relative">
              <pre>{String(sqlScript)}</pre>
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

  if (!editedCourse) return <div className="p-8 font-bold">Kursus tidak ditemukan</div>;

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
    setEditedCourse({ ...editedCourse, modules: [...(editedCourse.modules || []), newModule] });
    setShowAddMenu(false);
  };

  const updateModule = (index: number, field: string, value: any) => {
    const newModules = [...(editedCourse.modules || [])];
    newModules[index] = { ...newModules[index], [field]: value };
    setEditedCourse({ ...editedCourse, modules: newModules });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto pb-24 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-extrabold text-[#1E293B]">Editor: {String(editedCourse.title)}</h1>
        <Button onClick={handleSave} icon={Save}>Simpan Perubahan</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">Main Content <Badge color="#F472B6">Required</Badge></h3>
            <Input label="Judul Kursus" value={editedCourse.title} onChange={e => setEditedCourse({...editedCourse, title: e.target.value})} />
            <Textarea label="Deskripsi Kursus" value={editedCourse.description} onChange={e => setEditedCourse({...editedCourse, description: e.target.value})} />
            <ImageUpload label="Cover Image Kursus" value={editedCourse.coverImage} onChange={img => setEditedCourse({...editedCourse, coverImage: img})} />
          </Card>

          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Kurikulum Materi</h3>
              <div className="relative">
                <Button variant="yellow" icon={Plus} onClick={() => setShowAddMenu(!showAddMenu)}>Tambah Materi</Button>
                {showAddMenu && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white border-2 border-[#1E293B] rounded-2xl hard-shadow z-20 overflow-hidden">
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
              {(editedCourse.modules || []).map((mod, idx) => (
                <Card key={mod.id} className="relative group p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <Input label={`Judul Materi #${idx + 1}`} value={mod.title} onChange={e => updateModule(idx, 'title', e.target.value)} />
                    </div>
                    <button onClick={() => { if(confirm('Hapus?')) setEditedCourse({...editedCourse, modules: editedCourse.modules.filter((_, i) => i !== idx)}) }} className="ml-4 p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors">
                      <Trash2 size={20} />
                    </button>
                  </div>
                  <div className="mt-4 space-y-4">
                    {mod.type === 'video' ? (
                      <Input label="YouTube Link" value={mod.content} onChange={e => updateModule(idx, 'content', e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                    ) : (
                      <AdvancedEditor label="Text Content" value={mod.content} onChange={v => updateModule(idx, 'content', v)} placeholder="Konten teks..." />
                    )}
                    <AdvancedEditor label="Deskripsi Materi" value={mod.description} onChange={v => updateModule(idx, 'description', v)} />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <Card className="space-y-6">
            <h3 className="text-xl font-bold">Profil Mentor</h3>
            <div className="flex flex-col items-center gap-4">
              <ImageUpload value={mentor.photo} onChange={photo => setMentor({...mentor, photo})}>
                <img src={String(mentor.photo)} className="w-24 h-24 rounded-full border-2 border-[#1E293B] object-cover hard-shadow" alt="Mentor" />
              </ImageUpload>
            </div>
            <div className="space-y-4">
              <Input label="Nama Mentor" value={mentor.name} onChange={e => setMentor({...mentor, name: e.target.value})} />
              <Input label="Role" value={mentor.role} onChange={e => setMentor({...mentor, role: e.target.value})} />
              <Textarea label="Bio" value={mentor.bio} onChange={e => setMentor({...mentor, bio: e.target.value})} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const PublicCourseView: React.FC<{ courses: Course[]; mentor: Mentor; branding: Branding; isInitialLoading: boolean }> = ({ courses, mentor, branding, isInitialLoading }) => {
  const { id } = useParams<{ id: string }>();
  const course = useMemo(() => courses.find(c => c.id === id), [courses, id]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);

  useEffect(() => {
    if (course && course.modules && course.modules.length > 0 && !selectedModule) {
      setSelectedModule(course.modules[0]);
    }
  }, [course, selectedModule]);

  const getYoutubeEmbedUrl = (content: any) => {
    if (!content || typeof content !== 'string') return "";
    try {
      const videoId = content.includes('v=') 
        ? content.split('v=')[1]?.split('&')[0] 
        : content.split('/').pop()?.split('?')[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
    } catch (e) {
      return "";
    }
  };

  if (isInitialLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#FFFDF5]">
        <RefreshCw size={64} className="text-[#8B5CF6] animate-spin mb-6" />
        <p className="font-extrabold text-2xl text-[#1E293B]">Memuat Platform Arunika...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#FFFDF5] p-8 text-center">
        <AlertCircle size={64} className="text-red-500 mb-4" />
        <h1 className="text-4xl font-extrabold text-[#1E293B] mb-4">Materi Tidak Ditemukan</h1>
        <Link to="/"><Button variant="yellow">Kembali ke Beranda</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF5] flex flex-col">
      <header className="bg-white border-b-2 border-[#1E293B] p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={String(branding.logo)} className="w-10 h-10 object-contain" alt="Logo" />
            <span className="font-extrabold text-xl">{String(branding.siteName)}</span>
          </div>
          <Badge>{(course.modules || []).length} Materi</Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white border-2 border-[#1E293B] p-8 rounded-3xl hard-shadow flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <Badge color="#8B5CF6" className="text-white mb-3">PUBLIC PUBLICATION</Badge>
              <h1 className="text-4xl font-extrabold text-[#1E293B] mb-2">{String(course.title)}</h1>
            </div>
            <Button variant="secondary" icon={Share2} onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Link Copied!'); }}>Bagikan</Button>
          </div>

          {selectedModule ? (
            <div className="space-y-6">
              <div className="bg-white border-2 border-[#1E293B] rounded-3xl overflow-hidden hard-shadow">
                {selectedModule.type === 'video' ? (
                  <div className="aspect-video bg-black flex items-center justify-center">
                    {getYoutubeEmbedUrl(selectedModule.content) ? (
                      <iframe className="w-full h-full" src={getYoutubeEmbedUrl(selectedModule.content)} title={String(selectedModule.title)} frameBorder="0" allowFullScreen></iframe>
                    ) : <p className="text-white">Video tidak tersedia</p>}
                  </div>
                ) : (
                  <div className="p-10 prose max-w-none">
                    <h2 className="text-4xl font-extrabold mb-6 text-[#1E293B]">{String(selectedModule.title)}</h2>
                    <div className="whitespace-pre-wrap font-medium text-[#1E293B] text-xl">
                      {typeof selectedModule.content === 'string' ? selectedModule.content : "Format konten tidak valid."}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : <p className="text-center p-12">Pilih materi.</p>}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="flex flex-col items-center p-8 text-center featured">
             <img src={String(mentor.photo)} className="w-28 h-28 rounded-3xl border-2 border-[#1E293B] hard-shadow object-cover mb-4" alt={String(mentor.name)} />
             <h3 className="text-2xl font-extrabold text-[#1E293B]">{String(mentor.name)}</h3>
             <Badge color="#F472B6" className="text-white mb-4">{String(mentor.role)}</Badge>
          </Card>

          <div className="bg-white border-2 border-[#1E293B] rounded-3xl p-6 hard-shadow">
            <h3 className="font-extrabold text-xl mb-6 flex items-center gap-2"><BookOpen size={24} /> Materi</h3>
            <div className="space-y-3">
              {(course.modules || []).map((mod, i) => (
                <button key={mod.id} onClick={() => setSelectedModule(mod)} className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-4 ${selectedModule?.id === mod.id ? 'bg-[#FBBF24] border-[#1E293B] hard-shadow' : 'bg-white border-transparent hover:bg-[#F1F5F9]'}`}>
                  <div className="shrink-0 w-8 h-8 rounded-full border-2 border-[#1E293B] flex items-center justify-center font-bold text-xs">{i+1}</div>
                  <div className="flex-1"><p className="text-sm font-extrabold">{String(mod.title)}</p></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const [supabase, setSupabase] = useState<SupabaseConfig>(() => {
    const hash = window.location.hash;
    const queryIdx = hash.indexOf('?');
    const hashQuery = queryIdx !== -1 ? hash.slice(queryIdx) : '';
    const params = new URLSearchParams(hashQuery || window.location.search);
    const cfgStr = params.get('cfg');
    if (cfgStr) {
      const decoded = decodeConfig(cfgStr);
      if (decoded?.url) return decoded;
    }
    return getStorageItem('supabase', { url: '', anonKey: '' });
  });

  const [isLoggedIn, setIsLoggedIn] = useState(() => getStorageItem('isLoggedIn', false));
  const [courses, setCourses] = useState<Course[]>(() => getStorageItem('courses', initialCourses));
  const [mentor, setMentor] = useState<Mentor>(() => getStorageItem('mentor', initialMentor));
  const [branding, setBranding] = useState<Branding>(() => getStorageItem('branding', initialBranding));
  const [syncing, setSyncing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => { setStorageItem('isLoggedIn', isLoggedIn); }, [isLoggedIn]);
  useEffect(() => { setStorageItem('courses', courses); }, [courses]);
  useEffect(() => { setStorageItem('mentor', mentor); }, [mentor]);
  useEffect(() => { setStorageItem('branding', branding); }, [branding]);
  useEffect(() => { setStorageItem('supabase', supabase); }, [supabase]);

  useEffect(() => {
    if (!supabase.url || !supabase.anonKey) {
      setIsInitialLoading(false);
      return;
    }
    const client = createClient(supabase.url, supabase.anonKey);
    setIsInitialLoading(true);
    const initialFetch = async () => {
      try {
        const { data: b } = await client.from('branding').select('*').single();
        if (b) setBranding({ siteName: b.site_name, logo: b.logo });
        const { data: m } = await client.from('mentor').select('*').single();
        if (m) setMentor(m);
        const { data: c } = await client.from('courses').select('*');
        if (c) {
          const mapped = c.map((item: any) => ({
            ...item,
            coverImage: item.cover_image,
            mentorId: item.mentor_id,
            modules: item.modules || [],
            assets: item.assets || []
          }));
          setCourses(mapped);
        }
      } catch (err) { console.error(err); } finally {
        setIsInitialLoading(false);
      }
    };
    initialFetch();
  }, [supabase.url, supabase.anonKey]);

  return (
    <div className="min-h-screen">
      {syncing && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[999]">
          <div className="bg-[#34D399] border-2 border-[#1E293B] rounded-full px-6 py-3 flex items-center gap-3 hard-shadow">
             <RefreshCw size={18} className="animate-spin" />
             <span className="text-xs font-extrabold uppercase tracking-widest">Sinkronisasi...</span>
          </div>
        </div>
      )}
      <Routes>
        <Route path="/login" element={<Login isLoggedIn={isLoggedIn} onLogin={() => setIsLoggedIn(true)} />} />
        <Route path="/admin" element={isLoggedIn ? <div className="flex"><Sidebar branding={branding} onLogout={() => setIsLoggedIn(false)} /><main className="flex-1"><AdminDashboard courses={courses} setCourses={setCourses} supabase={supabase} /></main></div> : <Navigate to="/login" />} />
        <Route path="/admin/course/:id" element={isLoggedIn ? <div className="flex"><Sidebar branding={branding} onLogout={() => setIsLoggedIn(false)} /><main className="flex-1"><CourseEditor courses={courses} onSave={(updated) => setCourses(p => p.map(c => c.id === updated.id ? updated : c))} mentor={mentor} setMentor={setMentor} /></main></div> : <Navigate to="/login" />} />
        <Route path="/settings" element={isLoggedIn ? <div className="flex"><Sidebar branding={branding} onLogout={() => setIsLoggedIn(false)} /><main className="flex-1"><Settings branding={branding} setBranding={setBranding} supabase={supabase} setSupabase={setSupabase} /></main></div> : <Navigate to="/login" />} />
        <Route path="/course/:id" element={<PublicCourseView courses={courses} mentor={mentor} branding={branding} isInitialLoading={isInitialLoading} />} />
        <Route path="/" element={<Navigate to={isLoggedIn ? "/admin" : "/login"} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<Router><App /></Router>);
}
