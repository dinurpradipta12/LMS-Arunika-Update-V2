
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { createPortal } from 'react-dom';
import ReactDOMClient from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate, useParams, useLocation } from 'react-router-dom';
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
  MoreHorizontal,
  Tag
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

import { Course, Mentor, Branding, SupabaseConfig, Module, Asset, Category } from './types';
import { Button, Card, Input, Textarea, Badge } from './components/UI';

// --- UTILS ---
const compressImage = (base64Str: string, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
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
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
};

const getYoutubeDurationPlaceholder = (url: string) => {
  if (!url) return "";
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    // Simulated detection logic for demo purposes
    // In a real app, this would call a meta-fetcher or YouTube Data API
    return "12:45"; 
  }
  return "";
};

// --- DEFAULTS ---
const defaultBranding: Branding = {
  logo: '',
  siteName: 'Platform Arunika',
  availableCategories: [
    { id: 'cat-1', name: 'Design', color: '#8B5CF6' },
    { id: 'cat-2', name: 'Marketing', color: '#F472B6' },
    { id: 'cat-3', name: 'Coding', color: '#34D399' }
  ]
};

const defaultMentor: Mentor = {
  id: 'profile',
  name: '',
  role: '',
  bio: '',
  photo: '',
  socials: {}
};

// --- Storage & Analytics ---
const getStorageItem = <T,>(key: string, defaultValue: T): T => {
  const saved = localStorage.getItem(key);
  try { return saved ? JSON.parse(saved) : defaultValue; } catch (e) { return defaultValue; }
};
const setStorageItem = (key: string, value: any) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e: any) { console.error(`Error saving ${key}:`, e); }
};

let supabaseInstance: any = null;
let lastSupabaseConfig: SupabaseConfig | null = null;

const getSupabaseClient = (config: SupabaseConfig) => {
  if (!config.url || !config.anonKey) return null;
  if (supabaseInstance && lastSupabaseConfig?.url === config.url && lastSupabaseConfig?.anonKey === config.anonKey) return supabaseInstance;
  try {
    supabaseInstance = createClient(config.url, config.anonKey, { auth: { persistSession: false } });
    lastSupabaseConfig = config;
    return supabaseInstance;
  } catch (e) { return null; }
};

const generateShareLink = (courseId: string) => `${window.location.origin}/course/${courseId}`;

const TiktokIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

// --- UI COMPONENTS ---
const CropModal: React.FC<{ isOpen: boolean; onClose: () => void; image: string; onCrop: (croppedBase64: string) => void; aspectRatio?: number; }> = ({ isOpen, onClose, image, onCrop, aspectRatio = 1 }) => {
  const [isApplying, setIsApplying] = useState(false);
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);
  if (!isOpen) return null;
  const handleApply = async () => {
    setIsApplying(true);
    try {
      const compressed = await compressImage(image, aspectRatio === 1 ? 400 : 1000, 0.7);
      onCrop(compressed);
      onClose();
    } catch (e) { console.error(e); } finally { setIsApplying(false); }
  };
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white border-4 border-[#1E293B] rounded-3xl p-6 md:p-8 max-w-xl w-full hard-shadow space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-extrabold text-[#1E293B]">Optimize Image</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X/></button>
        </div>
        <div className={`overflow-hidden rounded-2xl border-4 border-[#1E293B] bg-[#F1F5F9] flex items-center justify-center ${aspectRatio === 1 ? 'aspect-square max-w-[280px] mx-auto' : 'aspect-video'}`}>
           <img src={image} className="w-full h-full object-cover" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Button variant="secondary" onClick={onClose} disabled={isApplying}>Batal</Button>
          <Button variant="primary" onClick={handleApply} isLoading={isApplying} icon={isApplying ? undefined : Check}>Terapkan</Button>
        </div>
      </div>
    </div>, document.body
  );
};

