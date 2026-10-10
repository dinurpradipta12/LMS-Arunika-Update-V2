import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ClipboardList,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Link as LinkIcon,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Share2,
  Trash2,
  UserRound,
  Users,
  XCircle
} from 'lucide-react';

import {
  OneToOnePortal,
  OneToOneReport,
  OneToOneReportRecipientType,
  OneToOneReportScope,
  OneToOneReportSession,
  OneToOneReportStatus,
  OneToOneReportTemplateSettings,
  OneToOneScheduleEvent
} from '../types';
import { Badge, Button, Card, Input, Textarea } from './UI';
import { getPublicBaseUrl, setPublicMetadata } from './PublicMetadata';
import logoUtama from '../src/logo-utama.png';

export const ONE_TO_ONE_REPORTS_LABEL = 'Raport mentee';

type Notice = { tone: 'success' | 'error'; message: string } | null;

const asText = (value: unknown, fallback = '') => typeof value === 'string' ? value : value == null ? fallback : String(value);
const isHexColor = (value: unknown) => /^#[0-9a-f]{6}$/i.test(asText(value).trim());
const reportAccent = (value: unknown) => isHexColor(value) ? asText(value).trim() : '#16436b';
const todayDate = () => new Date().toISOString().slice(0, 10);

const DEFAULT_TEMPLATE_SETTINGS: OneToOneReportTemplateSettings = {
  headerLabel: 'Laporan perkembangan',
  summaryLabel: 'Catatan mentoring',
  evaluationLabel: 'Evaluasi mentor',
  actionItemsLabel: 'Hal yang perlu dilakukan',
  showMentor: true
};

const normaliseTemplateSettings = (value: any): OneToOneReportTemplateSettings => ({
  headerLabel: asText(value?.headerLabel ?? value?.header_label, DEFAULT_TEMPLATE_SETTINGS.headerLabel).trim() || DEFAULT_TEMPLATE_SETTINGS.headerLabel,
  summaryLabel: asText(value?.summaryLabel ?? value?.summary_label, DEFAULT_TEMPLATE_SETTINGS.summaryLabel).trim() || DEFAULT_TEMPLATE_SETTINGS.summaryLabel,
  evaluationLabel: asText(value?.evaluationLabel ?? value?.evaluation_label, DEFAULT_TEMPLATE_SETTINGS.evaluationLabel).trim() || DEFAULT_TEMPLATE_SETTINGS.evaluationLabel,
  actionItemsLabel: asText(value?.actionItemsLabel ?? value?.action_items_label, DEFAULT_TEMPLATE_SETTINGS.actionItemsLabel).trim() || DEFAULT_TEMPLATE_SETTINGS.actionItemsLabel,
  showMentor: value?.showMentor ?? value?.show_mentor ?? DEFAULT_TEMPLATE_SETTINGS.showMentor
});

const normaliseRecipientType = (value: unknown): OneToOneReportRecipientType => value === 'team' ? 'team' : 'individual';
const normaliseScope = (value: unknown): OneToOneReportScope => value === 'multiple' ? 'multiple' : 'single';
const normaliseStatus = (value: unknown): OneToOneReportStatus => ['draft', 'shared', 'archived'].includes(asText(value)) ? asText(value) as OneToOneReportStatus : 'draft';
const normaliseMembers = (value: unknown) => Array.isArray(value) ? value.map(item => asText(item).trim()).filter(Boolean) : [];

const mapPortal = (row: any): OneToOnePortal => ({
  id: asText(row?.id),
  title: asText(row?.title, 'Ruang 1:1'),
  menteeName: asText(row?.mentee_name ?? row?.menteeName),
  menteeEmail: asText(row?.mentee_email ?? row?.menteeEmail),
  mentorName: asText(row?.mentor_name ?? row?.mentorName),
  mentorRole: asText(row?.mentor_role ?? row?.mentorRole),
  mentorAvatarUrl: asText(row?.mentor_avatar_url ?? row?.mentorAvatarUrl),
  logoUrl: asText(row?.logo_url ?? row?.logoUrl),
  coverImageUrl: asText(row?.cover_image_url ?? row?.coverImageUrl),
  welcomeTitle: asText(row?.welcome_title ?? row?.welcomeTitle),
  welcomeMessage: asText(row?.welcome_message ?? row?.welcomeMessage),
  theme: row?.theme || 'navy',
  accentColor: reportAccent(row?.accent_color ?? row?.accentColor),
  consultationPhone: asText(row?.consultation_phone ?? row?.consultationPhone),
  consultationTimezone: asText(row?.consultation_timezone ?? row?.consultationTimezone, 'Asia/Makassar'),
  consultationHours: row?.consultation_hours ?? row?.consultationHours ?? {},
  isActive: row?.is_active ?? row?.isActive ?? true,
  publicTokenHint: asText(row?.public_token_hint ?? row?.publicTokenHint),
  createdAt: row?.created_at ?? row?.createdAt,
  updatedAt: row?.updated_at ?? row?.updatedAt
});

const mapBooking = (row: any): OneToOneScheduleEvent => ({
  id: asText(row?.id),
  portalId: asText(row?.portal_id ?? row?.portalId),
  title: asText(row?.title, 'Sesi mentoring'),
  description: asText(row?.description),
  startsAt: asText(row?.starts_at ?? row?.startsAt),
  endsAt: asText(row?.ends_at ?? row?.endsAt),
  location: asText(row?.location),
  meetingUrl: asText(row?.meeting_url ?? row?.meetingUrl),
  status: row?.status === 'completed' || row?.status === 'cancelled' ? row.status : 'scheduled',
  sortOrder: Number(row?.sort_order ?? row?.sortOrder) || 0
});

const mapReport = (row: any): OneToOneReport => ({
  id: asText(row?.id),
  portalId: row?.portal_id ?? row?.portalId ?? null,
  bookingEventId: row?.booking_event_id ?? row?.bookingEventId ?? null,
  title: asText(row?.title, 'Laporan mentoring'),
  recipientType: normaliseRecipientType(row?.recipient_type ?? row?.recipientType),
  menteeName: asText(row?.mentee_name ?? row?.menteeName),
  menteeEmail: asText(row?.mentee_email ?? row?.menteeEmail),
  teamName: asText(row?.team_name ?? row?.teamName),
  teamMembers: normaliseMembers(row?.team_members ?? row?.teamMembers),
  periodLabel: asText(row?.period_label ?? row?.periodLabel),
  reportScope: normaliseScope(row?.report_scope ?? row?.reportScope),
  status: normaliseStatus(row?.status),
  mentorName: asText(row?.mentor_name ?? row?.mentorName),
  mentorRole: asText(row?.mentor_role ?? row?.mentorRole),
  accentColor: reportAccent(row?.accent_color ?? row?.accentColor),
  coverTitle: asText(row?.cover_title ?? row?.coverTitle, 'Laporan perkembangan'),
  coverSubtitle: asText(row?.cover_subtitle ?? row?.coverSubtitle),
  summary: asText(row?.summary),
  evaluation: asText(row?.evaluation),
  nextSteps: asText(row?.next_steps ?? row?.nextSteps),
  footerNote: asText(row?.footer_note ?? row?.footerNote),
  templateSettings: normaliseTemplateSettings(row?.template_settings ?? row?.templateSettings),
  isShared: Boolean(row?.is_shared ?? row?.isShared),
  publicTokenHint: asText(row?.public_token_hint ?? row?.publicTokenHint),
  sharedAt: row?.shared_at ?? row?.sharedAt ?? null,
  createdAt: row?.created_at ?? row?.createdAt,
  updatedAt: row?.updated_at ?? row?.updatedAt
});

