import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Copy, Eye, Loader2, MessageCircle, Pin, Play, Plus, Save, Trash2, XCircle } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import { FormThemeKey, QnaQuestion, QnaQuestionStatus, QnaSession, QnaSessionStatus } from '../types';
import { Badge, Button, Card, ConfirmModal, Input, Textarea } from './UI';
import { FORM_THEME_OPTIONS, formThemeStyle } from './FormMakerPages';

export const QNA_SPACE_LABEL = 'Q&A Audience';

const SESSION_STATUSES: Array<{ value: QnaSessionStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'live', label: 'Live' },
  { value: 'paused', label: 'Dijeda' },
  { value: 'closed', label: 'Ditutup' },
  { value: 'archived', label: 'Arsip' }
];

const QUESTION_STATUSES: Array<{ value: QnaQuestionStatus; label: string }> = [
  { value: 'pending', label: 'Menunggu moderasi' },
  { value: 'approved', label: 'Tampil' },
  { value: 'answered', label: 'Terjawab' },
  { value: 'hidden', label: 'Disembunyikan' },
  { value: 'archived', label: 'Arsip' }
];

type NoticeValue = { tone: 'success' | 'error'; message: string };
type QnaTab = 'moderation' | 'settings' | 'links';
type QnaDeleteTarget =
  | { kind: 'session'; id: string; label: string }
  | { kind: 'question'; id: string; label: string };

const questionStatusLabel = (status: QnaQuestionStatus) => QUESTION_STATUSES.find(item => item.value === status)?.label || status;

const questionStatusClass = (status: QnaQuestionStatus) => {
  if (status === 'approved') return 'bg-[var(--success-soft)] text-[var(--success-text)]';
  if (status === 'answered') return 'bg-[var(--accent-soft)] text-[var(--accent-strong)]';
  if (status === 'hidden' || status === 'archived') return 'bg-[var(--danger-soft)] text-[var(--danger-text)]';
  return 'bg-[var(--surface-soft)] text-[var(--muted)]';
};

const normalizeSessionStatus = (value: unknown): QnaSessionStatus => (
  SESSION_STATUSES.some(item => item.value === value) ? value as QnaSessionStatus : 'draft'
);

const normalizeQuestionStatus = (value: unknown): QnaQuestionStatus => (
  QUESTION_STATUSES.some(item => item.value === value) ? value as QnaQuestionStatus : 'pending'
);

const normalizeQuestionCategory = (value: unknown) => {
  const category = String(value || '').trim();
  return category || 'Umum';
};

const compareQuestionDisplayOrder = (a: QnaQuestion, b: QnaQuestion) => {
  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
};

const sortQuestionsForDisplay = (questions: QnaQuestion[]) => (
  [...questions].sort(compareQuestionDisplayOrder)
);

const normalizeTheme = (value: unknown): FormThemeKey => (
  FORM_THEME_OPTIONS.some(item => item.value === value) ? value as FormThemeKey : 'navy'
);

const mapSessionRow = (row: any): QnaSession => ({
  id: String(row?.id || ''),
  slug: String(row?.slug || ''),
  title: String(row?.title || 'Sesi Q&A Baru'),
  eventName: String(row?.event_name ?? row?.eventName ?? ''),
  description: String(row?.description || ''),
  status: normalizeSessionStatus(row?.status),
  allowAnonymous: row?.allow_anonymous ?? row?.allowAnonymous !== false,
  requireName: row?.require_name === true || row?.requireName === true,
  votingEnabled: row?.voting_enabled ?? row?.votingEnabled !== false,
  welcomeMessage: String(row?.welcome_message ?? row?.welcomeMessage ?? ''),
  closedMessage: String(row?.closed_message ?? row?.closedMessage ?? 'Sesi Q&A ini sudah ditutup.'),
  theme: normalizeTheme(row?.theme),
  presenterToken: String(row?.presenter_token ?? row?.presenterToken ?? ''),
  createdAt: row?.created_at ?? row?.createdAt,
  updatedAt: row?.updated_at ?? row?.updatedAt
});