const ImageUpload: React.FC<{ value: string; onChange: (base64: string) => void; label?: string; variant?: 'default' | 'minimal'; aspectRatio?: number; }> = ({ value, onChange, label, variant = 'default', aspectRatio = 1.77 }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setTempImage(reader.result as string); setIsCropperOpen(true); };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };
  return (
    <div className="space-y-2">
      {label && <label className="text-xs font-extrabold uppercase tracking-wide text-[#64748B] ml-1">{label}</label>}
      <div onClick={() => fileInputRef.current?.click()} className={`relative group cursor-pointer border-2 border-[#1E293B] rounded-2xl overflow-hidden bg-white flex items-center justify-center transition-all ${variant === 'minimal' ? 'p-4' : 'aspect-video hard-shadow hover:hard-shadow-hover'}`}>
        {value ? <img src={value} className={`${variant === 'minimal' ? 'max-h-24' : 'w-full h-full object-cover'}`} /> : <div className="text-center p-4"><Upload className="mx-auto mb-2 text-[#8B5CF6]" size={32} /><p className="font-bold text-sm">Upload</p></div>}
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
      </div>
      {tempImage && <CropModal isOpen={isCropperOpen} onClose={() => setIsCropperOpen(false)} image={tempImage} onCrop={onChange} aspectRatio={aspectRatio} />}
    </div>
  );
};

const AdvancedEditor: React.FC<{ value: string; onChange: (v: string) => void; label: string; placeholder?: string }> = ({ value, onChange, label, placeholder }) => {
  return (
    <div className="space-y-2">
      <label className="text-xs font-extrabold uppercase tracking-wide text-[#64748B] ml-1">{label}</label>
      <div className="border-2 border-[#1E293B] rounded-2xl overflow-hidden bg-white hard-shadow focus-within:hard-shadow-hover transition-all">
        <div className="bg-[#F8FAFC] border-b-2 border-[#1E293B] p-2 flex items-center flex-wrap gap-1">
          <div className="flex gap-1 border-r-2 border-[#E2E8F0] pr-2 mr-1">
            <button className="p-1.5 hover:bg-white rounded-lg transition-all border border-transparent hover:border-[#1E293B]"><Bold size={14}/></button>
            <button className="p-1.5 hover:bg-white rounded-lg transition-all border border-transparent hover:border-[#1E293B]"><Italic size={14}/></button>
            <button className="p-1.5 hover:bg-white rounded-lg transition-all border border-transparent hover:border-[#1E293B]"><Type size={14}/></button>
          </div>
          <div className="flex gap-1 border-r-2 border-[#E2E8F0] pr-2 mr-1">
            <button className="p-1.5 hover:bg-white rounded-lg transition-all border border-transparent hover:border-[#1E293B]"><List size={14}/></button>
            <button className="p-1.5 hover:bg-white rounded-lg transition-all border border-transparent hover:border-[#1E293B]"><ListOrdered size={14}/></button>
          </div>
          <div className="flex gap-1 border-r-2 border-[#E2E8F0] pr-2 mr-1">
            <button className="p-1.5 hover:bg-white rounded-lg transition-all border border-transparent hover:border-[#1E293B]"><AlignLeft size={14}/></button>
            <button className="p-1.5 hover:bg-white rounded-lg transition-all border border-transparent hover:border-[#1E293B]"><AlignCenter size={14}/></button>
            <button className="p-1.5 hover:bg-white rounded-lg transition-all border border-transparent hover:border-[#1E293B]"><AlignRight size={14}/></button>
          </div>
          <div className="flex gap-1">
            <button className="p-1.5 hover:bg-white rounded-lg transition-all border border-transparent hover:border-[#1E293B]"><MoveVertical size={14}/></button>
            <button className="p-1.5 hover:bg-white rounded-lg transition-all border border-transparent hover:border-[#1E293B]"><LinkIcon size={14}/></button>
            <button className="p-1.5 hover:bg-white rounded-lg transition-all border border-transparent hover:border-[#1E293B]"><MoreHorizontal size={14}/></button>
          </div>
          <div className="ml-auto"><Badge className="text-[8px]" color="#8B5CF6"><span className="text-white">PRO EDITOR</span></Badge></div>
        </div>
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full p-4 min-h-[160px] outline-none font-medium text-[#1E293B] bg-transparent resize-none leading-relaxed text-sm" />
      </div>
    </div>
  );
};

// --- PAGES ---
const AnalyticsPage: React.FC<{ courses: Course[], supabase: SupabaseConfig }> = ({ courses, supabase }) => {
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => {
    const client = getSupabaseClient(supabase);
    if (!client) return;
    client.from('events').select('*').order('created_at', { ascending: false }).then(({ data }) => data && setEvents(data));
  }, [supabase]);
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-extrabold">Analytics</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card><h2 className="text-4xl font-extrabold">{events.length}</h2><p className="text-xs font-bold uppercase text-[#64748B]">Total Views</p></Card>
        <Card><h2 className="text-4xl font-extrabold">{new Set(events.map(e => e.visitor_id)).size}</h2><p className="text-xs font-bold uppercase text-[#64748B]">Unique Visitors</p></Card>
        <Card><h2 className="text-4xl font-extrabold text-[#34D399]">100%</h2><p className="text-xs font-bold uppercase text-[#64748B]">System Uptime</p></Card>
      </div>
    </div>
  );
};

