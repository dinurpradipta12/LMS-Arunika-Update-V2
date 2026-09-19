import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  Loader2,
  LockKeyhole,
  PlayCircle,
  Plus,
  Save,
  Trash2,
  Upload,
  UserRound,
  Users,
  Video,
  XCircle
} from 'lucide-react';

import {
  OneToOneNote,
  OneToOnePortal,
  OneToOneRecording,
  OneToOneScheduleEvent,
  OneToOneTask,
  OneToOneTheme
} from '../types';
import { Badge, Button, Card, Input, Textarea } from './UI';
import { getPublicBaseUrl, setPublicMetadata } from './PublicMetadata';

export const ONE_TO_ONE_SPACE_LABEL = '1:1 Mentorship';

type Notice = { tone: 'success' | 'error'; message: string } | null;
type OneToOneTab = 'overview' | 'recordings' | 'schedule' | 'tasks' | 'notes';

const themeOptions: Array<{ value: OneToOneTheme; label: string; color: string }> = [
  { value: 'navy', label: 'Navy', color: '#16436b' },
  { value: 'emerald', label: 'Emerald', color: '#187a68' },
  { value: 'coral', label: 'Coral', color: '#b55b4b' },
  { value: 'violet', label: 'Violet', color: '#6c55a4' },
  { value: 'amber', label: 'Amber', color: '#9b6a20' }
];

const oneToOneLink = (token: string) => {
  try {
    const url = new URL(getPublicBaseUrl());
    url.search = '';
    url.hash = `/one-to-one/${encodeURIComponent(token)}`;
    return url.toString();
  } catch {
    return `${window.location.origin}${window.location.pathname}#/one-to-one/${encodeURIComponent(token)}`;
  }
};

const databaseErrorMessage = (error: any) => {
  const message = String(error?.message || error?.details || '').trim();
  return message || 'Perubahan belum dapat disimpan. Pastikan migration 1:1 sudah dijalankan.';
};

const mapPortal = (row: any): OneToOnePortal => ({
  id: row.id,
  title: row.title || 'Ruang 1:1',
  menteeName: row.mentee_name || '',
  menteeEmail: row.mentee_email || '',
  mentorName: row.mentor_name || '',
  mentorRole: row.mentor_role || '',
  mentorAvatarUrl: row.mentor_avatar_url || '',
  logoUrl: row.logo_url || '',
  coverImageUrl: row.cover_image_url || '',
  welcomeTitle: row.welcome_title || 'Ruang belajar personal Anda',
  welcomeMessage: row.welcome_message || '',
  theme: row.theme || 'navy',
  accentColor: row.accent_color || '#16436b',
  isActive: row.is_active !== false,
  publicTokenHint: row.public_token_hint || '',
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapRecording = (row: any): OneToOneRecording => ({
  id: row.id,
  portalId: row.portal_id,
  title: row.title || '',
  description: row.description || '',
  videoUrl: row.video_url || '',
  materialUrl: row.material_url || '',
  duration: row.duration || '',
  sortOrder: row.sort_order || 0,
  isPublished: row.is_published !== false
});

const mapSchedule = (row: any): OneToOneScheduleEvent => ({
  id: row.id,
  portalId: row.portal_id,
  title: row.title || '',
  description: row.description || '',
  startsAt: row.starts_at || '',
  endsAt: row.ends_at || '',
  location: row.location || '',
  meetingUrl: row.meeting_url || '',
  status: row.status || 'scheduled',
  sortOrder: row.sort_order || 0
});

const mapTask = (row: any): OneToOneTask => ({
  id: row.id,
  portalId: row.portal_id,
  title: row.title || '',
  description: row.description || '',
  dueAt: row.due_at || '',
  status: row.status || 'todo',
  priority: row.priority || 'medium',
  sortOrder: row.sort_order || 0,
  isVisible: row.is_visible !== false
});

const mapNote = (row: any): OneToOneNote => ({
  id: row.id,
  portalId: row.portal_id,
  title: row.title || '',
  body: row.body || '',
  noteDate: row.note_date || '',
  isVisible: row.is_visible !== false,
  sortOrder: row.sort_order || 0
});

const inputDateTime = (value: string) => value ? value.slice(0, 16) : '';
const isoDateTime = (value: string) => value ? new Date(value).toISOString() : null;
const formatDate = (value: string, withTime = false) => {
  if (!value) return 'Belum diatur';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'long' }).format(date);
};

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', 'true');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  input.remove();
};

const NoticeMessage: React.FC<{ notice: Notice }> = ({ notice }) => notice ? (
  <div className={`rounded-xl border px-4 py-3 text-sm ${notice.tone === 'success' ? 'border-[var(--border)] bg-[var(--success-soft)] text-[var(--success-text)]' : 'border-red-200 bg-red-50 text-red-700'}`} role="status">
    {notice.message}
  </div>
) : null;

const PortalSummary: React.FC<{ portal: OneToOnePortal }> = ({ portal }) => (
  <div className="flex items-start gap-4">
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
      {portal.mentorAvatarUrl ? <img src={portal.mentorAvatarUrl} alt="" className="h-full w-full object-cover" /> : <UserRound size={22} />}
    </div>
    <div className="min-w-0">
      <h2 className="truncate text-lg font-bold">{portal.title}</h2>
      <p className="mt-1 truncate text-sm text-[var(--muted)]">{portal.menteeName || 'Mentee belum diberi nama'}{portal.menteeEmail ? ` · ${portal.menteeEmail}` : ''}</p>
    </div>
  </div>
);

const readOneToOneImageDataUrl = (file: File, maxDimension = 1600): Promise<string> => new Promise((resolve, reject) => {
  if (!file.type.startsWith('image/')) {
    reject(new Error('Pilih file gambar yang valid.'));
    return;
  }

  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Gambar gagal dibaca.'));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error('Format gambar tidak didukung.'));
    image.onload = () => {
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Gambar gagal diproses.'));
        return;
      }

      const keepsTransparency = ['image/png', 'image/webp', 'image/gif'].includes(file.type.toLowerCase());
      context.imageSmoothingEnabled = !keepsTransparency;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL(keepsTransparency ? 'image/png' : 'image/jpeg', keepsTransparency ? undefined : 0.84);
      if (dataUrl.length > 2_400_000) {
        reject(new Error('Ukuran gambar terlalu besar. Gunakan gambar yang lebih kecil.'));
        return;
      }
      resolve(dataUrl);
    };
    image.src = String(reader.result || '');
  };
  reader.readAsDataURL(file);
});