const mapQuestionRow = (row: any): QnaQuestion => ({
  id: String(row?.id || ''),
  sessionId: String(row?.session_id ?? row?.sessionId ?? ''),
  body: String(row?.body || ''),
  displayName: String(row?.display_name ?? row?.displayName ?? ''),
  category: normalizeQuestionCategory(row?.category),
  status: normalizeQuestionStatus(row?.status),
  answer: String(row?.answer || ''),
  isPinned: row?.is_pinned === true || row?.isPinned === true,
  upvotes: Number(row?.upvotes || 0),
  sortOrder: Number(row?.sort_order || row?.sortOrder || 0),
  createdAt: String(row?.created_at ?? row?.createdAt ?? ''),
  updatedAt: row?.updated_at ?? row?.updatedAt
});

const sessionWriteRow = (session: QnaSession) => ({
  slug: session.slug,
  title: session.title,
  event_name: session.eventName,
  description: session.description,
  status: session.status,
  allow_anonymous: session.allowAnonymous,
  require_name: session.requireName,
  voting_enabled: session.votingEnabled,
  welcome_message: session.welcomeMessage,
  closed_message: session.closedMessage,
  theme: session.theme,
  updated_at: new Date().toISOString()
});

const defaultSession = (): QnaSession => ({
  id: '',
  slug: `qna-${Date.now()}`,
  title: 'Sesi Q&A Baru',
  eventName: 'Event baru',
  description: 'Kirim pertanyaan Anda selama sesi berlangsung.',
  status: 'draft',
  allowAnonymous: true,
  requireName: false,
  votingEnabled: true,
  welcomeMessage: 'Pertanyaan akan langsung tampil di ruang diskusi.',
  closedMessage: 'Sesi Q&A ini sudah ditutup.',
  theme: 'navy',
  presenterToken: ''
});

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString('id-ID') : '—';

const slugify = (value: string) => value
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80) || `qna-${Date.now()}`;

const createQnaLink = (slug: string, presenterToken?: string) => {
  const url = new URL(window.location.origin);
  url.pathname = `/qna/${encodeURIComponent(slug)}${presenterToken ? '/present' : ''}`;
  if (presenterToken) url.searchParams.set('key', presenterToken);
  return url.toString();
};

const errorMessage = (error: any) => {
  const message = String(error?.message || error || 'Terjadi kesalahan.');
  if (message.includes('QNA_NOT_FOUND')) return 'Sesi Q&A tidak ditemukan atau belum dipublikasikan.';
  if (message.includes('QNA_CLOSED')) return 'Sesi Q&A sedang ditutup atau dijeda.';
  if (message.includes('QNA_CATEGORY_TOO_LONG')) return 'Kategori pertanyaan terlalu panjang.';
  if (message.includes('duplicate key') && message.includes('slug')) return 'Slug sesi sudah digunakan. Pilih slug yang berbeda.';
  if (message.includes('qna_sessions') || message.includes('qna_questions') || message.includes('qna_question_votes')) return 'Database Q&A belum siap. Jalankan migration Q&A terbaru.';
  return message;
};

const Notice: React.FC<{ notice: NoticeValue | null }> = ({ notice }) => notice ? (
  <div className={`rounded-xl border border-[var(--border)] p-3 text-sm ${notice.tone === 'success' ? 'bg-[var(--success-soft)] text-[var(--success-text)]' : 'bg-[var(--danger-soft)] text-[var(--danger-text)]'}`}>
    {notice.message}
  </div>
) : null;

const PageHeader: React.FC<{
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ eyebrow, title, description, action }) => (
  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
    <div>
      <Link to="/admin/qna" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent-strong)]"><ArrowLeft size={14} /> {QNA_SPACE_LABEL}</Link>
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{eyebrow}</p>}
      <h1 className="mt-2 text-3xl font-bold">{title}</h1>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">{description}</p>
    </div>
    {action}
  </div>
);

