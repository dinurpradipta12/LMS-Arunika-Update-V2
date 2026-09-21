import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bold,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  Italic,
  Link as LinkIcon,
  Loader2,
  List,
  MessageCircle,
  Paperclip,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Smile,
  Underline,
  X
} from 'lucide-react';

import { Badge, Button, Card, Input, Textarea } from './UI';
import { getPublicBaseUrl, setPublicMetadata } from './PublicMetadata';
import logoUtama from '../src/logo-utama.png';

export const CHAT_CENTER_SPACE_LABEL = 'Chat Center';
export const PUBLIC_CHAT_TOKEN_STORAGE_KEY = 'arunika:last-public-chat-token';

type ChatRoomStatus = 'active' | 'closed' | 'expired';

interface ChatRoom {
  id: string;
  title: string;
  participantName: string;
  participantEmail: string;
  status: ChatRoomStatus;
  messageRetentionMinutes: number;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  publicTokenHint?: string;
}

interface ChatMessage {
  id: string;
  senderRole: 'admin' | 'guest';
  senderName: string;
  body: string;
  clientMessageId?: string | null;
  readAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

type Notice = { tone: 'success' | 'error'; message: string } | null;
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const databaseErrorMessage = (error: any) => {
  const message = String(error?.message || error?.details || '').trim();
  return message || 'Perubahan belum dapat disimpan. Pastikan migration Chat Center sudah dijalankan.';
};

const publicChatErrorMessage = (error: any, action: 'open' | 'send' = 'open') => {
  const raw = String(error?.message || error?.details || '').toUpperCase();
  if (raw.includes('ROOM_EXPIRED') || raw.includes('ROOM_CLOSED')) return 'Room chat sudah ditutup atau masa aksesnya berakhir.';
  if (raw.includes('RATE_LIMITED')) return 'Terlalu banyak pesan dalam waktu singkat. Coba lagi sebentar.';
  if (raw.includes('INVALID_MESSAGE')) return 'Pesan tidak valid atau terlalu panjang.';
  if (raw.includes('SCHEMA CACHE') || raw.includes('FUNCTION PUBLIC.') || raw.includes('NOT FOUND')) {
    return action === 'send' ? 'Pesan belum dapat dikirim. Coba lagi nanti.' : 'Room chat tidak ditemukan atau link sudah tidak berlaku.';
  }
  return action === 'send' ? 'Pesan belum dapat dikirim. Coba lagi nanti.' : 'Room chat tidak tersedia atau link sudah tidak berlaku.';
};

const mapRoom = (row: any): ChatRoom => ({
  id: row.id,
  title: row.title || CHAT_CENTER_SPACE_LABEL,
  participantName: row.participant_name || '',
  participantEmail: row.participant_email || '',
  status: row.status === 'closed' ? 'closed' : row.status === 'active' ? 'active' : 'expired',
  messageRetentionMinutes: Number(row.message_retention_minutes || row.duration_minutes || 1440),
  lastMessageAt: row.last_message_at || null,
  createdAt: row.created_at || '',
  updatedAt: row.updated_at || '',
  publicTokenHint: row.public_token_hint || ''
});

const mapMessage = (row: any): ChatMessage => {
  const senderRole = row.sender_role || row.senderRole;
  return {
    id: row.id,
    senderRole: senderRole === 'admin' ? 'admin' : 'guest',
    senderName: row.sender_name || row.senderName || '',
    body: row.body || '',
    clientMessageId: row.client_message_id || row.clientMessageId || null,
    readAt: row.read_at || row.readAt || null,
    expiresAt: row.expires_at || row.expiresAt || null,
    createdAt: row.created_at || row.createdAt || ''
  };
};

const formatDate = (value: string | null, withTime = true) => {
  if (!value) return 'Belum ada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(date);
};

const formatDuration = (minutes: number) => {
  if (minutes % 1440 === 0) return `${minutes / 1440} hari`;
  if (minutes % 60 === 0) return `${minutes / 60} jam`;
  return `${minutes} menit`;
};

const roomStatus = (room: ChatRoom): ChatRoomStatus => room.status === 'closed' ? 'closed' : 'active';
const statusLabel = (status: ChatRoomStatus) => status === 'active' ? 'Aktif' : status === 'expired' ? 'Kedaluwarsa' : 'Ditutup';

const chatLink = (token: string) => {
  try {
    const url = new URL(getPublicBaseUrl());
    url.search = '';
    url.hash = `/chat/${encodeURIComponent(token)}`;
    return url.toString();
  } catch {
    return `${window.location.origin}${window.location.pathname}#/chat/${encodeURIComponent(token)}`;
  }
};

const adminChatLink = (roomId: string) => `${window.location.origin}${window.location.pathname}#/admin/chat-center/${encodeURIComponent(roomId)}/chat`;

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

const ChatModal: React.FC<{ open: boolean; title: string; onClose: () => void; children: React.ReactNode }> = ({ open, title, onClose, children }) => {
  if (!open) return null;
  return <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl" onMouseDown={event => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4"><h2 className="text-xl font-bold">{title}</h2><button type="button" onClick={onClose} aria-label="Tutup" className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-soft)]"><X size={18} /></button></div>
      <div className="mt-5">{children}</div>
    </div>
  </div>;
};