type OneToOneImageKind = 'avatar' | 'logo' | 'cover';

const OneToOneImageField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  description: string;
  kind: OneToOneImageKind;
}> = ({ label, value, onChange, description, kind }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setIsProcessing(true);
    try {
      onChange(await readOneToOneImageDataUrl(file));
    } catch (uploadError: any) {
      setError(uploadError?.message || 'Gambar belum dapat digunakan.');
    } finally {
      setIsProcessing(false);
    }
  };

  const previewClass = kind === 'cover'
    ? 'aspect-[3/1]'
    : kind === 'avatar'
      ? 'mx-auto aspect-square max-w-[150px]'
      : 'h-28';
  const imageClass = kind === 'cover' ? 'object-cover' : 'object-contain';

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold">{label}</p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{description}</p>
        </div>
        {value && <button type="button" className="shrink-0 text-xs font-semibold text-[var(--danger-text)] hover:underline" onClick={() => { onChange(''); setError(''); }}>Hapus</button>}
      </div>
      <div className={`flex w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-2 ${previewClass}`}>
        {value ? <img src={value} alt="" className={`h-full w-full ${imageClass}`} /> : <div className="px-4 text-center text-xs text-[var(--muted)]">Belum ada gambar</div>}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <Button type="button" variant="secondary" icon={Upload} className="w-full" onClick={() => inputRef.current?.click()} disabled={isProcessing} isLoading={isProcessing}>
        {isProcessing ? 'Memproses gambar...' : 'Upload dari komputer'}
      </Button>
      <p className="text-[11px] leading-relaxed text-[var(--muted)]">Gambar diproses di browser dan disimpan bersama ruang ini. PNG transparan tetap dipertahankan.</p>
      {error && <p className="text-xs font-semibold text-red-700" role="alert">{error}</p>}
    </div>
  );
};

