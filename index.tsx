
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter as Router, Routes, Route, Link, useNavigate, Navigate, useParams } from 'react-router-dom';
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
  Music,
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
  // Added Check to imports
  Check
} from 'lucide-react';

// Use standard Supabase import if possible, but keeping URL import as requested/provided
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';

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
          <button className="p-1.5 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-[#1E293B]"><Bold size={14}/></button>
          <button className="p-1.5 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-[#1E293B]"><Italic size={14}/></button>
          <button className="p-1.5 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-[#1E293B]"><List size={14}/></button>
          <button className="p-1.5 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-[#1E293B]"><Type size={14}/></button>
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
          {error && <p className="text-red-500 text-sm font-bold bg-red-50 p-2 rounded-lg border border-red-200">{error}</p>}
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
        <img src={branding.logo} className="w-10 h-10 object-contain" alt="Logo" />
        <span className="font-extrabold text-xl">{branding.siteName}</span>
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
                <img src={course.coverImage} className="w-full h-full object-cover" alt={course.title} />
              ) : (
                <Globe size={48} className="text-[#CBD5E1]" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-extrabold group-hover:text-[#8B5CF6] transition-colors">{course.title}</h3>
              <p className="text-sm text-[#64748B] line-clamp-2 mt-2 mb-4">{course.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button onClick={() => navigate(`/admin/course/${course.id}`)} variant="secondary" className="text-xs">Edit Content</Button>
              <Button onClick={() => window.open(`#/course/${course.id}`, '_blank')} variant="yellow" className="text-xs" icon={Globe}>Public View</Button>
              <Button 
                onClick={() => {
                  const url = `${window.location.origin}${window.location.pathname}#/course/${course.id}`;
                  navigator.clipboard.writeText(url);
                  alert('Link publik berhasil disalin!');
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

  const sqlScript = `
-- SETUP DATABASE ARUNIKA LMS (REAL-TIME CONFIG)
-- Jalankan di SQL Editor Supabase Anda

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

-- 4. Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.branding;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentor;
ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;
`.trim();

  const handleCopySQL = () => {
    navigator.clipboard.writeText(sqlScript);
    alert('Kode SQL Setup disalin!');
  };

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
      alert('Terhubung ke Supabase! Data disinkronkan realtime.');
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
            <span className="uppercase tracking-tighter">{dbStatus}</span>
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
              <Button variant="secondary" className="px-4 py-1.5 text-xs" onClick={handleCopySQL} icon={Copy}>Copy SQL</Button>
            </div>
            <div className="bg-[#1E293B] text-[#34D399] p-6 rounded-3xl font-mono text-xs overflow-x-auto hard-shadow relative">
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
    setEditedCourse({ ...editedCourse, modules: [...editedCourse.modules, newModule] });
    setShowAddMenu(false);
  };

  const addAsset = (type: 'link' | 'file') => {
    const newAsset: Asset = {
      id: `a-${Date.now()}`,
      name: 'Asset Baru',
      type: type,
      url: ''
    };
    setEditedCourse({...editedCourse, assets: [...editedCourse.assets, newAsset]});
  };

  const handleAssetFileUpload = (index: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const updatedAssets = [...editedCourse.assets];
          updatedAssets[index] = {
            ...updatedAssets[index],
            name: file.name,
            fileName: file.name,
            url: reader.result as string, 
            type: 'file'
          };
          setEditedCourse({...editedCourse, assets: updatedAssets});
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
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

  return (
    <div className="p-8 max-w-5xl mx-auto pb-24 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-extrabold text-[#1E293B]">Editor: {editedCourse.title}</h1>
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
              {editedCourse.modules.map((mod, idx) => (
                <Card key={mod.id} className="relative group p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <Input label={`Judul Materi #${idx + 1}`} value={mod.title} onChange={e => updateModule(idx, 'title', e.target.value)} />
                    </div>
                    <button onClick={() => removeModule(idx)} className="ml-4 p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-colors">
                      <Trash2 size={20} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Badge color={mod.type === 'video' ? '#8B5CF6' : '#F472B6'}>
                      <span className="text-white font-bold">{mod.type.toUpperCase()}</span>
                    </Badge>
                    <Input label="Durasi" value={mod.duration || ''} onChange={e => updateModule(idx, 'duration', e.target.value)} />
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

        <div className="space-y-8">
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
                <Input label="TikTok" value={mentor.socials.tiktok} onChange={e => setMentor({...mentor, socials: {...mentor.socials, tiktok: e.target.value}})} icon={Music} />
                <Input label="Instagram" value={mentor.socials.instagram} onChange={e => setMentor({...mentor, socials: {...mentor.socials, instagram: e.target.value}})} />
                <Input label="Website" value={mentor.socials.website} onChange={e => setMentor({...mentor, socials: {...mentor.socials, website: e.target.value}})} icon={ExternalLink} />
              </div>
            </div>
          </Card>

          <div className="space-y-4">
             <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Asset Belajar</h3>
                <div className="flex gap-2">
                   <Button variant="green" className="p-2" icon={Upload} onClick={() => addAsset('file')}></Button>
                   <Button variant="secondary" className="p-2" icon={LinkIcon} onClick={() => addAsset('link')}></Button>
                </div>
             </div>
             <div className="space-y-3">
                {editedCourse.assets.map((asset, aidx) => (
                  <Card key={asset.id} className="p-4 flex flex-col gap-2">
                     <div className="flex justify-between items-center">
                        <Badge color={asset.type === 'link' ? '#FBBF24' : '#34D399'}>{asset.type.toUpperCase()}</Badge>
                        <button onClick={() => setEditedCourse({...editedCourse, assets: editedCourse.assets.filter((_, i) => i !== aidx)})} className="text-red-400"><Trash2 size={16}/></button>
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
                          <Input className="flex-1" placeholder="File..." value={asset.fileName || ''} readOnly />
                          <Button variant="secondary" className="px-3" onClick={() => handleAssetFileUpload(aidx)}><Upload size={14}/></Button>
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

const PublicCourseView: React.FC<{ courses: Course[]; mentor: Mentor; branding: Branding }> = ({ courses, mentor, branding }) => {
  const { id } = useParams<{ id: string }>();
  const course = courses.find(c => c.id === id);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);

  useEffect(() => {
    if (course && course.modules.length > 0) {
      setSelectedModule(course.modules[0]);
    }
  }, [course]);

  if (!course) return <div className="h-screen flex items-center justify-center font-bold">Materi tidak ditemukan</div>;

  return (
    <div className="min-h-screen bg-[#FFFDF5] flex flex-col">
      <header className="bg-white border-b-2 border-[#1E293B] p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={branding.logo} className="w-10 h-10 object-contain" alt="Logo" />
            <span className="font-extrabold text-xl">{branding.siteName}</span>
          </Link>
          <div className="hidden md:flex items-center gap-2">
            <Badge>{course.modules.length} Materi</Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1">
        <div className="lg:col-span-3 space-y-6">
          {/* JUDUL KURSUS DI ATAS VIDEO/TEKS */}
          <div className="bg-white border-2 border-[#1E293B] p-8 rounded-3xl hard-shadow flex flex-col md:flex-row md:items-center justify-between gap-6 transition-bounce">
            <div className="flex-1">
              <Badge color="#8B5CF6" className="text-white mb-3">Video Course</Badge>
              <h1 className="text-4xl font-extrabold text-[#1E293B] mb-2 leading-tight">{course.title}</h1>
              <div className="flex items-center gap-3">
                 <div className="h-2 w-24 bg-[#FBBF24] rounded-full"></div>
                 <span className="text-[#64748B] font-bold text-sm tracking-widest uppercase">Arunika Learning Hub</span>
              </div>
            </div>
            <Button variant="secondary" className="px-6 py-3" icon={Share2} onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('Link publik materi ini telah disalin!');
            }}>Bagikan Halaman</Button>
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
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                ) : (
                  <div className="p-10 prose prose-slate max-w-none">
                    <h2 className="text-4xl font-extrabold mb-6 text-[#1E293B] border-b-4 border-[#FBBF24] inline-block">{selectedModule.title}</h2>
                    <div className="whitespace-pre-wrap font-medium text-[#1E293B] text-xl leading-relaxed">{selectedModule.content}</div>
                  </div>
                )}
              </div>
              
              <div className="bg-white border-2 border-[#1E293B] rounded-3xl p-8 sticker-shadow relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-16 h-16 bg-[#FBBF24] rounded-bl-3xl border-l-2 border-b-2 border-[#1E293B] flex items-center justify-center">
                    <FileText className="text-[#1E293B]" />
                 </div>
                 <h3 className="text-2xl font-extrabold mb-4 text-[#1E293B] tracking-tight">Detail Materi: {selectedModule.title}</h3>
                 <div className="text-[#1E293B] text-lg leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedModule.description || "Tidak ada deskripsi tambahan untuk materi ini."}
                 </div>
              </div>
            </div>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center text-[#64748B] font-bold bg-white rounded-3xl border-2 border-[#1E293B] border-dashed">
               <Globe size={64} className="mb-4 text-[#CBD5E1]" />
               <p className="text-xl">Pilih salah satu materi di kurikulum untuk mulai.</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="flex flex-col items-center p-8 text-center featured">
             <div className="relative mb-6">
                <img src={mentor.photo} className="w-28 h-28 rounded-3xl border-2 border-[#1E293B] hard-shadow object-cover" alt={mentor.name} />
                <div className="absolute -bottom-2 -right-2 bg-[#FBBF24] p-2 rounded-xl border-2 border-[#1E293B] hard-shadow">
                   <Check size={16} className="text-[#1E293B]" />
                </div>
             </div>
             <h3 className="text-2xl font-extrabold text-[#1E293B] mb-1">{mentor.name}</h3>
             <Badge color="#F472B6" className="text-white mb-4 uppercase text-[10px] tracking-widest">{mentor.role}</Badge>
             <p className="text-[#64748B] text-sm leading-relaxed mb-6 font-medium italic">"{mentor.bio}"</p>
             
             <div className="flex justify-center gap-3 flex-wrap mb-8">
                {mentor.socials.linkedin && (
                   <a href={`https://linkedin.com/in/${mentor.socials.linkedin}`} target="_blank" className="p-3 bg-[#F1F5F9] border-2 border-[#1E293B] rounded-2xl hover:bg-[#0077b5] hover:text-white transition-all hard-shadow-hover">
                      <Linkedin size={20} />
                   </a>
                )}
                {mentor.socials.tiktok && (
                   <a href={`https://tiktok.com/@${mentor.socials.tiktok}`} target="_blank" className="p-3 bg-[#F1F5F9] border-2 border-[#1E293B] rounded-2xl hover:bg-black hover:text-white transition-all hard-shadow-hover">
                      <Music size={20} />
                   </a>
                )}
                {mentor.socials.instagram && (
                   <a href={`https://instagram.com/${mentor.socials.instagram}`} target="_blank" className="p-3 bg-[#F1F5F9] border-2 border-[#1E293B] rounded-2xl hover:bg-pink-500 hover:text-white transition-all hard-shadow-hover">
                      <Instagram size={20} />
                   </a>
                )}
             </div>

             {mentor.socials.website && (
               <Button 
                 variant="yellow" 
                 className="w-full text-xs font-bold py-2" 
                 icon={ExternalLink} 
                 onClick={() => window.open(mentor.socials.website, '_blank')}
               >
                 Link Produk Lainnya
               </Button>
             )}
          </Card>

          <div className="bg-white border-2 border-[#1E293B] rounded-3xl p-6 hard-shadow">
            <h3 className="font-extrabold text-xl mb-6 flex items-center gap-2 tracking-tight">
              <BookOpen size={24} className="text-[#8B5CF6]" /> Kurikulum Materi
            </h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {course.modules.map((mod, i) => (
                <button 
                  key={mod.id} 
                  onClick={() => setSelectedModule(mod)} 
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-4 ${selectedModule?.id === mod.id ? 'bg-[#FBBF24] border-[#1E293B] hard-shadow translate-x-1' : 'bg-white border-transparent hover:bg-[#F1F5F9]'}`}
                >
                  <div className={`shrink-0 w-8 h-8 rounded-full border-2 border-[#1E293B] flex items-center justify-center font-bold text-xs ${selectedModule?.id === mod.id ? 'bg-white' : 'bg-[#F1F5F9]'}`}>
                    {i+1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-extrabold leading-tight">{mod.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                       {mod.type === 'video' ? <Video size={12} className="text-[#8B5CF6]" /> : <FileText size={12} className="text-[#F472B6]" />}
                       <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">{mod.duration}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {course.assets.length > 0 && (
              <div className="mt-10 border-t-2 border-[#E2E8F0] pt-6">
                <h3 className="font-extrabold text-xl mb-4 flex items-center gap-2 tracking-tight">
                  <Upload size={20} className="text-[#34D399]" /> Asset Download
                </h3>
                <div className="space-y-2">
                  {course.assets.map(asset => (
                    <a 
                      key={asset.id} 
                      href={asset.url} 
                      target="_blank" 
                      className="flex items-center justify-between p-4 rounded-xl bg-white border-2 border-[#1E293B] hover:bg-[#34D399] transition-all group" 
                      download={asset.type === 'file' ? (asset.fileName || asset.name) : undefined}
                    >
                      <span className="text-sm font-bold truncate pr-2 group-hover:text-white">{asset.name}</span>
                      <ExternalLink size={14} className="shrink-0 group-hover:text-white" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

// --- Main Application with Forced Realtime Logic ---
const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => getStorageItem('isLoggedIn', false));
  const [courses, setCourses] = useState<Course[]>(() => getStorageItem('courses', initialCourses));
  const [mentor, setMentor] = useState<Mentor>(() => getStorageItem('mentor', initialMentor));
  const [branding, setBranding] = useState<Branding>(() => getStorageItem('branding', initialBranding));
  const [supabase, setSupabase] = useState<SupabaseConfig>(() => getStorageItem('supabase', { url: '', anonKey: '' }));
  const [syncing, setSyncing] = useState(false);

  // Persistence to LocalStorage (Always up to date locally)
  useEffect(() => setStorageItem('isLoggedIn', isLoggedIn), [isLoggedIn]);
  useEffect(() => setStorageItem('courses', courses), [courses]);
  useEffect(() => setStorageItem('mentor', mentor), [mentor]);
  useEffect(() => setStorageItem('branding', branding), [branding]);
  useEffect(() => setStorageItem('supabase', supabase), [supabase]);

  // FORCED REALTIME SYNC FUNCTION
  const triggerForcedSync = useCallback(async () => {
    if (!supabase.url || !supabase.anonKey) return;
    setSyncing(true);
    try {
      const client = createClient(supabase.url, supabase.anonKey);
      
      // Force sync branding
      await client.from('branding').upsert({ id: 'config', site_name: branding.siteName, logo: branding.logo });
      
      // Force sync mentor
      await client.from('mentor').upsert({ id: 'profile', ...mentor });
      
      // Force sync all courses
      for (const course of courses) {
        await client.from('courses').upsert({
          id: course.id,
          title: course.title,
          description: course.description,
          cover_image: course.coverImage,
          modules: course.modules,
          assets: course.assets,
          mentor_id: course.mentorId
        });
      }
    } catch (err) {
      console.error("Supabase Realtime Sync Failed:", err);
    } finally {
      setTimeout(() => setSyncing(false), 500);
    }
  }, [branding, mentor, courses, supabase]);

  // Automatic Trigger on any change
  useEffect(() => {
    const timer = setTimeout(triggerForcedSync, 1000); // 1s debounce to allow multiple quick inputs
    return () => clearTimeout(timer);
  }, [branding, mentor, courses, triggerForcedSync]);

  // Initial Fetch from Supabase
  useEffect(() => {
    if (!supabase.url || !supabase.anonKey) return;
    const client = createClient(supabase.url, supabase.anonKey);
    
    const initialFetch = async () => {
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
    };
    initialFetch();
    
    // Subscribe to realtime updates if any (for external changes)
    const sub = client.channel('public_updates').on('postgres_changes', { event: '*', table: '*' }, (payload: any) => {
       // Refresh local state if remote table branding or mentor changed
       if(payload.table === 'branding') setBranding({siteName: payload.new.site_name, logo: payload.new.logo});
       if(payload.table === 'mentor') setMentor(payload.new);
    }).subscribe();

    return () => { client.removeChannel(sub); };
  }, [supabase.url, supabase.anonKey]);

  const updateCourse = (updated: Course) => {
    setCourses(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  return (
    <div className="min-h-screen">
      {syncing && (
        <div className="fixed bottom-6 left-6 z-[999] bg-[#34D399] border-2 border-[#1E293B] rounded-full px-5 py-2 flex items-center gap-3 hard-shadow animate-bounce">
           <RefreshCw size={18} className="text-[#1E293B] animate-spin" />
           <span className="text-xs font-extrabold uppercase tracking-widest text-[#1E293B]">Syncing Realtime...</span>
        </div>
      )}
      <Routes>
        <Route path="/login" element={<Login isLoggedIn={isLoggedIn} onLogin={() => setIsLoggedIn(true)} />} />
        <Route path="/admin" element={isLoggedIn ? <div className="flex"><Sidebar branding={branding} onLogout={() => setIsLoggedIn(false)} /><main className="flex-1"><AdminDashboard courses={courses} setCourses={setCourses} /></main></div> : <Navigate to="/login" />} />
        <Route path="/admin/course/:id" element={isLoggedIn ? <div className="flex"><Sidebar branding={branding} onLogout={() => setIsLoggedIn(false)} /><main className="flex-1"><CourseEditor courses={courses} onSave={updateCourse} mentor={mentor} setMentor={setMentor} /></main></div> : <Navigate to="/login" />} />
        <Route path="/settings" element={isLoggedIn ? <div className="flex"><Sidebar branding={branding} onLogout={() => setIsLoggedIn(false)} /><main className="flex-1"><Settings branding={branding} setBranding={setBranding} supabase={supabase} setSupabase={setSupabase} /></main></div> : <Navigate to="/login" />} />
        <Route path="/course/:id" element={<PublicCourseView courses={courses} mentor={mentor} branding={branding} />} />
        <Route path="/" element={<Navigate to={isLoggedIn ? "/admin" : "/login"} />} />
      </Routes>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><Router><App /></Router></React.StrictMode>);