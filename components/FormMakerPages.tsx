import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, ClipboardList, Copy, Download, ExternalLink, FileDown, ImagePlus, Link as LinkIcon, Loader2, Mail, MoveDown, MoveUp, Phone, Plus, RefreshCw, Save, Trash2, Upload, Users, XCircle } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  FormDefinition,
  FormField,
  FormFieldType,
  FormPostSubmitMode,
  FormResponse,
  FormResponseStatus,
  FormStatus
} from '../types';
import { Badge, Button, Card, Input, Textarea } from './UI';
import logoUtama from '../src/logo-utama.png';

export const FORM_MAKER_SPACE_LABEL = 'Form Maker';

type Notice = { tone: 'success' | 'error'; message: string };

const FIELD_TYPES: Array<{ value: FormFieldType; label: string }> = [
  { value: 'short_text', label: 'Teks pendek' },
  { value: 'long_text', label: 'Teks panjang' },
  { value: 'email', label: 'Email' },
  { value: 'link', label: 'Link / URL' },
  { value: 'number', label: 'Angka' },
  { value: 'multiple_choice', label: 'Pilihan ganda' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox (bisa lebih dari satu)' },
  { value: 'date', label: 'Tanggal' }
];

const POST_SUBMIT_MODES: Array<{ value: FormPostSubmitMode; label: string; description: string }> = [
  { value: 'confirmation', label: 'Konfirmasi biasa', description: 'Tampilkan pesan bahwa data responder sudah diterima.' },
  { value: 'payment', label: 'Informasi pembayaran', description: 'Tampilkan instruksi dan link pembayaran sebelum admin mengubah status menjadi Paid.' },
  { value: 'redirect', label: 'Arahkan ke halaman lain', description: 'Tampilkan tombol menuju URL konfirmasi atau halaman lanjutan.' }
];

const RESPONSE_STATUSES: Array<{ value: FormResponseStatus; label: string }> = [
  { value: 'pending', label: 'Menunggu' },
  { value: 'confirmed', label: 'Terkonfirmasi' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Dibatalkan' }
];

const allowedFieldTypes = new Set(FIELD_TYPES.map(item => item.value));

const createField = (type: FormFieldType = 'short_text', index = 0): FormField => ({
  id: `field-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
  type,
  label: type === 'email' ? 'Email' : 'Pertanyaan baru',
  description: '',
  placeholder: '',
  required: false,
  options: type === 'multiple_choice' || type === 'dropdown' || type === 'checkbox' ? ['Pilihan A', 'Pilihan B'] : []
});

const createDefaultForm = (): FormDefinition => ({
  id: '',
  slug: `form-${Date.now()}`,
  title: 'Pendaftaran Kelas Baru',
  eventName: 'Event baru',
  description: 'Isi form berikut untuk mendaftarkan diri.',
  status: 'draft',
  fields: [
    { ...createField('short_text', 0), label: 'Asal instansi / pekerjaan', required: false },
    { ...createField('multiple_choice', 1), label: 'Pilihan kelas', required: true }
  ],
  postSubmitMode: 'confirmation',
  postSubmitTitle: 'Terima kasih, data Anda sudah diterima.',
  postSubmitMessage: 'Tim kami akan menghubungi Anda untuk langkah berikutnya.',
  paymentInstructions: '',
  paymentLink: '',
  paymentAmount: '',
  paymentQrCode: '',
  paymentAccountNumber: '',
  paymentWhatsapp: '',
  redirectUrl: '',
  allowMultiple: true
});

const normalizeField = (value: any, index: number): FormField => {
  const type = allowedFieldTypes.has(value?.type) ? value.type as FormFieldType : 'short_text';
  return {
    id: String(value?.id || `field-${index + 1}`),
    type,
    label: String(value?.label || `Pertanyaan ${index + 1}`),
    description: String(value?.description || ''),
    placeholder: String(value?.placeholder || ''),
    required: value?.required === true,
    options: Array.isArray(value?.options) ? value.options.map((item: unknown) => String(item)).filter(Boolean) : []
  };
};

const mapFormRow = (row: any): FormDefinition => ({
  id: String(row?.id || ''),
  slug: String(row?.slug || ''),
  title: String(row?.title || 'Form Baru'),
  eventName: String(row?.event_name ?? row?.eventName ?? ''),
  description: String(row?.description || ''),
  status: (row?.status === 'published' || row?.status === 'archived' ? row.status : 'draft') as FormStatus,
  fields: Array.isArray(row?.fields) ? row.fields.map(normalizeField) : [],
  postSubmitMode: (row?.post_submit_mode ?? row?.postSubmitMode ?? 'confirmation') as FormPostSubmitMode,
  postSubmitTitle: String(row?.post_submit_title ?? row?.postSubmitTitle ?? 'Terima kasih, data Anda sudah diterima.'),
  postSubmitMessage: String(row?.post_submit_message ?? row?.postSubmitMessage ?? 'Tim kami akan menghubungi Anda untuk langkah berikutnya.'),
  paymentInstructions: String(row?.payment_instructions ?? row?.paymentInstructions ?? ''),
  paymentLink: String(row?.payment_link ?? row?.paymentLink ?? ''),
  paymentAmount: String(row?.payment_amount ?? row?.paymentAmount ?? ''),
  paymentQrCode: String(row?.payment_qr_code ?? row?.paymentQrCode ?? ''),
  paymentAccountNumber: String(row?.payment_account_number ?? row?.paymentAccountNumber ?? ''),
  paymentWhatsapp: String(row?.payment_whatsapp ?? row?.paymentWhatsapp ?? ''),
  redirectUrl: String(row?.redirect_url ?? row?.redirectUrl ?? ''),
  allowMultiple: row?.allow_multiple ?? row?.allowMultiple !== false,
  createdAt: row?.created_at ?? row?.createdAt,
  updatedAt: row?.updated_at ?? row?.updatedAt
});

const mapResponseRow = (row: any): FormResponse => ({
  id: String(row?.id || ''),
  formId: String(row?.form_id ?? row?.formId ?? ''),
  responderName: String(row?.responder_name ?? row?.responderName ?? ''),
  responderEmail: String(row?.responder_email ?? row?.responderEmail ?? ''),
  answers: row?.answers && typeof row.answers === 'object' ? row.answers : {},
  status: (['pending', 'confirmed', 'paid', 'cancelled'].includes(row?.status) ? row.status : 'pending') as FormResponseStatus,
  paymentReference: String(row?.payment_reference ?? row?.paymentReference ?? ''),
  adminNote: String(row?.admin_note ?? row?.adminNote ?? ''),
  submittedAt: String(row?.submitted_at ?? row?.submittedAt ?? ''),
  confirmedAt: row?.confirmed_at ?? row?.confirmedAt ?? null,
  paidAt: row?.paid_at ?? row?.paidAt ?? null,
  updatedAt: row?.updated_at ?? row?.updatedAt
});

const formWriteRow = (form: FormDefinition) => ({
  ...(form.id ? { id: form.id } : {}),
  slug: form.slug,
  title: form.title,
  event_name: form.eventName,
  description: form.description,
  status: form.status,
  fields: form.fields,
  post_submit_mode: form.postSubmitMode,
  post_submit_title: form.postSubmitTitle,
  post_submit_message: form.postSubmitMessage,
  payment_instructions: form.paymentInstructions,
  payment_link: form.paymentLink,
  payment_amount: form.paymentAmount,
  payment_qr_code: form.paymentQrCode,
  payment_account_number: form.paymentAccountNumber,
  payment_whatsapp: form.paymentWhatsapp,
  redirect_url: form.redirectUrl,
  allow_multiple: form.allowMultiple,
  updated_at: new Date().toISOString()
});

const slugify = (value: string) => value
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80) || `form-${Date.now()}`;

const createFormShareLink = (slug: string) => {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = `/form/${encodeURIComponent(slug)}`;
  return url.toString();
};

const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString('id-ID') : '—';

const formatAnswer = (value: unknown) => Array.isArray(value) ? value.join(', ') : String(value ?? '');

const errorMessage = (error: any) => {
  const message = String(error?.message || error || 'Terjadi kesalahan.');
  if (message.includes('duplicate key') && message.includes('slug')) return 'Slug form sudah digunakan. Pilih slug yang berbeda.';
  if (message.includes('FORM_ALREADY_SUBMITTED')) return 'Email ini sudah pernah mengirim form tersebut.';
  if (message.includes('FORM_NOT_FOUND')) return 'Form tidak ditemukan atau belum dipublikasikan.';
  if (message.includes('REQUIRED_FIELD')) return 'Lengkapi semua pertanyaan wajib sebelum mengirim form.';
  if (message.includes('INVALID_RESPONDER')) return 'Nama dan email responder belum valid.';
  if (message.includes('INVALID_FIELD') || message.includes('FIELD_TOO_LONG')) return 'Ada jawaban yang tidak sesuai format form.';
  if (message.includes('form_forms') || message.includes('form_responses') || message.includes('get_public_form') || message.includes('submit_public_form')) return 'Database Form Maker belum siap. Jalankan migration Form Maker terbaru.';
  return message;
};

const NoticeBanner: React.FC<{ notice: Notice | null }> = ({ notice }) => notice ? (
  <div className={`rounded-xl border p-4 text-sm ${notice.tone === 'success' ? 'border-[var(--border)] bg-[var(--success-soft)] text-[var(--success-text)]' : 'border-[var(--border)] bg-[var(--danger-soft)] text-[var(--danger-text)]'}`}>
    {notice.message}
  </div>
) : null;

const statusLabel = (status: FormResponseStatus) => RESPONSE_STATUSES.find(item => item.value === status)?.label || status;

const statusClass = (status: FormResponseStatus) => {
  if (status === 'paid' || status === 'confirmed') return 'bg-[var(--success-soft)] text-[var(--success-text)]';
  if (status === 'cancelled') return 'bg-[var(--danger-soft)] text-[var(--danger-text)]';
  return 'bg-[var(--accent-soft)] text-[var(--accent-strong)]';
};

const FormFieldEditor: React.FC<{
  field: FormField;
  index: number;
  total: number;
  onChange: (patch: Partial<FormField>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}> = ({ field, index, total, onChange, onRemove, onMove }) => {
  const hasOptions = field.type === 'multiple_choice' || field.type === 'dropdown' || field.type === 'checkbox';
  const typeLabel = FIELD_TYPES.find(item => item.value === field.type)?.label || 'Teks pendek';
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Pertanyaan {index + 1}</p>
          <p className="text-sm font-semibold mt-1">{typeLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label={`Naikkan pertanyaan ${index + 1}`} disabled={index === 0} onClick={() => onMove(-1)} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-soft)] disabled:opacity-30"><MoveUp size={16} /></button>
          <button type="button" aria-label={`Turunkan pertanyaan ${index + 1}`} disabled={index === total - 1} onClick={() => onMove(1)} className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-soft)] disabled:opacity-30"><MoveDown size={16} /></button>
          <button type="button" aria-label={`Hapus pertanyaan ${index + 1}`} onClick={onRemove} className="rounded-lg p-2 text-[var(--danger-text)] hover:bg-[var(--danger-soft)]"><Trash2 size={16} /></button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-[var(--muted)]">Tipe input</span>
          <select value={field.type} onChange={event => onChange({ type: event.target.value as FormFieldType, options: ['multiple_choice', 'dropdown', 'checkbox'].includes(event.target.value) ? (field.options.length ? field.options : ['Pilihan A', 'Pilihan B']) : [] })} className="min-h-[46px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]">
            {FIELD_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </label>
        <Input label="Label pertanyaan" value={field.label} onChange={event => onChange({ label: event.target.value })} placeholder="Contoh: Nama perusahaan" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Placeholder" value={field.placeholder} onChange={event => onChange({ placeholder: event.target.value })} placeholder="Petunjuk singkat untuk responder" />
        <Input label="Deskripsi bantuan" value={field.description} onChange={event => onChange({ description: event.target.value })} placeholder="Opsional" />
      </div>
      {hasOptions && (
        <Textarea label="Pilihan jawaban (satu pilihan per baris)" value={field.options.join('\n')} onChange={event => onChange({ options: event.target.value.split('\n').map(value => value.trim()).filter(Boolean) })} className="min-h-[100px]" />
      )}
      <label className="inline-flex items-center gap-3 text-sm font-semibold cursor-pointer">
        <input type="checkbox" checked={field.required} onChange={event => onChange({ required: event.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
        Wajib diisi
      </label>
    </Card>
  );
};

const normalizeWhatsAppNumber = (value: string) => {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return '';
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
};

const createWhatsAppLink = (phone: string, form: FormDefinition, responderName: string, responderEmail: string, responseId?: string) => {
  const normalizedPhone = normalizeWhatsAppNumber(phone);
  if (!normalizedPhone) return '';
  const message = [
    `Halo, saya ${responderName}.`,
    `Saya sudah mengisi form ${form.title} untuk event ${form.eventName}.`,
    `Email: ${responderEmail}.`,
    responseId ? `ID pendaftaran: ${responseId}.` : '',
    'Mohon konfirmasi pendaftaran dan pembayaran saya.'
  ].filter(Boolean).join('\n');
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
};

const PaymentQrUploader: React.FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Pilih file gambar QR Code.');
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('QR Code gagal dibaca.'));
        reader.onload = () => {
          const image = new Image();
          image.onerror = () => reject(new Error('Format QR Code tidak didukung.'));
          image.onload = () => {
            const maxSize = 1000;
            const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            const context = canvas.getContext('2d');
            if (!context) return reject(new Error('QR Code gagal diproses.'));
            context.imageSmoothingEnabled = false;
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/png'));
          };
          image.src = String(reader.result);
        };
        reader.readAsDataURL(file);
      });
      if (dataUrl.length > 1_500_000) {
        setError('Ukuran QR Code terlalu besar. Gunakan gambar yang lebih kecil.');
        return;
      }
      onChange(dataUrl);
    } catch (uploadError: any) {
      setError(uploadError?.message || 'QR Code gagal diproses.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[var(--muted)]">QR Code pembayaran</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Upload gambar QR atau gunakan URL gambar.</p>
        </div>
        {value && <button type="button" onClick={() => onChange('')} className="text-xs font-semibold text-[var(--danger-text)] hover:underline">Hapus QR</button>}
      </div>
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
        {value ? <img src={value} alt="QR Code pembayaran" className="mx-auto max-h-48 max-w-full object-contain" /> : <div className="flex min-h-32 flex-col items-center justify-center gap-2 text-center text-sm text-[var(--muted)]"><ImagePlus size={28} /><span>Belum ada QR Code</span></div>}
      </div>
      <div className="flex flex-wrap gap-2">
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <Button type="button" variant="secondary" icon={Upload} onClick={() => inputRef.current?.click()} isLoading={isProcessing}>Upload QR Code</Button>
      </div>
      <Input label="URL QR Code (opsional)" value={value.startsWith('data:') ? '' : value} onChange={event => onChange(event.target.value)} placeholder="https://.../qr-code.png" />
      {error && <p className="text-xs text-[var(--danger-text)]">{error}</p>}
    </div>
  );
};

export const FormMakerPage: React.FC<{ client: any }> = ({ client }) => {
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const fetchForms = useCallback(async () => {
    if (!client) {
      setLoadError('Koneksi admin belum tersedia.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const [formResult, responseResult] = await Promise.all([
      client.from('form_forms').select('*').order('created_at', { ascending: false }),
      client.from('form_responses').select('form_id')
    ]);
    if (formResult.error) {
      setLoadError(errorMessage(formResult.error));
    } else {
      setForms((formResult.data || []).map(mapFormRow));
      setLoadError(null);
    }
    if (!responseResult.error) {
      const counts: Record<string, number> = {};
      (responseResult.data || []).forEach((row: any) => { counts[row.form_id] = (counts[row.form_id] || 0) + 1; });
      setResponseCounts(counts);
    }
    setIsLoading(false);
  }, [client]);

  useEffect(() => {
    void fetchForms();
    if (!client) return;
    const channel = client.channel('form_maker_admin_updates').on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'public_content_revisions', filter: 'scope=eq.forms'
    }, () => { void fetchForms(); }).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [client, fetchForms]);

  const handleCreate = async () => {
    if (!client) return;
    setIsCreating(true);
    const draft = createDefaultForm();
    const { data, error } = await client.from('form_forms').insert(formWriteRow(draft)).select('*').single();
    if (error) setNotice({ tone: 'error', message: errorMessage(error) });
    else if (data) navigate(`/admin/forms/${data.id}`);
    setIsCreating(false);
  };

  const handleCopy = async (form: FormDefinition) => {
    const url = createFormShareLink(form.slug);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(form.slug);
      window.setTimeout(() => setCopiedSlug(current => current === form.slug ? null : current), 2000);
    } catch {
      setNotice({ tone: 'error', message: `Link form: ${url}` });
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><Link to="/admin" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent-strong)]"><ArrowLeft size={14} /> Semua Space</Link><h1 className="text-3xl font-bold">{FORM_MAKER_SPACE_LABEL}</h1><p className="mt-1 text-sm text-[var(--muted)]">Buat form pendaftaran, kumpulkan responder berdasarkan event, dan kelola status pembayaran.</p></div>
        <Button icon={Plus} onClick={handleCreate} isLoading={isCreating}>Buat Form</Button>
      </div>
      <NoticeBanner notice={notice} />
      {isLoading ? (
        <Card className="flex items-center justify-center gap-3 py-14 text-sm text-[var(--muted)]"><Loader2 size={18} className="animate-spin" /> Memuat form...</Card>
      ) : loadError ? (
        <Card className="space-y-4 py-12 text-center"><XCircle size={30} className="mx-auto text-[var(--danger-text)]" /><p className="text-sm text-[var(--danger-text)]">{loadError}</p><Button variant="secondary" onClick={fetchForms} className="mx-auto" icon={RefreshCw}>Coba Lagi</Button></Card>
      ) : forms.length === 0 ? (
        <Card className="space-y-4 py-14 text-center"><ClipboardList size={34} className="mx-auto text-[var(--muted)]" /><p className="font-semibold">Belum ada form</p><p className="text-sm text-[var(--muted)]">Buat form pertama untuk pendaftaran kelas atau event lain.</p><Button onClick={handleCreate} icon={Plus} className="mx-auto">Buat Form Pertama</Button></Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {forms.map(form => (
            <Card key={form.id} className="flex h-full flex-col gap-5">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge color="var(--accent-soft)">{FORM_MAKER_SPACE_LABEL}</Badge><span className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${form.status === 'published' ? 'bg-[var(--success-soft)] text-[var(--success-text)]' : form.status === 'archived' ? 'bg-[var(--danger-soft)] text-[var(--danger-text)]' : 'bg-[var(--surface-soft)] text-[var(--muted)]'}`}>{form.status === 'published' ? 'Publik' : form.status === 'archived' ? 'Arsip' : 'Draft'}</span></div><h2 className="mt-3 truncate text-xl font-bold">{form.title}</h2><p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{form.eventName || 'Tanpa nama event'}</p></div><ClipboardList className="flex-shrink-0 text-[var(--accent-strong)]" size={24} /></div>
              <p className="line-clamp-2 text-sm leading-relaxed text-[var(--muted)]">{form.description || 'Belum ada deskripsi form.'}</p>
              <div className="grid grid-cols-2 gap-3 text-xs text-[var(--muted)]"><span className="flex items-center gap-2"><ClipboardList size={14} /> {form.fields.length} pertanyaan</span><span className="flex items-center gap-2"><Users size={14} /> {responseCounts[form.id] || 0} responder</span></div>
              <div className="mt-auto grid grid-cols-2 gap-2 pt-2"><Button variant="secondary" className="text-xs px-2" onClick={() => navigate(`/admin/forms/${form.id}`)}>Edit Form</Button><Button variant="secondary" className="text-xs px-2" icon={Users} onClick={() => navigate(`/admin/forms/${form.id}/responses`)}>Responder</Button><Button variant={copiedSlug === form.slug ? 'green' : 'secondary'} className="text-xs px-2" icon={copiedSlug === form.slug ? Check : Copy} onClick={() => void handleCopy(form)}>{copiedSlug === form.slug ? 'Tersalin' : 'Copy Link'}</Button><Button className="text-xs px-2" icon={ExternalLink} disabled={form.status !== 'published'} onClick={() => window.open(createFormShareLink(form.slug), '_blank', 'noopener,noreferrer')}>Buka Publik</Button></div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export const FormEditorPage: React.FC<{ client: any }> = ({ client }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const fetchForm = useCallback(async () => {
    if (!id || !client) return;
    setIsLoading(true);
    const { data, error } = await client.from('form_forms').select('*').eq('id', id).maybeSingle();
    if (error || !data) setNotice({ tone: 'error', message: errorMessage(error || 'Form tidak ditemukan.') });
    else setForm(mapFormRow(data));
    setIsLoading(false);
  }, [client, id]);

  useEffect(() => { void fetchForm(); }, [fetchForm]);

  const updateField = (index: number, patch: Partial<FormField>) => {
    setForm(current => current ? { ...current, fields: current.fields.map((field, fieldIndex) => fieldIndex === index ? { ...field, ...patch } : field) } : current);
  };

  const moveField = (index: number, direction: -1 | 1) => {
    setForm(current => {
      if (!current) return current;
      const target = index + direction;
      if (target < 0 || target >= current.fields.length) return current;
      const fields = [...current.fields];
      [fields[index], fields[target]] = [fields[target], fields[index]];
      return { ...current, fields };
    });
  };

  const handleSave = async () => {
    if (!form || !client) return;
    if (!form.title.trim() || !form.eventName.trim()) {
      setNotice({ tone: 'error', message: 'Judul form dan nama event wajib diisi.' });
      return;
    }
    const normalized = { ...form, slug: slugify(form.slug || form.title) };
    setIsSaving(true);
    const { data, error } = await client.from('form_forms').update(formWriteRow(normalized)).eq('id', form.id).select('*').single();
    if (error) setNotice({ tone: 'error', message: errorMessage(error) });
    else {
      setForm(mapFormRow(data));
      setNotice({ tone: 'success', message: 'Form berhasil disimpan.' });
    }
    setIsSaving(false);
  };

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-[var(--muted)]"><Loader2 size={18} className="animate-spin" /> Memuat editor form...</div>;
  if (!form) return <div className="mx-auto max-w-xl p-8"><Card className="space-y-4 text-center"><XCircle className="mx-auto text-[var(--danger-text)]" /><p>Form tidak ditemukan.</p><Button variant="secondary" onClick={() => navigate('/admin/forms')}>Kembali</Button></Card></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 pb-28 md:p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><Link to="/admin/forms" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent-strong)]"><ArrowLeft size={14} /> {FORM_MAKER_SPACE_LABEL}</Link><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold">Edit Form</h1><Badge color={form.status === 'published' ? 'var(--success-soft)' : 'var(--surface-soft)'}>{form.status === 'published' ? 'Publik' : 'Draft'}</Badge></div><p className="mt-2 text-sm text-[var(--muted)]">Susun pertanyaan, atur halaman setelah submit, dan bagikan link form.</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" icon={Users} onClick={() => navigate(`/admin/forms/${form.id}/responses`)}>Responder</Button><Button icon={Save} onClick={() => void handleSave()} isLoading={isSaving}>Simpan Form</Button></div></div>
      <NoticeBanner notice={notice} />
      <Card className="space-y-5"><div><h2 className="text-lg font-bold">Informasi form</h2><p className="mt-1 text-xs text-[var(--muted)]">Nama event dipakai untuk mengelompokkan data responder di dashboard.</p></div><div className="grid gap-4 md:grid-cols-2"><Input label="Judul form" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /><Input label="Nama event" value={form.eventName} onChange={event => setForm({ ...form, eventName: event.target.value })} /></div><Textarea label="Deskripsi untuk responder" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /><div className="grid gap-4 md:grid-cols-2"><Input label="Slug link publik" value={form.slug} onChange={event => setForm({ ...form, slug: event.target.value })} onBlur={() => setForm(current => current ? { ...current, slug: slugify(current.slug || current.title) } : current)} /><label className="flex flex-col gap-2"><span className="text-xs font-semibold text-[var(--muted)]">Status form</span><select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as FormStatus })} className="min-h-[46px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"><option value="draft">Draft</option><option value="published">Publik</option><option value="archived">Arsip</option></select></label></div><label className="inline-flex items-center gap-3 text-sm font-semibold cursor-pointer"><input type="checkbox" checked={form.allowMultiple} onChange={event => setForm({ ...form, allowMultiple: event.target.checked })} className="h-4 w-4 accent-[var(--accent)]" /> Izinkan satu email mengirim lebih dari satu kali</label>{form.status === 'published' && <div className="rounded-xl bg-[var(--surface-soft)] p-4 text-sm text-[var(--muted)]">Link publik: <span className="break-all font-semibold text-[var(--text)]">{createFormShareLink(form.slug)}</span></div>}</Card>

      <section className="space-y-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Builder</p><h2 className="mt-2 text-2xl font-bold">Pertanyaan form</h2><p className="mt-1 text-sm text-[var(--muted)]">Nama dan email responder selalu dicatat otomatis. Tambahkan pertanyaan lain sesuai kebutuhan event.</p></div><div className="flex flex-wrap gap-2">{(['short_text', 'long_text', 'multiple_choice', 'checkbox'] as FormFieldType[]).map(type => <Button key={type} variant="secondary" className="text-xs px-3" icon={Plus} onClick={() => setForm({ ...form, fields: [...form.fields, createField(type, form.fields.length)] })}>{FIELD_TYPES.find(item => item.value === type)?.label}</Button>)}</div></div>{form.fields.map((field, index) => <FormFieldEditor key={field.id} field={field} index={index} total={form.fields.length} onChange={patch => updateField(index, patch)} onRemove={() => setForm({ ...form, fields: form.fields.filter((_, fieldIndex) => fieldIndex !== index) })} onMove={direction => moveField(index, direction)} />)}{form.fields.length === 0 && <Card className="border-dashed py-12 text-center text-sm text-[var(--muted)]">Belum ada pertanyaan tambahan. Nama dan email responder tetap tersedia di form publik.</Card>}</section>

      <Card className="space-y-5"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Setelah submit</p><h2 className="mt-2 text-xl font-bold">Halaman lanjutan responder</h2><p className="mt-1 text-sm text-[var(--muted)]">Atur informasi yang dilihat peserta sebelum status mereka diubah menjadi terkonfirmasi atau paid oleh admin.</p></div><label className="flex flex-col gap-2"><span className="text-xs font-semibold text-[var(--muted)]">Jenis halaman setelah dikirim</span><select value={form.postSubmitMode} onChange={event => setForm({ ...form, postSubmitMode: event.target.value as FormPostSubmitMode })} className="min-h-[46px] rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]">{POST_SUBMIT_MODES.map(mode => <option key={mode.value} value={mode.value}>{mode.label}</option>)}</select></label><p className="-mt-2 text-xs text-[var(--muted)]">{POST_SUBMIT_MODES.find(mode => mode.value === form.postSubmitMode)?.description}</p><div className="grid gap-4 md:grid-cols-2"><Input label="Judul halaman" value={form.postSubmitTitle} onChange={event => setForm({ ...form, postSubmitTitle: event.target.value })} /><Textarea label="Pesan konfirmasi" value={form.postSubmitMessage} onChange={event => setForm({ ...form, postSubmitMessage: event.target.value })} className="min-h-[100px]" /></div>{form.postSubmitMode === 'payment' && <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><Textarea label="Instruksi pembayaran" value={form.paymentInstructions} onChange={event => setForm({ ...form, paymentInstructions: event.target.value })} placeholder="Transfer ke rekening..., kirim bukti ke..." /><Input label="Link pembayaran (opsional)" value={form.paymentLink} onChange={event => setForm({ ...form, paymentLink: event.target.value })} placeholder="https://..." /></div><div className="grid gap-4 md:grid-cols-2"><Input label="Nominal pembayaran" value={form.paymentAmount} onChange={event => setForm({ ...form, paymentAmount: event.target.value })} placeholder="Contoh: Rp 250.000" /><Input label="Nomor rekening pembayaran (opsional)" value={form.paymentAccountNumber} onChange={event => setForm({ ...form, paymentAccountNumber: event.target.value })} icon={Phone} placeholder="Contoh: 1234567890 a.n. Arunika" /></div><div className="grid gap-4 md:grid-cols-2"><Input label="Nomor WhatsApp konfirmasi" value={form.paymentWhatsapp} onChange={event => setForm({ ...form, paymentWhatsapp: event.target.value })} icon={Phone} placeholder="Contoh: 62812xxxxxxx" /><div className="flex items-end"><p className="pb-3 text-xs leading-relaxed text-[var(--muted)]">Nomor WhatsApp dipakai untuk membuat tombol konfirmasi otomatis di halaman responder.</p></div></div><PaymentQrUploader value={form.paymentQrCode} onChange={paymentQrCode => setForm({ ...form, paymentQrCode })} /></div>}{form.postSubmitMode === 'redirect' && <Input label="URL halaman lanjutan" value={form.redirectUrl} onChange={event => setForm({ ...form, redirectUrl: event.target.value })} placeholder="https://..." />}</Card>
    </div>
  );
};