const mapSession = (row: any): OneToOneReportSession => ({
  id: asText(row?.id),
  reportId: asText(row?.report_id ?? row?.reportId),
  bookingEventId: row?.booking_event_id ?? row?.bookingEventId ?? null,
  sessionDate: asText(row?.session_date ?? row?.sessionDate),
  title: asText(row?.title, 'Pertemuan'),
  notes: asText(row?.notes),
  evaluation: asText(row?.evaluation),
  actionItems: asText(row?.action_items ?? row?.actionItems),
  sortOrder: Number(row?.sort_order ?? row?.sortOrder) || 0
});

const newSession = (index: number, reportId = ''): OneToOneReportSession => ({
  id: '',
  reportId,
  bookingEventId: null,
  sessionDate: todayDate(),
  title: `Pertemuan ${index + 1}`,
  notes: '',
  evaluation: '',
  actionItems: '',
  sortOrder: index
});

const formatDate = (value: string, withTime = false) => {
  if (!value) return '—';
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'long', year: 'numeric' }
  ).format(date);
};

const bookingDate = (value: string) => value ? value.slice(0, 10) : '';
const reportRecipientLabel = (report: Pick<OneToOneReport, 'recipientType' | 'menteeName' | 'teamName'>) => report.recipientType === 'team' ? report.teamName || 'Tim belum diberi nama' : report.menteeName || 'Mentee belum dipilih';
const getPortalForBooking = (portals: OneToOnePortal[], booking: OneToOneScheduleEvent | undefined) => portals.find(portal => portal.id === booking?.portalId);

const reportShareLink = (token: string) => {
  try {
    const url = new URL(getPublicBaseUrl());
    url.search = '';
    url.hash = `/one-to-one-report/${encodeURIComponent(token)}`;
    return url.toString();
  } catch {
    return `${window.location.origin}${window.location.pathname}#/one-to-one-report/${encodeURIComponent(token)}`;
  }
};

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
};

const reportErrorMessage = (error: any) => {
  const message = asText(error?.message || error?.details || error).trim();
  if (message.includes('one_to_one_reports') || message.includes('one_to_one_report_sessions') || message.includes('one_to_one_report')) return 'Fitur raport 1:1 belum tersedia di database. Jalankan migration 20261010000000_one_to_one_reports.sql.';
  return message || 'Perubahan belum dapat disimpan.';
};

const pdfText = (value: unknown) => asText(value)
  .normalize('NFKD')
  .replace(/[“”]/g, '"')
  .replace(/[‘’]/g, "'")
  .replace(/[–—]/g, '-')
  .replace(/…/g, '...')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\x20-\x7E]/g, '?');

const pdfEscape = (value: unknown) => pdfText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const wrapPdfText = (value: unknown, maxLength = 76) => {
  const source = pdfText(value).trim();
  if (!source) return ['-'];
  const lines: string[] = [];
  source.split(/\r?\n/).forEach(paragraph => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
      return;
    }
    let line = '';
    words.forEach(word => {
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length <= maxLength || !line) line = candidate;
      else {
        lines.push(line);
        line = word;
      }
    });
    if (line) lines.push(line);
  });
  return lines.length ? lines : ['-'];
};