export const OneToOneSpacePage: React.FC<{ client: any }> = ({ client }) => {
  const navigate = useNavigate();
  const [portals, setPortals] = useState<OneToOnePortal[]>([]);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [createForm, setCreateForm] = useState({ title: '', menteeName: '', menteeEmail: '' });

  const fetchPortals = async () => {
    if (!client) {
      setNotice({ tone: 'error', message: 'Koneksi admin belum tersedia.' });
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await client.from('one_to_one_portals').select('*').order('created_at', { ascending: false });
    if (error) setNotice({ tone: 'error', message: databaseErrorMessage(error) });
    else setPortals((data || []).map(mapPortal));
    setIsLoading(false);
  };

  useEffect(() => { void fetchPortals(); }, [client]);

  const createPortal = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!createForm.menteeName.trim()) {
      setNotice({ tone: 'error', message: 'Nama mentee wajib diisi.' });
      return;
    }
    setIsCreating(true);
    const { data, error } = await client.rpc('create_one_to_one_portal', {
      p_title: createForm.title.trim() || `Ruang 1:1 ${createForm.menteeName.trim()}`,
      p_mentee_name: createForm.menteeName.trim(),
      p_mentee_email: createForm.menteeEmail.trim()
    });
    if (error || !data?.portalId || !data?.token) {
      setNotice({ tone: 'error', message: databaseErrorMessage(error || data) });
      setIsCreating(false);
      return;
    }
    setTokens(current => ({ ...current, [data.portalId]: data.token }));
    const link = oneToOneLink(data.token);
    try { await copyText(link); } catch { /* the link remains visible in the editor */ }
    setNotice({ tone: 'success', message: 'Ruang 1:1 dibuat. Link privat sudah disalin ke clipboard.' });
    setCreateForm({ title: '', menteeName: '', menteeEmail: '' });
    setIsCreating(false);
    navigate(`/admin/one-to-one/${data.portalId}`, { state: { oneToOneToken: data.token } });
  };

  const rotateToken = async (portalId: string) => {
    const { data, error } = await client.rpc('rotate_one_to_one_portal_token', { p_portal_id: portalId });
    if (error || !data?.token) {
      setNotice({ tone: 'error', message: databaseErrorMessage(error || data) });
      return;
    }
    setTokens(current => ({ ...current, [portalId]: data.token }));
    try { await copyText(oneToOneLink(data.token)); } catch { /* user can still use the open button */ }
    setNotice({ tone: 'success', message: 'Link privat baru dibuat dan disalin. Link lama tidak lagi aktif.' });
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-7 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <Badge color="var(--accent-soft)">Space 08</Badge>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">{ONE_TO_ONE_SPACE_LABEL}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--muted)]">Buat ruang privat untuk setiap mentee. Mereka dapat membuka recording, jadwal, task, dan catatan mentor melalui link personal tanpa login.</p>
        </div>
        <Button icon={Plus} onClick={() => document.getElementById('one-to-one-create-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Buat ruang baru</Button>
      </div>

      <NoticeMessage notice={notice} />

      <div id="one-to-one-create-form" className="scroll-mt-6"><Card className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Ruang baru</p>
          <h2 className="mt-2 text-xl font-bold">Buat link personal mentee</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Setiap ruang memiliki token privat yang berbeda. Jangan gunakan token yang sama untuk dua mentee.</p>
        </div>
        <form className="grid gap-4 md:grid-cols-3" onSubmit={createPortal}>
          <Input label="Nama mentee" required value={createForm.menteeName} onChange={event => setCreateForm({ ...createForm, menteeName: event.target.value })} placeholder="Contoh: Nabila" />
          <Input label="Email mentee (opsional)" type="email" value={createForm.menteeEmail} onChange={event => setCreateForm({ ...createForm, menteeEmail: event.target.value })} placeholder="nabila@email.com" />
          <Input label="Judul ruang (opsional)" value={createForm.title} onChange={event => setCreateForm({ ...createForm, title: event.target.value })} placeholder="Mentorship Social Media" />
          <div className="md:col-span-3 flex justify-end">
            <Button type="submit" icon={Plus} isLoading={isCreating}>Buat ruang 1:1</Button>
          </div>
        </form>
      </Card></div>

      {isLoading ? <Card className="flex min-h-[220px] items-center justify-center gap-3 text-sm text-[var(--muted)]"><Loader2 size={20} className="animate-spin" /> Memuat ruang 1:1...</Card> : portals.length === 0 ? (
        <Card className="flex min-h-[260px] flex-col items-center justify-center gap-4 text-center"><Users size={38} className="text-[var(--muted)]" /><div><p className="font-semibold">Belum ada ruang 1:1</p><p className="mt-1 text-sm text-[var(--muted)]">Buat ruang pertama untuk membagikan dashboard personal kepada mentee.</p></div></Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {portals.map(portal => {
            const token = tokens[portal.id];
            return <Card key={portal.id} className="flex h-full flex-col gap-5">
              <div className="flex items-start justify-between gap-4"><PortalSummary portal={portal} /><Badge color={portal.isActive ? 'var(--success-soft)' : 'var(--surface-soft)'}>{portal.isActive ? 'Aktif' : 'Nonaktif'}</Badge></div>
              <div className="grid gap-3 text-sm sm:grid-cols-3"><div className="rounded-xl bg-[var(--surface-soft)] p-3"><p className="text-xs text-[var(--muted)]">Mentor</p><p className="mt-1 font-semibold">{portal.mentorName || 'Belum diatur'}</p></div><div className="rounded-xl bg-[var(--surface-soft)] p-3"><p className="text-xs text-[var(--muted)]">Dibuat</p><p className="mt-1 font-semibold">{formatDate(portal.createdAt || '')}</p></div><div className="rounded-xl bg-[var(--surface-soft)] p-3"><p className="text-xs text-[var(--muted)]">Token</p><p className="mt-1 font-semibold">{token ? `…${token.slice(-8)}` : portal.publicTokenHint ? `…${portal.publicTokenHint}` : 'Tersembunyi'}</p></div></div>
              <div className="mt-auto flex flex-wrap gap-2"><Button variant="secondary" onClick={() => navigate(`/admin/one-to-one/${portal.id}`, { state: token ? { oneToOneToken: token } : undefined })}>Edit ruang</Button><Button variant="secondary" icon={token ? Copy : LinkIcon} onClick={() => token ? void copyText(oneToOneLink(token)) : void rotateToken(portal.id)}>{token ? 'Salin link' : 'Buat link'}</Button>{token && <Button variant="secondary" icon={ExternalLink} onClick={() => window.open(oneToOneLink(token), '_blank', 'noopener,noreferrer')}>Buka publik</Button>}<Button variant="danger" icon={LinkIcon} onClick={() => void rotateToken(portal.id)}>Perbarui link</Button></div>
            </Card>;
          })}
        </div>
      )}
    </div>
  );
};

const SectionTabs: React.FC<{ active: OneToOneTab; onChange: (tab: OneToOneTab) => void }> = ({ active, onChange }) => {
  const tabs: Array<{ value: OneToOneTab; label: string; icon: React.ComponentType<any> }> = [
    { value: 'overview', label: 'Tampilan', icon: UserRound },
    { value: 'recordings', label: 'Recording', icon: Video },
    { value: 'schedule', label: 'Kalender', icon: CalendarDays },
    { value: 'tasks', label: 'Task', icon: CheckCircle2 },
    { value: 'notes', label: 'Catatan', icon: FileText }
  ];
  return <div className="flex gap-2 overflow-x-auto border-b border-[var(--border)] pb-2">{tabs.map(tab => <button key={tab.value} type="button" onClick={() => onChange(tab.value)} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${active === tab.value ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text)]'}`}><tab.icon size={16} />{tab.label}</button>)}</div>;
};

export const OneToOneEditorPage: React.FC<{ client: any }> = ({ client }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [portal, setPortal] = useState<OneToOnePortal | null>(null);
  const [recordings, setRecordings] = useState<OneToOneRecording[]>([]);
  const [schedule, setSchedule] = useState<OneToOneScheduleEvent[]>([]);
  const [tasks, setTasks] = useState<OneToOneTask[]>([]);
  const [notes, setNotes] = useState<OneToOneNote[]>([]);
  const [token, setToken] = useState<string>((location.state as any)?.oneToOneToken || '');
  const [activeTab, setActiveTab] = useState<OneToOneTab>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const fetchAll = async () => {
    if (!client || !id) return;
    setIsLoading(true);
    const [portalResult, recordingsResult, scheduleResult, tasksResult, notesResult] = await Promise.all([
      client.from('one_to_one_portals').select('*').eq('id', id).maybeSingle(),
      client.from('one_to_one_recordings').select('*').eq('portal_id', id).order('sort_order').order('created_at'),
      client.from('one_to_one_schedule_events').select('*').eq('portal_id', id).order('starts_at'),
      client.from('one_to_one_tasks').select('*').eq('portal_id', id).order('sort_order').order('created_at'),
      client.from('one_to_one_notes').select('*').eq('portal_id', id).order('note_date', { ascending: false })
    ]);
    const firstError = [portalResult.error, recordingsResult.error, scheduleResult.error, tasksResult.error, notesResult.error].find(Boolean);
    if (firstError) setNotice({ tone: 'error', message: databaseErrorMessage(firstError) });
    setPortal(portalResult.data ? mapPortal(portalResult.data) : null);
    setRecordings((recordingsResult.data || []).map(mapRecording));
    setSchedule((scheduleResult.data || []).map(mapSchedule));
    setTasks((tasksResult.data || []).map(mapTask));
    setNotes((notesResult.data || []).map(mapNote));
    setIsLoading(false);
  };

  useEffect(() => { void fetchAll(); }, [client, id]);

  const savePortal = async () => {
    if (!portal || !id) return;
    setIsSaving(true);
    const { error } = await client.from('one_to_one_portals').update({
      title: portal.title,
      mentee_name: portal.menteeName,
      mentee_email: portal.menteeEmail,
      mentor_name: portal.mentorName,
      mentor_role: portal.mentorRole,
      mentor_avatar_url: portal.mentorAvatarUrl,
      logo_url: portal.logoUrl,
      cover_image_url: portal.coverImageUrl,
      welcome_title: portal.welcomeTitle,
      welcome_message: portal.welcomeMessage,
      theme: portal.theme,
      accent_color: portal.accentColor,
      is_active: portal.isActive
    }).eq('id', id);
    setNotice(error ? { tone: 'error', message: databaseErrorMessage(error) } : { tone: 'success', message: 'Tampilan ruang berhasil disimpan.' });
    setIsSaving(false);
  };

  const rotateToken = async () => {
    if (!id) return;
    const { data, error } = await client.rpc('rotate_one_to_one_portal_token', { p_portal_id: id });
    if (error || !data?.token) {
      setNotice({ tone: 'error', message: databaseErrorMessage(error || data) });
      return;
    }
    setToken(data.token);
    try { await copyText(oneToOneLink(data.token)); } catch { /* keep the link in the editor */ }
    setNotice({ tone: 'success', message: 'Link privat dibuat dan disalin ke clipboard.' });
  };

  const saveRow = async (table: string, rowId: string, payload: Record<string, any>) => {
    const { error } = await client.from(table).update(payload).eq('id', rowId).eq('portal_id', id);
    setNotice(error ? { tone: 'error', message: databaseErrorMessage(error) } : { tone: 'success', message: 'Perubahan berhasil disimpan.' });
    if (!error) await fetchAll();
  };

  const deleteRow = async (table: string, rowId: string) => {
    if (!window.confirm('Hapus item ini dari ruang 1:1?')) return;
    const { error } = await client.from(table).delete().eq('id', rowId).eq('portal_id', id);
    setNotice(error ? { tone: 'error', message: databaseErrorMessage(error) } : { tone: 'success', message: 'Item dihapus.' });
    if (!error) await fetchAll();
  };

  const addRow = async (table: string, payload: Record<string, any>) => {
    const { error } = await client.from(table).insert({ ...payload, portal_id: id });
    setNotice(error ? { tone: 'error', message: databaseErrorMessage(error) } : { tone: 'success', message: 'Item baru ditambahkan.' });
    if (!error) await fetchAll();
  };

  const accent = portal?.accentColor || themeOptions.find(option => option.value === portal?.theme)?.color || '#16436b';
  const publicUrl = token ? oneToOneLink(token) : '';

  if (isLoading) return <div className="flex min-h-[70vh] items-center justify-center gap-3 text-sm text-[var(--muted)]"><Loader2 size={20} className="animate-spin" /> Memuat ruang 1:1...</div>;
  if (!portal) return <div className="mx-auto max-w-xl p-8"><Card className="space-y-4 text-center"><XCircle size={34} className="mx-auto text-[var(--danger-text)]" /><p>Ruang 1:1 tidak ditemukan.</p><Button variant="secondary" onClick={() => navigate('/admin/one-to-one')}>Kembali</Button></Card></div>;

  return <div className="mx-auto w-full max-w-[1440px] space-y-6 p-4 md:p-6 lg:p-8">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><Link to="/admin/one-to-one" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent-strong)]"><ArrowLeft size={14} /> Semua ruang 1:1</Link><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold">{portal.title}</h1><Badge color={portal.isActive ? 'var(--success-soft)' : 'var(--surface-soft)'}>{portal.isActive ? 'Aktif' : 'Nonaktif'}</Badge></div><p className="mt-2 text-sm text-[var(--muted)]">Dashboard personal untuk {portal.menteeName || 'mentee ini'}.</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" icon={token ? Copy : LinkIcon} onClick={() => token ? void copyText(publicUrl) : void rotateToken()}>{token ? 'Salin link privat' : 'Buat link privat'}</Button>{token && <Button variant="secondary" icon={ExternalLink} onClick={() => window.open(publicUrl, '_blank', 'noopener,noreferrer')}>Preview publik</Button>}<Button icon={Save} onClick={() => void savePortal()} isLoading={isSaving}>Simpan tampilan</Button></div></div>
    <NoticeMessage notice={notice} />
    {token && <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><span className="min-w-0 truncate text-[var(--muted)]"><LockKeyhole size={15} className="mr-2 inline text-[var(--accent-strong)]" />{publicUrl}</span><Button type="button" variant="secondary" className="shrink-0" onClick={() => void rotateToken()}>Ganti link</Button></div>}
    <SectionTabs active={activeTab} onChange={setActiveTab} />

    {activeTab === 'overview' && (
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(310px,0.65fr)]">
        <div className="min-w-0 space-y-5">
          <Card className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Identitas ruang</p>
              <h2 className="mt-2 text-xl font-bold">Profil mentee dan akses</h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">Field di sini hanya berlaku untuk link privat mentee ini. Perubahan baru terlihat setelah menekan tombol simpan.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2"><Input label="Judul ruang" value={portal.title} onChange={event => setPortal({ ...portal, title: event.target.value })} placeholder="Contoh: Social Media Content" /></div>
              <Input label="Nama mentee" value={portal.menteeName} onChange={event => setPortal({ ...portal, menteeName: event.target.value })} />
              <Input label="Email mentee" type="email" value={portal.menteeEmail} onChange={event => setPortal({ ...portal, menteeEmail: event.target.value })} />
              <label className="md:col-span-2 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-semibold">
                <input type="checkbox" checked={portal.isActive} onChange={event => setPortal({ ...portal, isActive: event.target.checked })} />
                Link aktif untuk mentee
                <span className="ml-auto text-xs font-normal text-[var(--muted)]">Matikan sementara tanpa menghapus data ruang.</span>
              </label>
            </div>
          </Card>

          <Card className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Mentor dan visual</p>
              <h2 className="mt-2 text-xl font-bold">Identitas yang tampil di halaman publik</h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">Upload foto langsung dari komputer. Tidak perlu menempelkan URL gambar.</p>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-4">
                <Input label="Nama mentor" value={portal.mentorName} onChange={event => setPortal({ ...portal, mentorName: event.target.value })} />
                <Input label="Jabatan / label mentor" value={portal.mentorRole} onChange={event => setPortal({ ...portal, mentorRole: event.target.value })} placeholder="Contoh: Mentor Social Media" />
                <OneToOneImageField label="Foto mentor" value={portal.mentorAvatarUrl} onChange={value => setPortal({ ...portal, mentorAvatarUrl: value })} kind="avatar" description="Gunakan foto persegi atau portrait. Transparansi PNG tetap dipertahankan." />
              </div>
              <div className="space-y-4">
                <OneToOneImageField label="Logo ruang" value={portal.logoUrl} onChange={value => setPortal({ ...portal, logoUrl: value })} kind="logo" description="Logo transparan akan ditampilkan tanpa latar tambahan." />
                <OneToOneImageField label="Cover ruang (opsional)" value={portal.coverImageUrl} onChange={value => setPortal({ ...portal, coverImageUrl: value })} kind="cover" description="Banner yang tampil di bagian atas halaman mentee." />
              </div>
            </div>
          </Card>

          <Card className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Welcome dan tema</p>
              <h2 className="mt-2 text-xl font-bold">Atur pesan pembuka dan warna ruang</h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">Pesan ini menjadi konteks pertama yang dibaca mentee saat membuka link.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Judul sambutan" value={portal.welcomeTitle} onChange={event => setPortal({ ...portal, welcomeTitle: event.target.value })} placeholder="Ruang belajar personal Anda" />
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-[var(--muted)]">Tema</span>
                <select value={portal.theme} onChange={event => setPortal({ ...portal, theme: event.target.value as OneToOneTheme })} className="min-h-[46px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm outline-none focus:border-[var(--accent)]">
                  {themeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <Textarea label="Pesan sambutan" value={portal.welcomeMessage} onChange={event => setPortal({ ...portal, welcomeMessage: event.target.value })} className="min-h-[150px] md:col-span-2" placeholder="Tulis arahan singkat untuk mentee..." />
              <Input label="Warna aksen" type="color" value={portal.accentColor} onChange={event => setPortal({ ...portal, accentColor: event.target.value })} className="h-[46px] p-1" />
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card className="space-y-4 xl:sticky xl:top-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: accent }}>Preview identitas</p>
              <h2 className="mt-2 text-xl font-bold">Tampilan ringkas halaman mentee</h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">Preview ini mengikuti perubahan form secara langsung.</p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)]">
              {portal.coverImageUrl && <img src={portal.coverImageUrl} alt="" className="h-28 w-full object-cover" />}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {portal.logoUrl ? <img src={portal.logoUrl} alt="Logo ruang" className="h-12 w-12 shrink-0 rounded-xl object-contain" /> : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)]" style={{ color: accent }}><UserRound size={19} /></div>}
                  <div className="min-w-0"><p className="truncate text-sm font-bold">{portal.title || 'Judul ruang'}</p><p className="mt-1 text-xs text-[var(--muted)]">Untuk {portal.menteeName || 'nama mentee'}</p></div>
                </div>
                <div className="mt-4 flex items-center gap-3 border-t border-[var(--border)] pt-4">
                  {portal.mentorAvatarUrl ? <img src={portal.mentorAvatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface)]" style={{ color: accent }}><UserRound size={17} /></div>}
                  <div className="min-w-0"><p className="truncate text-sm font-semibold">{portal.mentorName || 'Nama mentor'}</p><p className="truncate text-xs text-[var(--muted)]">{portal.mentorRole || 'Jabatan mentor'}</p></div>
                </div>
                {(portal.welcomeTitle || portal.welcomeMessage) && <div className="mt-4 rounded-xl p-3" style={{ backgroundColor: `${accent}12` }}><p className="text-sm font-bold" style={{ color: accent }}>{portal.welcomeTitle || 'Selamat datang'}</p>{portal.welcomeMessage && <p className="mt-1 line-clamp-4 whitespace-pre-line text-xs leading-relaxed text-[var(--muted)]">{portal.welcomeMessage}</p>}</div>}
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Pengaturan tersedia</p>
              <h2 className="mt-2 text-lg font-bold">Kelola isi ruang dari tab di atas</h2>
            </div>
            <ul className="space-y-3 text-sm text-[var(--muted)]">
              <li className="flex gap-3"><span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />Recording dan materi dapat ditambah, diedit, diurutkan, atau disembunyikan.</li>
              <li className="flex gap-3"><span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />Kalender mendukung waktu sesi, lokasi, link meeting, dan status.</li>
              <li className="flex gap-3"><span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />Task dan catatan mentor bisa diberi deadline, prioritas, serta visibilitas per item.</li>
            </ul>
            <div className="rounded-xl bg-[var(--surface-soft)] p-3 text-xs leading-relaxed text-[var(--muted)]">Simpan perubahan tampilan dengan tombol <strong className="text-[var(--text)]">Simpan tampilan</strong> di bagian atas.</div>
          </Card>
        </div>
      </div>
    )}

    {activeTab === 'recordings' && <RecordingEditor rows={recordings} onAdd={() => void addRow('one_to_one_recordings', { title: 'Recording baru', description: '', video_url: '', material_url: '', duration: '', sort_order: recordings.length, is_published: true })} onSave={(row) => void saveRow('one_to_one_recordings', row.id, { title: row.title, description: row.description, video_url: row.videoUrl, material_url: row.materialUrl, duration: row.duration, sort_order: row.sortOrder, is_published: row.isPublished })} onDelete={row => void deleteRow('one_to_one_recordings', row.id)} />}
    {activeTab === 'schedule' && <ScheduleEditor rows={schedule} onAdd={() => void addRow('one_to_one_schedule_events', { title: 'Sesi mentoring', description: '', starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), location: '', meeting_url: '', status: 'scheduled', sort_order: schedule.length })} onSave={(row) => void saveRow('one_to_one_schedule_events', row.id, { title: row.title, description: row.description, starts_at: isoDateTime(row.startsAt), ends_at: isoDateTime(row.endsAt), location: row.location, meeting_url: row.meetingUrl, status: row.status, sort_order: row.sortOrder })} onDelete={row => void deleteRow('one_to_one_schedule_events', row.id)} />}
    {activeTab === 'tasks' && <TaskEditor rows={tasks} onAdd={() => void addRow('one_to_one_tasks', { title: 'Task baru', description: '', due_at: null, status: 'todo', priority: 'medium', sort_order: tasks.length, is_visible: true })} onSave={(row) => void saveRow('one_to_one_tasks', row.id, { title: row.title, description: row.description, due_at: isoDateTime(row.dueAt), status: row.status, priority: row.priority, sort_order: row.sortOrder, is_visible: row.isVisible })} onDelete={row => void deleteRow('one_to_one_tasks', row.id)} />}
    {activeTab === 'notes' && <NoteEditor rows={notes} onAdd={() => void addRow('one_to_one_notes', { title: 'Catatan mentor', body: '', note_date: new Date().toISOString().slice(0, 10), sort_order: notes.length, is_visible: true })} onSave={(row) => void saveRow('one_to_one_notes', row.id, { title: row.title, body: row.body, note_date: row.noteDate || null, sort_order: row.sortOrder, is_visible: row.isVisible })} onDelete={row => void deleteRow('one_to_one_notes', row.id)} />}
  </div>;
};

