import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Copy, Eye, FileText, Loader2, Maximize2, MessageCircle, Minimize2, Pin, Play, Plus, RefreshCw, Save, Send, Trash2, XCircle } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';

import {
  FormThemeKey,
  QnaQuestion,
  QnaQuestionStatus,
  QnaSession,
  QnaSessionStatus
} from '../types';
import { Badge, Button, Card, ConfirmModal, Input, Textarea } from './UI';
import { FORM_MAKER_PUBLIC_LABEL, FORM_THEME_OPTIONS, formThemeStyle } from './FormMakerPages';
import logoUtama from '../src/logo-utama.png';

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
  status: normalizeQuestionStatus(row?.status),
  answer: String(row?.answer || ''),
  isPinned: row?.is_pinned === true || row?.isPinned === true,
  upvotes: Number(row?.upvotes || 0),
  sortOrder: Number(row?.sort_order || row?.sortOrder || 0),
  createdAt: String(row?.created_at ?? row?.createdAt ?? ''),
  updatedAt: row?.updated_at ?? row?.updatedAt
});

const mapPublicSession = (value: any) => {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row) return null;
  return {
    id: String(row.id || ''),
    slug: String(row.slug || ''),
    title: String(row.title || 'Sesi Q&A'),
    eventName: String(row.eventName || ''),
    description: String(row.description || ''),
    status: normalizeSessionStatus(row.status),
    allowAnonymous: row.allowAnonymous !== false,
    requireName: row.requireName === true,
    votingEnabled: row.votingEnabled !== false,
    welcomeMessage: String(row.welcomeMessage || ''),
    closedMessage: String(row.closedMessage || 'Sesi Q&A ini sudah ditutup.'),
    theme: normalizeTheme(row.theme),
    presenterValid: row.presenterValid === true || row.isPresenter === true,
    questions: Array.isArray(row.questions) ? row.questions.map(mapQuestionRow) : []
  };
};

type PublicQnaSession = NonNullable<ReturnType<typeof mapPublicSession>>;

type QnaDeleteTarget =
  | { kind: 'session'; id: string; label: string }
  | { kind: 'question'; id: string; label: string };

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
  if (message.includes('QNA_NAME_REQUIRED')) return 'Nama wajib diisi untuk mengirim pertanyaan.';
  if (message.includes('QNA_NAME_TOO_LONG')) return 'Nama terlalu panjang.';
  if (message.includes('QNA_QUESTION_REQUIRED')) return 'Pertanyaan wajib diisi.';
  if (message.includes('QNA_RATE_LIMITED')) return 'Tunggu sebentar sebelum mengirim pertanyaan lagi.';
  if (message.includes('QNA_VOTING_DISABLED')) return 'Voting sedang dimatikan untuk sesi ini.';
  if (message.includes('QNA_VOTER_REQUIRED')) return 'Voting tidak dapat dilakukan dari perangkat ini.';
  if (message.includes('qna_sessions') || message.includes('qna_questions') || message.includes('qna_question_votes') || message.includes('get_public_qna') || message.includes('submit_public_qna')) return 'Database Q&A belum siap. Jalankan migration Q&A terbaru.';
  return message;
};

const createClientToken = () => {
  try {
    const key = 'arunika-qna-client-token';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const token = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, token);
    return token;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
};

const Notice: React.FC<{ tone: 'success' | 'error'; children: React.ReactNode }> = ({ tone, children }) => (
  <div className={`rounded-xl border border-[var(--border)] p-3 text-sm ${tone === 'success' ? 'bg-[var(--success-soft)] text-[var(--success-text)]' : 'bg-[var(--danger-soft)] text-[var(--danger-text)]'}`}>
    {children}
  </div>
);