export const FormResponsesPage: React.FC<{ client: any }> = ({ client }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormDefinition | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);

  const fetchData = useCallback(async () => {
    if (!id || !client) return;
    setIsLoading(true);
    const [formResult, responseResult] = await Promise.all([
      client.from('form_forms').select('*').eq('id', id).maybeSingle(),
      client.from('form_responses').select('*').eq('form_id', id).order('submitted_at', { ascending: false })
    ]);
    if (formResult.error || !formResult.data) setNotice({ tone: 'error', message: errorMessage(formResult.error || 'Form tidak ditemukan.') });
    else setForm(mapFormRow(formResult.data));
    if (responseResult.error) setNotice({ tone: 'error', message: errorMessage(responseResult.error) });
    else setResponses((responseResult.data || []).map(mapResponseRow));
    setIsLoading(false);
  }, [client, id]);

  useEffect(() => {
    void fetchData();
    if (!client) return;
    const channel = client.channel(`form_responses_${id}`).on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'public_content_revisions', filter: 'scope=eq.forms'
    }, () => { void fetchData(); }).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [client, fetchData, id]);

  const stats = useMemo(() => ({
    total: responses.length,
    pending: responses.filter(response => response.status === 'pending').length,
    confirmed: responses.filter(response => response.status === 'confirmed').length,
    paid: responses.filter(response => response.status === 'paid').length
  }), [responses]);

  const updateResponse = async (response: FormResponse, status: FormResponseStatus) => {
    if (!client) return;
    const now = new Date().toISOString();
    const { error } = await client.from('form_responses').update({
      status,
      confirmed_at: status === 'confirmed' || status === 'paid' ? response.confirmedAt || now : null,
      paid_at: status === 'paid' ? response.paidAt || now : null
    }).eq('id', response.id);
    if (error) setNotice({ tone: 'error', message: errorMessage(error) });
    else {
      setResponses(current => current.map(item => item.id === response.id ? { ...item, status, confirmedAt: status === 'confirmed' || status === 'paid' ? item.confirmedAt || now : null, paidAt: status === 'paid' ? item.paidAt || now : null } : item));
      setNotice({ tone: 'success', message: `Status ${response.responderName} diperbarui menjadi ${statusLabel(status)}.` });
    }
  };

  const exportCsv = () => {
    if (!form) return;
    const headers = ['Nama Responder', 'Email Responder', 'Status', 'Waktu Submit', ...form.fields.map(field => field.label)];
    const rows = responses.map(response => [response.responderName, response.responderEmail, statusLabel(response.status), formatDate(response.submittedAt), ...form.fields.map(field => formatAnswer(response.answers[field.id]))]);
    const csv = [headers, ...rows].map(row => row.map(escapeCsv).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `responder-${form.slug}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-[var(--muted)]"><Loader2 size={18} className="animate-spin" /> Memuat responder...</div>;
  if (!form) return <div className="mx-auto max-w-xl p-8"><Card className="space-y-4 text-center"><XCircle className="mx-auto text-[var(--danger-text)]" /><p>Form tidak ditemukan.</p><Button variant="secondary" onClick={() => navigate('/admin/forms')}>Kembali</Button></Card></div>;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><Link to="/admin/forms" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent-strong)]"><ArrowLeft size={14} /> {FORM_MAKER_SPACE_LABEL}</Link><h1 className="text-3xl font-bold">Responder Form</h1><p className="mt-1 text-sm text-[var(--muted)]">{form.title} · {form.eventName}</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => navigate(`/admin/forms/${form.id}`)}>Edit Form</Button><Button icon={FileDown} disabled={!responses.length} onClick={exportCsv}>Export CSV</Button></div></div>
      <NoticeBanner notice={notice} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Card><p className="text-xs text-[var(--muted)]">Total Responder</p><p className="mt-2 text-3xl font-bold">{stats.total}</p></Card><Card><p className="text-xs text-[var(--muted)]">Menunggu</p><p className="mt-2 text-3xl font-bold">{stats.pending}</p></Card><Card><p className="text-xs text-[var(--muted)]">Terkonfirmasi</p><p className="mt-2 text-3xl font-bold">{stats.confirmed}</p></Card><Card><p className="text-xs text-[var(--muted)]">Paid</p><p className="mt-2 text-3xl font-bold">{stats.paid}</p></Card></div>
      {responses.length === 0 ? <Card className="py-14 text-center"><Users size={32} className="mx-auto mb-3 text-[var(--muted)]" /><p className="font-semibold">Belum ada responder</p><p className="mt-1 text-sm text-[var(--muted)]">Data akan muncul setelah form publik dikirim.</p></Card> : <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[var(--surface-soft)] text-xs text-[var(--muted)]"><tr><th className="p-4">Responder</th><th className="p-4">Status</th><th className="p-4">Jawaban</th><th className="p-4">Dikirim</th><th className="p-4">Ubah Status</th></tr></thead><tbody>{responses.map(response => <tr key={response.id} className="border-t border-[var(--border)] align-top"><td className="p-4"><p className="font-semibold">{response.responderName}</p><p className="mt-1 text-xs text-[var(--muted)]">{response.responderEmail}</p></td><td className="p-4"><span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${statusClass(response.status)}`}>{statusLabel(response.status)}</span></td><td className="max-w-md p-4"><details><summary className="cursor-pointer text-xs font-semibold text-[var(--accent-strong)]">Lihat jawaban</summary><div className="mt-3 space-y-3">{form.fields.map(field => <div key={field.id}><p className="text-xs font-semibold text-[var(--muted)]">{field.label}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{formatAnswer(response.answers[field.id]) || '—'}</p></div>)}</div></details></td><td className="p-4 text-xs text-[var(--muted)]">{formatDate(response.submittedAt)}</td><td className="p-4"><select value={response.status} onChange={event => void updateResponse(response, event.target.value as FormResponseStatus)} className="min-h-[40px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs outline-none focus:border-[var(--accent)]">{RESPONSE_STATUSES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}</select></td></tr>)}</tbody></table></div>}
    </div>
  );
};