const SettingsPage: React.FC<{ branding: Branding, setBranding: (b: Branding) => void, onLocalEdit: () => void }> = ({ branding, setBranding, onLocalEdit }) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#8B5CF6');
  const addCategory = () => {
    if (!newCatName) return;
    const updated = { ...branding, availableCategories: [...(branding.availableCategories || []), { id: `cat-${Date.now()}`, name: newCatName, color: newCatColor }] };
    setBranding(updated);
    setNewCatName('');
    onLocalEdit();
  };
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-12">
      <h1 className="text-3xl font-extrabold">Settings & Branding</h1>
      <section className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2"><Layout size={20}/> Global Branding</h2>
        <Card className="grid md:grid-cols-2 gap-8">
          <Input label="Site Name" value={branding.siteName} onChange={e => { onLocalEdit(); setBranding({...branding, siteName: e.target.value}) }} />
          <ImageUpload label="Logo" variant="minimal" value={branding.logo} onChange={logo => { onLocalEdit(); setBranding({...branding, logo}) }} />
        </Card>
      </section>
      <section className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2"><Tag size={20}/> Kategori Kursus</h2>
        <Card className="space-y-6">
           <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]"><Input label="Nama Kategori" placeholder="e.g. Design" value={newCatName} onChange={e => setNewCatName(e.target.value)} /></div>
              <div><label className="text-xs font-extrabold uppercase block mb-2">Warna</label><input type="color" value={newCatColor} onChange={e => setNewCatColor(e.target.value)} className="w-16 h-12 border-2 border-[#1E293B] rounded-xl cursor-pointer" /></div>
              <Button variant="primary" onClick={addCategory} icon={Plus}>Tambah</Button>
           </div>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(branding.availableCategories || []).map(cat => (
                <div key={cat.id} className="p-3 bg-white border-2 border-[#1E293B] rounded-xl flex items-center justify-between hard-shadow">
                  <span className="font-bold text-xs truncate" style={{ color: cat.color }}>{cat.name}</span>
                  <button onClick={() => { setBranding({...branding, availableCategories: branding.availableCategories?.filter(c => c.id !== cat.id)}); onLocalEdit(); }} className="text-red-500 hover:bg-red-50 rounded-lg p-1"><X size={14}/></button>
                </div>
              ))}
           </div>
        </Card>
      </section>
    </div>
  );
};