const createReportPdf = (report: OneToOneReport, sessions: OneToOneReportSession[]) => {
  const pageWidth = 595;
  const pageHeight = 842;
  const accent = reportAccent(report.accentColor);
  const ink = '#182b3d';
  const muted = '#6a7d8f';
  const soft = '#f3f7fa';
  const pages: string[][] = [];
  const rgb = (hex: string) => {
    const source = hex.replace('#', '');
    return [0, 2, 4].map(index => (parseInt(source.slice(index, index + 2), 16) / 255).toFixed(3)).join(' ');
  };
  let commands: string[] = [];
  let y = 758;
  const drawText = (value: unknown, x: number, baseline: number, size: number, color = ink) => commands.push(`${rgb(color)} rg BT /F1 ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${baseline.toFixed(2)} Tm (${pdfEscape(value)}) Tj ET`);
  const fillRect = (x: number, bottom: number, width: number, height: number, color: string) => commands.push(`${rgb(color)} rg ${x} ${bottom} ${width} ${height} re f`);
  const line = (x1: number, y1: number, x2: number, y2: number, color: string) => commands.push(`${rgb(color)} RG 0.7 w ${x1} ${y1} m ${x2} ${y2} l S`);
  const beginPage = (continuation = false) => {
    commands = [];
    fillRect(0, 0, pageWidth, pageHeight, '#ffffff');
    fillRect(0, 802, pageWidth, 40, accent);
    drawText(report.templateSettings.headerLabel.toUpperCase(), 42, 815, 8, '#ffffff');
    drawText(continuation ? `${report.title} - lanjutan` : report.title, 42, 780, 18, accent);
    line(42, 768, pageWidth - 42, 768, '#d6e1e8');
    y = 744;
  };
  const finishPage = () => {
    drawText(report.footerNote || 'Dokumen laporan mentoring', 42, 28, 7, muted);
    drawText('Arunika Learning Hub', pageWidth - 142, 28, 7, muted);
    pages.push(commands);
  };
  const ensureSpace = (height: number) => {
    if (y - height > 58) return;
    finishPage();
    beginPage(true);
  };
  const writeLines = (value: unknown, size = 9, color = ink, maxChars = 82) => {
    const lines = wrapPdfText(value, maxChars);
    ensureSpace(lines.length * (size + 5) + 7);
    lines.forEach(item => {
      drawText(item, 42, y, size, color);
      y -= size + 5;
    });
    y -= 5;
  };
  const writeSection = (label: string, value: unknown) => {
    ensureSpace(46);
    drawText(label.toUpperCase(), 42, y, 7, accent);
    y -= 14;
    writeLines(value || '-', 9, ink);
  };

  beginPage();
  drawText(report.coverTitle || 'Laporan perkembangan', 42, y, 22, ink);
  y -= 30;
  if (report.coverSubtitle) writeLines(report.coverSubtitle, 10, muted);
  drawText('PENERIMA', 42, y, 7, muted);
  drawText(reportRecipientLabel(report), 42, y - 15, 12, ink);
  drawText('PERIODE', 280, y, 7, muted);
  drawText(report.periodLabel || 'Belum ditentukan', 280, y - 15, 12, ink);
  y -= 46;
  if (report.recipientType === 'team' && report.teamMembers.length) {
    writeSection('Anggota tim', report.teamMembers.map((member, index) => `${index + 1}. ${member}`).join('\n'));
  }
  if (report.templateSettings.showMentor && (report.mentorName || report.mentorRole)) {
    writeSection('Mentor', [report.mentorName, report.mentorRole].filter(Boolean).join(' · '));
  }
  writeSection(report.templateSettings.summaryLabel, report.summary);
  writeSection(report.templateSettings.evaluationLabel, report.evaluation);
  writeSection(report.templateSettings.actionItemsLabel, report.nextSteps);
  const reportSessions = sessions.length ? sessions : [newSession(0, report.id)];
  reportSessions.forEach((session, index) => {
    ensureSpace(90);
    drawText(`PERTEMUAN ${index + 1} · ${session.sessionDate ? formatDate(session.sessionDate) : 'Tanggal belum diatur'}`, 42, y, 8, accent);
    y -= 15;
    drawText(session.title || `Pertemuan ${index + 1}`, 42, y, 12, ink);
    y -= 18;
    writeSection('Catatan', session.notes);
    writeSection(report.templateSettings.evaluationLabel, session.evaluation);
    writeSection(report.templateSettings.actionItemsLabel, session.actionItems);
  });
  finishPage();

  const streams = pages.map(page => page.join('\n'));
  const pageObjectNumbers = streams.map((_, index) => 4 + index * 2);
  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageObjectNumbers.map(number => `${number} 0 R`).join(' ')}] /Count ${streams.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  streams.forEach((stream, index) => {
    const pageObject = 4 + index * 2;
    const contentObject = pageObject + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObject} 0 R >>`);
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  let pdf = '%PDF-1.4\n%Arunika\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
};

const downloadReportPdf = (report: OneToOneReport, sessions: OneToOneReportSession[]) => {
  const url = URL.createObjectURL(createReportPdf(report, sessions));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `raport-${reportRecipientLabel(report).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'mentee'}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const NoticeMessage: React.FC<{ notice: Notice }> = ({ notice }) => notice ? <div className={`rounded-xl border px-4 py-3 text-sm ${notice.tone === 'error' ? 'border-[var(--danger-text)] bg-[var(--danger-soft)] text-[var(--danger-text)]' : 'border-[var(--border)] bg-[var(--success-soft)] text-[var(--success-text)]'}`}>{notice.message}</div> : null;

const ReportPreview: React.FC<{ report: OneToOneReport; sessions: OneToOneReportSession[]; publicView?: boolean }> = ({ report, sessions, publicView = false }) => {
  const accent = reportAccent(report.accentColor);
  const recipient = reportRecipientLabel(report);
  return <article className={`overflow-hidden rounded-2xl border border-[var(--border)] bg-white text-slate-800 shadow-sm ${publicView ? 'mx-auto max-w-4xl' : ''}`} style={{ borderTopWidth: '7px', borderTopColor: accent }}>
    <header className="border-b border-slate-100 px-5 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-center gap-3"><img src={logoUtama} alt="Arunika" className="h-8 w-auto object-contain" /><span className="h-5 w-px bg-slate-200" /><p className="text-[10px] font-bold uppercase tracking-[0.17em]" style={{ color: accent }}>{report.templateSettings.headerLabel}</p></div>
      <div className="mt-7 grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"><div><h1 className="text-2xl font-bold tracking-tight md:text-3xl">{report.coverTitle || report.title}</h1>{report.coverSubtitle && <p className="mt-2 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-slate-500">{report.coverSubtitle}</p>}</div><div className="rounded-xl bg-slate-50 px-4 py-3 text-sm"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Periode</p><p className="mt-1 font-semibold text-slate-800">{report.periodLabel || 'Belum ditentukan'}</p></div></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-slate-100 p-4"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{report.recipientType === 'team' ? 'Tim / organisasi' : 'Mentee'}</p><p className="mt-1 font-bold text-slate-800">{recipient}</p>{report.recipientType === 'individual' && report.menteeEmail && <p className="mt-1 text-xs text-slate-500">{report.menteeEmail}</p>}</div>{report.templateSettings.showMentor && <div className="rounded-xl border border-slate-100 p-4"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Mentor</p><p className="mt-1 font-bold text-slate-800">{report.mentorName || 'Belum diatur'}</p>{report.mentorRole && <p className="mt-1 text-xs text-slate-500">{report.mentorRole}</p>}</div>}</div>
      {report.recipientType === 'team' && report.teamMembers.length > 0 && <div className="mt-4 rounded-xl border border-slate-100 p-4"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Anggota tim</p><div className="mt-2 flex flex-wrap gap-2">{report.teamMembers.map(member => <span key={member} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{member}</span>)}</div></div>}
    </header>
    <div className="space-y-6 px-5 py-6 md:px-8 md:py-8">
      <ReportPreviewSection title={report.templateSettings.summaryLabel} value={report.summary} accent={accent} />
      <ReportPreviewSection title={report.templateSettings.evaluationLabel} value={report.evaluation} accent={accent} />
      <ReportPreviewSection title={report.templateSettings.actionItemsLabel} value={report.nextSteps} accent={accent} />
      <section><div className="flex items-center gap-3"><span className="h-px flex-1 bg-slate-100" /><p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: accent }}>{report.reportScope === 'multiple' ? 'Rangkaian pertemuan' : 'Detail pertemuan'}</p><span className="h-px flex-1 bg-slate-100" /></div>{sessions.length ? <div className="mt-4 space-y-4">{sessions.map((session, index) => <article key={session.id || `draft-session-${index}`} className="rounded-xl border border-slate-100 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-semibold" style={{ color: accent }}>{session.sessionDate ? formatDate(session.sessionDate) : 'Tanggal belum diatur'}</p><h3 className="mt-1 font-bold">{session.title || `Pertemuan ${index + 1}`}</h3></div><span className="rounded-lg bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Sesi {index + 1}</span></div><div className="mt-4 grid gap-4 lg:grid-cols-3"><PreviewField label="Catatan" value={session.notes} /><PreviewField label={report.templateSettings.evaluationLabel} value={session.evaluation} /><PreviewField label={report.templateSettings.actionItemsLabel} value={session.actionItems} /></div></article>)}</div> : <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Belum ada detail pertemuan.</p>}</section>
    </div>
    <footer className="border-t border-slate-100 px-5 py-4 text-center text-xs text-slate-500 md:px-8">{report.footerNote || 'Dokumen perkembangan mentoring.'}</footer>
  </article>;
};

const ReportPreviewSection: React.FC<{ title: string; value: string; accent: string }> = ({ title, value, accent }) => <section><p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: accent }}>{title}</p><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{value || 'Belum ada isi.'}</p></section>;
const PreviewField: React.FC<{ label: string; value: string }> = ({ label, value }) => <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-600">{value || '—'}</p></div>;

const selectClassName = 'min-h-[46px] w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] outline-none transition-all focus:border-[var(--accent)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent)_12%,transparent)]';

const BookingLabel: React.FC<{ booking: OneToOneScheduleEvent; portals: OneToOnePortal[] }> = ({ booking, portals }) => {
  const portal = getPortalForBooking(portals, booking);
  return <>{formatDate(booking.startsAt, true)} · {portal?.menteeName || 'Mentee belum dinamai'} · {booking.title || 'Sesi mentoring'}</>;
};

export const OneToOneReportsDashboard: React.FC<{
  client: any;
  portals: OneToOnePortal[];
  bookingEvents: OneToOneScheduleEvent[];
}> = ({ client, portals, bookingEvents }) => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<OneToOneReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [filter, setFilter] = useState<'all' | OneToOneReportRecipientType>('all');
  const [recipientType, setRecipientType] = useState<OneToOneReportRecipientType>('individual');
  const [bookingEventId, setBookingEventId] = useState('');
  const [portalId, setPortalId] = useState('');
  const [teamName, setTeamName] = useState('');

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await client.from('one_to_one_reports').select('*').order('updated_at', { ascending: false });
    if (error) setNotice({ tone: 'error', message: reportErrorMessage(error) });
    else setReports((data || []).map(mapReport));
    setIsLoading(false);
  }, [client]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const sortedBookings = useMemo(() => [...bookingEvents].sort((first, second) => (second.startsAt || '').localeCompare(first.startsAt || '')), [bookingEvents]);
  const filteredReports = useMemo(() => filter === 'all' ? reports : reports.filter(report => report.recipientType === filter), [filter, reports]);

  const createReport = async () => {
    setIsCreating(true);
    setNotice(null);
    const { data, error } = await client.rpc('create_one_to_one_report', {
      p_booking_event_id: bookingEventId || null,
      p_portal_id: bookingEventId ? null : portalId || null,
      p_recipient_type: recipientType,
      p_team_name: recipientType === 'team' ? teamName.trim() : ''
    });
    setIsCreating(false);
    if (error || !data?.reportId) {
      setNotice({ tone: 'error', message: reportErrorMessage(error || 'Raport belum dapat dibuat.') });
      return;
    }
    navigate(`/admin/one-to-one/reports/${data.reportId}`);
  };

  return <div className="space-y-6">
    {notice && <NoticeMessage notice={notice} />}
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[var(--border)] bg-[var(--surface-soft)] px-5 py-5 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[var(--accent-strong)]"><ClipboardList size={18} /><p className="text-xs font-bold uppercase tracking-[0.15em]">Workspace raport</p></div>
            <h2 className="mt-2 text-xl font-bold text-[var(--text)]">Buat laporan perkembangan mentee</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">Pilih booking untuk mengisi data mentee dan mentor otomatis, lalu tulis evaluasi per satu atau beberapa pertemuan.</p>
          </div>
          <Badge color="var(--accent-soft)">{reports.length} raport</Badge>
        </div>
      </div>
      <div className="grid gap-5 p-5 md:grid-cols-2 md:p-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div><p className="text-sm font-bold text-[var(--text)]">1. Tentukan penerima</p><p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">Laporan dapat dibuat untuk seorang mentee atau sebuah tim.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => setRecipientType('individual')} className={`rounded-xl border p-4 text-left transition-colors ${recipientType === 'individual' ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] hover:bg-[var(--surface-soft)]'}`}><UserRound size={18} className="text-[var(--accent-strong)]" /><p className="mt-3 font-bold text-sm text-[var(--text)]">Perorangan</p><p className="mt-1 text-xs text-[var(--muted)]">Satu mentee dari booking 1:1.</p></button>
            <button type="button" onClick={() => setRecipientType('team')} className={`rounded-xl border p-4 text-left transition-colors ${recipientType === 'team' ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] hover:bg-[var(--surface-soft)]'}`}><Users size={18} className="text-[var(--accent-strong)]" /><p className="mt-3 font-bold text-sm text-[var(--text)]">Tim</p><p className="mt-1 text-xs text-[var(--muted)]">Atur nama dan anggota tim sendiri.</p></button>
          </div>
          {recipientType === 'team' && <Input label="Nama tim" value={teamName} onChange={event => setTeamName(event.target.value)} placeholder="Contoh: Tim Growth Arunika" />}
        </div>
        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div><p className="text-sm font-bold text-[var(--text)]">2. Hubungkan ke booking</p><p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">Opsional, tetapi disarankan agar nama mentee, mentor, dan sesi pertama terisi otomatis.</p></div>
          <div className="space-y-2"><label className="text-xs font-semibold text-[var(--muted)]">Booking 1:1</label><select className={selectClassName} value={bookingEventId} onChange={event => { setBookingEventId(event.target.value); if (event.target.value) setPortalId(''); }}><option value="">Belum dihubungkan ke booking</option>{sortedBookings.map(booking => <option key={booking.id} value={booking.id}><BookingLabel booking={booking} portals={portals} /></option>)}</select></div>
          {!bookingEventId && <div className="space-y-2"><label className="text-xs font-semibold text-[var(--muted)]">Atau pilih ruang 1:1</label><select className={selectClassName} value={portalId} onChange={event => setPortalId(event.target.value)}><option value="">Pilih nanti di editor</option>{portals.map(portal => <option key={portal.id} value={portal.id}>{portal.menteeName || 'Mentee belum dinamai'} · {portal.title}</option>)}</select></div>}
          <Button type="button" icon={Plus} className="w-full" onClick={() => void createReport()} isLoading={isCreating}>Buat dan buka editor raport</Button>
        </div>
      </div>
    </Card>

    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-[var(--text)]">Raport tersimpan</h2><p className="mt-1 text-sm text-[var(--muted)]">Draft tetap privat sampai Anda membuat link share.</p></div><div className="flex overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">{([['all', 'Semua'], ['individual', 'Perorangan'], ['team', 'Tim']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${filter === value ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:bg-[var(--surface-soft)]'}`}>{label}</button>)}</div></div>
    {isLoading ? <div className="flex min-h-40 items-center justify-center text-sm text-[var(--muted)]"><Loader2 className="mr-2 animate-spin" size={18} />Memuat raport…</div> : filteredReports.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredReports.map(report => <Card key={report.id} className="flex min-h-56 flex-col p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Badge color={report.recipientType === 'team' ? 'var(--accent-soft)' : 'var(--success-soft)'}>{report.recipientType === 'team' ? 'Tim' : 'Perorangan'}</Badge><h3 className="mt-3 truncate text-base font-bold text-[var(--text)]">{report.title}</h3><p className="mt-1 text-sm text-[var(--muted)]">{reportRecipientLabel(report)}</p></div><span className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${report.isShared ? 'bg-emerald-500' : 'bg-slate-300'}`} title={report.isShared ? 'Sudah dibagikan' : 'Masih draft'} /></div><div className="mt-auto pt-6"><div className="flex items-center justify-between text-xs text-[var(--muted)]"><span>{report.reportScope === 'multiple' ? 'Beberapa pertemuan' : '1 pertemuan'}</span><span>{report.updatedAt ? `Diubah ${formatDate(report.updatedAt)}` : 'Baru dibuat'}</span></div><Button type="button" variant="secondary" className="mt-4 w-full" icon={ArrowLeft} onClick={() => navigate(`/admin/one-to-one/reports/${report.id}`)}>Buka editor</Button></div></Card>)}</div> : <Card className="py-12 text-center"><ClipboardList size={30} className="mx-auto text-[var(--muted)]" /><h3 className="mt-3 font-bold text-[var(--text)]">Belum ada raport</h3><p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">Buat raport pertama dari booking di atas. Data mentee dan mentor akan menjadi snapshot laporan.</p></Card>}
  </div>;
};