const QnaSessionForm: React.FC<{
  session: QnaSession;
  isSaving: boolean;
  isCreate: boolean;
  onChange: (patch: Partial<QnaSession>) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}> = ({ session, isSaving, isCreate, onChange, onSubmit, onCancel, onDelete }) => (
  <Card className="space-y-6">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Konfigurasi sesi</p>
      <h2 className="mt-2 text-xl font-bold">{isCreate ? 'Atur sesi Q&A sebelum dibuat' : 'Pengaturan sesi Q&A'}</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">Atur identitas, akses audience, dan tampilan ruang Q&A.</p>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <Input label="Judul sesi" value={session.title} onChange={event => onChange({ title: event.target.value })} placeholder="Contoh: Q&A Webinar Strategi Konten" />
      <Input label="Nama event / kelas" value={session.eventName} onChange={event => onChange({ eventName: event.target.value })} placeholder="Contoh: Webinar September" />
    </div>
    <Textarea label="Deskripsi" value={session.description} onChange={event => onChange({ description: event.target.value })} placeholder="Jelaskan konteks sesi kepada audience." />
    <div className="grid gap-4 md:grid-cols-2">
      <Input label="Slug link audience" value={session.slug} onChange={event => onChange({ slug: event.target.value })} onBlur={() => onChange({ slug: slugify(session.slug || session.title) })} placeholder="qna-webinar-september" />
      <label className="flex flex-col gap-2"><span className="text-xs font-semibold text-[var(--muted)]">Status sesi</span><select value={session.status} onChange={event => onChange({ status: event.target.value as QnaSessionStatus })} className="min-h-[46px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]">{SESSION_STATUSES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
    </div>

    <div className="grid gap-3 md:grid-cols-3">
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 text-sm"><input type="checkbox" checked={session.allowAnonymous} onChange={event => onChange({ allowAnonymous: event.target.checked })} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" /><span><span className="block font-semibold">Boleh anonim</span><span className="mt-1 block text-xs text-[var(--muted)]">Audience tidak wajib menulis nama.</span></span></label>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 text-sm"><input type="checkbox" checked={session.requireName} onChange={event => onChange({ requireName: event.target.checked })} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" /><span><span className="block font-semibold">Wajibkan nama</span><span className="mt-1 block text-xs text-[var(--muted)]">Tampilkan identitas pengirim.</span></span></label>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 text-sm"><input type="checkbox" checked={session.votingEnabled} onChange={event => onChange({ votingEnabled: event.target.checked })} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" /><span><span className="block font-semibold">Aktifkan voting</span><span className="mt-1 block text-xs text-[var(--muted)]">Audience dapat menaikkan pertanyaan.</span></span></label>
    </div>

    <div className="grid gap-4 md:grid-cols-2"><Textarea label="Pesan pembuka audience" value={session.welcomeMessage} onChange={event => onChange({ welcomeMessage: event.target.value })} placeholder="Pertanyaan akan langsung tampil di ruang diskusi." /><Textarea label="Pesan saat ditutup" value={session.closedMessage} onChange={event => onChange({ closedMessage: event.target.value })} /></div>

    <div className="space-y-3">
      <div><p className="text-xs font-semibold text-[var(--muted)]">Tema presenter dan audience</p><p className="mt-1 text-xs text-[var(--muted)]">Pilih warna aksen yang sesuai dengan event.</p></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{FORM_THEME_OPTIONS.map(option => <button key={option.value} type="button" aria-pressed={session.theme === option.value} onClick={() => onChange({ theme: option.value })} className={`rounded-xl border p-3 text-left transition-colors ${session.theme === option.value ? 'border-[var(--accent)] ring-2 ring-[var(--accent-soft)]' : 'border-[var(--border)] hover:border-[var(--border-strong)]'}`}><span className="mb-2 block h-7 rounded-lg" style={{ backgroundColor: option.swatch }} aria-hidden="true" /><span className="block text-sm font-semibold">{option.label}</span><span className="mt-1 block text-xs text-[var(--muted)]">{option.description}</span></button>)}</div>
    </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
      {onDelete ? <Button type="button" variant="danger" icon={Trash2} onClick={onDelete}>Hapus Sesi</Button> : <span />}
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="secondary" onClick={onCancel}>{isCreate ? 'Batal' : 'Kembali ke Moderasi'}</Button><Button type="button" icon={isCreate ? Plus : Save} onClick={onSubmit} isLoading={isSaving}>{isCreate ? 'Buat & buka moderasi' : 'Simpan Pengaturan'}</Button></div>
    </div>
  </Card>
);

export const QnaAdminListPage: React.FC<{ client: any }> = ({ client }) => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<QnaSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<NoticeValue | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QnaDeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (!client) {
      setNotice({ tone: 'error', message: 'Koneksi admin belum tersedia.' });
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await client.from('qna_sessions').select('*').order('created_at', { ascending: false });
    if (error) setNotice({ tone: 'error', message: errorMessage(error) });
    else setSessions((data || []).map(mapSessionRow));
    setIsLoading(false);
  }, [client]);

  useEffect(() => {
    void fetchSessions();
    if (!client) return;
    const channel = client.channel('qna_admin_session_list').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'public_content_revisions', filter: 'scope=eq.qna' }, () => { void fetchSessions(); }).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [client, fetchSessions]);

  const handleDelete = async () => {
    if (!client || !deleteTarget || deleteTarget.kind !== 'session') return;
    setIsDeleting(true);
    const target = deleteTarget;
    const { data, error } = await client.from('qna_sessions').delete().eq('id', target.id).select('id');
    if (error) setNotice({ tone: 'error', message: errorMessage(error) });
    else if (!data?.length) setNotice({ tone: 'error', message: 'Sesi Q&A tidak ditemukan atau sudah dihapus.' });
    else {
      setSessions(current => current.filter(session => session.id !== target.id));
      setDeleteTarget(null);
      setNotice({ tone: 'success', message: `Sesi “${target.label}” dan seluruh pertanyaannya berhasil dihapus.` });
    }
    setIsDeleting(false);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      <PageHeader title={QNA_SPACE_LABEL} description="Buat ruang Q&A untuk webinar atau kelas, lalu moderasi pertanyaan audience dari halaman detail sesi." action={<Button icon={Plus} onClick={() => navigate('/admin/qna/new')}>Buat Sesi Q&A</Button>} />
      <Notice notice={notice} />
      {isLoading ? <Card className="flex min-h-[320px] items-center justify-center gap-3 text-sm text-[var(--muted)]"><Loader2 size={18} className="animate-spin" /> Memuat sesi Q&A...</Card> : sessions.length === 0 ? <Card className="flex min-h-[360px] flex-col items-center justify-center gap-4 text-center"><MessageCircle size={40} className="text-[var(--muted)]" /><div><p className="font-semibold">Belum ada sesi Q&A</p><p className="mt-1 max-w-md text-sm leading-relaxed text-[var(--muted)]">Buat sesi baru untuk mendapatkan link audience dan mulai mengumpulkan pertanyaan.</p></div><Button icon={Plus} onClick={() => navigate('/admin/qna/new')}>Buat Sesi Q&A</Button></Card> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{sessions.map(session => <Card key={session.id} className="flex h-full flex-col gap-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge color="var(--accent-soft)">Q&A</Badge><span className={`rounded-lg px-2 py-1 text-[10px] font-semibold uppercase ${session.status === 'live' ? 'bg-[var(--success-soft)] text-[var(--success-text)]' : 'bg-[var(--surface-soft)] text-[var(--muted)]'}`}>{session.status}</span></div><h2 className="mt-3 truncate text-xl font-bold">{session.title}</h2><p className="mt-1 truncate text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{session.eventName || 'Tanpa nama event'}</p></div><MessageCircle className="shrink-0 text-[var(--accent-strong)]" size={24} /></div><p className="line-clamp-3 text-sm leading-relaxed text-[var(--muted)]">{session.description || 'Belum ada deskripsi sesi.'}</p><div className="mt-auto grid gap-2 sm:grid-cols-2"><Button onClick={() => navigate(`/admin/qna/${session.id}`)} icon={Eye}>Kelola Moderasi</Button><Button type="button" variant="secondary" onClick={() => navigate(`/admin/qna/${session.id}?tab=settings`)}>Edit Pengaturan</Button><Button type="button" variant="danger" className="sm:col-span-2" icon={Trash2} onClick={() => setDeleteTarget({ kind: 'session', id: session.id, label: session.title })}>Hapus Sesi</Button></div></Card>)}</div>}
      <ConfirmModal open={deleteTarget?.kind === 'session'} title="Hapus sesi Q&A ini?" description={deleteTarget?.kind === 'session' ? <>Sesi <strong className="text-[var(--text)]">{deleteTarget.label}</strong> beserta seluruh pertanyaan dan vote di dalamnya akan dihapus permanen.</> : null} confirmLabel="Hapus Sesi" isLoading={isDeleting} onCancel={() => { if (!isDeleting) setDeleteTarget(null); }} onConfirm={() => void handleDelete()} />
    </div>
  );
};