const CourseEditor: React.FC<{ courses: Course[], onSave: (c: Course, m: Mentor) => Promise<void>, mentor: Mentor, setMentor: (m: Mentor) => void, branding: Branding }> = ({ courses, onSave, mentor, setMentor, branding }) => {
  const { id } = useParams<{ id: string }>();
  const course = courses.find(c => c.id === id);
  const [editedCourse, setEditedCourse] = useState<Course | null>(null);
  const [localMentor, setLocalMentor] = useState<Mentor>(mentor);
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => { if (course) setEditedCourse({ ...course }); setLocalMentor({ ...mentor }); }, [id, course, mentor]);
  if (!editedCourse) return <div>Loading...</div>;
  const toggleCategory = (catId: string) => {
    const current = editedCourse.categoryIds || [];
    const updated = current.includes(catId) ? current.filter(i => i !== catId) : [...current, catId];
    setEditedCourse({...editedCourse, categoryIds: updated});
  };
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 pb-32">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-extrabold">Edit Kursus</h1>
        <Button onClick={() => onSave(editedCourse, localMentor).then(() => alert('Disimpan!'))} icon={Save} isLoading={isSaving}>Simpan</Button>
      </div>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="space-y-6">
            <h3 className="font-bold text-xl flex items-center gap-2"><Pencil size={18}/> Detail Utama</h3>
            <Input label="Judul" value={editedCourse.title} onChange={e => setEditedCourse({...editedCourse, title: e.target.value})} />
            <Textarea label="Deskripsi" value={editedCourse.description} onChange={e => setEditedCourse({...editedCourse, description: e.target.value})} />
            <div>
              <label className="text-xs font-extrabold uppercase mb-2 block">Pilih Kategori</label>
              <div className="flex flex-wrap gap-2">
                {(branding.availableCategories || []).map(cat => (
                  <button key={cat.id} onClick={() => toggleCategory(cat.id)} className={`px-4 py-2 rounded-xl border-2 font-bold text-xs transition-all ${editedCourse.categoryIds?.includes(cat.id) ? 'bg-[#1E293B] text-white' : 'bg-white text-[#1E293B]'}`} style={!editedCourse.categoryIds?.includes(cat.id) ? { borderColor: cat.color } : {}}>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
            <ImageUpload label="Cover" value={editedCourse.coverImage} onChange={img => setEditedCourse({...editedCourse, coverImage: img})} />
          </Card>
          <div className="space-y-4">
             <div className="flex justify-between items-center"><h3 className="font-bold text-xl">Kurikulum</h3><Button variant="yellow" onClick={() => setEditedCourse({...editedCourse, modules: [...editedCourse.modules, { id: `m-${Date.now()}`, title: 'Materi Baru', type: 'video', content: '', description: '' }]})}>+ Materi</Button></div>
             {editedCourse.modules.map((mod, idx) => (
               <Card key={mod.id} className="space-y-4 relative">
                 <button onClick={() => setEditedCourse({...editedCourse, modules: editedCourse.modules.filter((_, i) => i !== idx)})} className="absolute top-4 right-4 text-red-500"><Trash2 size={16}/></button>
                 <Input label="Judul Materi" value={mod.title} onChange={e => { const m = [...editedCourse.modules]; m[idx].title = e.target.value; setEditedCourse({...editedCourse, modules: m}); }} />
                 <Input label="Link YouTube / Teks" value={mod.content} onChange={e => { const m = [...editedCourse.modules]; m[idx].content = e.target.value; setEditedCourse({...editedCourse, modules: m}); }} />
                 <Textarea label="Deskripsi Materi" value={mod.description} onChange={e => { const m = [...editedCourse.modules]; m[idx].description = e.target.value; setEditedCourse({...editedCourse, modules: m}); }} />
               </Card>
             ))}
          </div>
        </div>
        <div className="space-y-8">
          <Card className="space-y-6">
            <h3 className="font-bold text-xl">Info Mentor</h3>
            <ImageUpload variant="minimal" aspectRatio={1} value={localMentor.photo} onChange={p => setLocalMentor({...localMentor, photo: p})} />
            <Input label="Nama" value={localMentor.name} onChange={e => setLocalMentor({...localMentor, name: e.target.value})} />
            <Textarea label="Bio" value={localMentor.bio} onChange={e => setLocalMentor({...localMentor, bio: e.target.value})} />
          </Card>
        </div>
      </div>
    </div>
  );
};

const PublicCourseView: React.FC<{ courses: Course[], mentor: Mentor, branding: Branding, supabase: SupabaseConfig }> = ({ courses, mentor: initialMentor, branding: initialBranding, supabase }) => {
  const { id } = useParams<{ id: string }>();
  const [course, setLocalCourse] = useState<Course | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  useEffect(() => {
    const client = getSupabaseClient(supabase);
    if (!client) return;
    client.from('courses').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        const full: Course = { ...data, cover_image: data.cover_image, modules: data.modules || [], assets: data.assets || [], category_ids: data.category_ids || [] };
        setLocalCourse(full);
        if (full.modules.length > 0) setSelectedModule(full.modules[0]);
      }
    });
  }, [id, supabase]);

  if (!course) return <div className="h-screen flex items-center justify-center font-bold text-[#64748B]">Memuat Kursus...</div>;

  return (
    <div className="min-h-screen bg-[#FFFDF5] flex flex-col">
      <header className="bg-white border-b-2 border-[#1E293B] p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3"><img src={initialBranding.logo} className="w-10 h-10 object-contain" /><span className="font-extrabold text-xl">{initialBranding.siteName}</span></div>
          <Badge>{course.modules.length} Materi</Badge>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-4 md:p-8 grid lg:grid-cols-4 gap-8 flex-1">
        <div className="lg:col-span-3 space-y-6">
          <div className="flex flex-col gap-3 pb-2">
            <h1 className="text-xl md:text-2xl font-extrabold text-[#1E293B]">{course.title}</h1>
            <div className="flex flex-wrap gap-2">
              {(course.categoryIds || []).map(catId => {
                const cat = initialBranding.availableCategories?.find(c => c.id === catId);
                return cat ? <span key={catId} className="px-3 py-1 rounded-lg border-2 border-[#1E293B] text-[10px] font-black uppercase tracking-widest" style={{ backgroundColor: cat.color }}>{cat.name}</span> : null;
              })}
            </div>
          </div>
          {selectedModule && (
            <div className="space-y-6">
              <div className="bg-white border-4 border-[#1E293B] rounded-2xl overflow-hidden shadow-[8px_8px_0px_0px_#E2E8F0]">
                {selectedModule.type === 'video' ? <iframe className="w-full aspect-video" src={`https://www.youtube.com/embed/${selectedModule.content.split('v=')[1]?.split('&')[0] || selectedModule.content.split('/').pop()}`} frameBorder="0" allowFullScreen /> : <div className="p-8 prose prose-slate max-w-none whitespace-pre-wrap font-medium leading-relaxed bg-white">{selectedModule.content}</div>}
              </div>
              {selectedModule.description && (
                <div className="space-y-3 pt-4 border-t-2 border-[#E2E8F0]">
                  <h4 className="font-extrabold text-sm uppercase tracking-widest text-[#8B5CF6] flex items-center gap-2"><FileText size={16}/> Deskripsi Materi</h4>
                  <p className="text-[#1E293B] text-lg font-medium leading-relaxed whitespace-pre-wrap">{selectedModule.description}</p>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border-2 border-[#1E293B] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#E2E8F0] text-center">
            <img src={initialMentor.photo} className="w-24 h-24 mx-auto rounded-full border-4 border-[#1E293B] mb-4 object-cover" />
            <h3 className="font-bold text-lg">{initialMentor.name}</h3>
            <p className="text-xs text-[#8B5CF6] font-extrabold uppercase tracking-widest mb-4">{initialMentor.role}</p>
            <p className="text-xs text-[#64748B] line-clamp-3 mb-6 font-medium">{initialMentor.bio}</p>
            {initialMentor.socials?.website && <a href={initialMentor.socials.website} target="_blank" className="block w-full"><Button variant="primary" className="w-full text-xs h-11">Template lainnya</Button></a>}
          </div>
          <div className="bg-white border-2 border-[#1E293B] rounded-3xl p-5 shadow-[4px_4px_0px_0px_#E2E8F0] space-y-3">
            <h4 className="font-extrabold mb-4 flex items-center gap-2 text-[#1E293B] uppercase tracking-widest text-xs"><List size={18} className="text-[#8B5CF6]"/> Daftar Materi</h4>
            <div className="space-y-2">
              {course.modules.map((m, i) => (
                <button key={m.id} onClick={() => setSelectedModule(m)} className={`w-full text-left p-3 rounded-2xl border-2 transition-all ${selectedModule?.id === m.id ? 'bg-[#FBBF24] border-[#1E293B]' : 'border-transparent hover:bg-[#F8FAFC]'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full border-2 border-[#1E293B] flex-shrink-0 flex items-center justify-center text-xs font-black ${selectedModule?.id === m.id ? 'bg-white' : 'bg-[#F1F5F9]'}`}>{i+1}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold truncate text-[#1E293B]">{m.title}</p>
                      <p className="text-[10px] font-bold text-[#64748B] flex items-center gap-1 mt-0.5"><Clock size={10}/> {m.duration || (m.type === 'video' ? getYoutubeDurationPlaceholder(m.content) : "5 min")}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// --- AUTH & LAYOUT ---
// Fix: Added missing Login component
const Login: React.FC<{ isLoggedIn: boolean; onLogin: () => void }> = ({ isLoggedIn, onLogin }) => {
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  if (isLoggedIn) return <Navigate to="/admin" />;
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') { onLogin(); navigate('/admin'); }
    else { alert('Password salah! (Gunakan: admin123)'); }
  };
  return (
    <div className="min-h-screen bg-[#FFFDF5] flex items-center justify-center p-4">
      <Card className="max-w-md w-full space-y-8 p-10">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#8B5CF6] rounded-3xl border-4 border-[#1E293B] hard-shadow flex items-center justify-center mx-auto mb-6"><Layout size={40} className="text-white" /></div>
          <h2 className="text-3xl font-black text-[#1E293B]">Admin Panel</h2>
          <p className="text-[#64748B] font-bold mt-2">Silakan masuk untuk mengelola kursus</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          <Button type="submit" className="w-full" icon={ChevronRight}>Masuk</Button>
        </form>
      </Card>
    </div>
  );
};

// Fix: Added missing AdminLayout component
const AdminLayout: React.FC<{ 
  children: React.ReactNode; 
  branding: Branding; 
  onLogout: () => void; 
  isSidebarOpen: boolean; 
  setIsSidebarOpen: (o: boolean) => void; 
}> = ({ children, branding, onLogout, isSidebarOpen, setIsSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const menuItems = [
    { icon: LayoutGrid, label: 'Dashboard', path: '/admin' },
    { icon: BarChart2, label: 'Analytics', path: '/analytics' },
    { icon: SettingsIcon, label: 'Settings', path: '/settings' },
  ];
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row">
      <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden fixed bottom-6 right-6 z-[100] bg-[#8B5CF6] text-white p-4 rounded-full border-4 border-[#1E293B] hard-shadow">
        {isSidebarOpen ? <X /> : <Menu />}
      </button>
      <aside className={`fixed inset-y-0 left-0 z-[90] w-72 bg-white border-r-4 border-[#1E293B] transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 h-full flex flex-col">
          <div className="flex items-center gap-3 mb-12">
            {branding.logo ? <img src={branding.logo} className="w-10 h-10 object-contain" /> : <div className="w-10 h-10 bg-[#8B5CF6] rounded-xl border-2 border-[#1E293B]" />}
            <span className="font-black text-xl tracking-tight">{branding.siteName}</span>
          </div>
          <nav className="flex-1 space-y-3">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path} onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all font-bold ${isActive ? 'bg-[#FBBF24] border-[#1E293B] hard-shadow' : 'border-transparent hover:bg-slate-50'}`}>
                  <item.icon size={20} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button onClick={() => { onLogout(); navigate('/login'); }} className="flex items-center gap-4 p-4 rounded-2xl border-2 border-transparent hover:bg-red-50 text-red-500 font-bold transition-all"><LogOut size={20} />Logout</button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
};

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => getStorageItem('isLoggedIn', false));
  const [branding, setBranding] = useState<Branding>(() => getStorageItem('branding', defaultBranding));
  const [mentor, setMentor] = useState<Mentor>(() => getStorageItem('mentor', defaultMentor));
  const [courses, setCourses] = useState<Course[]>(() => getStorageItem('courses', []));
  const [supabase, setSupabase] = useState<SupabaseConfig>(() => getStorageItem('supabase', { url: 'https://mhuqqbbqlovdiquaktzd.supabase.co', anonKey: '' }));

  useEffect(() => { setStorageItem('branding', branding); setStorageItem('mentor', mentor); setStorageItem('courses', courses); }, [branding, mentor, courses]);

  const handleSaveCourse = async (course: Course, mentorData: Mentor) => {
    const client = getSupabaseClient(supabase);
    if (client) {
      const payload = { ...course, cover_image: course.coverImage, category_ids: course.categoryIds };
      await client.from('courses').upsert(payload);
      await client.from('mentor').upsert({ ...mentorData, id: 'profile' });
    }
    setCourses(prev => prev.map(c => c.id === course.id ? course : c));
    setMentor(mentorData);
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login isLoggedIn={isLoggedIn} onLogin={() => setIsLoggedIn(true)} />} />
        <Route path="/admin" element={isLoggedIn ? <AdminLayout branding={branding} onLogout={() => setIsLoggedIn(false)} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}><AdminDashboard courses={courses} setCourses={setCourses} supabase={supabase} onDeleteCourse={async (id) => setCourses(courses.filter(c => c.id !== id))} /></AdminLayout> : <Navigate to="/login" />} />
        <Route path="/admin/course/:id" element={isLoggedIn ? <AdminLayout branding={branding} onLogout={() => setIsLoggedIn(false)} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}><CourseEditor courses={courses} onSave={handleSaveCourse} mentor={mentor} setMentor={setMentor} branding={branding} /></AdminLayout> : <Navigate to="/login" />} />
        <Route path="/analytics" element={isLoggedIn ? <AdminLayout branding={branding} onLogout={() => setIsLoggedIn(false)} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}><AnalyticsPage courses={courses} supabase={supabase} /></AdminLayout> : <Navigate to="/login" />} />
        <Route path="/settings" element={isLoggedIn ? <AdminLayout branding={branding} onLogout={() => setIsLoggedIn(false)} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}><SettingsPage branding={branding} setBranding={setBranding} onLocalEdit={() => {}} /></AdminLayout> : <Navigate to="/login" />} />
        <Route path="/course/:id" element={<PublicCourseView courses={courses} mentor={mentor} branding={branding} supabase={supabase} />} />
        <Route path="/" element={<Navigate to="/admin" />} />
      </Routes>
    </Router>
  );
};

const AdminDashboard: React.FC<{ courses: Course[], setCourses: any, supabase: SupabaseConfig, onDeleteCourse: any }> = ({ courses, setCourses, supabase, onDeleteCourse }) => {
  const navigate = useNavigate();
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center"><h1 className="text-3xl font-extrabold">My Courses</h1><Button icon={Plus} onClick={() => { const id = `c-${Date.now()}`; setCourses([...courses, { id, title: 'Baru', modules: [], assets: [], mentorId: 'profile', description: '', coverImage: '' }]); navigate(`/admin/course/${id}`); }}>Tambah Kursus</Button></div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map(c => <Card key={c.id}><h3 className="font-bold mb-2">{c.title}</h3><Button onClick={() => navigate(`/admin/course/${c.id}`)}>Edit</Button></Card>)}
      </div>
    </div>
  );
};

const root = ReactDOMClient.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