const SessionEditor: React.FC<{
  session: OneToOneReportSession;
  index: number;
  bookings: OneToOneScheduleEvent[];
  portals: OneToOnePortal[];
  evaluationLabel: string;
  actionItemsLabel: string;
  canRemove: boolean;
  onChange: (patch: Partial<OneToOneReportSession>) => void;
  onRemove: () => void;
}> = ({ session, index, bookings, portals, evaluationLabel, actionItemsLabel, canRemove, onChange, onRemove }) => <Card className="space-y-4 p-4">
  <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-strong)]">Pertemuan {index + 1}</p><p className="mt-1 text-xs text-[var(--muted)]">Setiap sesi bisa ditautkan ke booking yang berbeda.</p></div>{canRemove && <button type="button" aria-label={`Hapus pertemuan ${index + 1}`} onClick={onRemove} className="rounded-lg p-2 text-[var(--danger-text)] hover:bg-[var(--danger-soft)]"><Trash2 size={17} /></button>}</div>
  <div className="grid gap-3 sm:grid-cols-2"><Input label="Tanggal pertemuan" type="date" value={session.sessionDate} onChange={event => onChange({ sessionDate: event.target.value })} /><Input label="Judul sesi" value={session.title} onChange={event => onChange({ title: event.target.value })} placeholder={`Pertemuan ${index + 1}`} /></div>
  <div className="space-y-2"><label className="text-xs font-semibold text-[var(--muted)]">Booking terkait</label><select className={selectClassName} value={session.bookingEventId || ''} onChange={event => { const booking = bookings.find(item => item.id === event.target.value); onChange({ bookingEventId: event.target.value || null, sessionDate: booking ? bookingDate(booking.startsAt) : session.sessionDate, title: booking?.title || session.title }); }}><option value="">Tidak ditautkan</option>{bookings.map(booking => <option key={booking.id} value={booking.id}><BookingLabel booking={booking} portals={portals} /></option>)}</select></div>
  <Textarea label="Catatan pertemuan" value={session.notes} onChange={event => onChange({ notes: event.target.value })} placeholder="Apa yang dibahas, konteks, atau perkembangan yang terlihat?" />
  <div className="grid gap-4 lg:grid-cols-2"><Textarea label={evaluationLabel} value={session.evaluation} onChange={event => onChange({ evaluation: event.target.value })} placeholder="Penilaian mentor atas sesi ini." /><Textarea label={actionItemsLabel} value={session.actionItems} onChange={event => onChange({ actionItems: event.target.value })} placeholder="Langkah yang perlu dikerjakan sebelum sesi berikutnya." /></div>