export const QnaAdminPage: React.FC<{ client: any }> = ({ client }) => {
  const [sessions, setSessions] = useState<QnaSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QnaQuestion[]>([]);
  const [questionFilter, setQuestionFilter] = useState<'all' | QnaQuestionStatus>('all');
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<QnaDeleteTarget | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const selectedSession = sessions.find(session => session.id === selectedSessionId) || null;

  const fetchSessions = useCallback(async () => {
    if (!client) {
      setNotice({ tone: 'error', message: 'Koneksi admin belum tersedia.' });
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await client.from('qna_sessions').select('*').order('created_at', { ascending: false });
    if (error) setNotice({ tone: 'error', message: errorMessage(error) });
    else {
      const mapped = (data || []).map(mapSessionRow);
      setSessions(mapped);
      setSelectedSessionId(current => current && mapped.some(session => session.id === current) ? current : mapped[0]?.id || null);
    }
    setIsLoading(false);
  }, [client]);

  const fetchQuestions = useCallback(async () => {
    if (!client || !selectedSessionId) {
      setQuestions([]);
      return;
    }
    setIsLoadingQuestions(true);
    const { data, error } = await client.from('qna_questions').select('*').eq('session_id', selectedSessionId).order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
    if (error) setNotice({ tone: 'error', message: errorMessage(error) });
    else {
      const mapped = (data || []).map(mapQuestionRow);
      setQuestions(mapped);
      setAnswerDrafts(current => ({ ...current, ...Object.fromEntries(mapped.map(question => [question.id, current[question.id] ?? question.answer])) }));
    }
    setIsLoadingQuestions(false);
  }, [client, selectedSessionId]);

  useEffect(() => { void fetchSessions(); }, [fetchSessions]);

  useEffect(() => {
    void fetchQuestions();
    if (!client || !selectedSessionId) return;
    const channel = client.channel(`qna_admin_${selectedSessionId}`).on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'public_content_revisions', filter: 'scope=eq.qna'
    }, () => { void fetchSessions(); void fetchQuestions(); }).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [client, fetchQuestions, fetchSessions, selectedSessionId]);

  const updateSelectedSession = (patch: Partial<QnaSession>) => {
    setSessions(current => current.map(session => session.id === selectedSessionId ? { ...session, ...patch } : session));
  };

  const handleCreate = async () => {
    if (!client) return;
    setIsCreating(true);
    const draft: QnaSession = {
      id: '',
      slug: `qna-${Date.now()}`,
      title: 'Sesi Q&A Baru',
      eventName: 'Event baru',
      description: 'Kirim pertanyaan Anda selama sesi berlangsung.',
      status: 'draft',
      allowAnonymous: true,
      requireName: false,
      votingEnabled: true,
      welcomeMessage: 'Pertanyaan akan ditampilkan setelah disetujui moderator.',
      closedMessage: 'Sesi Q&A ini sudah ditutup.',
      theme: 'navy',
      presenterToken: ''
    };
    const { data, error } = await client.from('qna_sessions').insert(sessionWriteRow(draft)).select('*').single();
    if (error) setNotice({ tone: 'error', message: errorMessage(error) });
    else if (data) {
      const session = mapSessionRow(data);
      setSessions(current => [session, ...current]);
      setSelectedSessionId(session.id);
      setNotice({ tone: 'success', message: 'Sesi Q&A berhasil dibuat.' });
    }
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!client || !selectedSession) return;
    setIsSaving(true);
    const normalized = { ...selectedSession, slug: slugify(selectedSession.slug || selectedSession.title) };
    const { data, error } = await client.from('qna_sessions').update(sessionWriteRow(normalized)).eq('id', normalized.id).select('*').single();
    if (error) setNotice({ tone: 'error', message: errorMessage(error) });
    else if (data) {
      setSessions(current => current.map(session => session.id === normalized.id ? mapSessionRow(data) : session));
      setNotice({ tone: 'success', message: 'Pengaturan sesi Q&A disimpan.' });
    }
    setIsSaving(false);
  };

  const updateQuestion = async (question: QnaQuestion, patch: Partial<QnaQuestion>) => {
    if (!client) return;
    const row = {
      status: patch.status ?? question.status,
      answer: patch.answer ?? question.answer,
      is_pinned: patch.isPinned ?? question.isPinned,
      sort_order: patch.sortOrder ?? question.sortOrder,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await client.from('qna_questions').update(row).eq('id', question.id).select('*').single();
    if (error) setNotice({ tone: 'error', message: errorMessage(error) });
    else if (data) {
      const mapped = mapQuestionRow(data);
      setQuestions(current => current.map(item => item.id === mapped.id ? mapped : item));
      setAnswerDrafts(current => ({ ...current, [mapped.id]: mapped.answer }));
    }
  };

  const handleDelete = async () => {
    if (!client || !deleteTarget) return;
    setIsDeleting(true);
    const target = deleteTarget;
    const table = target.kind === 'session' ? 'qna_sessions' : 'qna_questions';
    const { data, error } = await client.from(table).delete().eq('id', target.id).select('id');
    if (error) {
      setNotice({ tone: 'error', message: errorMessage(error) });
    } else if (!data?.length) {
      setNotice({ tone: 'error', message: `${target.kind === 'session' ? 'Sesi Q&A' : 'Pertanyaan'} tidak ditemukan atau sudah dihapus.` });
    } else if (target.kind === 'session') {
      const remaining = sessions.filter(session => session.id !== target.id);
      setSessions(remaining);
      setSelectedSessionId(current => current === target.id ? remaining[0]?.id || null : current);
      setQuestions([]);
      setAnswerDrafts({});
      setDeleteTarget(null);
      setNotice({ tone: 'success', message: `Sesi “${target.label}” dan seluruh pertanyaannya berhasil dihapus.` });
    } else {
      setQuestions(current => current.filter(question => question.id !== target.id));
      setAnswerDrafts(current => {
        const next = { ...current };
        delete next[target.id];
        return next;
      });
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

  const filteredQuestions = useMemo(() => questionFilter === 'all' ? questions : questions.filter(question => question.status === questionFilter), [questionFilter, questions]);
  const pendingCount = questions.filter(question => question.status === 'pending').length;
  const visibleCount = questions.filter(question => question.status === 'approved' || question.status === 'answered').length;

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-[var(--muted)]"><Loader2 size={18} className="animate-spin" /> Memuat sesi Q&A...</div>;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Link to="/admin" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent-strong)]"><ArrowLeft size={14} /> Semua Space</Link>
          <h1 className="text-3xl font-bold">{QNA_SPACE_LABEL}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">Kelola pertanyaan audience, moderasi sebelum tampil, dan buka layar presenter realtime untuk kelas atau webinar.</p>
        </div>
        <Button icon={Plus} onClick={() => void handleCreate()} isLoading={isCreating}>Buat Sesi Q&A</Button>
      </div>
      {notice && <Notice tone={notice.tone}>{notice.message}</Notice>}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="h-fit space-y-4">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Sesi</p><h2 className="mt-1 text-lg font-bold">Daftar Q&A</h2></div><MessageCircle size={20} className="text-[var(--accent-strong)]" /></div>
          {sessions.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-4 text-center text-xs leading-relaxed text-[var(--muted)]">Belum ada sesi. Buat sesi pertama untuk mulai mengumpulkan pertanyaan.</div> : <div className="space-y-2">{sessions.map(session => <div key={session.id} className={`flex items-start gap-1 rounded-xl border p-1 transition-colors ${selectedSessionId === session.id ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] hover:border-[var(--border-strong)]'}`}><button type="button" aria-pressed={selectedSessionId === session.id} onClick={() => setSelectedSessionId(session.id)} className="min-w-0 flex-1 rounded-lg p-2 text-left"><div className="flex items-start justify-between gap-2"><span className="min-w-0 truncate text-sm font-semibold">{session.title}</span><span className={`shrink-0 rounded-md px-1.5 py-1 text-[9px] font-semibold uppercase ${session.status === 'live' ? 'bg-[var(--success-soft)] text-[var(--success-text)]' : 'bg-[var(--surface-soft)] text-[var(--muted)]'}`}>{session.status}</span></div><span className="mt-1 block truncate text-xs text-[var(--muted)]">{session.eventName || 'Tanpa nama event'}</span></button><button type="button" aria-label={`Hapus sesi ${session.title}`} onClick={() => setDeleteTarget({ kind: 'session', id: session.id, label: session.title })} className="mt-1 rounded-lg p-2 text-[var(--danger-text)] transition-colors hover:bg-[var(--danger-soft)]"><Trash2 size={16} /></button></div>)}</div>}
        </Card>

        {!selectedSession ? <Card className="flex min-h-[360px] flex-col items-center justify-center gap-4 text-center"><MessageCircle size={38} className="text-[var(--muted)]" /><div><p className="font-semibold">Pilih atau buat sesi Q&A</p><p className="mt-1 text-sm text-[var(--muted)]">Satu sesi dapat dipakai untuk satu webinar, kelas, atau event.</p></div><Button icon={Plus} onClick={() => void handleCreate()} isLoading={isCreating}>Buat Sesi Q&A</Button></Card> : <div className="space-y-6">
          <Card className="space-y-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Pengaturan sesi</p><h2 className="mt-2 text-xl font-bold">{selectedSession.title}</h2><p className="mt-1 text-sm text-[var(--muted)]">Atur identitas dan perilaku ruang Q&A publik.</p></div><Badge color={selectedSession.status === 'live' ? 'var(--success-soft)' : 'var(--surface-soft)'}>{selectedSession.status === 'live' ? 'LIVE' : selectedSession.status.toUpperCase()}</Badge></div>
            <div className="grid gap-4 md:grid-cols-2"><Input label="Judul sesi" value={selectedSession.title} onChange={event => updateSelectedSession({ title: event.target.value })} /><Input label="Nama event / kelas" value={selectedSession.eventName} onChange={event => updateSelectedSession({ eventName: event.target.value })} /></div>
            <Textarea label="Deskripsi" value={selectedSession.description} onChange={event => updateSelectedSession({ description: event.target.value })} />
            <div className="grid gap-4 md:grid-cols-2"><Input label="Slug link audience" value={selectedSession.slug} onChange={event => updateSelectedSession({ slug: event.target.value })} onBlur={() => updateSelectedSession({ slug: slugify(selectedSession.slug || selectedSession.title) })} /><label className="flex flex-col gap-2"><span className="text-xs font-semibold text-[var(--muted)]">Status sesi</span><select value={selectedSession.status} onChange={event => updateSelectedSession({ status: event.target.value as QnaSessionStatus })} className="min-h-[46px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]">{SESSION_STATUSES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label></div>
            <div className="grid gap-3 md:grid-cols-3"><label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 text-sm"><input type="checkbox" checked={selectedSession.allowAnonymous} onChange={event => updateSelectedSession({ allowAnonymous: event.target.checked })} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" /><span><span className="block font-semibold">Boleh anonim</span><span className="mt-1 block text-xs text-[var(--muted)]">Audience tidak wajib menulis nama.</span></span></label><label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 text-sm"><input type="checkbox" checked={selectedSession.requireName} onChange={event => updateSelectedSession({ requireName: event.target.checked })} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" /><span><span className="block font-semibold">Wajibkan nama</span><span className="mt-1 block text-xs text-[var(--muted)]">Tampilkan identitas pengirim.</span></span></label><label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 text-sm"><input type="checkbox" checked={selectedSession.votingEnabled} onChange={event => updateSelectedSession({ votingEnabled: event.target.checked })} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" /><span><span className="block font-semibold">Aktifkan voting</span><span className="mt-1 block text-xs text-[var(--muted)]">Audience dapat menaikkan pertanyaan.</span></span></label></div>
            <div className="grid gap-4 md:grid-cols-2"><Textarea label="Pesan pembuka audience" value={selectedSession.welcomeMessage} onChange={event => updateSelectedSession({ welcomeMessage: event.target.value })} placeholder="Pertanyaan akan dimoderasi sebelum tampil." /><Textarea label="Pesan saat ditutup" value={selectedSession.closedMessage} onChange={event => updateSelectedSession({ closedMessage: event.target.value })} /></div>
            <div className="space-y-3"><div><p className="text-xs font-semibold text-[var(--muted)]">Tema presenter dan audience</p><p className="mt-1 text-xs text-[var(--muted)]">Pilih warna aksen yang sesuai dengan event.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{FORM_THEME_OPTIONS.map(option => <button key={option.value} type="button" aria-pressed={selectedSession.theme === option.value} onClick={() => updateSelectedSession({ theme: option.value })} className={`rounded-xl border p-3 text-left transition-colors ${selectedSession.theme === option.value ? 'border-[var(--accent)] ring-2 ring-[var(--accent-soft)]' : 'border-[var(--border)] hover:border-[var(--border-strong)]'}`}><span className="mb-2 block h-7 rounded-lg" style={{ backgroundColor: option.swatch }} aria-hidden="true" /><span className="block text-sm font-semibold">{option.label}</span><span className="mt-1 block text-xs text-[var(--muted)]">{option.description}</span></button>)}</div></div>
            <div className="flex flex-wrap items-center justify-between gap-2"><Button type="button" variant="danger" icon={Trash2} onClick={() => setDeleteTarget({ kind: 'session', id: selectedSession.id, label: selectedSession.title })}>Hapus Sesi</Button><div className="flex flex-wrap justify-end gap-2"><Button variant="secondary" icon={Eye} onClick={() => window.open(createQnaLink(selectedSession.slug), '_blank', 'noopener,noreferrer')}>Preview Audience</Button><Button variant="secondary" icon={Play} disabled={!selectedSession.presenterToken} onClick={() => window.open(createQnaLink(selectedSession.slug, selectedSession.presenterToken), '_blank', 'noopener,noreferrer')}>Buka Presenter</Button><Button icon={Save} onClick={() => void handleSave()} isLoading={isSaving}>Simpan Sesi</Button></div></div>
            <div className="grid gap-3 rounded-xl bg-[var(--surface-soft)] p-4 text-xs text-[var(--muted)] md:grid-cols-2"><div><p className="font-semibold text-[var(--text)]">Link audience</p><p className="mt-1 break-all">{createQnaLink(selectedSession.slug)}</p><Button type="button" variant="secondary" className="mt-3 text-xs" icon={Copy} onClick={() => void copyLink(createQnaLink(selectedSession.slug), 'Link audience')}>Copy link</Button></div><div><p className="font-semibold text-[var(--text)]">Link presenter</p><p className="mt-1 break-all">{selectedSession.presenterToken ? createQnaLink(selectedSession.slug, selectedSession.presenterToken) : 'Simpan sesi untuk membuat link presenter.'}</p>{selectedSession.presenterToken && <Button type="button" variant="secondary" className="mt-3 text-xs" icon={Copy} onClick={() => void copyLink(createQnaLink(selectedSession.slug, selectedSession.presenterToken), 'Link presenter')}>Copy link</Button>}</div></div>
          </Card>

          <Card className="space-y-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Moderasi</p><h2 className="mt-2 text-xl font-bold">Pertanyaan audience</h2><p className="mt-1 text-sm text-[var(--muted)]">Setujui pertanyaan sebelum ditampilkan di layar presenter.</p></div><div className="flex gap-2"><Badge color="var(--surface-soft)">{pendingCount} menunggu</Badge><Badge color="var(--success-soft)">{visibleCount} tampil</Badge></div></div>
            <div className="flex flex-wrap gap-2">{(['all', 'pending', 'approved', 'answered', 'hidden'] as const).map(filter => <button key={filter} type="button" onClick={() => setQuestionFilter(filter)} className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${questionFilter === filter ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]' : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)]'}`}>{filter === 'all' ? 'Semua' : questionStatusLabel(filter)}</button>)}</div>
            {isLoadingQuestions ? <div className="flex items-center justify-center gap-3 py-12 text-sm text-[var(--muted)]"><Loader2 size={18} className="animate-spin" /> Memuat pertanyaan...</div> : filteredQuestions.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-8 text-center text-sm text-[var(--muted)]">Belum ada pertanyaan pada filter ini.</div> : <div className="space-y-3">{filteredQuestions.map(question => <article key={question.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{question.displayName || 'Anonim'}</span><span className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${questionStatusClass(question.status)}`}>{questionStatusLabel(question.status)}</span>{question.isPinned && <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--accent-strong)]"><Pin size={11} /> Dipin</span>}</div><p className="mt-1 text-xs text-[var(--muted)]">{formatDate(question.createdAt)} · {question.upvotes} vote</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" className="text-xs" onClick={() => void updateQuestion(question, { isPinned: !question.isPinned })}>{question.isPinned ? 'Lepas pin' : 'Pin'}</Button>{question.status === 'pending' && <Button type="button" className="text-xs" icon={Check} onClick={() => void updateQuestion(question, { status: 'approved' })}>Tampilkan</Button>}{(question.status === 'approved' || question.status === 'answered') && <Button type="button" variant="secondary" className="text-xs" onClick={() => void updateQuestion(question, { status: 'hidden' })}>Sembunyikan</Button>}{question.status === 'hidden' && <Button type="button" className="text-xs" onClick={() => void updateQuestion(question, { status: 'approved' })}>Tampilkan lagi</Button>}<Button type="button" variant="danger" className="text-xs" icon={Trash2} onClick={() => setDeleteTarget({ kind: 'question', id: question.id, label: question.body })}>Hapus</Button></div></div><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--text)]">{question.body}</p><div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"><Textarea label="Jawaban moderator (opsional)" value={answerDrafts[question.id] ?? question.answer} onChange={event => setAnswerDrafts(current => ({ ...current, [question.id]: event.target.value }))} className="min-h-[84px]" placeholder="Tulis jawaban yang akan tampil di presenter..." /><Button type="button" variant="secondary" className="text-xs" onClick={() => void updateQuestion(question, { answer: answerDrafts[question.id] ?? question.answer, status: (answerDrafts[question.id] ?? question.answer).trim() ? 'answered' : question.status === 'answered' ? 'approved' : question.status })}>Simpan jawaban</Button></div></article>)}</div>}
          </Card>
        </div>}
      </div>
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={deleteTarget?.kind === 'session' ? 'Hapus sesi Q&A ini?' : 'Hapus pertanyaan ini?'}
        description={deleteTarget?.kind === 'session' ? <>Sesi <strong className="text-[var(--text)]">{deleteTarget.label}</strong> beserta seluruh pertanyaan dan vote di dalamnya akan dihapus permanen.</> : <>Pertanyaan <strong className="text-[var(--text)]">{deleteTarget?.label}</strong> akan dihapus permanen dan tidak akan muncul lagi setelah halaman dimuat ulang.</>}
        confirmLabel={deleteTarget?.kind === 'session' ? 'Hapus Sesi' : 'Hapus Pertanyaan'}
        isLoading={isDeleting}
        onCancel={() => { if (!isDeleting) setDeleteTarget(null); }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
};

