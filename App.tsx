
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
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
  User, 
  Globe,
  Instagram,
  Linkedin,
  Twitter,
  ExternalLink,
  ChevronRight,
  Menu,
  X,
  Database,
  Pencil
} from 'lucide-react';
import { Course, Mentor, Branding, SupabaseConfig } from './types';
import { initialCourses, initialMentor, initialBranding } from './mockData';
import { Button, Card, Input, Textarea, Badge } from './components/UI';

// --- Login Page ---
const Login: React.FC<{ onLogin: () => void; isLoggedIn: boolean }> = ({ onLogin, isLoggedIn }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      navigate('/admin');
    }
  }, [isLoggedIn, navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'arunika' && password === 'ar4925') {
      onLogin();
      navigate('/admin');
    } else {
      setError('Username atau password salah');
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
          <p className="text-[#64748B]">Selamat datang kembali, Arunika!</p>
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

// --- Shared Components ---
const Sidebar: React.FC<{ branding: Branding; onLogout: () => void }> = ({ branding, onLogout }) => {
  const navigate = useNavigate();
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
      coverImage: 'https://picsum.photos/seed/new/800/450',
      mentorId: 'mentor-1',
      modules: [],
      assets: []
    };
    setCourses([...courses, newCourse]);
    navigate(`/admin/course/${newCourse.id}`);
  };

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus kursus ini?')) {
      setCourses(courses.filter(c => c.id !== id));
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-extrabold mb-2 text-[#1E293B]">Dashboard Kursus</h1>
          <p className="text-[#64748B]">Kelola semua materi pembelajaran publik Anda.</p>
        </div>
        <Button icon={Plus} onClick={handleAddCourse}>Tambah Kursus</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map((course) => (
          <Card key={course.id} className="group overflow-hidden flex flex-col">
            <img src={course.coverImage} className="w-full h-48 object-cover rounded-lg border-2 border-[#1E293B] mb-4" />
            <div className="flex-1">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-extrabold group-hover:text-[#8B5CF6] transition-colors">{course.title}</h3>
                <Badge>{course.modules.length} Materi</Badge>
              </div>
              <p className="text-sm text-[#64748B] line-clamp-2 mb-4">{course.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => navigate(`/admin/course/${course.id}`)} variant="secondary" className="px-3 py-2 text-sm">Edit</Button>
              <Button onClick={() => window.open(`#/course/${course.id}`, '_blank')} variant="yellow" className="px-3 py-2 text-sm" icon={Globe}>Preview</Button>
              <Button 
                onClick={() => {
                  const url = `${window.location.origin}${window.location.pathname}#/course/${course.id}`;
                  navigator.clipboard.writeText(url);
                  alert('Link publik berhasil disalin!');
                }} 
                variant="green" 
                className="px-3 py-2 text-sm" 
                icon={Share2}
              >
                Share
              </Button>
              <Button onClick={() => handleDelete(course.id)} className="bg-red-500 text-white px-3 py-2 text-sm border-2 border-[#1E293B]" icon={Trash2}>Hapus</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// --- Course Editor ---
const CourseEditor: React.FC<{ 
  course: Course; 
  onSave: (course: Course) => void;
  mentor: Mentor;
  setMentor: React.Dispatch<React.SetStateAction<Mentor>>;
}> = ({ course: initialCourse, onSave, mentor, setMentor }) => {
  const [course, setCourse] = useState<Course>(initialCourse);
  const [showAddModule, setShowAddModule] = useState(false);
  const navigate = useNavigate();

  const handleUpdate = (updates: Partial<Course>) => {
    const updated = { ...course, ...updates };
    setCourse(updated);
    onSave(updated);
  };

  const addModule = (type: 'video' | 'text') => {
    const newModule = {
      id: `m-${Date.now()}`,
      title: type === 'video' ? 'Link Video Baru' : 'Halaman Teks Baru',
      type,
      content: '',
      duration: '0:00'
    };
    handleUpdate({ modules: [...course.modules, newModule] });
    setShowAddModule(false);
  };

  const removeModule = (id: string) => {
    handleUpdate({ modules: course.modules.filter(m => m.id !== id) });
  };

  const updateModule = (id: string, content: string, title?: string) => {
    handleUpdate({
      modules: course.modules.map(m => m.id === id ? { ...m, content, title: title || m.title } : m)
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'cover' | 'logo' | 'mentorPhoto') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (field === 'cover') handleUpdate({ coverImage: reader.result as string });
        if (field === 'mentorPhoto') setMentor({ ...mentor, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12">
      <div className="flex items-center gap-4">
        <Button variant="secondary" onClick={() => navigate('/admin')}>Kembali</Button>
        <h1 className="text-3xl font-extrabold text-[#1E293B]">Editor Kursus</h1>
      </div>

      {/* Main Info */}
      <Card className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Input label="Judul Kursus" value={course.title} onChange={e => handleUpdate({ title: e.target.value })} />
            <Textarea label="Deskripsi" value={course.description} onChange={e => handleUpdate({ description: e.target.value })} />
          </div>
          <div className="space-y-4">
            <label className="text-xs font-extrabold uppercase tracking-wide text-[#64748B] ml-1">Cover Image</label>
            <div className="relative group cursor-pointer border-2 border-[#1E293B] rounded-xl overflow-hidden aspect-video">
              <img src={course.coverImage} className="w-full h-full object-cover" />
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleFileUpload(e, 'cover')} />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold">
                Ganti Gambar
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Curriculum */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-extrabold">Kurikulum Materi</h2>
          <div className="relative">
            <Button icon={Plus} onClick={() => setShowAddModule(!showAddModule)}>Tambah Materi</Button>
            {showAddModule && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white border-2 border-[#1E293B] rounded-xl hard-shadow z-20 overflow-hidden">
                <button onClick={() => addModule('text')} className="w-full p-4 text-left font-bold hover:bg-[#F1F5F9] flex items-center gap-2 border-b-2 border-[#1E293B]">
                  <FileText size={18} className="text-[#F472B6]" /> Teks Saja
                </button>
                <button onClick={() => addModule('video')} className="w-full p-4 text-left font-bold hover:bg-[#F1F5F9] flex items-center gap-2">
                  <Video size={18} className="text-[#8B5CF6]" /> Video YouTube
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {course.modules.map((m, idx) => (
            <Card key={m.id} className="flex gap-4 items-center">
              <div className="bg-[#1E293B] text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-[2px 2px 0px_0px_#8B5CF6]">
                {idx + 1}
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex gap-3">
                  <Input 
                    className="flex-1 text-sm font-bold" 
                    value={m.title} 
                    onChange={e => updateModule(m.id, m.content, e.target.value)} 
                    placeholder="Judul Materi"
                  />
                  <Badge color={m.type === 'video' ? '#8B5CF6' : '#F472B6'}>
                    <span className="text-white">{m.type.toUpperCase()}</span>
                  </Badge>
                </div>
                {m.type === 'video' ? (
                  <Input 
                    placeholder="https://youtube.com/watch?v=..." 
                    value={m.content} 
                    onChange={e => updateModule(m.id, e.target.value)} 
                  />
                ) : (
                  <Textarea 
                    placeholder="Masukkan konten teks atau markdown..." 
                    value={m.content} 
                    onChange={e => updateModule(m.id, e.target.value)} 
                  />
                )}
              </div>
              <Button onClick={() => removeModule(m.id)} className="bg-red-100 border-none shadow-none text-red-500 hover:bg-red-200" icon={Trash2} />
            </Card>
          ))}
        </div>
      </div>

      {/* Mentor Editing */}
      <div className="space-y-6">
        <h2 className="text-2xl font-extrabold">Profil Mentor</h2>
        <Card className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-4">
              <div className="relative group w-32 h-32 mx-auto md:mx-0">
                <img src={mentor.photo} className="w-full h-full object-cover rounded-full border-2 border-[#1E293B] hard-shadow" />
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => handleFileUpload(e, 'mentorPhoto')} />
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs text-center font-bold">
                  Ganti Foto
                </div>
              </div>
              <Input label="Nama Mentor" value={mentor.name} onChange={e => setMentor({...mentor, name: e.target.value})} />
              <Input label="Role" value={mentor.role} onChange={e => setMentor({...mentor, role: e.target.value})} />
           </div>
           <div className="space-y-4">
              <Textarea label="Bio Mentor" value={mentor.bio} onChange={e => setMentor({...mentor, bio: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Instagram" value={mentor.socials.instagram} onChange={e => setMentor({...mentor, socials: {...mentor.socials, instagram: e.target.value}})} />
                <Input label="LinkedIn" value={mentor.socials.linkedin} onChange={e => setMentor({...mentor, socials: {...mentor.socials, linkedin: e.target.value}})} />
              </div>
           </div>
        </Card>
      </div>

      {/* Assets */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-extrabold">Asset Belajar</h2>
          <Button variant="yellow" icon={Plus} onClick={() => {
            const newAsset = { id: `a-${Date.now()}`, name: 'Asset Baru', type: 'link' as const, url: '' };
            handleUpdate({ assets: [...course.assets, newAsset] });
          }}>Tambah Asset</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {course.assets.map(a => (
            <Card key={a.id} className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Input className="flex-1 text-sm" value={a.name} onChange={e => handleUpdate({ assets: course.assets.map(item => item.id === a.id ? {...item, name: e.target.value} : item) })} placeholder="Nama Asset" />
                <Button onClick={() => handleUpdate({ assets: course.assets.filter(item => item.id !== a.id) })} className="bg-red-50 text-red-500 shadow-none border-none p-2" icon={Trash2} />
              </div>
              <Input className="text-sm" value={a.url} onChange={e => handleUpdate({ assets: course.assets.map(item => item.id === a.id ? {...item, url: e.target.value} : item) })} placeholder="Link URL atau Nama File" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Settings & Branding ---
const Settings: React.FC<{ 
  branding: Branding; 
  setBranding: React.Dispatch<React.SetStateAction<Branding>>;
  supabase: SupabaseConfig;
  setSupabase: React.Dispatch<React.SetStateAction<SupabaseConfig>>;
}> = ({ branding, setBranding, supabase, setSupabase }) => {
  
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setBranding({ ...branding, logo: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const sqlScript = `
-- TABEL KURKULUM REALTIME
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

-- AKTIFKAN REALTIME REPLICATION
alter publication supabase_realtime add table public.courses;
  `.trim();

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-12">
      <h1 className="text-4xl font-extrabold text-[#1E293B]">Branding & Database</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="space-y-6">
          <h2 className="text-2xl font-extrabold flex items-center gap-2 text-[#8B5CF6]">
            <Layout size={24} /> Visual Branding
          </h2>
          <Card className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="relative group w-24 h-24 bg-white rounded-2xl border-2 border-[#1E293B] hard-shadow flex items-center justify-center overflow-hidden shrink-0">
                <img src={branding.logo} className="w-16 h-16 object-contain" />
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleLogoUpload} />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">UBAH LOGO</div>
              </div>
              <div className="flex-1">
                <Input label="Nama Situs / Platform" value={branding.siteName} onChange={e => setBranding({...branding, siteName: e.target.value})} />
              </div>
            </div>
          </Card>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-extrabold flex items-center gap-2 text-[#34D399]">
            <Database size={24} /> Supabase Realtime
          </h2>
          <Card className="space-y-4">
            <Input label="Supabase URL" value={supabase.url} onChange={e => setSupabase({...supabase, url: e.target.value})} placeholder="https://xyz.supabase.co" />
            <Input label="Anon Key" type="password" value={supabase.anonKey} onChange={e => setSupabase({...supabase, anonKey: e.target.value})} placeholder="eyJhbGc..." />
          </Card>
        </section>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-extrabold">Setup Database SQL</h2>
        <Card className="bg-[#1E293B] text-green-400 p-6 rounded-xl font-mono text-sm overflow-x-auto">
          <pre>{sqlScript}</pre>
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-white font-bold mb-2">Instruksi:</p>
            <ol className="list-decimal list-inside text-slate-300 space-y-1">
              <li>Copy kode SQL di atas</li>
              <li>Buka Supabase Dashboard > SQL Editor</li>
              <li>Klik "New Query", paste kode, dan klik "Run"</li>
              <li>Data kursus akan tersimpan secara realtime untuk akses publik</li>
            </ol>
          </div>
        </Card>
      </section>
    </div>
  );
};

// --- Public View Page ---
const PublicCourseView: React.FC<{ 
  course: Course; 
  mentor: Mentor; 
  branding: Branding 
}> = ({ course, mentor, branding }) => {
  const [activeModule, setActiveModule] = useState<string>(course.modules[0]?.id || '');
  const currentModule = course.modules.find(m => m.id === activeModule);

  const getYTId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b-2 border-[#1E293B] sticky top-0 z-10 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img src={branding.logo} className="w-8 h-8 rounded-lg" alt="Logo" />
          <h2 className="text-xl font-extrabold hidden md:block">{branding.siteName}</h2>
        </div>
        <div className="text-center flex-1">
          <h1 className="text-xl font-extrabold text-[#8B5CF6] truncate px-4">{course.title}</h1>
        </div>
        <div className="flex gap-2">
           <Button variant="secondary" className="px-4 py-2 text-sm" icon={ExternalLink} onClick={() => alert('Daftar kelas sekarang!')}>Daftar Kelas</Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="space-y-6">
            {currentModule ? (
              <>
                {currentModule.type === 'video' ? (
                  <div className="aspect-video bg-black border-2 border-[#1E293B] rounded-2xl overflow-hidden hard-shadow">
                    <iframe 
                      width="100%" 
                      height="100%" 
                      src={`https://www.youtube.com/embed/${getYTId(currentModule.content)}`} 
                      title="YouTube video player" 
                      frameBorder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                    ></iframe>
                  </div>
                ) : (
                  <Card className="min-h-[400px] prose prose-slate max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: currentModule.content.replace(/\n/g, '<br/>') }} />
                  </Card>
                )}
                <div className="flex justify-between items-start">
                   <div>
                    <h2 className="text-3xl font-extrabold mb-2">{currentModule.title}</h2>
                    <p className="text-[#64748B]">{course.title} • Materi {course.modules.findIndex(m => m.id === activeModule) + 1}</p>
                   </div>
                   <div className="flex gap-2">
                      <Button 
                        variant="secondary" 
                        className="p-2" 
                        icon={Share2}
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          alert('Link materi berhasil disalin!');
                        }}
                      ></Button>
                   </div>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-[#64748B] flex-col gap-4">
                 <img src={course.coverImage} className="max-w-md w-full rounded-2xl border-2 border-[#1E293B] hard-shadow" />
                 <h2 className="text-2xl font-extrabold">Pilih materi untuk memulai belajar</h2>
              </div>
            )}
          </div>

          <hr className="border-t-2 border-[#E2E8F0]" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
            <div className="lg:col-span-2 space-y-6">
               <h3 className="text-2xl font-extrabold">Tentang Kelas</h3>
               <p className="text-[#64748B] leading-relaxed">{course.description}</p>
               
               <div className="space-y-4 pt-4">
                 <h4 className="text-xl font-extrabold">Download Assets</h4>
                 <div className="flex flex-wrap gap-4">
                    {course.assets.map(a => (
                      <a key={a.id} href={a.url} target="_blank" className="flex items-center gap-3 px-4 py-3 bg-white border-2 border-[#1E293B] rounded-xl font-bold hard-shadow hover:-translate-y-1 transition-bounce">
                        <Badge color="#34D399">{a.type.toUpperCase()}</Badge>
                        {a.name}
                      </a>
                    ))}
                 </div>
               </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-extrabold">Mentor Anda</h3>
              <Card className="text-center relative pt-12 featured">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                   <img src={mentor.photo} className="w-24 h-24 rounded-full border-4 border-[#1E293B] object-cover hard-shadow" />
                </div>
                <h4 className="text-xl font-extrabold">{mentor.name}</h4>
                <p className="text-[#8B5CF6] font-bold text-sm mb-4">{mentor.role}</p>
                <p className="text-sm text-[#64748B] mb-6">{mentor.bio}</p>
                <div className="flex justify-center gap-3">
                   {mentor.socials.instagram && <a href={`https://instagram.com/${mentor.socials.instagram}`} target="_blank" className="p-2 bg-[#F1F5F9] rounded-full hover:bg-[#F472B6] hover:text-white border-2 border-transparent hover:border-[#1E293B] transition-all"><Instagram size={18} /></a>}
                   {mentor.socials.linkedin && <a href={`https://linkedin.com/in/${mentor.socials.linkedin}`} target="_blank" className="p-2 bg-[#F1F5F9] rounded-full hover:bg-[#8B5CF6] hover:text-white border-2 border-transparent hover:border-[#1E293B] transition-all"><Linkedin size={18} /></a>}
                   {mentor.socials.twitter && <a href={`https://twitter.com/${mentor.socials.twitter}`} target="_blank" className="p-2 bg-[#F1F5F9] rounded-full hover:bg-[#34D399] hover:text-white border-2 border-transparent hover:border-[#1E293B] transition-all"><Twitter size={18} /></a>}
                   {mentor.socials.website && <a href={mentor.socials.website} target="_blank" className="p-2 bg-[#F1F5F9] rounded-full hover:bg-[#FBBF24] hover:text-white border-2 border-transparent hover:border-[#1E293B] transition-all"><Globe size={18} /></a>}
                </div>
              </Card>
            </div>
          </div>
        </div>

        <div className="w-full md:w-80 bg-white border-l-2 border-[#1E293B] overflow-y-auto">
          <div className="p-6 border-b-2 border-[#1E293B] bg-[#FFFDF5]">
            <h3 className="text-xl font-extrabold">List Materi</h3>
            <p className="text-xs text-[#64748B] font-bold uppercase mt-1">{course.modules.length} Video & Teks</p>
          </div>
          <div className="divide-y-2 divide-[#E2E8F0]">
            {course.modules.map((m, i) => (
              <button 
                key={m.id}
                onClick={() => setActiveModule(m.id)}
                className={`w-full text-left p-6 transition-colors flex items-start gap-4 ${activeModule === m.id ? 'bg-[#F1F5F9] border-l-8 border-[#8B5CF6]' : 'hover:bg-[#F8FAFC]'}`}
              >
                <div className={`shrink-0 w-8 h-8 rounded-full border-2 border-[#1E293B] flex items-center justify-center font-bold text-sm ${activeModule === m.id ? 'bg-[#8B5CF6] text-white' : 'bg-white'}`}>
                  {i + 1}
                </div>
                <div>
                  <h4 className={`font-bold leading-tight ${activeModule === m.id ? 'text-[#8B5CF6]' : 'text-[#1E293B]'}`}>{m.title}</h4>
                  <div className="flex items-center gap-2 mt-2">
                    {m.type === 'video' ? <Video size={14} /> : <FileText size={14} />}
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#64748B]">{m.type}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Wrapper ---
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [mentor, setMentor] = useState<Mentor>(initialMentor);
  const [branding, setBranding] = useState<Branding>(initialBranding);
  const [supabase, setSupabase] = useState<SupabaseConfig>({ url: '', anonKey: '' });

  const updateCourse = (updatedCourse: Course) => {
    setCourses(courses.map(c => c.id === updatedCourse.id ? updatedCourse : c));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return (
    <Router>
      <div className="min-h-screen bg-[#FFFDF5]">
        <Routes>
          <Route path="/login" element={<Login onLogin={() => setIsLoggedIn(true)} isLoggedIn={isLoggedIn} />} />
          
          <Route 
            path="/admin/*" 
            element={
              !isLoggedIn ? <Login onLogin={() => setIsLoggedIn(true)} isLoggedIn={isLoggedIn} /> : (
                <div className="flex">
                  <Sidebar branding={branding} onLogout={handleLogout} />
                  <main className="flex-1">
                    <Routes>
                      <Route index element={<AdminDashboard courses={courses} setCourses={setCourses} />} />
                      <Route 
                        path="course/:id" 
                        element={
                          <CourseEditorWrapper 
                            courses={courses} 
                            onSave={updateCourse} 
                            mentor={mentor} 
                            setMentor={setMentor} 
                          />
                        } 
                      />
                    </Routes>
                  </main>
                </div>
              )
            } 
          />

          <Route 
            path="/settings" 
            element={
              !isLoggedIn ? <Login onLogin={() => setIsLoggedIn(true)} isLoggedIn={isLoggedIn} /> : (
                <div className="flex">
                  <Sidebar branding={branding} onLogout={handleLogout} />
                  <main className="flex-1">
                    <Settings branding={branding} setBranding={setBranding} supabase={supabase} setSupabase={setSupabase} />
                  </main>
                </div>
              )
            } 
          />

          <Route 
            path="/course/:id" 
            element={<PublicCourseWrapper courses={courses} mentor={mentor} branding={branding} />} 
          />

          <Route path="/" element={<NavigateToDashboard isLoggedIn={isLoggedIn} />} />
        </Routes>
      </div>
    </Router>
  );
}

// --- Helper Route Wrappers ---
const NavigateToDashboard: React.FC<{ isLoggedIn: boolean }> = ({ isLoggedIn }) => {
  const navigate = useNavigate();
  useEffect(() => {
    if (isLoggedIn) navigate('/admin');
    else navigate('/login');
  }, [isLoggedIn, navigate]);
  return null;
};

const CourseEditorWrapper: React.FC<{ 
  courses: Course[]; 
  onSave: (course: Course) => void;
  mentor: Mentor;
  setMentor: React.Dispatch<React.SetStateAction<Mentor>>;
}> = ({ courses, onSave, mentor, setMentor }) => {
  const { pathname } = useLocation();
  const id = pathname.split('/').pop();
  const course = courses.find(c => c.id === id);
  if (!course) return <div className="p-8 font-bold">Kursus tidak ditemukan</div>;
  return <CourseEditor course={course} onSave={onSave} mentor={mentor} setMentor={setMentor} />;
};

const PublicCourseWrapper: React.FC<{ 
  courses: Course[]; 
  mentor: Mentor; 
  branding: Branding 
}> = ({ courses, mentor, branding }) => {
  const { pathname } = useLocation();
  const id = pathname.split('/').pop();
  const course = courses.find(c => c.id === id);
  if (!course) return (
    <div className="h-screen flex items-center justify-center p-8 text-center flex-col gap-6">
       <div className="bg-[#FBBF24] p-12 rounded-full border-4 border-[#1E293B] hard-shadow">
          <X size={80} />
       </div>
       <h1 className="text-4xl font-extrabold">Halaman Tidak Ditemukan</h1>
       <p className="text-[#64748B]">Mungkin link yang Anda gunakan sudah kedaluwarsa atau salah.</p>
       <Button onClick={() => window.location.hash = '/'}>Kembali Beranda</Button>
    </div>
  );
  return <PublicCourseView course={course} mentor={mentor} branding={branding} />;
};