</Card>;

export const OneToOneReportEditorPage: React.FC<{ client: any }> = ({ client }) => {
  const navigate = useNavigate();
  const { reportId = '' } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<OneToOneReport | null>(null);
  const [sessions, setSessions] = useState<OneToOneReportSession[]>([]);
  const [originalSessionIds, setOriginalSessionIds] = useState<string[]>([]);
  const [portals, setPortals] = useState<OneToOnePortal[]>([]);
  const [bookings, setBookings] = useState<OneToOneScheduleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const loadReport = useCallback(async () => {
    if (!reportId) return;
    setIsLoading(true);
    const [reportResponse, sessionsResponse, portalsResponse, bookingsResponse] = await Promise.all([
      client.from('one_to_one_reports').select('*').eq('id', reportId).maybeSingle(),
      client.from('one_to_one_report_sessions').select('*').eq('report_id', reportId).order('sort_order').order('session_date'),
      client.from('one_to_one_portals').select('*').order('mentee_name'),
      client.from('one_to_one_schedule_events').select('*').order('starts_at', { ascending: false })
    ]);
    if (reportResponse.error || !reportResponse.data) {
      setNotice({ tone: 'error', message: reportErrorMessage(reportResponse.error || 'Raport tidak ditemukan atau Anda tidak memiliki akses.') });
      setReport(null);
      setIsLoading(false);
      return;
    }
    const mappedSessions = (sessionsResponse.data || []).map(mapSession);
    setReport(mapReport(reportResponse.data));
    setSessions(mappedSessions.length ? mappedSessions : [newSession(0, reportId)]);
    setOriginalSessionIds(mappedSessions.map((session: OneToOneReportSession) => session.id).filter(Boolean));
    setPortals((portalsResponse.data || []).map(mapPortal));
    setBookings((bookingsResponse.data || []).map(mapBooking));
    if (sessionsResponse.error || portalsResponse.error || bookingsResponse.error) setNotice({ tone: 'error', message: reportErrorMessage(sessionsResponse.error || portalsResponse.error || bookingsResponse.error) });
    setIsLoading(false);
  }, [client, reportId]);

  useEffect(() => { void loadReport(); }, [loadReport]);

  const patchReport = (patch: Partial<OneToOneReport>) => setReport(current => current ? { ...current, ...patch } : current);
  const patchSession = (index: number, patch: Partial<OneToOneReportSession>) => setSessions(current => current.map((session, itemIndex) => itemIndex === index ? { ...session, ...patch } : session));

  const applyBookingToReport = (bookingId: string) => {
    const booking = bookings.find(item => item.id === bookingId);
    if (!booking) {
      patchReport({ bookingEventId: null });
      return;
    }
    const portal = getPortalForBooking(portals, booking);
    patchReport({
      bookingEventId: booking.id,
      portalId: booking.portalId || null,
      menteeName: portal?.menteeName || report?.menteeName || '',
      menteeEmail: portal?.menteeEmail || report?.menteeEmail || '',
      mentorName: portal?.mentorName || report?.mentorName || '',
      mentorRole: portal?.mentorRole || report?.mentorRole || '',
      accentColor: portal?.accentColor || report?.accentColor || '#16436b',
      periodLabel: report?.periodLabel || formatDate(booking.startsAt)
    });
    setSessions(current => {
      const first = current[0] || newSession(0, reportId);
      return [{ ...first, bookingEventId: booking.id, sessionDate: bookingDate(booking.startsAt), title: booking.title || first.title }, ...current.slice(1)];
    });
  };

  const applyPortalToReport = (portalId: string) => {
    const portal = portals.find(item => item.id === portalId);
    patchReport({
      portalId: portalId || null,
      bookingEventId: portalId ? null : report?.bookingEventId || null,
      menteeName: portal?.menteeName || report?.menteeName || '',
      menteeEmail: portal?.menteeEmail || report?.menteeEmail || '',
      mentorName: portal?.mentorName || report?.mentorName || '',
      mentorRole: portal?.mentorRole || report?.mentorRole || '',
      accentColor: portal?.accentColor || report?.accentColor || '#16436b'
    });
  };

  const saveReport = async (showNotice = true) => {
    if (!report) return false;
    if (!report.title.trim()) {
      setNotice({ tone: 'error', message: 'Judul raport harus diisi.' });
      return false;
    }
    setIsSaving(true);
    setNotice(null);
    const effectiveSessions = (report.reportScope === 'single' ? sessions.slice(0, 1) : sessions).map((session, index) => ({ ...session, sortOrder: index, title: session.title.trim() || `Pertemuan ${index + 1}` }));
    const { error: reportError } = await client.from('one_to_one_reports').update({
      portal_id: report.portalId || null,
      booking_event_id: report.bookingEventId || null,
      title: report.title.trim(),
      recipient_type: report.recipientType,
      mentee_name: report.menteeName.trim(),
      mentee_email: report.menteeEmail.trim(),
      team_name: report.teamName.trim(),
      team_members: report.teamMembers,
      period_label: report.periodLabel.trim(),
      report_scope: report.reportScope,
      status: report.status,
      mentor_name: report.mentorName.trim(),
      mentor_role: report.mentorRole.trim(),
      accent_color: reportAccent(report.accentColor),
      cover_title: report.coverTitle.trim() || report.title.trim(),
      cover_subtitle: report.coverSubtitle,
      summary: report.summary,
      evaluation: report.evaluation,
      next_steps: report.nextSteps,
      footer_note: report.footerNote,
      template_settings: report.templateSettings
    }).eq('id', report.id);
    if (reportError) {
      setIsSaving(false);
      setNotice({ tone: 'error', message: reportErrorMessage(reportError) });
      return false;
    }

    const existing = effectiveSessions.filter(session => session.id);
    const added = effectiveSessions.filter(session => !session.id);
    const keptIds = existing.map(session => session.id);
    const deletedIds = originalSessionIds.filter(id => !keptIds.includes(id));
    const sessionPayload = (session: OneToOneReportSession, index: number) => ({
      booking_event_id: session.bookingEventId || null,
      session_date: session.sessionDate || null,
      title: session.title.trim() || `Pertemuan ${index + 1}`,
      notes: session.notes,
      evaluation: session.evaluation,
      action_items: session.actionItems,
      sort_order: index
    });
    const updates = await Promise.all(existing.map((session, index) => client.from('one_to_one_report_sessions').update(sessionPayload(session, index)).eq('id', session.id)));
    const updateFailure = updates.find((result: any) => result.error)?.error;
    if (updateFailure) {
      setIsSaving(false);
      setNotice({ tone: 'error', message: reportErrorMessage(updateFailure) });
      return false;
    }
    if (added.length) {
      const { error: insertError } = await client.from('one_to_one_report_sessions').insert(added.map((session, index) => ({ report_id: report.id, ...sessionPayload(session, existing.length + index) })));
      if (insertError) {
        setIsSaving(false);
        setNotice({ tone: 'error', message: reportErrorMessage(insertError) });
        return false;
      }
    }
    if (deletedIds.length) {
      const { error: deleteError } = await client.from('one_to_one_report_sessions').delete().in('id', deletedIds);
      if (deleteError) {
        setIsSaving(false);
        setNotice({ tone: 'error', message: reportErrorMessage(deleteError) });
        return false;
      }
    }
    setIsSaving(false);
    if (showNotice) setNotice({ tone: 'success', message: 'Raport tersimpan. Preview di kanan sudah memakai perubahan terbaru.' });
    await loadReport();
    return true;
  };

  const shareReport = async () => {
    if (!(await saveReport(false)) || !report) return;
    setIsSharing(true);
    const { data, error } = await client.rpc('rotate_one_to_one_report_share_token', { p_report_id: report.id });
    setIsSharing(false);
    if (error || !data?.token) {
      setNotice({ tone: 'error', message: reportErrorMessage(error || 'Link share belum dapat dibuat.') });
      return;
    }
    try {
      await copyText(reportShareLink(data.token));
      setNotice({ tone: 'success', message: 'Link share baru sudah dibuat dan disalin. Link lama tidak lagi berlaku.' });
    } catch {
      setNotice({ tone: 'success', message: `Link share sudah dibuat: ${reportShareLink(data.token)}` });
    }
    patchReport({ isShared: true, status: 'shared', publicTokenHint: data.publicTokenHint || '' });
  };

  const unshareReport = async () => {
    if (!report) return;
    const { error } = await client.from('one_to_one_reports').update({ is_shared: false, status: 'draft' }).eq('id', report.id);
    if (error) {
      setNotice({ tone: 'error', message: reportErrorMessage(error) });
      return;
    }
    patchReport({ isShared: false, status: 'draft' });
    setNotice({ tone: 'success', message: 'Akses link publik telah dinonaktifkan.' });
  };

  if (isLoading) return <div className="flex min-h-[55vh] items-center justify-center text-sm text-[var(--muted)]"><Loader2 size={20} className="mr-2 animate-spin" />Memuat editor raport…</div>;
  if (!report) return <div className="mx-auto max-w-xl py-16 text-center"><XCircle className="mx-auto text-[var(--danger-text)]" size={34} /><h1 className="mt-4 text-xl font-bold text-[var(--text)]">Raport tidak tersedia</h1><p className="mt-2 text-sm text-[var(--muted)]">Pastikan migration raport telah dijalankan dan Anda memiliki hak akses admin.</p><Button type="button" variant="secondary" className="mx-auto mt-5" onClick={() => navigate('/admin/one-to-one')}>Kembali ke 1:1</Button></div>;

  const sortedBookings = [...bookings].sort((first, second) => (second.startsAt || '').localeCompare(first.startsAt || ''));
  const shownSessions = report.reportScope === 'single' ? sessions.slice(0, 1) : sessions;
  return <div className="space-y-5 pb-10">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><Link to="/admin/one-to-one" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)] hover:text-[var(--text)]"><ArrowLeft size={16} />Kembali ke 1:1 Mentorship</Link><div className="mt-3 flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">Editor raport 1:1</h1><Badge color={report.isShared ? 'var(--success-soft)' : 'var(--surface-soft)'}>{report.isShared ? 'Link aktif' : 'Draft privat'}</Badge></div><p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--muted)]">Isi di kiri langsung muncul di preview. Export PDF menggunakan versi yang sedang Anda lihat, termasuk perubahan yang belum disimpan.</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" icon={Download} onClick={() => downloadReportPdf(report, shownSessions)}>Export PDF</Button>{report.isShared ? <Button type="button" variant="secondary" icon={RotateCcw} onClick={() => void unshareReport()}>Nonaktifkan link</Button> : null}<Button type="button" variant="secondary" icon={Share2} onClick={() => void shareReport()} isLoading={isSharing}>Buat link share</Button><Button type="button" icon={Save} onClick={() => void saveReport()} isLoading={isSaving}>Simpan</Button></div></div>
    {notice && <NoticeMessage notice={notice} />}
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.15fr)]">
      <div className="space-y-5 xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto xl:pr-2">
        <Card className="space-y-4"><div><p className="text-sm font-bold text-[var(--text)]">Identitas raport</p><p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">Hubungkan ke booking untuk mengambil data penerima, tanpa mengubah data booking aslinya.</p></div><Input label="Judul internal raport" value={report.title} onChange={event => patchReport({ title: event.target.value })} /><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><label className="text-xs font-semibold text-[var(--muted)]">Jenis penerima</label><select className={selectClassName} value={report.recipientType} onChange={event => patchReport({ recipientType: normaliseRecipientType(event.target.value) })}><option value="individual">Perorangan</option><option value="team">Tim</option></select></div><div className="space-y-2"><label className="text-xs font-semibold text-[var(--muted)]">Cakupan laporan</label><select className={selectClassName} value={report.reportScope} onChange={event => { const scope = normaliseScope(event.target.value); patchReport({ reportScope: scope }); setSessions(current => scope === 'single' ? current.slice(0, 1) : current.length ? current : [newSession(0, report.id)]); }}><option value="single">1 pertemuan</option><option value="multiple">Beberapa pertemuan</option></select></div></div><div className="space-y-2"><label className="text-xs font-semibold text-[var(--muted)]">Booking utama</label><select className={selectClassName} value={report.bookingEventId || ''} onChange={event => applyBookingToReport(event.target.value)}><option value="">Tidak ditautkan</option>{sortedBookings.map(booking => <option key={booking.id} value={booking.id}><BookingLabel booking={booking} portals={portals} /></option>)}</select></div>{!report.bookingEventId && <div className="space-y-2"><label className="text-xs font-semibold text-[var(--muted)]">Ruang 1:1</label><select className={selectClassName} value={report.portalId || ''} onChange={event => applyPortalToReport(event.target.value)}><option value="">Tidak ditautkan</option>{portals.map(portal => <option key={portal.id} value={portal.id}>{portal.menteeName || 'Mentee belum dinamai'} · {portal.title}</option>)}</select></div>}<Input label="Periode laporan" value={report.periodLabel} onChange={event => patchReport({ periodLabel: event.target.value })} placeholder="Contoh: September–Oktober 2026" /></Card>

        <Card className="space-y-4"><div><p className="text-sm font-bold text-[var(--text)]">Penerima & mentor</p><p className="mt-1 text-xs text-[var(--muted)]">Untuk tim, nama mentee dapat diisi sebagai PIC atau kontak utama.</p></div>{report.recipientType === 'team' && <><Input label="Nama tim / organisasi" value={report.teamName} onChange={event => patchReport({ teamName: event.target.value })} placeholder="Contoh: Tim Growth Arunika" /><Textarea label="Anggota tim (satu nama per baris)" value={report.teamMembers.join('\n')} onChange={event => patchReport({ teamMembers: event.target.value.split(/\r?\n/).map(item => item.trim()).filter(Boolean) })} placeholder={'Alya\nBima\nCitra'} /></>}<div className="grid gap-3 sm:grid-cols-2"><Input label={report.recipientType === 'team' ? 'Nama PIC' : 'Nama mentee'} value={report.menteeName} onChange={event => patchReport({ menteeName: event.target.value })} /><Input label={report.recipientType === 'team' ? 'Email PIC' : 'Email mentee'} type="email" value={report.menteeEmail} onChange={event => patchReport({ menteeEmail: event.target.value })} /></div><div className="grid gap-3 sm:grid-cols-2"><Input label="Nama mentor" value={report.mentorName} onChange={event => patchReport({ mentorName: event.target.value })} /><Input label="Peran mentor" value={report.mentorRole} onChange={event => patchReport({ mentorRole: event.target.value })} /></div></Card>

        <Card className="space-y-4"><div><p className="text-sm font-bold text-[var(--text)]">Ringkasan & evaluasi</p><p className="mt-1 text-xs text-[var(--muted)]">Bagian ini tampil sebagai kesimpulan keseluruhan di awal raport.</p></div><Textarea label={report.templateSettings.summaryLabel} value={report.summary} onChange={event => patchReport({ summary: event.target.value })} placeholder="Rangkuman perkembangan, konteks, atau fokus mentoring." /><Textarea label={report.templateSettings.evaluationLabel} value={report.evaluation} onChange={event => patchReport({ evaluation: event.target.value })} placeholder="Penilaian keseluruhan mentor." /><Textarea label={report.templateSettings.actionItemsLabel} value={report.nextSteps} onChange={event => patchReport({ nextSteps: event.target.value })} placeholder="Hal yang perlu dilakukan setelah mentoring." /></Card>

        <Card className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold text-[var(--text)]">Pertemuan</p><p className="mt-1 text-xs text-[var(--muted)]">Catatan rinci per sesi. Pilih cakupan beberapa pertemuan untuk menambah sesi.</p></div>{report.reportScope === 'multiple' && <Button type="button" variant="secondary" icon={Plus} onClick={() => setSessions(current => [...current, newSession(current.length, report.id)])}>Tambah sesi</Button>}</div><div className="space-y-4">{shownSessions.map((session, index) => <SessionEditor key={session.id || `new-${index}`} session={session} index={index} bookings={sortedBookings} portals={portals} evaluationLabel={report.templateSettings.evaluationLabel} actionItemsLabel={report.templateSettings.actionItemsLabel} canRemove={report.reportScope === 'multiple' && shownSessions.length > 1} onChange={patch => patchSession(index, patch)} onRemove={() => setSessions(current => current.filter((_, itemIndex) => itemIndex !== index))} />)}</div></Card>

        <Card className="space-y-4"><div><p className="text-sm font-bold text-[var(--text)]">Kustomisasi tampilan</p><p className="mt-1 text-xs text-[var(--muted)]">Ubah istilah, judul cover, warna aksen, dan footer agar format raport sesuai gaya Anda.</p></div><div className="grid gap-3 sm:grid-cols-2"><Input label="Judul cover" value={report.coverTitle} onChange={event => patchReport({ coverTitle: event.target.value })} /><div className="flex flex-col gap-2"><label className="text-xs font-semibold text-[var(--muted)]">Warna aksen</label><div className="flex min-h-[46px] items-center gap-3 rounded-xl border border-[var(--border)] px-3"><input aria-label="Warna aksen" type="color" value={reportAccent(report.accentColor)} onChange={event => patchReport({ accentColor: event.target.value })} className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0" /><Input aria-label="Kode warna aksen" value={report.accentColor} onChange={event => patchReport({ accentColor: event.target.value })} className="min-h-0 border-0 py-0 focus:ring-0" /></div></div></div><Textarea label="Subjudul cover" value={report.coverSubtitle} onChange={event => patchReport({ coverSubtitle: event.target.value })} className="min-h-[86px]" placeholder="Contoh: Ringkasan perkembangan dan arah tindak lanjut." /><div className="grid gap-3 sm:grid-cols-2"><Input label="Label header" value={report.templateSettings.headerLabel} onChange={event => patchReport({ templateSettings: { ...report.templateSettings, headerLabel: event.target.value } })} /><Input label="Label ringkasan" value={report.templateSettings.summaryLabel} onChange={event => patchReport({ templateSettings: { ...report.templateSettings, summaryLabel: event.target.value } })} /><Input label="Label evaluasi" value={report.templateSettings.evaluationLabel} onChange={event => patchReport({ templateSettings: { ...report.templateSettings, evaluationLabel: event.target.value } })} /><Input label="Label tindak lanjut" value={report.templateSettings.actionItemsLabel} onChange={event => patchReport({ templateSettings: { ...report.templateSettings, actionItemsLabel: event.target.value } })} /></div><label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] p-3 text-sm font-semibold text-[var(--text)]"><input type="checkbox" checked={report.templateSettings.showMentor} onChange={event => patchReport({ templateSettings: { ...report.templateSettings, showMentor: event.target.checked } })} className="h-4 w-4 accent-[var(--accent)]" />Tampilkan identitas mentor pada raport</label><Textarea label="Catatan footer" value={report.footerNote} onChange={event => patchReport({ footerNote: event.target.value })} className="min-h-[86px]" placeholder="Contoh: Dokumen ini dibuat sebagai ringkasan mentoring." /></Card>
      </div>
      <aside className="xl:sticky xl:top-5"><div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-bold text-[var(--text)]"><FileText size={17} />Preview langsung</div><span className="text-xs text-[var(--muted)]">Mode cetak</span></div><ReportPreview report={report} sessions={shownSessions} /></aside>
    </div>
  </div>;
};