const QnaAudienceView: React.FC<{
  client: any;
  session: PublicQnaSession;
  clientToken: string;
  onQuestionVote: (questionId: string) => Promise<boolean>;
}> = ({ client, session, clientToken, onQuestionVote }) => {
  const [displayName, setDisplayName] = useState('');
  const [question, setQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [votedQuestions, setVotedQuestions] = useState<Set<string>>(() => new Set());
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const nameRequired = session.requireName || !session.allowAnonymous;
  const isLive = session.status === 'live';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isLive) return;
    if (!question.trim()) {
      setNotice({ tone: 'error', message: 'Pertanyaan wajib diisi.' });
      return;
    }
    if (nameRequired && !displayName.trim()) {
      setNotice({ tone: 'error', message: 'Nama wajib diisi untuk sesi ini.' });
      return;
    }
    setIsSubmitting(true);
    setNotice(null);
    const { error } = await client.rpc('submit_public_qna_question', {
      p_slug: session.slug,
      p_question: question.trim(),
      p_display_name: displayName.trim(),
      p_client_token: clientToken
    });
    if (error) setNotice({ tone: 'error', message: errorMessage(error) });
    else {
      setQuestion('');
      setNotice({ tone: 'success', message: 'Pertanyaan terkirim dan menunggu moderasi.' });
    }
    setIsSubmitting(false);
  };

  const handleVote = async (questionId: string) => {
    if (!session.votingEnabled || votedQuestions.has(questionId)) return;
    try {
      const didVote = await onQuestionVote(questionId);
      if (didVote) setVotedQuestions(current => new Set([...current, questionId]));
    } catch (error) {
      setNotice({ tone: 'error', message: errorMessage(error) });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] p-4 md:p-8" style={formThemeStyle(session.theme)}>
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center gap-3"><img src={logoUtama} alt="Arunika LMS" className="h-10 w-14 object-contain" /><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{FORM_MAKER_PUBLIC_LABEL}</p><p className="truncate font-semibold">{session.title}</p></div></header>
        <Card className="space-y-6">
          <div><div className="flex flex-wrap items-center gap-2"><Badge color="var(--accent-soft)">Q&A Audience</Badge><Badge color={isLive ? 'var(--success-soft)' : 'var(--surface-soft)'}>{isLive ? 'LIVE' : session.status.toUpperCase()}</Badge></div><h1 className="mt-4 text-3xl font-bold">{session.title}</h1><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">{session.description}</p>{session.welcomeMessage && <p className="mt-4 rounded-xl bg-[var(--surface-soft)] p-3 text-sm leading-relaxed text-[var(--muted)]">{session.welcomeMessage}</p>}</div>
          {!isLive ? <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--muted)]">{session.closedMessage}</div> : <form onSubmit={handleSubmit} className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><Input label={`Nama ${nameRequired ? '*' : '(opsional)'}`} value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder={session.allowAnonymous && !nameRequired ? 'Anonim' : 'Nama Anda'} required={nameRequired} /><div className="flex items-end text-xs leading-relaxed text-[var(--muted)]"><span>Pertanyaan Anda akan diperiksa moderator sebelum tampil ke peserta lain.</span></div></div><Textarea label="Pertanyaan Anda" value={question} onChange={event => setQuestion(event.target.value.slice(0, 1200))} maxLength={1200} placeholder="Tulis pertanyaan untuk pembicara..." className="min-h-[130px]" /><div className="flex items-center justify-between gap-3"><span className="text-xs text-[var(--muted)]">{question.length}/1200 karakter</span><Button type="submit" icon={Send} isLoading={isSubmitting}>Kirim pertanyaan</Button></div></form>}
          {notice && <Notice tone={notice.tone}>{notice.message}</Notice>}
        </Card>

        <section className="space-y-4"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Pertanyaan terpilih</p><h2 className="mt-2 text-xl font-bold">Diskusi audience</h2></div><Badge color="var(--surface-soft)">{session.questions.length} tampil</Badge></div>{session.questions.length === 0 ? <Card className="py-12 text-center text-sm text-[var(--muted)]"><MessageCircle size={30} className="mx-auto mb-3" />Belum ada pertanyaan yang ditampilkan.</Card> : <div className="space-y-3">{session.questions.map(item => <article key={item.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{item.displayName || 'Anonim'}</span>{item.isPinned && <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--accent-strong)]"><Pin size={11} /> Dipin</span>}</div><p className="mt-1 text-xs text-[var(--muted)]">{formatDate(item.createdAt)}</p></div>{session.votingEnabled && <button type="button" disabled={votedQuestions.has(item.id)} onClick={() => void handleVote(item.id)} className={`min-w-14 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${votedQuestions.has(item.id) ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]' : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent-strong)]'}`} aria-label={`Vote pertanyaan dari ${item.displayName || 'anonim'}`}><span className="block text-base leading-none">▲</span><span className="mt-1 block">{item.upvotes}</span></button>}</div><p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed">{item.body}</p>{item.answer && <div className="mt-4 rounded-xl bg-[var(--accent-soft)] p-3"><p className="text-xs font-semibold text-[var(--accent-strong)]">Jawaban moderator</p><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{item.answer}</p></div>}</article>)}</div>}</section>
      </div>
    </div>
  );
};

