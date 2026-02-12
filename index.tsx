
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter as Router, Routes, Route, Link, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
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
  Instagram,
  Linkedin,
  Twitter,
  ExternalLink,
  ChevronRight,
  Database,
  X,
  Upload,
  Link as LinkIcon,
  Pencil,
  Check,
  Camera
} from 'lucide-react';
import { Course, Mentor, Branding, SupabaseConfig, Module, Asset } from './types';
import { initialCourses, initialMentor, initialBranding } from './mockData';
import { Button, Card, Input, Textarea, Badge } from './components/UI';

// --- Components ---

const ImageUpload: React.FC<{ value: string; onChange: (base64: string) => void; label: string }> = ({ value, onChange, label }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => onChange(reader.result as string);
      reader.readAsDataURL(file);
    }
  };
  return (
    <div className="space-y-2">
      <label className="text-xs font-extrabold uppercase tracking-wide text-[#64748B] ml-1">{label}</label>
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

// --- Login Page ---
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

// --- Shared Layout ---
const Sidebar: React.FC<{ branding: Branding; onLogout: () => void }> = ({ branding, onLogout }) => {
  return (
    <div className="w-64 bg-white border-r-2 border-[#1E293B] min-h-screen hidden md:flex flex-col sticky top-0">
      <div className="p-6 border-b-2 border-[#1E293B] flex items-center gap-3">
        <img src={branding.logo} className="w-10 h-10 rounded-lg border-2 border-[#1E293B]" alt="Logo" />
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

// --- Admin Dashboard ---
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

// --- Settings Page ---
const Settings: React.FC<{ 
  branding: Branding; 
  setBranding: React.Dispatch<React.SetStateAction<Branding>>;
  supabase: SupabaseConfig;
  setSupabase: React.Dispatch<React.SetStateAction<SupabaseConfig>>;
}> = ({ branding, setBranding, supabase, setSupabase }) => {
  const sqlScript = `
-- SETUP DATABASE ARUNIKA LMS
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  modules JSONB DEFAULT '[]'::jsonb,
  assets JSONB DEFAULT '[]'::jsonb,
  mentor_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AKTIFKAN REALTIME UNTUK PREVIEW PUBLIC
ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;
  `.trim();

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-12 pb-24">
      <h1 className="text-4xl font-extrabold text-[#1E293B]">Branding & Database</h1>
      
      <section className="space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Layout size={24} className="text-[#8B5CF6]" /> Custom Branding
        </h2>
        <Card className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Input label="Nama Platform" value={branding.siteName} onChange={e => setBranding({...branding, siteName: e.target.value})} />
          </div>
          <ImageUpload label="Logo Platform (PNG)" value={branding.logo} onChange={logo => setBranding({...branding, logo})} />
        </Card>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Database size={24} className="text-[#34D399]" /> Koneksi Supabase (Realtime Sync)
        </h2>
        <Card className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Supabase URL" value={supabase.url} onChange={e => setSupabase({...supabase, url: e.target.value})} placeholder="https://xxx.supabase.co" />
            <Input label="Anon Key" value={supabase.anonKey} onChange={e => setSupabase({...supabase, anonKey: e.target.value})} placeholder="eyJhb..." type="password" />
          </div>
          <div className="space-y-4">
            <label className="text-xs font-extrabold uppercase tracking-wide text-[#64748B]">Kode SQL Setup</label>
            <div className="bg-[#1E293B] text-[#34D399] p-6 rounded-2xl font-mono text-sm overflow-x-auto hard-shadow">
              <pre>{sqlScript}</pre>
            </div>
            <p className="text-sm text-[#64748B] italic">Copy dan jalankan kode di atas pada SQL Editor Supabase Anda untuk mengaktifkan sinkronisasi data.</p>
          </div>
        </Card>
      </section>
    </div>
  );
};

// --- Course Editor Wrapper ---
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
    alert('Konten kursus berhasil disimpan ke database lokal.');
  };

  const addModule = (type: 'video' | 'text') => {
    const newModule: Module = {
      id: `m-${Date.now()}`,
      title: type === 'video' ? 'Materi Video Baru' : 'Halaman Materi Teks',
      type: type,
      content: '',
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
        <Button onClick={handleSave} icon={Database}>Simpan Perubahan</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Main Info */}
          <Card className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">Main Content <Badge color="#F472B6">Required</Badge></h3>
            <Input label="Judul Kursus" value={editedCourse.title} onChange={e => setEditedCourse({...editedCourse, title: e.target.value})} />
            <Textarea label="Deskripsi Kursus" value={editedCourse.description} onChange={e => setEditedCourse({...editedCourse, description: e.target.value})} />
            <ImageUpload label="Cover Image Kursus" value={editedCourse.coverImage} onChange={img => setEditedCourse({...editedCourse, coverImage: img})} />
          </Card>

          {/* Curriculum */}
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
                    <Input label="Durasi (e.g 10:00)" value={mod.duration || ''} onChange={e => updateModule(idx, 'duration', e.target.value)} />
                  </div>
                  <div className="mt-4">
                    {mod.type === 'video' ? (
                      <Input label="YouTube Link" value={mod.content} onChange={e => updateModule(idx, 'content', e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                    ) : (
                      <Textarea label="Text Pages Content" value={mod.content} onChange={e => updateModule(idx, 'content', e.target.value)} placeholder="Masukkan konten teks di sini..." />
                    )}
                  </div>
                </Card>
              ))}
              {editedCourse.modules.length === 0 && (
                <div className="p-12 text-center bg-white/50 border-2 border-dashed border-[#CBD5E1] rounded-3xl">
                  <p className="font-bold text-[#64748B]">Belum ada materi. Klik "Tambah Materi" untuk mulai.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Mentor Profile */}
          <Card className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">Data Mentor</h3>
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <img src={mentor.photo} className="w-24 h-24 rounded-full border-2 border-[#1E293B] object-cover" />
                <button className="absolute bottom-0 right-0 p-2 bg-[#8B5CF6] text-white rounded-full border-2 border-[#1E293B] shadow-sm"><Camera size={14} /></button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-end gap-2">
                <Input label="Nama Lengkap" value={mentor.name} onChange={e => setMentor({...mentor, name: e.target.value})} className="flex-1" />
                <Badge><Pencil size={12}/></Badge>
              </div>
              <div className="flex items-end gap-2">
                <Input label="Role/Profesi" value={mentor.role} onChange={e => setMentor({...mentor, role: e.target.value})} className="flex-1" />
                <Badge><Pencil size={12}/></Badge>
              </div>
              <div className="flex items-end gap-2">
                <Textarea label="Bio Mentor" value={mentor.bio} onChange={e => setMentor({...mentor, bio: e.target.value})} className="flex-1" />
                <Badge><Pencil size={12}/></Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Web Link" value={mentor.socials.website} onChange={e => setMentor({...mentor, socials: {...mentor.socials, website: e.target.value}})} />
                <Input label="Instagram" value={mentor.socials.instagram} onChange={e => setMentor({...mentor, socials: {...mentor.socials, instagram: e.target.value}})} />
              </div>
            </div>
          </Card>

          {/* Assets */}
          <div className="space-y-4">
             <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Asset Belajar</h3>
                <Button variant="green" className="p-2" icon={Plus} onClick={() => addAsset('link')}></Button>
             </div>
             <div className="space-y-3">
                {editedCourse.assets.map((asset, aidx) => (
                  <Card key={asset.id} className="p-4 flex flex-col gap-2">
                     <div className="flex justify-between items-center">
                        <Badge color={asset.type === 'link' ? '#FBBF24' : '#34D399'}>{asset.type.toUpperCase()}</Badge>
                        <button onClick={() => {
                          const updatedAssets = editedCourse.assets.filter((_, i) => i !== aidx);
                          setEditedCourse({...editedCourse, assets: updatedAssets});
                        }} className="text-red-400"><Trash2 size={16}/></button>
                     </div>
                     <Input placeholder="Nama Asset" value={asset.name} onChange={e => {
                       const updatedAssets = [...editedCourse.assets];
                       updatedAssets[aidx].name = e.target.value;
                       setEditedCourse({...editedCourse, assets: updatedAssets});
                     }} />
                     <Input placeholder="URL Link / Filename" value={asset.url} onChange={e => {
                       const updatedAssets = [...editedCourse.assets];
                       updatedAssets[aidx].url = e.target.value;
                       setEditedCourse({...editedCourse, assets: updatedAssets});
                     }} />
                  </Card>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Public Course View ---
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
            <img src={branding.logo} className="w-10 h-10 rounded-lg border-2 border-[#1E293B]" alt="Logo" />
            <span className="font-extrabold text-xl">{branding.siteName}</span>
          </Link>
          <div className="hidden md:flex items-center gap-2">
            <Badge>{course.modules.length} Materi</Badge>
            <Badge color="#FBBF24">{course.title}</Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1">
        <div className="lg:col-span-3 space-y-6">
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
                  <div className="p-8 prose prose-slate max-w-none">
                    <h1 className="text-4xl font-extrabold mb-6 text-[#1E293B] border-b-4 border-[#FBBF24] inline-block">{selectedModule.title}</h1>
                    <div className="whitespace-pre-wrap font-medium text-[#1E293B] text-lg leading-relaxed">
                      {selectedModule.content}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-extrabold">{selectedModule.title}</h2>
                <Badge color="#8B5CF6" className="text-white px-4 py-2 text-sm">{selectedModule.duration}</Badge>
              </div>
            </div>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center text-[#64748B] font-bold">
               <Globe size={64} className="mb-4 text-[#CBD5E1]" />
               <p>Pilih materi di samping untuk mulai belajar</p>
            </div>
          )}

          {/* Mentor Data Section */}
          <div className="bg-white border-2 border-[#1E293B] rounded-3xl p-8 sticker-shadow">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="shrink-0 relative">
                <img src={mentor.photo} className="w-32 h-32 rounded-3xl border-2 border-[#1E293B] hard-shadow object-cover" alt={mentor.name} />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-extrabold text-[#1E293B] mb-1">{mentor.name}</h3>
                <p className="font-bold text-[#8B5CF6] mb-4 uppercase tracking-wider text-sm">{mentor.role}</p>
                <p className="text-[#64748B] text-lg leading-relaxed mb-6 italic">"{mentor.bio}"</p>
                <div className="flex flex-wrap gap-4">
                  {mentor.socials.instagram && <a href={`https://instagram.com/${mentor.socials.instagram}`} target="_blank" className="flex items-center gap-2 p-3 bg-[#F1F5F9] border-2 border-[#1E293B] rounded-xl font-bold hover:bg-[#F472B6] hover:text-white transition-all"><Instagram size={20} /> Instagram</a>}
                  {mentor.socials.linkedin && <a href={`https://linkedin.com/in/${mentor.socials.linkedin}`} target="_blank" className="flex items-center gap-2 p-3 bg-[#F1F5F9] border-2 border-[#1E293B] rounded-xl font-bold hover:bg-[#8B5CF6] hover:text-white transition-all"><Linkedin size={20} /> LinkedIn</a>}
                  {mentor.socials.website && <a href={mentor.socials.website} target="_blank" className="flex items-center gap-2 p-3 bg-[#F1F5F9] border-2 border-[#1E293B] rounded-xl font-bold hover:bg-[#FBBF24] transition-all"><Globe size={20} /> Website</a>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Curriculum */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border-2 border-[#1E293B] rounded-3xl p-6 sticky top-28 hard-shadow">
            <h3 className="font-extrabold text-xl mb-6 flex items-center gap-2">
              <BookOpen size={24} className="text-[#8B5CF6]" /> Kurikulum Kelas
            </h3>
            <div className="space-y-3">
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
                       {mod.type === 'video' ? <Video size={12} /> : <FileText size={12} />}
                       <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">{mod.duration}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {course.assets.length > 0 && (
              <div className="mt-10 border-t-2 border-[#E2E8F0] pt-6">
                <h3 className="font-extrabold text-xl mb-4 flex items-center gap-2">
                  <Upload size={20} className="text-[#34D399]" /> Asset Belajar
                </h3>
                <div className="space-y-2">
                  {course.assets.map(asset => (
                    <a 
                      key={asset.id} 
                      href={asset.url} 
                      target="_blank" 
                      className="flex items-center justify-between p-4 rounded-xl bg-white border-2 border-[#1E293B] hover:bg-[#34D399] transition-all group"
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

// --- App Entry ---
const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [mentor, setMentor] = useState<Mentor>(initialMentor);
  const [branding, setBranding] = useState<Branding>(initialBranding);
  const [supabase, setSupabase] = useState<SupabaseConfig>({ url: '', anonKey: '' });

  const updateCourse = (updated: Course) => {
    setCourses(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/login" element={<Login isLoggedIn={isLoggedIn} onLogin={() => setIsLoggedIn(true)} />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={isLoggedIn ? <div className="flex"><Sidebar branding={branding} onLogout={() => setIsLoggedIn(false)} /><main className="flex-1"><AdminDashboard courses={courses} setCourses={setCourses} /></main></div> : <Navigate to="/login" />} />
        <Route path="/admin/course/:id" element={isLoggedIn ? <div className="flex"><Sidebar branding={branding} onLogout={() => setIsLoggedIn(false)} /><main className="flex-1"><CourseEditor courses={courses} onSave={updateCourse} mentor={mentor} setMentor={setMentor} /></main></div> : <Navigate to="/login" />} />
        <Route path="/settings" element={isLoggedIn ? <div className="flex"><Sidebar branding={branding} onLogout={() => setIsLoggedIn(false)} /><main className="flex-1"><Settings branding={branding} setBranding={setBranding} supabase={supabase} setSupabase={setSupabase} /></main></div> : <Navigate to="/login" />} />
        
        {/* Public Routes */}
        <Route path="/course/:id" element={<PublicCourseView courses={courses} mentor={mentor} branding={branding} />} />
        
        {/* Default */}
        <Route path="/" element={<Navigate to={isLoggedIn ? "/admin" : "/login"} />} />
      </Routes>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
);