const EditorShell: React.FC<{ title: string; description: string; onAdd: () => void; children: React.ReactNode; addLabel: string }> = ({ title, description, onAdd, children, addLabel }) => <div className="space-y-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Kelola konten</p><h2 className="mt-2 text-xl font-bold">{title}</h2><p className="mt-1 text-sm text-[var(--muted)]">{description}</p></div><Button icon={Plus} onClick={onAdd}>{addLabel}</Button></div>{children}</div>;

const RecordingEditor: React.FC<{ rows: OneToOneRecording[]; onAdd: () => void; onSave: (row: OneToOneRecording) => void; onDelete: (row: OneToOneRecording) => void }> = ({ rows, onAdd, onSave, onDelete }) => <EditorShell title="Recording dan materi" description="Tambahkan rekaman, link materi, atau file yang hanya tampil pada ruang mentee ini." onAdd={onAdd} addLabel="Tambah recording">{rows.length === 0 ? <Card className="text-sm text-[var(--muted)]">Belum ada recording.</Card> : rows.map(row => <Card key={row.id} className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><Input label="Judul recording" value={row.title} onChange={event => { row.title = event.target.value; }} /><Input label="Durasi" value={row.duration} onChange={event => { row.duration = event.target.value; }} placeholder="Contoh: 42 menit" /><Input label="URL video / recording" value={row.videoUrl} onChange={event => { row.videoUrl = event.target.value; }} placeholder="https://..." /><Input label="URL materi unduhan" value={row.materialUrl} onChange={event => { row.materialUrl = event.target.value; }} placeholder="https://..." /></div><Textarea label="Deskripsi singkat" value={row.description} onChange={event => { row.description = event.target.value; }} className="min-h-[90px]" /><div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={row.isPublished} onChange={event => { row.isPublished = event.target.checked; }} /> Tampilkan ke mentee</label><div className="flex gap-2"><Button variant="danger" icon={Trash2} onClick={() => onDelete(row)}>Hapus</Button><Button icon={Save} onClick={() => onSave(row)}>Simpan recording</Button></div></div></Card>)}</EditorShell>;