const QnaPresenterView: React.FC<{ session: PublicQnaSession }> = ({ session }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isLive = session.status === 'live';

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen?.();
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] p-4 md:p-8" style={formThemeStyle(session.theme)}>
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><img src={logoUtama} alt="Arunika LMS" className="h-10 w-14 object-contain" /><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Presenter Q&A</p><h1 className="truncate text-xl font-bold">{session.title}</h1><p className="mt-1 text-sm text-[var(--muted)]">{session.eventName}</p></div></div><div className="flex flex-wrap items-center gap-2"><Badge color={isLive ? 'var(--success-soft)' : 'var(--surface-soft)'}>{isLive ? 'LIVE' : session.status.toUpperCase()}</Badge><Button variant="secondary" icon={isFullscreen ? Minimize2 : Maximize2} onClick={() => void toggleFullscreen()}>{isFullscreen ? 'Keluar fullscreen' : 'Fullscreen'}</Button></div></header>
        {!isLive && <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--muted)]">{session.closedMessage}</div>}
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Pertanyaan disetujui</p><h2 className="mt-2 text-2xl font-bold">Pilih pertanyaan untuk dibahas</h2></div><Badge color="var(--accent-soft)">{session.questions.length} pertanyaan</Badge></div>
        {session.questions.length === 0 ? <Card className="flex min-h-[360px] flex-col items-center justify-center gap-4 text-center"><MessageCircle size={48} className="text-[var(--muted)]" /><div><p className="text-lg font-semibold">Menunggu pertanyaan</p><p className="mt-1 text-sm text-[var(--muted)]">Pertanyaan yang disetujui moderator akan muncul realtime di sini.</p></div></Card> : <div className="grid gap-5 md:grid-cols-2">{session.questions.map(item => <article key={item.id} className={`rounded-2xl border bg-[var(--surface)] p-6 shadow-sm ${item.isPinned ? 'border-[var(--accent)] ring-2 ring-[var(--accent-soft)]' : 'border-[var(--border)]'}`}><div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><Badge color={item.status === 'answered' ? 'var(--success-soft)' : 'var(--accent-soft)'}>{item.status === 'answered' ? 'Terjawab' : 'Pertanyaan'}</Badge>{item.isPinned && <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-strong)]"><Pin size={13} /> Prioritas</span>}</div><p className="mt-3 text-sm font-semibold text-[var(--muted)]">{item.displayName || 'Anonim'} · {item.upvotes} vote</p></div><FileText size={22} className="shrink-0 text-[var(--accent-strong)]" /></div><p className="mt-5 whitespace-pre-wrap break-words text-xl font-semibold leading-relaxed md:text-2xl">{item.body}</p>{item.answer && <div className="mt-5 rounded-xl bg-[var(--accent-soft)] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-strong)]">Jawaban moderator</p><p className="mt-2 whitespace-pre-wrap text-base leading-relaxed">{item.answer}</p></div>}</article>)}</div>}
      </div>
    </div>
  );
};