export const QnaAdminCreatePage: React.FC<{ client: any }> = ({ client }) => {
  const navigate = useNavigate();
  const [session, setSession] = useState<QnaSession>(() => defaultSession());
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<NoticeValue | null>(null);

  const handleSave = async () => {
    if (!client) return;
    if (!session.title.trim() || !session.eventName.trim()) {
      setNotice({ tone: 'error', message: 'Judul sesi dan nama event wajib diisi.' });
      return;
    }
    setIsSaving(true);
    const normalized = { ...session, slug: slugify(session.slug || session.title) };
    const { data, error } = await client.from('qna_sessions').insert(sessionWriteRow(normalized)).select('*').single();
    if (error) setNotice({ tone: 'error', message: errorMessage(error) });
    else if (data) navigate(`/admin/qna/${data.id}`, { replace: true });
    setIsSaving(false);
  };

  return <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-8"><PageHeader eyebrow="Sesi baru" title="Buat Sesi Q&A" description="Konfigurasikan sesi terlebih dahulu. Setelah disimpan, Anda langsung masuk ke halaman moderasi pertanyaan." /><Notice notice={notice} /><QnaSessionForm session={session} isSaving={isSaving} isCreate onChange={patch => setSession(current => ({ ...current, ...patch }))} onSubmit={() => void handleSave()} onCancel={() => navigate('/admin/qna')} /></div>;
};