const ScheduleEditor: React.FC<{ rows: OneToOneScheduleEvent[]; onAdd: () => void; onSave: (row: OneToOneScheduleEvent) => void; onDelete: (row: OneToOneScheduleEvent) => void }> = ({ rows, onAdd, onSave, onDelete }) => <EditorShell title="Kalender penjadwalan" description="Atur tanggal sesi, lokasi, dan link meeting untuk mentee." onAdd={onAdd} addLabel="Tambah jadwal">{rows.length === 0 ? <Card className="text-sm text-[var(--muted)]">Belum ada jadwal.</Card> : rows.map(row => <Card key={row.id} className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><Input label="Judul sesi" value={row.title} onChange={event => { row.title = event.target.value; }} /><Input label="Lokasi" value={row.location} onChange={event => { row.location = event.target.value; }} placeholder="Zoom / Google Meet / Offline" /><Input label="Mulai" type="datetime-local" value={inputDateTime(row.startsAt)} onChange={event => { row.startsAt = event.target.value; }} /><Input label="Selesai" type="datetime-local" value={inputDateTime(row.endsAt)} onChange={event => { row.endsAt = event.target.value; }} /><Input label="Link meeting" value={row.meetingUrl} onChange={event => { row.meetingUrl = event.target.value; }} placeholder="https://..." /><label className="flex flex-col gap-2"><span className="text-xs font-semibold text-[var(--muted)]">Status</span><select value={row.status} onChange={event => { row.status = event.target.value as OneToOneScheduleEvent['status']; }} className="min-h-[46px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm"><option value="scheduled">Terjadwal</option><option value="completed">Selesai</option><option value="cancelled">Dibatalkan</option></select></label></div><Textarea label="Catatan jadwal" value={row.description} onChange={event => { row.description = event.target.value; }} className="min-h-[80px]" /><div className="flex justify-end gap-2"><Button variant="danger" icon={Trash2} onClick={() => onDelete(row)}>Hapus</Button><Button icon={Save} onClick={() => onSave(row)}>Simpan jadwal</Button></div></Card>)}</EditorShell>;