export const PublicQnaPage: React.FC<{ client: any; presenterMode?: boolean; slugOverride?: string }> = ({ client, presenterMode = false, slugOverride }) => {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const location = useLocation();
  const slug = slugOverride || routeSlug;
  const [session, setSession] = useState<PublicQnaSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const clientToken = useMemo(createClientToken, []);
  const presenterToken = new URLSearchParams(location.search).get('key') || '';

  const fetchSession = useCallback(async () => {
    if (!client || !slug) {
      setLoadError('Link sesi Q&A tidak valid.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await client.rpc('get_public_qna_session', { p_slug: decodeURIComponent(slug), p_presenter_token: presenterToken });
    if (error || !data) setLoadError(errorMessage(error || 'QNA_NOT_FOUND'));
    else {
      const mapped = mapPublicSession(data);
      if (!mapped) setLoadError('Sesi Q&A tidak ditemukan.');
      else {
        setSession(mapped);
        setLoadError(presenterMode && !mapped.presenterValid ? 'Link presenter tidak valid atau sudah dicabut.' : null);
      }
    }
    setIsLoading(false);
  }, [client, presenterMode, presenterToken, slug]);

  useEffect(() => { void fetchSession(); }, [fetchSession]);

  useEffect(() => {
    if (!client || !slug) return;
    const channel = client.channel(`public_qna_${slug}`).on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'public_content_revisions', filter: 'scope=eq.qna'
    }, () => { void fetchSession(); }).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [client, fetchSession, slug]);

  const handleQuestionVote = async (questionId: string): Promise<boolean> => {
    if (!session || !client) return false;
    const { data, error } = await client.rpc('vote_public_qna_question', { p_slug: session.slug, p_question_id: questionId, p_voter_token: clientToken });
    if (error) throw error;
    const upvotes = Number(data?.upvotes ?? 0);
    setSession(current => current ? { ...current, questions: current.questions.map(question => question.id === questionId ? { ...question, upvotes } : question) } : current);
    return data?.voted !== false;
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center gap-3 bg-[var(--app-bg)] text-sm text-[var(--muted)]"><Loader2 size={18} className="animate-spin" /> Memuat sesi Q&A...</div>;
  if (loadError || !session) return <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] p-6"><Card className="w-full max-w-md space-y-5 py-10 text-center"><XCircle size={34} className="mx-auto text-[var(--danger-text)]" /><div><h1 className="text-xl font-bold">Sesi Q&A tidak dapat dibuka</h1><p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{loadError}</p></div><Button icon={RefreshCw} onClick={() => void fetchSession()} className="mx-auto w-full">Coba Lagi</Button></Card></div>;
  if (presenterMode) return <QnaPresenterView session={session} />;
  return <QnaAudienceView client={client} session={session} clientToken={clientToken} onQuestionVote={handleQuestionVote} />;
};