const QnaModerationPanel: React.FC<{
  questions: QnaQuestion[];
  isLoading: boolean;
  filter: 'all' | QnaQuestionStatus;
  onFilterChange: (filter: 'all' | QnaQuestionStatus) => void;
  answerDrafts: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  onUpdate: (question: QnaQuestion, patch: Partial<QnaQuestion>) => void;
  onDelete: (question: QnaQuestion) => void;
}> = ({ questions, isLoading, filter, onFilterChange, answerDrafts, onAnswerChange, onUpdate, onDelete }) => {
  const filteredQuestions = useMemo(() => sortQuestionsForDisplay(filter === 'all' ? questions : questions.filter(question => question.status === filter)), [filter, questions]);
  const pendingCount = questions.filter(question => question.status === 'pending').length;
  const visibleCount = questions.filter(question => question.status === 'approved' || question.status === 'answered').length;

  return <Card className="space-y-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Moderasi realtime</p><h2 className="mt-2 text-xl font-bold">Pertanyaan audience</h2><p className="mt-1 text-sm text-[var(--muted)]">Pertanyaan baru langsung tampil. Moderator dapat menyembunyikan, menyematkan, menjawab, atau menghapusnya.</p></div><div className="flex gap-2"><Badge color="var(--surface-soft)">{pendingCount} belum tampil</Badge><Badge color="var(--success-soft)">{visibleCount} tampil</Badge></div></div><div className="flex flex-wrap gap-2">{(['all', 'pending', 'approved', 'answered', 'hidden'] as const).map(value => <button key={value} type="button" onClick={() => onFilterChange(value)} className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${filter === value ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]' : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)]'}`}>{value === 'all' ? 'Semua' : questionStatusLabel(value)}</button>)}</div>{isLoading ? <div className="flex items-center justify-center gap-3 py-12 text-sm text-[var(--muted)]"><Loader2 size={18} className="animate-spin" /> Memuat pertanyaan...</div> : filteredQuestions.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-10 text-center text-sm text-[var(--muted)]"><MessageCircle size={30} className="mx-auto mb-3" />Belum ada pertanyaan pada filter ini.</div> : <div className="space-y-3">{filteredQuestions.map(question => <article key={question.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{question.displayName || 'Anonim'}</span>{question.category && <span className="rounded-lg bg-[var(--surface)] px-2 py-1 text-[10px] font-semibold text-[var(--muted)]">{question.category}</span>}<span className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${questionStatusClass(question.status)}`}>{questionStatusLabel(question.status)}</span>{question.isPinned && <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--accent-strong)]"><Pin size={11} /> Dipin</span>}</div><p className="mt-1 text-xs text-[var(--muted)]">{formatDate(question.createdAt)} · {question.upvotes} vote</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" className="text-xs" onClick={() => onUpdate(question, { isPinned: !question.isPinned })}>{question.isPinned ? 'Lepas pin' : 'Pin'}</Button>{question.status === 'pending' && <Button type="button" className="text-xs" icon={Check} onClick={() => onUpdate(question, { status: 'approved' })}>Tampilkan</Button>}{(question.status === 'approved' || question.status === 'answered') && <Button type="button" variant="secondary" className="text-xs" onClick={() => onUpdate(question, { status: 'hidden' })}>Sembunyikan</Button>}{question.status === 'hidden' && <Button type="button" className="text-xs" onClick={() => onUpdate(question, { status: 'approved' })}>Tampilkan lagi</Button>}<Button type="button" variant="danger" className="text-xs" icon={Trash2} onClick={() => onDelete(question)}>Hapus</Button></div></div><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--text)]">{question.body}</p><div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"><Textarea label="Jawaban moderator (opsional)" value={answerDrafts[question.id] ?? question.answer} onChange={event => onAnswerChange(question.id, event.target.value)} className="min-h-[84px]" placeholder="Tulis jawaban yang akan tampil di presenter..." /><Button type="button" variant="secondary" className="text-xs" onClick={() => onUpdate(question, { answer: answerDrafts[question.id] ?? question.answer, status: (answerDrafts[question.id] ?? question.answer).trim() ? 'answered' : question.status === 'answered' ? 'approved' : question.status })}>Simpan jawaban</Button></div></article>)}</div>}</Card>;
};

const QnaLinksPanel: React.FC<{ session: QnaSession; onCopy: (value: string, label: string) => void }> = ({ session, onCopy }) => {
  const audienceLink = createQnaLink(session.slug);
  const presenterLink = session.presenterToken ? createQnaLink(session.slug, session.presenterToken) : '';
  return <div className="grid gap-5 lg:grid-cols-2"><Card className="space-y-5"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Audience</p><h2 className="mt-2 text-xl font-bold">Link pertanyaan audience</h2><p className="mt-1 text-sm text-[var(--muted)]">Bagikan link ini kepada peserta untuk mengirim pertanyaan.</p></div><div className="rounded-xl bg-[var(--surface-soft)] p-4"><p className="break-all text-sm font-semibold text-[var(--text)]">{audienceLink}</p><Button type="button" variant="secondary" className="mt-4" icon={Copy} onClick={() => onCopy(audienceLink, 'Link audience')}>Copy link audience</Button></div><Button type="button" variant="secondary" icon={Eye} onClick={() => window.open(audienceLink, '_blank', 'noopener,noreferrer')}>Preview Audience</Button></Card><Card className="space-y-5"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Presenter</p><h2 className="mt-2 text-xl font-bold">Layar presenter</h2><p className="mt-1 text-sm text-[var(--muted)]">Gunakan layar ini saat webinar untuk menampilkan pertanyaan yang sudah disetujui.</p></div><div className="rounded-xl bg-[var(--surface-soft)] p-4"><p className="break-all text-sm font-semibold text-[var(--text)]">{presenterLink || 'Simpan sesi untuk membuat link presenter.'}</p>{presenterLink && <Button type="button" variant="secondary" className="mt-4" icon={Copy} onClick={() => onCopy(presenterLink, 'Link presenter')}>Copy link presenter</Button>}</div><Button type="button" variant="secondary" icon={Play} disabled={!presenterLink} onClick={() => presenterLink && window.open(presenterLink, '_blank', 'noopener,noreferrer')}>Buka Presenter</Button></Card></div>;
};

export const QnaAdminDetailPage: React.FC<{ client: any }> = ({ client }) => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<QnaSession | null>(null);
  const [questions, setQuestions] = useState<QnaQuestion[]>([]);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [questionFilter, setQuestionFilter] = useState<'all' | QnaQuestionStatus>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<QnaDeleteTarget | null>(null);
  const [notice, setNotice] = useState<NoticeValue | null>(null);
  const rawTab = new URLSearchParams(location.search).get('tab');
  const activeTab: QnaTab = rawTab === 'settings' || rawTab === 'links' ? rawTab : 'moderation';

  const fetchSession = useCallback(async () => {
    if (!client || !id) return;
    const { data, error } = await client.from('qna_sessions').select('*').eq('id', id).maybeSingle();
    if (error || !data) setNotice({ tone: 'error', message: errorMessage(error || 'Sesi Q&A tidak ditemukan.') });
    else setSession(mapSessionRow(data));
    setIsLoading(false);
  }, [client, id]);

  const fetchQuestions = useCallback(async () => {
    if (!client || !id) return;
    setIsLoadingQuestions(true);
    const { data, error } = await client.from('qna_questions').select('*').eq('session_id', id).order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
    if (error) setNotice({ tone: 'error', message: errorMessage(error) });
    else {
      const mapped = sortQuestionsForDisplay((data || []).map(mapQuestionRow));
      setQuestions(mapped);
      setAnswerDrafts(current => ({ ...current, ...Object.fromEntries(mapped.map(question => [question.id, current[question.id] ?? question.answer])) }));
    }
    setIsLoadingQuestions(false);
  }, [client, id]);

  useEffect(() => { void fetchSession(); void fetchQuestions(); }, [fetchQuestions, fetchSession]);

  useEffect(() => {
    if (!client || !id) return;
    const channel = client.channel(`qna_admin_detail_${id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'public_content_revisions', filter: 'scope=eq.qna' }, () => { void fetchSession(); void fetchQuestions(); }).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [client, fetchQuestions, fetchSession, id]);

  const updateSession = (patch: Partial<QnaSession>) => setSession(current => current ? { ...current, ...patch } : current);

  const handleSave = async () => {
    if (!client || !session) return;
    if (!session.title.trim() || !session.eventName.trim()) {
      setNotice({ tone: 'error', message: 'Judul sesi dan nama event wajib diisi.' });
      return;
    }
    setIsSaving(true);
    const normalized = { ...session, slug: slugify(session.slug || session.title) };
    const { data, error } = await client.from('qna_sessions').update(sessionWriteRow(normalized)).eq('id', normalized.id).select('*').single();
    if (error) setNotice({ tone: 'error', message: errorMessage(error) });
    else if (data) {
      setSession(mapSessionRow(data));
      setNotice({ tone: 'success', message: 'Pengaturan sesi Q&A disimpan.' });
    }
    setIsSaving(false);
  };

  const updateQuestion = async (question: QnaQuestion, patch: Partial<QnaQuestion>) => {
    if (!client) return;
    const row = { status: patch.status ?? question.status, answer: patch.answer ?? question.answer, is_pinned: patch.isPinned ?? question.isPinned, sort_order: patch.sortOrder ?? question.sortOrder, updated_at: new Date().toISOString() };
    const { data, error } = await client.from('qna_questions').update(row).eq('id', question.id).select('*').single();
    if (error) setNotice({ tone: 'error', message: errorMessage(error) });
    else if (data) {
      const mapped = mapQuestionRow(data);
      setQuestions(current => sortQuestionsForDisplay(current.map(item => item.id === mapped.id ? mapped : item)));
      setAnswerDrafts(current => ({ ...current, [mapped.id]: mapped.answer }));
    }
  };

  const handleDelete = async () => {
    if (!client || !deleteTarget) return;
    setIsDeleting(true);
    const target = deleteTarget;
    const table = target.kind === 'session' ? 'qna_sessions' : 'qna_questions';
    const { data, error } = await client.from(table).delete().eq('id', target.id).select('id');
    if (error) setNotice({ tone: 'error', message: errorMessage(error) });
    else if (!data?.length) setNotice({ tone: 'error', message: `${target.kind === 'session' ? 'Sesi Q&A' : 'Pertanyaan'} tidak ditemukan atau sudah dihapus.` });
    else if (target.kind === 'session') {
      setDeleteTarget(null);
      navigate('/admin/qna', { replace: true });
    } else {
      setQuestions(current => current.filter(question => question.id !== target.id));
      setAnswerDrafts(current => { const next = { ...current }; delete next[target.id]; return next; });
      setDeleteTarget(null);
      setNotice({ tone: 'success', message: 'Pertanyaan berhasil dihapus permanen.' });
    }
    setIsDeleting(false);
  };

  const copyLink = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice({ tone: 'success', message: `${label} berhasil disalin.` });
    } catch {
      setNotice({ tone: 'error', message: value });
    }
  };

  const setTab = (tab: QnaTab) => navigate(`/admin/qna/${id}${tab === 'moderation' ? '' : `?tab=${tab}`}`);

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-[var(--muted)]"><Loader2 size={18} className="animate-spin" /> Memuat sesi Q&A...</div>;
  if (!session) return <div className="mx-auto max-w-xl p-8"><Card className="space-y-4 text-center"><XCircle size={34} className="mx-auto text-[var(--danger-text)]" /><p className="text-sm text-[var(--danger-text)]">Sesi Q&A tidak ditemukan.</p><Button variant="secondary" onClick={() => navigate('/admin/qna')}>Kembali ke daftar</Button></Card></div>;

  return <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8" style={formThemeStyle(session.theme)}>
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><Link to="/admin/qna" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent-strong)]"><ArrowLeft size={14} /> Daftar Q&A</Link><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold">{session.title}</h1><Badge color={session.status === 'live' ? 'var(--success-soft)' : 'var(--surface-soft)'}>{session.status === 'live' ? 'LIVE' : session.status.toUpperCase()}</Badge></div><p className="mt-1 text-sm text-[var(--muted)]">{session.eventName || 'Tanpa nama event'} · Kelola sesi dan pertanyaan audience.</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" icon={Eye} onClick={() => window.open(createQnaLink(session.slug), '_blank', 'noopener,noreferrer')}>Preview Audience</Button><Button variant="secondary" icon={Play} disabled={!session.presenterToken} onClick={() => session.presenterToken && window.open(createQnaLink(session.slug, session.presenterToken), '_blank', 'noopener,noreferrer')}>Presenter</Button></div></div>
    <Notice notice={notice} />
    <Card className="p-2"><div className="grid gap-2 sm:grid-cols-3"><button type="button" onClick={() => setTab('moderation')} className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${activeTab === 'moderation' ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : 'text-[var(--muted)] hover:bg-[var(--surface-soft)]'}`}>Moderasi <span className="ml-1 text-xs">({questions.filter(question => question.status === 'pending').length} menunggu)</span></button><button type="button" onClick={() => setTab('settings')} className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${activeTab === 'settings' ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : 'text-[var(--muted)] hover:bg-[var(--surface-soft)]'}`}>Pengaturan</button><button type="button" onClick={() => setTab('links')} className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${activeTab === 'links' ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : 'text-[var(--muted)] hover:bg-[var(--surface-soft)]'}`}>Link & Presenter</button></div></Card>
    {activeTab === 'moderation' && <QnaModerationPanel questions={questions} isLoading={isLoadingQuestions} filter={questionFilter} onFilterChange={setQuestionFilter} answerDrafts={answerDrafts} onAnswerChange={(questionId, value) => setAnswerDrafts(current => ({ ...current, [questionId]: value }))} onUpdate={(question, patch) => { void updateQuestion(question, patch); }} onDelete={question => setDeleteTarget({ kind: 'question', id: question.id, label: question.body })} />}
    {activeTab === 'settings' && <QnaSessionForm session={session} isSaving={isSaving} isCreate={false} onChange={updateSession} onSubmit={() => void handleSave()} onCancel={() => setTab('moderation')} onDelete={() => setDeleteTarget({ kind: 'session', id: session.id, label: session.title })} />}
    {activeTab === 'links' && <QnaLinksPanel session={session} onCopy={(value, label) => void copyLink(value, label)} />}
    <ConfirmModal open={Boolean(deleteTarget)} title={deleteTarget?.kind === 'session' ? 'Hapus sesi Q&A ini?' : 'Hapus pertanyaan ini?'} description={deleteTarget?.kind === 'session' ? <>Sesi <strong className="text-[var(--text)]">{deleteTarget.label}</strong> beserta seluruh pertanyaan dan vote di dalamnya akan dihapus permanen.</> : <>Pertanyaan <strong className="text-[var(--text)]">{deleteTarget?.label}</strong> akan dihapus permanen dan tidak akan muncul lagi setelah halaman dimuat ulang.</>} confirmLabel={deleteTarget?.kind === 'session' ? 'Hapus Sesi' : 'Hapus Pertanyaan'} isLoading={isDeleting} onCancel={() => { if (!isDeleting) setDeleteTarget(null); }} onConfirm={() => void handleDelete()} />
  </div>;
};