const TaskEditor: React.FC<{ rows: OneToOneTask[]; onAdd: () => void; onSave: (row: OneToOneTask) => void; onDelete: (row: OneToOneTask) => void }> = ({ rows, onAdd, onSave, onDelete }) => <EditorShell title="Task mentee" description="Tulis pekerjaan, deadline, prioritas, dan status yang perlu diikuti mentee." onAdd={onAdd} addLabel="Tambah task">{rows.length === 0 ? <Card className="text-sm text-[var(--muted)]">Belum ada task.</Card> : rows.map(row => <Card key={row.id} className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><Input label="Judul task" value={row.title} onChange={event => { row.title = event.target.value; }} /><Input label="Deadline" type="datetime-local" value={inputDateTime(row.dueAt)} onChange={event => { row.dueAt = event.target.value; }} /><label className="flex flex-col gap-2"><span className="text-xs font-semibold text-[var(--muted)]">Status</span><select value={row.status} onChange={event => { row.status = event.target.value as OneToOneTask['status']; }} className="min-h-[46px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm"><option value="todo">Belum mulai</option><option value="in_progress">Sedang dikerjakan</option><option value="done">Selesai</option></select></label><label className="flex flex-col gap-2"><span className="text-xs font-semibold text-[var(--muted)]">Prioritas</span><select value={row.priority} onChange={event => { row.priority = event.target.value as OneToOneTask['priority']; }} className="min-h-[46px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm"><option value="low">Rendah</option><option value="medium">Sedang</option><option value="high">Tinggi</option></select></label></div><Textarea label="Deskripsi task" value={row.description} onChange={event => { row.description = event.target.value; }} className="min-h-[90px]" /><div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={row.isVisible} onChange={event => { row.isVisible = event.target.checked; }} /> Tampilkan ke mentee</label><div className="flex gap-2"><Button variant="danger" icon={Trash2} onClick={() => onDelete(row)}>Hapus</Button><Button icon={Save} onClick={() => onSave(row)}>Simpan task</Button></div></div></Card>)}</EditorShell>;

