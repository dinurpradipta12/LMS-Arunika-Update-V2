
import React, { useState, useEffect } from 'react';
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
  X
} from 'lucide-react';
import { Course, Mentor, Branding, SupabaseConfig, Module } from './types';
import { initialCourses, initialMentor, initialBranding } from './mockData';
import { Button, Card, Input, Textarea, Badge } from './components/UI';

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

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-extrabold mb-2 text-[#1E293B]">Dashboard Kursus</h1>
          <p className="text-[#64748B]">Kelola konten publik Anda di sini.</p>
        </div>
        <Button icon={Plus} onClick={handleAddCourse}>Tambah Kursus</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map((course) => (
          <Card key={course.id} className="group overflow-hidden flex flex-col">
            <img src={course.coverImage} className="w-full h-48 object-cover rounded-lg border-2 border-[#1E293B] mb-4" alt={course.title} />
            <div className="flex-1">
              <h3 className="text-xl font-extrabold group-hover:text-[#8B5CF6] transition-colors">{course.title}</h3>
              <p className="text-sm text-[#64748B] line-clamp-2 mt-2 mb-4">{course.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button onClick={() => navigate(`/admin/course/${course.id}`)} variant="secondary" className="text-xs">Edit</Button>
              <Button onClick={() => window.open(`#/course/${course.id}`, '_blank')} variant="yellow" className="text-xs" icon={Globe}>Preview</Button>
              <Button 
                onClick={() => {
                  const url = `${window.location.origin}${window.location.pathname}#/course/${course.id}`;
                  navigator.clipboard.writeText(url);
                  alert('Link publik berhasil disalin!');
                }} 
                variant="green" className="text-xs col-span-2" icon={Share2}
              >
                Share Public Link
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// --- Settings Page ---
/* Added Settings component to fix line 170 error */
const Settings: React.FC<{ 
  branding: Branding; 
  setBranding: React.Dispatch<React.SetStateAction<Branding>>;
  supabase: SupabaseConfig;
  setSupabase: React.Dispatch<React.SetStateAction<SupabaseConfig>>;
}> = ({ branding, setBranding, supabase, setSupabase }) => {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-extrabold mb-8 text-[#1E293B]">Settings</h1>
      
      <div className="space-y-12">
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Layout size={24} className="text-[#8B5CF6]" /> Branding
          </h2>
          <Card className="space-y-4">
            <Input 
              label="Site Name" 
              value={branding.siteName} 
              onChange={e => setBranding({...branding, siteName: e.target.value})} 
            />
            <Input 
              label="Logo URL" 
              value={branding.logo} 
              onChange={e => setBranding({...branding, logo: e.target.value})} 
            />
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Database size={24} className="text-[#8B5CF6]" /> Database (Supabase)
          </h2>
          <Card className="space-y-4">
            <Input 
              label="Supabase URL" 
              value={supabase.url} 
              onChange={e => setSupabase({...supabase, url: e.target.value})} 
              placeholder="https://xxx.supabase.co"
            />
            <Input 
              label="Anon Key" 
              value={supabase.anonKey} 
              onChange={e => setSupabase({...supabase, anonKey: e.target.value})} 
              placeholder="eyJhb..."
              type="password"
            />
          </Card>
        </section>
      </div>
    </div>
  );
};

// --- Full Application ---
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
        <Route path="/admin" element={isLoggedIn ? <div className="flex"><Sidebar branding={branding} onLogout={() => setIsLoggedIn(false)} /><main className="flex-1"><AdminDashboard courses={courses} setCourses={setCourses} /></main></div> : <Navigate to="/login" />} />
        <Route path="/admin/course/:id" element={isLoggedIn ? <div className="flex"><Sidebar branding={branding} onLogout={() => setIsLoggedIn(false)} /><main className="flex-1"><CourseEditorWrapper courses={courses} onSave={updateCourse} mentor={mentor} setMentor={setMentor} /></main></div> : <Navigate to="/login" />} />
        <Route path="/settings" element={isLoggedIn ? <div className="flex"><Sidebar branding={branding} onLogout={() => setIsLoggedIn(false)} /><main className="flex-1"><Settings branding={branding} setBranding={setBranding} supabase={supabase} setSupabase={setSupabase} /></main></div> : <Navigate to="/login" />} />
        <Route path="/course/:id" element={<PublicCourseWrapper courses={courses} mentor={mentor} branding={branding} />} />
        <Route path="/" element={<Navigate to={isLoggedIn ? "/admin" : "/login"} />} />
      </Routes>
    </div>
  );
};

/* Implemented full CourseEditorWrapper logic */
const CourseEditorWrapper: React.FC<{ 
  courses: Course[]; 
  onSave: (c: Course) => void; 
  mentor: Mentor; 
  setMentor: React.Dispatch<React.SetStateAction<Mentor>> 
}> = ({ courses, onSave, mentor, setMentor }) => {
  const { id } = useParams<{ id: string }>();
  const course = courses.find(c => c.id === id);
  
  const [editedCourse, setEditedCourse] = useState<Course | null>(course || null);

  useEffect(() => {
    if (course) setEditedCourse(course);
  }, [course]);

  if (!editedCourse) return <div className="p-8 font-bold">Kursus tidak ditemukan</div>;

  const handleSave = () => {
    onSave(editedCourse);
    alert('Kursus berhasil disimpan!');
  };

  const addModule = () => {
    const newModule: Module = {
      id: `m-${Date.now()}`,
      title: 'Modul Baru',
      type: 'video',
      content: '',
      duration: '00:00'
    };
    setEditedCourse({ ...editedCourse, modules: [...editedCourse.modules, newModule] });
  };

  const updateModule = (index: number, field: string, value: any) => {
    const newModules = [...editedCourse.modules];
    newModules[index] = { ...newModules[index], [field]: value };
    setEditedCourse({ ...editedCourse, modules: newModules });
  };

  const removeModule = (index: number) => {
    const newModules = editedCourse.modules.filter((_, i) => i !== index);
    setEditedCourse({ ...editedCourse, modules: newModules });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-[#1E293B]">Edit: {editedCourse.title}</h1>
        <Button onClick={handleSave} icon={Database}>Simpan Perubahan</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <h3 className="text-xl font-bold mb-4">Informasi Utama</h3>
            <div className="space-y-4">
              <Input 
                label="Judul Kursus" 
                value={editedCourse.title} 
                onChange={e => setEditedCourse({...editedCourse, title: e.target.value})} 
              />
              <Textarea 
                label="Deskripsi" 
                value={editedCourse.description} 
                onChange={e => setEditedCourse({...editedCourse, description: e.target.value})} 
              />
              <Input 
                label="Cover Image URL" 
                value={editedCourse.coverImage} 
                onChange={e => setEditedCourse({...editedCourse, coverImage: e.target.value})} 
              />
            </div>
          </Card>

          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Modul Pembelajaran</h3>
              <Button variant="secondary" className="text-xs" icon={Plus} onClick={addModule}>Tambah Modul</Button>
            </div>
            <div className="space-y-4">
              {editedCourse.modules.map((mod, idx) => (
                <Card key={mod.id} className="relative group">
                  <button 
                    onClick={() => removeModule(idx)}
                    className="absolute top-4 right-4 text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      label="Judul Modul" 
                      value={mod.title} 
                      onChange={e => updateModule(idx, 'title', e.target.value)} 
                    />
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-xs font-extrabold uppercase tracking-wide text-[#64748B] ml-1">Tipe Konten</label>
                        <select 
                          className="w-full bg-white border-2 border-[#CBD5E1] rounded-xl px-4 py-3 text-[#1E293B] mt-2 outline-none"
                          value={mod.type}
                          onChange={e => updateModule(idx, 'type', e.target.value as any)}
                        >
                          <option value="video">🎥 Video (YouTube)</option>
                          <option value="text">📄 Text (Markdown)</option>
                        </select>
                      </div>
                      <Input 
                        label="Durasi/Estimasi" 
                        className="w-24"
                        value={mod.duration || ''} 
                        onChange={e => updateModule(idx, 'duration', e.target.value)} 
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    {mod.type === 'video' ? (
                      <Input 
                        label="YouTube URL" 
                        value={mod.content} 
                        onChange={e => updateModule(idx, 'content', e.target.value)} 
                      />
                    ) : (
                      <Textarea 
                        label="Markdown Content" 
                        value={mod.content} 
                        onChange={e => updateModule(idx, 'content', e.target.value)} 
                      />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <Card>
            <h3 className="text-xl font-bold mb-4">Profil Mentor</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <img src={mentor.photo} className="w-16 h-16 rounded-full border-2 border-[#1E293B]" alt={mentor.name} />
                <div>
                  <h4 className="font-bold">{mentor.name}</h4>
                  <p className="text-xs text-[#64748B]">{mentor.role}</p>
                </div>
              </div>
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

/* Implemented full PublicCourseWrapper logic */
const PublicCourseWrapper: React.FC<{ courses: Course[]; mentor: Mentor; branding: Branding }> = ({ courses, mentor, branding }) => {
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
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-white border-b-2 border-[#1E293B] p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={branding.logo} className="w-10 h-10 rounded-lg border-2 border-[#1E293B]" alt="Logo" />
            <span className="font-extrabold text-xl">{branding.siteName}</span>
          </Link>
          <div className="hidden md:flex items-center gap-2">
            <Badge>{course.modules.length} Modul</Badge>
            <Badge color="#34D399">{course.title}</Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
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
                    <h1 className="text-3xl font-extrabold mb-6">{selectedModule.title}</h1>
                    <div className="whitespace-pre-wrap font-medium text-[#1E293B]">
                      {selectedModule.content}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-extrabold">{selectedModule.title}</h2>
                <Badge color="#8B5CF6" className="text-white">{selectedModule.duration}</Badge>
              </div>
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center text-[#64748B] font-bold">Pilih modul untuk memulai</div>
          )}

          <div className="bg-white border-2 border-[#1E293B] rounded-3xl p-8 sticker-shadow">
            <h3 className="text-xl font-extrabold mb-4">Tentang Kursus Ini</h3>
            <p className="text-[#64748B] leading-relaxed mb-8">{course.description}</p>
            
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <img src={mentor.photo} className="w-24 h-24 rounded-2xl border-2 border-[#1E293B]" alt={mentor.name} />
              <div>
                <h4 className="font-extrabold text-lg">{mentor.name}</h4>
                <p className="text-sm font-bold text-[#8B5CF6] mb-2">{mentor.role}</p>
                <p className="text-[#64748B] text-sm mb-4">{mentor.bio}</p>
                <div className="flex gap-4">
                  {mentor.socials.instagram && <a href={`https://instagram.com/${mentor.socials.instagram}`} target="_blank" rel="noreferrer"><Instagram size={20} className="text-[#1E293B] hover:text-[#8B5CF6] transition-colors" /></a>}
                  {mentor.socials.linkedin && <a href={`https://linkedin.com/in/${mentor.socials.linkedin}`} target="_blank" rel="noreferrer"><Linkedin size={20} className="text-[#1E293B] hover:text-[#8B5CF6] transition-colors" /></a>}
                  {mentor.socials.twitter && <a href={`https://twitter.com/${mentor.socials.twitter}`} target="_blank" rel="noreferrer"><Twitter size={20} className="text-[#1E293B] hover:text-[#8B5CF6] transition-colors" /></a>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border-2 border-[#1E293B] rounded-3xl p-6 sticky top-28">
            <h3 className="font-extrabold text-lg mb-4 flex items-center gap-2">
              <BookOpen size={20} /> Kurikulum
            </h3>
            <div className="space-y-3">
              {course.modules.map((mod) => (
                <button 
                  key={mod.id}
                  onClick={() => setSelectedModule(mod)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-3 ${selectedModule?.id === mod.id ? 'bg-[#FBBF24] border-[#1E293B] hard-shadow' : 'bg-white border-transparent hover:bg-[#F1F5F9]'}`}
                >
                  <div className={`mt-1 rounded-lg p-1 ${selectedModule?.id === mod.id ? 'bg-white' : 'bg-[#F1F5F9]'}`}>
                    {mod.type === 'video' ? <Video size={16} /> : <FileText size={16} />}
                  </div>
                  <div>
                    <p className="text-sm font-extrabold leading-tight">{mod.title}</p>
                    <p className="text-[10px] font-bold text-[#64748B] mt-1 uppercase">{mod.duration}</p>
                  </div>
                </button>
              ))}
            </div>

            {course.assets.length > 0 && (
              <div className="mt-8">
                <h3 className="font-extrabold text-lg mb-4">Resources</h3>
                <div className="space-y-2">
                  {course.assets.map(asset => (
                    <a 
                      key={asset.id} 
                      href={asset.url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl bg-[#F1F5F9] border-2 border-transparent hover:border-[#1E293B] transition-all"
                    >
                      <span className="text-sm font-bold truncate pr-2">{asset.name}</span>
                      <ExternalLink size={14} className="shrink-0" />
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

// --- ROOT RENDER ---
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
);