export const PublicFormView: React.FC<{ client: any }> = ({ client }) => {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<FormDefinition | null>(null);
  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [responderName, setResponderName] = useState('');
  const [responderEmail, setResponderEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<any | null>(null);

  const fetchForm = useCallback(async () => {
    if (!client || !slug) {
      setLoadError('Link form tidak valid.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await client.rpc('get_public_form', { p_slug: decodeURIComponent(slug) });
    if (error || !data) setLoadError(errorMessage(error || 'FORM_NOT_FOUND'));
    else {
      const mapped = mapFormRow(data);
      setForm(mapped);
      setValues(current => current && Object.keys(current).length ? current : Object.fromEntries(mapped.fields.map(field => [field.id, field.type === 'checkbox' ? [] : ''])));
      setLoadError(null);
    }
    setIsLoading(false);
  }, [client, slug]);

  useEffect(() => {
    void fetchForm();
    if (!client) return;
    const channel = client.channel('public_form_updates').on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'public_content_revisions', filter: 'scope=eq.public'
    }, () => { void fetchForm(); }).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [client, fetchForm]);

  const setValue = (fieldId: string, value: string | string[]) => setValues(current => ({ ...current, [fieldId]: value }));

  const validate = () => {
    if (!responderName.trim() || !responderEmail.trim() || !responderEmail.includes('@')) return 'Nama dan email responder wajib diisi dengan benar.';
    const requiredField = form?.fields.find(field => field.required && (!values[field.id] || (Array.isArray(values[field.id]) ? values[field.id].length === 0 : !String(values[field.id]).trim())));
    if (requiredField) return `Isi pertanyaan wajib: ${requiredField.label}`;
    const invalidLink = form?.fields.find(field => field.type === 'link' && values[field.id] && !/^https?:\/\//i.test(String(values[field.id])));
    if (invalidLink) return `Link pada “${invalidLink.label}” harus diawali http:// atau https://.`;
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form || !client) return;
    const validationError = validate();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    const { data, error } = await client.rpc('submit_public_form', {
      p_slug: form.slug,
      p_responder_name: responderName.trim(),
      p_responder_email: responderEmail.trim(),
      p_answers: values
    });
    if (error) setSubmitError(errorMessage(error));
    else setSubmitted(data);
    setIsSubmitting(false);
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center gap-3 bg-[var(--app-bg)] text-sm text-[var(--muted)]"><Loader2 size={18} className="animate-spin" /> Memuat form...</div>;
  if (loadError || !form) return <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] p-6"><Card className="w-full max-w-md space-y-5 py-10 text-center"><XCircle size={34} className="mx-auto text-[var(--danger-text)]" /><div><h1 className="text-xl font-bold">Form tidak dapat dibuka</h1><p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{loadError}</p></div><Button icon={RefreshCw} onClick={fetchForm} className="mx-auto w-full">Coba Lagi</Button></Card></div>;

  if (submitted) {
    const mode = submitted.postSubmitMode || form.postSubmitMode;
    const paymentAmount = submitted.paymentAmount || form.paymentAmount;
    const paymentQrCode = submitted.paymentQrCode || form.paymentQrCode;
    const paymentAccountNumber = submitted.paymentAccountNumber || form.paymentAccountNumber;
    const paymentWhatsapp = submitted.paymentWhatsapp || form.paymentWhatsapp;
    const whatsappLink = createWhatsAppLink(paymentWhatsapp, form, responderName, responderEmail, submitted.responseId);
    return (
      <div className="min-h-screen bg-[var(--app-bg)] p-4 md:p-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <header className="flex items-center gap-3">
            <img src={logoUtama} alt="Arunika LMS" className="h-10 w-14 object-contain" />
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{FORM_MAKER_SPACE_LABEL}</p><p className="font-semibold">{form.eventName}</p></div>
          </header>
          <Card className="space-y-5 py-10 text-center">
            <CheckCircle2 size={48} className="mx-auto text-[var(--success-text)]" />
            <div>
              <h1 className="text-2xl font-bold">{submitted.postSubmitTitle || form.postSubmitTitle}</h1>
              <p className="mx-auto mt-3 max-w-xl whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">{submitted.postSubmitMessage || form.postSubmitMessage}</p>
            </div>
            <Badge color="var(--accent-soft)">Status: Menunggu konfirmasi</Badge>
            {mode === 'payment' && <div className="mx-auto w-full max-w-xl space-y-4 rounded-xl bg-[var(--surface-soft)] p-5 text-left">
              <p className="text-sm font-semibold">Informasi pembayaran</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">{submitted.paymentInstructions || form.paymentInstructions || 'Informasi pembayaran akan diberikan oleh penyelenggara.'}</p>
              {paymentAmount && <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"><p className="text-xs font-semibold text-[var(--muted)]">Nominal pembayaran</p><p className="mt-1 break-words text-lg font-bold text-[var(--accent-strong)]">{paymentAmount}</p></div>}
              {paymentAccountNumber && <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"><p className="text-xs font-semibold text-[var(--muted)]">Nomor rekening</p><p className="mt-1 break-words text-sm font-semibold">{paymentAccountNumber}</p></div>}
              {paymentQrCode && <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-center"><p className="mb-3 text-xs font-semibold text-[var(--muted)]">QR Code pembayaran</p><img src={paymentQrCode} alt="QR Code pembayaran" className="mx-auto max-h-64 max-w-full object-contain" /></div>}
              {(submitted.paymentLink || form.paymentLink) && <a className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)] hover:underline" href={submitted.paymentLink || form.paymentLink} target="_blank" rel="noreferrer">Buka link pembayaran <ExternalLink size={15} /></a>}
              {whatsappLink && <a className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#128c7e] px-4 py-3 text-sm font-semibold text-white hover:brightness-95" href={whatsappLink} target="_blank" rel="noreferrer"><Phone size={16} /> Konfirmasi via WhatsApp</a>}
            </div>}
            {mode === 'redirect' && (submitted.redirectUrl || form.redirectUrl) && <a className="mx-auto inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 font-semibold text-white" href={submitted.redirectUrl || form.redirectUrl} target="_blank" rel="noreferrer">Lanjutkan <ExternalLink size={16} /></a>}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] p-4 md:p-8"><div className="mx-auto max-w-3xl space-y-6"><header className="flex items-center gap-3"><img src={logoUtama} alt="Arunika LMS" className="h-10 w-14 object-contain" /><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{FORM_MAKER_SPACE_LABEL}</p><p className="truncate font-semibold">{form.eventName}</p></div></header><Card className="space-y-6"><div><Badge color="var(--accent-soft)">{form.eventName}</Badge><h1 className="mt-4 text-3xl font-bold">{form.title}</h1><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">{form.description}</p></div><form onSubmit={handleSubmit} className="space-y-5"><div className="grid gap-4 border-b border-[var(--border)] pb-5 md:grid-cols-2"><Input label="Nama lengkap" value={responderName} onChange={event => setResponderName(event.target.value)} required icon={Users} placeholder="Nama Anda" /><Input label="Email responder" value={responderEmail} onChange={event => setResponderEmail(event.target.value)} required type="email" icon={Mail} placeholder="nama@email.com" /></div>{form.fields.map(field => <div key={field.id} className="space-y-2"><label className="block text-xs font-semibold text-[var(--muted)]">{field.label}{field.required && <span className="text-[var(--danger-text)]"> *</span>}</label>{field.description && <p className="text-xs leading-relaxed text-[var(--muted)]">{field.description}</p>}{field.type === 'long_text' ? <textarea value={String(values[field.id] || '')} onChange={event => setValue(field.id, event.target.value)} placeholder={field.placeholder} className="min-h-[130px] w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]" /> : field.type === 'multiple_choice' ? <div className="space-y-2">{field.options.map(option => <label key={option} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 text-sm"><input type="radio" name={field.id} checked={values[field.id] === option} onChange={() => setValue(field.id, option)} className="h-4 w-4 accent-[var(--accent)]" />{option}</label>)}</div> : field.type === 'dropdown' ? <select value={String(values[field.id] || '')} onChange={event => setValue(field.id, event.target.value)} className="min-h-[46px] w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"><option value="">Pilih jawaban</option>{field.options.map(option => <option key={option} value={option}>{option}</option>)}</select> : field.type === 'checkbox' ? <div className="space-y-2">{field.options.map(option => <label key={option} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 text-sm"><input type="checkbox" checked={Array.isArray(values[field.id]) && (values[field.id] as string[]).includes(option)} onChange={event => { const current = Array.isArray(values[field.id]) ? values[field.id] as string[] : []; setValue(field.id, event.target.checked ? [...current, option] : current.filter(item => item !== option)); }} className="h-4 w-4 accent-[var(--accent)]" />{option}</label>)}</div> : <input type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} value={String(values[field.id] || '')} onChange={event => setValue(field.id, event.target.value)} placeholder={field.placeholder} className="min-h-[46px] w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]" />}</div>)}{submitError && <p className="rounded-xl border border-[var(--border)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger-text)]">{submitError}</p>}<Button type="submit" isLoading={isSubmitting} icon={Check} className="w-full">Kirim Form</Button></form></Card></div></div>
  );
};