const NoteEditor: React.FC<{ rows: OneToOneNote[]; onAdd: () => void; onSave: (row: OneToOneNote) => void; onDelete: (row: OneToOneNote) => void }> = ({ rows, onAdd, onSave, onDelete }) => <EditorShell title="Catatan mentor" description="Catatan ini dapat ditampilkan atau disembunyikan dari mentee satu per satu." onAdd={onAdd} addLabel="Tambah catatan">{rows.length === 0 ? <Card className="text-sm text-[var(--muted)]">Belum ada catatan.</Card> : rows.map(row => <Card key={row.id} className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><Input label="Judul catatan" value={row.title} onChange={event => { row.title = event.target.value; }} /><Input label="Tanggal catatan" type="date" value={row.noteDate || ''} onChange={event => { row.noteDate = event.target.value; }} /></div><Textarea label="Isi catatan" value={row.body} onChange={event => { row.body = event.target.value; }} className="min-h-[130px]" /><div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={row.isVisible} onChange={event => { row.isVisible = event.target.checked; }} /> Tampilkan ke mentee</label><div className="flex gap-2"><Button variant="danger" icon={Trash2} onClick={() => onDelete(row)}>Hapus</Button><Button icon={Save} onClick={() => onSave(row)}>Simpan catatan</Button></div></div></Card>)}</EditorShell>;

const publicTheme: Record<OneToOneTheme, { background: string; surface: string }> = {
  navy: { background: '#eef4f8', surface: '#ffffff' },
  emerald: { background: '#edf7f3', surface: '#ffffff' },
  coral: { background: '#fff3ef', surface: '#ffffff' },
  violet: { background: '#f5f1fb', surface: '#ffffff' },
  amber: { background: '#fff8e8', surface: '#ffffff' }
};