const ChatMessages: React.FC<{ messages: ChatMessage[]; viewer: 'admin' | 'guest'; className?: string }> = ({ messages, viewer, className = '' }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const visibleMessages = messages.filter(message => !message.expiresAt || new Date(message.expiresAt).getTime() > Date.now());
  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [visibleMessages.length]);

  return <div ref={scrollRef} className={`flex h-full min-h-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 md:p-6 ${className}`}>
    {visibleMessages.length === 0 ? <div className="m-auto max-w-xs text-center text-sm text-[var(--muted)]"><MessageCircle size={30} className="mx-auto mb-3" /><p>Belum ada pesan.</p><p className="mt-1 text-xs">Kirim pesan pertama untuk memulai percakapan.</p></div> : visibleMessages.map(message => {
      const mine = message.senderRole === viewer;
      return <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm ${mine ? 'rounded-br-md bg-[var(--accent)] text-white' : 'rounded-bl-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]'}`}>
          <p className={`mb-1 text-[10px] font-semibold ${mine ? 'text-white/75' : 'text-[var(--muted)]'}`}>{message.senderName || (mine ? 'Anda' : 'Peserta')}</p>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>
          <p className={`mt-2 text-[10px] ${mine ? 'text-white/70' : 'text-[var(--muted)]'}`}>{formatDate(message.createdAt)}</p>
        </div>
      </div>;
    })}
  </div>;
};

const ChatComposer: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  placeholder: string;
  disabled?: boolean;
  isSending?: boolean;
}> = ({ value, onChange, onSubmit, placeholder, disabled = false, isSending = false }) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 58), 220);
    textarea.style.height = `${nextHeight}px`;
  };
  const toolbarButtons = [
    { label: 'Tebal', icon: Bold },
    { label: 'Miring', icon: Italic },
    { label: 'Garis bawah', icon: Underline },
    { label: 'Daftar', icon: List }
  ];

  useEffect(() => {
    resizeTextarea();
  }, [value]);

  return <form className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] p-3 md:p-5" onSubmit={onSubmit}>
    <div className={`rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 transition-all focus-within:border-[var(--border-strong)] focus-within:ring-4 focus-within:ring-[color-mix(in_srgb,var(--accent)_10%,transparent)] ${disabled ? 'opacity-70' : ''}`}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={event => {
          onChange(event.target.value);
          requestAnimationFrame(resizeTextarea);
        }}
        placeholder={placeholder}
        rows={1}
        maxLength={4000}
        disabled={disabled || isSending}
        className="max-h-[220px] min-h-[58px] w-full resize-none overflow-y-auto border-0 bg-transparent px-1 py-1 text-sm leading-6 text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:ring-0"
        aria-label="Pesan"
      />
      <div className="mt-2 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-2">
        <div className="flex items-center gap-1 text-[var(--muted)]">
          {toolbarButtons.map(({ label, icon: Icon }) => <button key={label} type="button" disabled aria-label={label} title={`${label} (segera hadir)`} className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg opacity-55"><Icon size={16} /></button>)}
          <button type="button" disabled={disabled} aria-label="Lampiran" title="Lampiran (segera hadir)" className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg opacity-55"><Paperclip size={16} /></button>
          <button type="button" disabled={disabled} aria-label="Emoji" title="Emoji (segera hadir)" className="flex h-8 w-8 cursor-not-allowed items-center justify-center rounded-lg opacity-55"><Smile size={16} /></button>
        </div>
        <div className="flex items-center gap-2"><span className="hidden text-[10px] text-[var(--muted)] sm:inline">Enter untuk baris baru</span><Button type="submit" icon={Send} isLoading={isSending} disabled={disabled || isSending || !value.trim()} className="min-h-[42px] px-4">Kirim</Button></div>
      </div>
    </div>
  </form>;
};

export const ChatCenterPage: React.FC<{ client: any }> = ({ client }) => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [createForm, setCreateForm] = useState({ title: '', participantName: '', participantEmail: '', messageRetentionMinutes: '1440' });

  const fetchRooms = useCallback(async () => {
    if (!client) {
      setNotice({ tone: 'error', message: 'Koneksi admin belum tersedia.' });
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await client.from('chat_rooms').select('*').order('updated_at', { ascending: false });
    if (error) setNotice({ tone: 'error', message: databaseErrorMessage(error) });
    else setRooms((data || []).map(mapRoom));
    setIsLoading(false);
  }, [client]);

  useEffect(() => { void fetchRooms(); }, [fetchRooms]);

  const createRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    const messageRetentionMinutes = Number(createForm.messageRetentionMinutes);
    if (!createForm.participantName.trim()) {
      setNotice({ tone: 'error', message: 'Nama peserta wajib diisi.' });
      return;
    }
    if (!Number.isFinite(messageRetentionMinutes) || messageRetentionMinutes < 5 || messageRetentionMinutes > 43200) {
      setNotice({ tone: 'error', message: 'Retensi pesan harus antara 5 menit dan 30 hari.' });
      return;
    }
    setIsCreating(true);
    const { data, error } = await client.rpc('create_chat_room', {
      p_title: createForm.title.trim() || `Chat dengan ${createForm.participantName.trim()}`,
      p_participant_name: createForm.participantName.trim(),
      p_participant_email: createForm.participantEmail.trim(),
      p_duration_minutes: messageRetentionMinutes
    });
    if (error || !data?.roomId || !data?.token) {
      setNotice({ tone: 'error', message: databaseErrorMessage(error || data) });
      setIsCreating(false);
      return;
    }
    const token = String(data.token);
    setTokens(current => ({ ...current, [data.roomId]: token }));
    try { await copyText(chatLink(token)); } catch { /* link tetap tersedia di halaman detail */ }
    setCreateForm({ title: '', participantName: '', participantEmail: '', messageRetentionMinutes: '1440' });
    setShowCreate(false);
    setNotice({ tone: 'success', message: 'Room chat dibuat dan link publik disalin ke clipboard.' });
    setIsCreating(false);
    navigate(`/admin/chat-center/${data.roomId}`, { state: { chatToken: token } });
  };

  const rotateToken = async (roomId: string) => {
    const { data, error } = await client.rpc('rotate_chat_room_token', { p_room_id: roomId });
    if (error || !data?.token) {
      setNotice({ tone: 'error', message: databaseErrorMessage(error || data) });
      return;
    }
    const token = String(data.token);
    setTokens(current => ({ ...current, [roomId]: token }));
    try { await copyText(chatLink(token)); } catch { /* user masih dapat menyalin dari detail */ }
    setNotice({ tone: 'success', message: 'Link baru dibuat. Link lama langsung tidak aktif.' });
  };

  return <div className="mx-auto w-full max-w-[1600px] space-y-7 p-4 md:p-6 lg:p-8">
    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div><Badge color="var(--accent-soft)">Space 09</Badge><h1 className="mt-4 text-3xl font-bold tracking-tight">{CHAT_CENTER_SPACE_LABEL}</h1><p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--muted)]">Buat room chat 1:1 untuk setiap orang melalui public link tanpa login. Atur durasi akses, balas pesan, dan tutup room kapan saja.</p></div>
      <Button icon={Plus} onClick={() => setShowCreate(true)}>Buat room chat</Button>
    </div>
    <NoticeMessage notice={notice} />
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="p-5"><p className="text-xs text-[var(--muted)]">Total room</p><p className="mt-2 text-3xl font-bold">{rooms.length}</p></Card>
      <Card className="p-5"><p className="text-xs text-[var(--muted)]">Room aktif</p><p className="mt-2 text-3xl font-bold text-[var(--success-text)]">{rooms.filter(room => roomStatus(room) === 'active').length}</p></Card>
      <Card className="p-5"><p className="text-xs text-[var(--muted)]">Perlu perhatian</p><p className="mt-2 text-3xl font-bold text-[var(--accent-strong)]">{rooms.filter(room => roomStatus(room) !== 'active').length}</p></Card>
    </div>
    {isLoading ? <Card className="flex min-h-[240px] items-center justify-center gap-3 text-sm text-[var(--muted)]"><Loader2 size={20} className="animate-spin" /> Memuat room chat...</Card> : rooms.length === 0 ? <Card className="flex min-h-[280px] flex-col items-center justify-center gap-4 text-center"><MessageCircle size={40} className="text-[var(--muted)]" /><div><p className="font-semibold">Belum ada room chat</p><p className="mt-1 text-sm text-[var(--muted)]">Buat room untuk mulai percakapan privat 1:1.</p></div><Button icon={Plus} onClick={() => setShowCreate(true)}>Buat room pertama</Button></Card> : <div className="grid gap-5 xl:grid-cols-2">{rooms.map(room => {
      const status = roomStatus(room);
      const token = tokens[room.id];
      return <Card key={room.id} className="flex h-full flex-col gap-5">
        <div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]"><MessageCircle size={21} /></div><div className="min-w-0"><h2 className="truncate text-lg font-bold">{room.title}</h2><p className="mt-1 truncate text-sm text-[var(--muted)]">{room.participantName}{room.participantEmail ? ` · ${room.participantEmail}` : ''}</p></div></div><Badge color={status === 'active' ? 'var(--success-soft)' : 'var(--surface-soft)'}>{statusLabel(status)}</Badge></div>
        <div className="grid gap-3 text-sm sm:grid-cols-2"><div className="rounded-xl bg-[var(--surface-soft)] p-3"><p className="text-xs text-[var(--muted)]">Retensi pesan</p><p className="mt-1 font-semibold">{formatDuration(room.messageRetentionMinutes)}</p></div><div className="rounded-xl bg-[var(--surface-soft)] p-3"><p className="text-xs text-[var(--muted)]">Pesan terakhir</p><p className="mt-1 font-semibold">{formatDate(room.lastMessageAt, false)}</p></div></div>
        <div className="mt-auto flex flex-wrap gap-2"><Button variant="secondary" onClick={() => navigate(`/admin/chat-center/${room.id}`, { state: token ? { chatToken: token } : undefined })}>Buka chat</Button><Button variant="secondary" icon={ExternalLink} onClick={() => window.open(adminChatLink(room.id), '_blank', 'noopener,noreferrer')}>Chat saja</Button>{token ? <Button variant="secondary" icon={Copy} onClick={() => void copyText(chatLink(token))}>Salin link</Button> : <Button variant="secondary" icon={LinkIcon} onClick={() => void rotateToken(room.id)}>Buat link</Button>}{token && <Button variant="secondary" icon={ExternalLink} onClick={() => window.open(chatLink(token), '_blank', 'noopener,noreferrer')}>Buka publik</Button>}<Button variant="danger" icon={RotateCcw} onClick={() => void rotateToken(room.id)}>Perbarui link</Button></div>
      </Card>;
    })}</div>}
    <ChatModal open={showCreate} title="Buat room chat 1:1" onClose={() => setShowCreate(false)}><form className="space-y-4" onSubmit={createRoom}><Input label="Nama peserta" required value={createForm.participantName} onChange={event => setCreateForm({ ...createForm, participantName: event.target.value })} placeholder="Contoh: Nabila" /><Input label="Email peserta (opsional)" type="email" value={createForm.participantEmail} onChange={event => setCreateForm({ ...createForm, participantEmail: event.target.value })} placeholder="nabila@email.com" /><Input label="Judul room (opsional)" value={createForm.title} onChange={event => setCreateForm({ ...createForm, title: event.target.value })} placeholder="Chat konsultasi Social Media" /><Input label="Pesan disimpan selama (menit)" type="number" min="5" max="43200" value={createForm.messageRetentionMinutes} onChange={event => setCreateForm({ ...createForm, messageRetentionMinutes: event.target.value })} /><p className="text-xs leading-relaxed text-[var(--muted)]">Setiap pesan akan terhapus otomatis setelah waktu ini. Contoh: 60 = 1 jam, 360 = 6 jam, 1440 = 1 hari. Maksimal 30 hari.</p><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Batal</Button><Button type="submit" icon={Plus} isLoading={isCreating}>Buat room</Button></div></form></ChatModal>
  </div>;
};

export const ChatCenterRoomPage: React.FC<{ client: any; standalone?: boolean }> = ({ client, standalone = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [token, setToken] = useState<string>(() => (location.state as any)?.chatToken || '');
  const [message, setMessage] = useState('');
  const [messageRetentionMinutes, setMessageRetentionMinutes] = useState('1440');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSavingAccess, setIsSavingAccess] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const fetchRoom = useCallback(async (showLoader = false) => {
    if (!id || !client) return;
    if (showLoader) setIsLoading(true);
    await client.rpc('cleanup_expired_chat_messages');
    const [{ data: roomRow, error: roomError }, { data: messageRows, error: messageError }] = await Promise.all([
      client.from('chat_rooms').select('*').eq('id', id).maybeSingle(),
      client.from('chat_messages').select('*').eq('room_id', id).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: true }).limit(200)
    ]);
    if (roomError) setNotice({ tone: 'error', message: databaseErrorMessage(roomError) });
    else if (roomRow) {
      const nextRoom = mapRoom(roomRow);
      setRoom(nextRoom);
      setMessageRetentionMinutes(String(nextRoom.messageRetentionMinutes));
    }
    if (messageError) setNotice({ tone: 'error', message: databaseErrorMessage(messageError) });
    else setMessages((messageRows || []).map(mapMessage));
    setIsLoading(false);
  }, [client, id]);

  useEffect(() => { void fetchRoom(true); }, [fetchRoom]);
  useEffect(() => {
    const timer = window.setInterval(() => { void fetchRoom(false); }, 3000);
    return () => window.clearInterval(timer);
  }, [fetchRoom]);

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = message.trim();
    if (!id || !body || isSending) return;
    setIsSending(true);
    const { data, error } = await client.from('chat_messages').insert({ room_id: id, sender_role: 'admin', sender_name: 'Admin', body }).select('*').single();
    if (error) setNotice({ tone: 'error', message: databaseErrorMessage(error) });
    else {
      await client.from('chat_rooms').update({ last_message_at: new Date().toISOString() }).eq('id', id);
      setMessages(current => [...current, mapMessage(data)]);
      setMessage('');
    }
    setIsSending(false);
  };

  const saveAccess = async (status: 'active' | 'closed') => {
    if (!id) return;
    const minutes = Number(messageRetentionMinutes);
    if (!Number.isFinite(minutes) || minutes < 5 || minutes > 43200) {
      setNotice({ tone: 'error', message: 'Retensi pesan harus antara 5 menit dan 30 hari.' });
      return;
    }
    setIsSavingAccess(true);
    const { data, error } = await client.rpc('update_chat_room_access', { p_room_id: id, p_status: status, p_duration_minutes: minutes });
    if (error) setNotice({ tone: 'error', message: databaseErrorMessage(error) });
    else {
      setNotice({ tone: 'success', message: status === 'active' ? 'Room tetap aktif dan retensi pesan diperbarui.' : 'Room ditutup. Link publik tidak dapat mengirim pesan baru.' });
      await fetchRoom(false);
    }
    setIsSavingAccess(false);
  };

  const rotateToken = async () => {
    if (!id) return;
    const { data, error } = await client.rpc('rotate_chat_room_token', { p_room_id: id });
    if (error || !data?.token) setNotice({ tone: 'error', message: databaseErrorMessage(error || data) });
    else {
      setToken(String(data.token));
      try { await copyText(chatLink(String(data.token))); } catch { /* link tetap terlihat */ }
      setNotice({ tone: 'success', message: 'Link baru dibuat dan link lama tidak lagi aktif.' });
    }
  };

  if (isLoading && !room) return <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-[var(--muted)]"><Loader2 size={20} className="animate-spin" /> Memuat room chat...</div>;
  if (!room) return <Card className="mx-auto mt-12 max-w-lg space-y-4 text-center"><MessageCircle size={34} className="mx-auto text-[var(--muted)]" /><p className="font-semibold">Room chat tidak ditemukan.</p><Button variant="secondary" onClick={() => navigate('/admin/chat-center')}>Kembali</Button></Card>;

  const status = roomStatus(room);
  const publicLink = token ? chatLink(token) : '';
  const openStandaloneChat = () => {
    window.open(adminChatLink(id || room.id), '_blank', 'noopener,noreferrer');
  };

  const conversationCard = <Card className={`flex ${standalone ? 'min-h-0 flex-1' : 'min-h-[calc(100vh-14rem)]'} flex-col gap-0 overflow-hidden bg-[var(--surface-soft)] p-0 shadow-sm`}>
    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4 md:px-6"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Percakapan</p><h2 className="mt-2 text-xl font-bold">Pesan room</h2></div><div className="flex items-center gap-2 text-xs text-[var(--muted)]"><ShieldCheck size={15} /> Akses admin terverifikasi</div></div>
    <div className="min-h-0 flex-1 overflow-hidden"><ChatMessages messages={messages} viewer="admin" className="h-full min-h-0 rounded-none border-0 bg-transparent" /></div>
    <ChatComposer value={message} onChange={setMessage} onSubmit={sendMessage} placeholder="Tulis balasan..." isSending={isSending} />
  </Card>;

  if (standalone) return <main className="min-h-screen bg-[var(--app-bg)] p-4 md:p-8"><div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1100px] flex-col gap-5 md:min-h-[calc(100vh-4rem)]"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><Link to={`/admin/chat-center/${room.id}`} className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent-strong)]"><ArrowLeft size={14} /> Pengaturan room</Link><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold">{room.title}</h1><Badge color={status === 'active' ? 'var(--success-soft)' : 'var(--surface-soft)'}>{statusLabel(status)}</Badge></div><p className="mt-2 text-sm text-[var(--muted)]">Chat 1:1 dengan {room.participantName}{room.participantEmail ? ` · ${room.participantEmail}` : ''}</p></div><Button variant="secondary" icon={RefreshCw} onClick={() => void fetchRoom(true)}>Refresh</Button></div><NoticeMessage notice={notice} />{conversationCard}</div></main>;

  return <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-6 lg:p-8">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><Link to="/admin/chat-center" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent-strong)]"><ArrowLeft size={14} /> Semua room chat</Link><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold">{room.title}</h1><Badge color={status === 'active' ? 'var(--success-soft)' : 'var(--surface-soft)'}>{statusLabel(status)}</Badge></div><p className="mt-2 text-sm text-[var(--muted)]">Chat 1:1 dengan {room.participantName}{room.participantEmail ? ` · ${room.participantEmail}` : ''}</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" icon={ExternalLink} onClick={openStandaloneChat}>Buka chat saja</Button><Button variant="secondary" icon={RefreshCw} onClick={() => void fetchRoom(true)}>Refresh</Button></div></div>
    <NoticeMessage notice={notice} />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      {conversationCard}
      <div className="space-y-6">
        <Card className="space-y-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Akses publik</p><h2 className="mt-2 text-lg font-bold">Retensi pesan dan link</h2></div><div className="rounded-xl bg-[var(--surface-soft)] p-3"><p className="text-xs text-[var(--muted)]">Pesan tersimpan selama</p><p className="mt-1 font-semibold">{formatDuration(room.messageRetentionMinutes)}</p><p className="mt-1 text-xs text-[var(--muted)]">Pesan terhapus otomatis setelah waktu ini.</p></div><Input label="Simpan pesan selama (menit)" type="number" min="5" max="43200" value={messageRetentionMinutes} onChange={event => setMessageRetentionMinutes(event.target.value)} /><div className="flex flex-wrap gap-2"><Button className="flex-1" onClick={() => void saveAccess('active')} isLoading={isSavingAccess} disabled={isSavingAccess}>Simpan retensi</Button><Button variant="danger" className="flex-1" onClick={() => void saveAccess('closed')} isLoading={isSavingAccess} disabled={isSavingAccess}>Tutup room</Button></div>{token ? <><div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3"><p className="break-all text-xs text-[var(--muted)]">{publicLink}</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" icon={Copy} className="flex-1" onClick={() => void copyText(publicLink)}>Salin link</Button><Button variant="secondary" icon={ExternalLink} className="flex-1" onClick={() => window.open(publicLink, '_blank', 'noopener,noreferrer')}>Buka publik</Button></div></> : <div className="rounded-xl border border-dashed border-[var(--border-strong)] p-3 text-xs leading-relaxed text-[var(--muted)]">Token asli tidak disimpan oleh server. Buat link baru jika halaman ini dibuka ulang tanpa token.</div>}<Button variant="secondary" icon={RotateCcw} className="w-full" onClick={() => void rotateToken()}>Perbarui link publik</Button></Card>
        <Card className="space-y-3"><div className="flex items-center gap-2"><Clock3 size={18} className="text-[var(--accent-strong)]" /><h2 className="font-semibold">Aturan room</h2></div><p className="text-sm leading-relaxed text-[var(--muted)]">Link ini tidak membutuhkan login, jadi perlakukan sebagai kunci akses. Room tetap tersedia sampai ditutup admin. Setiap pesan akan dihapus otomatis dari database dan tidak lagi tampil setelah retensinya habis.</p></Card>
      </div>
    </div>
  </div>;
};

export const PublicChatRoomPage: React.FC<{ client: any; tokenOverride?: string }> = ({ client, tokenOverride }) => {
  const { token: routeToken } = useParams<{ token: string }>();
  const token = tokenOverride || routeToken || '';
  const [room, setRoom] = useState<{ id: string; title: string; participantName: string; status: ChatRoomStatus; available: boolean; messageRetentionMinutes: number; messages: ChatMessage[] } | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  const fetchRoom = useCallback(async (showLoader = false) => {
    if (!client || !token) {
      setError('Link room chat tidak valid.');
      setIsLoading(false);
      return;
    }
    if (showLoader) setIsLoading(true);
    const { data, error: requestError } = await client.rpc('get_public_chat_room', { p_token: token });
    if (requestError || !data) setError(requestError ? publicChatErrorMessage(requestError) : 'Room chat tidak ditemukan atau link sudah tidak berlaku.');
    else {
      setError('');
      setRoom({ id: data.id, title: data.title || CHAT_CENTER_SPACE_LABEL, participantName: data.participantName || '', status: data.status === 'closed' ? 'closed' : 'active', available: data.available === true, messageRetentionMinutes: Number(data.messageRetentionMinutes || 1440), messages: Array.isArray(data.messages) ? data.messages.map(mapMessage) : [] });
    }
    setIsLoading(false);
  }, [client, token]);

  useEffect(() => { void fetchRoom(true); }, [fetchRoom]);
  useEffect(() => {
    const timer = window.setInterval(() => { void fetchRoom(false); }, 3000);
    return () => window.clearInterval(timer);
  }, [fetchRoom]);
  useEffect(() => {
    setPublicMetadata({ title: room?.title || CHAT_CENTER_SPACE_LABEL, description: 'Percakapan privat 1:1 melalui Chat Center.' });
  }, [room?.title]);
  useEffect(() => {
    if (!token) return;
    try { localStorage.setItem(PUBLIC_CHAT_TOKEN_STORAGE_KEY, token); } catch { /* storage opsional */ }
  }, [token]);
  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(display-mode: standalone)');
    const standalone = Boolean(mediaQuery?.matches || (navigator as Navigator & { standalone?: boolean }).standalone);
    setIsStandalone(standalone);
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const installPwa = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = message.trim();
    if (!body || !room?.available || isSending) return;
    setIsSending(true);
    const clientMessageId = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const { data, error: requestError } = await client.rpc('send_public_chat_message', { p_token: token, p_body: body, p_client_message_id: clientMessageId });
    if (requestError) setError(publicChatErrorMessage(requestError, 'send'));
    else {
      setMessage('');
      if (data) setRoom(current => current ? { ...current, messages: [...current.messages.filter(item => item.id !== data.id), mapMessage(data)] } : current);
      void fetchRoom(false);
    }
    setIsSending(false);
  };

  if (isLoading && !room) return <div className="flex min-h-screen items-center justify-center gap-3 bg-[var(--app-bg)] text-sm text-[var(--muted)]"><Loader2 size={20} className="animate-spin" /> Membuka room chat...</div>;
  if (error && !room) return <main className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] p-5"><Card className="w-full max-w-md space-y-5 text-center"><MessageCircle size={38} className="mx-auto text-[var(--muted)]" /><div><h1 className="text-xl font-bold">Room chat tidak tersedia</h1><p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{error}</p></div><Button variant="secondary" icon={RefreshCw} onClick={() => void fetchRoom(true)} className="mx-auto">Coba lagi</Button></Card></main>;
  if (!room) return null;

  return <main className="min-h-screen bg-[var(--app-bg)] p-0 sm:p-4 md:p-8"><div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col overflow-hidden border border-[var(--border)] bg-[var(--surface-soft)] shadow-sm sm:min-h-[calc(100vh-2rem)] sm:rounded-3xl md:min-h-[calc(100vh-4rem)]"><header className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4 md:px-7"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--surface-soft)]"><img src={logoUtama} alt="Arunika LMS" className="h-8 w-9 object-contain" /></div><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{CHAT_CENTER_SPACE_LABEL}</p><h1 className="truncate text-lg font-bold">{room.title}</h1><p className="truncate text-xs text-[var(--muted)]">Chat privat 1:1{room.participantName ? ` · ${room.participantName}` : ''}</p></div></div><div className="flex items-center gap-2"><Badge color={room.available ? 'var(--success-soft)' : 'var(--surface-soft)'}>{room.available ? 'Online' : 'Ditutup'}</Badge>{installPrompt && !isStandalone && <Button variant="secondary" icon={Download} onClick={() => void installPwa} className="hidden sm:inline-flex">Instal</Button>}</div></header><div className="flex min-h-0 flex-1 flex-col gap-4 bg-[var(--surface-soft)] p-4 md:p-6"><div className="flex shrink-0 items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[var(--accent-strong)]" /><div><p className="font-semibold">Percakapan privat</p><p className="mt-1 leading-relaxed text-[var(--muted)]">Pesan tersimpan selama {formatDuration(room.messageRetentionMinutes)} lalu otomatis dihapus. Room tetap tersedia selama admin belum menutupnya.</p></div></div>{!isStandalone && <details className="shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm"><summary className="flex cursor-pointer list-none items-center gap-2 font-semibold"><Download size={17} className="text-[var(--accent-strong)]" /> Instal chat di perangkat ini</summary><div className="mt-3 space-y-3 text-xs leading-relaxed text-[var(--muted)]"><p>Setelah terpasang, aplikasi akan membuka room chat terakhir di perangkat ini.</p>{installPrompt && <Button variant="secondary" icon={Download} onClick={() => void installPwa}>Instal aplikasi</Button>}<ol className="list-decimal space-y-1 pl-5"><li>Android/Chrome: pilih tombol Instal aplikasi atau menu browser <strong>Install app</strong>.</li><li>iPhone/iPad: pilih Share lalu <strong>Add to Home Screen</strong> di Safari.</li><li>Desktop Chrome/Edge: pilih ikon Install di sisi kanan address bar.</li></ol><p className="text-[var(--muted)]">Jangan instal di perangkat bersama karena link publik tersimpan sebagai akses terakhir.</p></div></details>}<div className="min-h-0 flex-1 overflow-hidden"><ChatMessages messages={room.messages} viewer="guest" className="h-full min-h-0 rounded-2xl border-0 bg-transparent p-2 md:p-4" /></div>{error && <p className="shrink-0 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}<ChatComposer value={message} onChange={setMessage} onSubmit={sendMessage} placeholder={room.available ? 'Tulis pesan...' : 'Room ini sudah ditutup'} disabled={!room.available} isSending={isSending} /></div><footer className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-center text-[11px] text-[var(--muted)]">Powered by Arunika LMS · Jangan bagikan link room kepada orang lain.</footer></div></main>;
};

export const PublicChatEntryPage: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    try { setToken(localStorage.getItem(PUBLIC_CHAT_TOKEN_STORAGE_KEY)); } catch { setToken(null); }
  }, []);
  if (token) return <Navigate to={`/chat/${encodeURIComponent(token)}`} replace />;
  return <main className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] p-5"><Card className="w-full max-w-md space-y-4 text-center"><MessageCircle size={38} className="mx-auto text-[var(--muted)]" /><h1 className="text-xl font-bold">Buka link chat publik</h1><p className="text-sm leading-relaxed text-[var(--muted)]">Instalasi PWA belum memiliki room chat terakhir di perangkat ini. Buka link publik dari admin terlebih dahulu.</p></Card></main>;
};