export const PublicOneToOneReportPage: React.FC<{ client: any; tokenOverride?: string }> = ({ client, tokenOverride }) => {
  const { token: tokenParam } = useParams<{ token: string }>();
  const token = tokenOverride || tokenParam || '';
  const [report, setReport] = useState<OneToOneReport | null>(null);
  const [sessions, setSessions] = useState<OneToOneReportSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadPublicReport = async () => {
      if (!token) {
        if (active) setIsLoading(false);
        return;
      }
      const { data, error } = await client.rpc('get_public_one_to_one_report', { p_token: token });
      if (!active) return;
      if (error || !data) {
        setReport(null);
        setSessions([]);
        setIsLoading(false);
        setPublicMetadata({ title: 'Raport tidak tersedia | Arunika', description: 'Raport tidak ditemukan atau aksesnya sudah dinonaktifkan.' });
        return;
      }
      const payload = typeof data === 'string' ? JSON.parse(data) : data;
      const mappedReport = mapReport({ ...payload, status: 'shared', isShared: true });
      setReport(mappedReport);
      setSessions(Array.isArray(payload?.sessions) ? payload.sessions.map(mapSession) : []);
      setIsLoading(false);
      setPublicMetadata({ title: `${mappedReport.coverTitle || mappedReport.title} | Arunika`, description: `Raport perkembangan ${reportRecipientLabel(mappedReport)}.` });
    };
    void loadPublicReport();
    return () => { active = false; };
  }, [client, token]);

  if (isLoading) return <main className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] p-6"><div className="flex items-center gap-3 text-sm text-[var(--muted)]"><Loader2 className="animate-spin" size={20} />Memuat raport…</div></main>;
  if (!report) return <main className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] p-6"><Card className="w-full max-w-md py-12 text-center"><XCircle className="mx-auto text-[var(--danger-text)]" size={32} /><h1 className="mt-4 text-xl font-bold text-[var(--text)]">Raport tidak tersedia</h1><p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">Link ini mungkin sudah tidak aktif atau tidak lagi dibagikan.</p></Card></main>;
  return <main className="min-h-screen bg-[var(--app-bg)] px-4 py-7 md:px-7 md:py-10"><div className="mx-auto mb-5 flex max-w-4xl flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><img src={logoUtama} alt="Arunika" className="h-8 w-auto object-contain" /><span className="h-5 w-px bg-[var(--border)]" /><p className="text-sm font-semibold text-[var(--muted)]">Raport mentoring</p></div><Button type="button" variant="secondary" icon={Download} onClick={() => downloadReportPdf(report, sessions)}>Unduh PDF</Button></div><ReportPreview report={report} sessions={sessions} publicView /></main>;
};