export const PublicOneToOnePage: React.FC<{ client: any; tokenOverride?: string }> = ({ client, tokenOverride }) => {
  const { token: routeToken } = useParams();
  const token = tokenOverride || routeToken || '';
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'recordings' | 'schedule' | 'tasks' | 'notes'>('recordings');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!client || !token) { setError('Link 1:1 tidak lengkap.'); setIsLoading(false); return; }
      setIsLoading(true);
      const { data: result, error: requestError } = await client.rpc('get_one_to_one_portal', { p_token: token });
      if (cancelled) return;
      if (requestError || !result) setError('Link 1:1 tidak ditemukan atau sudah tidak aktif.');
      else { setData(result); setPublicMetadata({ title: `${result.title || 'Ruang 1:1'} | Arunika`, description: result.welcomeMessage || `Ruang personal untuk ${result.menteeName || 'mentee'}.`, image: result.coverImageUrl || result.logoUrl }); }
      setIsLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [client, token]);

  const theme = publicTheme[data?.theme as OneToOneTheme] || publicTheme.navy;
  const accent = data?.accentColor || '#16436b';
  const tabs = useMemo(() => [
    { value: 'recordings' as const, label: 'Materi & recording', icon: Video },
    { value: 'schedule' as const, label: 'Kalender', icon: CalendarDays },
    { value: 'tasks' as const, label: 'Task', icon: CheckCircle2 },
    { value: 'notes' as const, label: 'Catatan mentor', icon: FileText }
  ], []);

  if (isLoading) return <main className="flex min-h-screen items-center justify-center gap-3 p-6 text-sm text-[var(--muted)]"><Loader2 size={20} className="animate-spin" /> Membuka ruang personal...</main>;
  if (error || !data) return <main className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] p-6"><Card className="w-full max-w-md space-y-4 text-center"><LockKeyhole size={34} className="mx-auto text-[var(--accent-strong)]" /><h1 className="text-xl font-bold">Ruang tidak tersedia</h1><p className="text-sm leading-relaxed text-[var(--muted)]">{error || 'Link ini tidak dapat digunakan.'}</p></Card></main>;

  const recordings = data.recordings || [];
  const schedule = data.schedule || [];
  const tasks = data.tasks || [];
  const notes = data.notes || [];
  return <main className="min-h-screen px-4 py-6 md:px-8 md:py-10" style={{ background: theme.background, ['--one-to-one-accent' as any]: accent }}>
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-3xl border border-white/70 bg-white shadow-sm" style={{ borderTopColor: accent }}>
        {data.coverImageUrl && <img src={data.coverImageUrl} alt="" className="h-40 w-full object-cover md:h-56" />}
        <div className="p-6 md:p-10"><div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between"> <div className="flex items-center gap-4">{data.logoUrl ? <img src={data.logoUrl} alt="Logo" className="h-14 w-14 rounded-2xl object-contain" /> : <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: `${accent}18`, color: accent }}><Users size={26} /></div>}<div><p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>Ruang 1:1 personal</p><h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">{data.title}</h1><p className="mt-1 text-sm text-slate-500">Untuk {data.menteeName || 'mentee'}{data.menteeEmail ? ` · ${data.menteeEmail}` : ''}</p></div></div>{data.mentorName && <div className="flex items-center gap-3 sm:max-w-xs sm:justify-end">{data.mentorAvatarUrl ? <img src={data.mentorAvatarUrl} alt={data.mentorName} className="h-11 w-11 rounded-full object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100"><UserRound size={19} /></div>}<div className="text-left sm:text-right"><p className="text-sm font-bold text-slate-800">{data.mentorName}</p><p className="text-xs text-slate-500">{data.mentorRole || 'Mentor'}</p></div></div>}</div><div className="mt-8 rounded-2xl p-5" style={{ backgroundColor: `${accent}0d` }}><h2 className="text-lg font-bold text-slate-900">{data.welcomeTitle || 'Selamat datang di ruang personal Anda'}</h2>{data.welcomeMessage && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{data.welcomeMessage}</p>}</div></div>
      </section>
      <section className="rounded-3xl border border-white/70 bg-white p-4 shadow-sm md:p-6"><div className="flex gap-2 overflow-x-auto pb-2">{tabs.map(tab => <button key={tab.value} type="button" onClick={() => setActiveTab(tab.value)} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold ${activeTab === tab.value ? 'text-white' : 'text-slate-600 hover:bg-slate-50'}`} style={activeTab === tab.value ? { backgroundColor: accent } : undefined}><tab.icon size={17} />{tab.label}</button>)}</div><div className="mt-6 space-y-4">
        {activeTab === 'recordings' && (recordings.length === 0 ? <EmptyPublic label="Belum ada materi recording." icon={Video} /> : recordings.map((item: any) => <article key={item.id} className="rounded-2xl border border-slate-200 p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h2 className="font-bold text-slate-900">{item.title}</h2>{item.duration && <p className="mt-1 text-xs text-slate-500">{item.duration}</p>}</div>{item.videoUrl && <a href={item.videoUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white" style={{ backgroundColor: accent }}><PlayCircle size={16} /> Buka recording</a>}</div>{item.description && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{item.description}</p>}{item.materialUrl && <a href={item.materialUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: accent }}><LinkIcon size={15} /> Buka materi unduhan <ExternalLink size={14} /></a>}</article>))}
        {activeTab === 'schedule' && (schedule.length === 0 ? <EmptyPublic label="Belum ada jadwal mentoring." icon={CalendarDays} /> : <div className="space-y-5"><PublicScheduleCalendar items={schedule} accent={accent} />{schedule.map((item: any) => <article key={item.id} className="rounded-2xl border border-slate-200 p-5"><div className="flex flex-col gap-4 sm:flex-row"><div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl text-white" style={{ backgroundColor: accent }}><span className="text-[10px] font-bold uppercase">{item.startsAt ? new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(item.startsAt)) : '—'}</span><span className="text-xl font-bold">{item.startsAt ? new Date(item.startsAt).getDate() : '—'}</span></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-slate-900">{item.title}</h2><Badge color={item.status === 'completed' ? 'var(--success-soft)' : item.status === 'cancelled' ? '#fee2e2' : `${accent}18`}>{item.status === 'completed' ? 'Selesai' : item.status === 'cancelled' ? 'Dibatalkan' : 'Terjadwal'}</Badge></div><p className="mt-1 text-sm text-slate-600">{formatDate(item.startsAt, true)}{item.endsAt ? ` – ${new Intl.DateTimeFormat('id-ID', { timeStyle: 'short' }).format(new Date(item.endsAt))}` : ''}</p>{item.location && <p className="mt-1 text-sm text-slate-500">{item.location}</p>}{item.description && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{item.description}</p>}{item.meetingUrl && item.status !== 'cancelled' && <a href={item.meetingUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: accent }}>Buka link meeting <ExternalLink size={14} /></a>}</div></div></article>)}</div>)}
        {activeTab === 'tasks' && (tasks.length === 0 ? <EmptyPublic label="Belum ada task untuk Anda." icon={CheckCircle2} /> : tasks.map((item: any) => <article key={item.id} className="rounded-2xl border border-slate-200 p-5"><div className="flex items-start gap-3"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}16`, color: accent }}><Check size={17} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-slate-900">{item.title}</h2><Badge color={item.status === 'done' ? 'var(--success-soft)' : item.priority === 'high' ? '#fee2e2' : `${accent}18`}>{item.status === 'done' ? 'Selesai' : item.status === 'in_progress' ? 'Sedang dikerjakan' : item.priority === 'high' ? 'Prioritas tinggi' : 'Belum mulai'}</Badge></div>{item.description && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{item.description}</p>}{item.dueAt && <p className="mt-3 text-xs font-semibold text-slate-500">Deadline: {formatDate(item.dueAt, true)}</p>}</div></div></article>))}
        {activeTab === 'notes' && (notes.length === 0 ? <EmptyPublic label="Belum ada catatan mentor." icon={FileText} /> : notes.map((item: any) => <article key={item.id} className="rounded-2xl border border-slate-200 p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: accent }}>{item.noteDate ? formatDate(item.noteDate) : 'Catatan mentor'}</p><h2 className="mt-2 font-bold text-slate-900">{item.title}</h2><p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{item.body}</p></article>))}
      </div></section><p className="text-center text-xs text-slate-500">Link ini bersifat privat. Jangan bagikan kepada orang lain.</p>
    </div>
  </main>;
};

const EmptyPublic: React.FC<{ label: string; icon: React.ComponentType<any> }> = ({ label, icon: Icon }) => <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500"><Icon size={28} className="mx-auto mb-3 opacity-60" />{label}</div>;

const PublicScheduleCalendar: React.FC<{ items: any[]; accent: string }> = ({ items, accent }) => {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDayOffset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const eventDays = new Set(items.filter(item => item.status !== 'cancelled' && item.startsAt).map(item => {
    const date = new Date(item.startsAt);
    return date.getFullYear() === year && date.getMonth() === monthIndex ? date.getDate() : null;
  }).filter(Boolean));
  const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(month);
  return <div className="rounded-2xl border border-slate-200 p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-bold capitalize text-slate-900">{monthLabel}</h2><div className="flex gap-1"><button type="button" aria-label="Bulan sebelumnya" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><ChevronLeft size={17} /></button><button type="button" aria-label="Bulan berikutnya" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><ChevronRight size={17} /></button></div></div><div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">{['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => <span key={day} className="py-1">{day}</span>)}{Array.from({ length: firstDayOffset }).map((_, index) => <span key={`empty-${index}`} />)}{Array.from({ length: daysInMonth }).map((_, index) => { const day = index + 1; const hasEvent = eventDays.has(day); return <span key={day} className="relative flex h-9 items-center justify-center rounded-lg text-sm text-slate-700" style={hasEvent ? { backgroundColor: `${accent}15`, color: accent, fontWeight: 700 } : undefined}>{day}{hasEvent && <i className="absolute bottom-1 h-1 w-1 rounded-full" style={{ backgroundColor: accent }} />}</span>; })}</div><p className="mt-3 text-xs text-slate-500">Tanggal bertanda warna memiliki sesi mentoring.</p></div>;
};
