import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BarChart3, Copy, ExternalLink, Eye, Link as LinkIcon, Loader2, MousePointer2, Package, RefreshCw, Users } from 'lucide-react';
import { CatalogPage } from '../types';
import { Button, Card } from './UI';

type DailyPoint = { day: string; views: number; clicks: number };
type TopItem = { itemId: string; clicks: number };
type DashboardData = { views: number; uniqueVisitors: number; clicks: number; daily: DailyPoint[]; topItems: TopItem[] };
const integer = (value: unknown) => Math.max(0, Number(value) || 0);
const formatNumber = (value: number) => value.toLocaleString('id-ID');
const emptyDashboard: DashboardData = { views: 0, uniqueVisitors: 0, clicks: 0, daily: [], topItems: [] };

const normalizeDashboard = (value: any): DashboardData => ({
  views: integer(value?.views),
  uniqueVisitors: integer(value?.uniqueVisitors),
  clicks: integer(value?.clicks),
  daily: Array.isArray(value?.daily) ? value.daily.map((point: any) => ({ day: String(point.day || ''), views: integer(point.views), clicks: integer(point.clicks) })) : [],
  topItems: Array.isArray(value?.topItems) ? value.topItems.map((item: any) => ({ itemId: String(item.itemId || ''), clicks: integer(item.clicks) })) : []
});

const dateLabel = (day: string) => {
  const date = new Date(`${day}T12:00:00`);
  return Number.isNaN(date.getTime()) ? day : new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(date);
};

function CatalogTrendChart({ daily }: { daily: DailyPoint[] }) {
  const width = 760;
  const height = 250;
  const top = 20;
  const bottom = 225;
  const left = 12;
  const right = 748;
  const maximum = Math.max(1, ...daily.flatMap(point => [point.views, point.clicks]));
  const x = (index: number) => left + (index / Math.max(1, daily.length - 1)) * (right - left);
  const y = (value: number) => bottom - (value / maximum) * (bottom - top);
  const line = (key: 'views' | 'clicks') => daily.map((point, index) => `${index ? 'L' : 'M'} ${x(index).toFixed(1)} ${y(point[key]).toFixed(1)}`).join(' ');
  const viewLine = line('views');
  const clickLine = line('clicks');
  const viewArea = daily.length ? `${viewLine} L ${x(daily.length - 1)} ${bottom} L ${left} ${bottom} Z` : '';
  const labels = daily.length ? [0, Math.floor((daily.length - 1) / 2), daily.length - 1] : [];

  return <div className="min-w-0">
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Grafik tren kunjungan dan klik kartu katalog per hari" className="h-[230px] w-full overflow-visible sm:h-[280px]">
      <defs><linearGradient id="catalog-views-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#3d8bce" stopOpacity="0.3" /><stop offset="100%" stopColor="#3d8bce" stopOpacity="0.015" /></linearGradient></defs>
      {[0, 0.25, 0.5, 0.75, 1].map(tick => <line key={tick} x1={left} x2={right} y1={y(maximum * tick)} y2={y(maximum * tick)} stroke="currentColor" className="text-[var(--border)]" strokeDasharray="4 6" />)}
      {viewArea && <path d={viewArea} fill="url(#catalog-views-fill)" />}
      {viewLine && <path d={viewLine} fill="none" stroke="#3d8bce" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
      {clickLine && <path d={clickLine} fill="none" stroke="#23b39b" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="7 5" vectorEffect="non-scaling-stroke" />}
      {daily.filter((_, index) => index % Math.max(1, Math.ceil(daily.length / 15)) === 0 || index === daily.length - 1).map(point => {
        const index = daily.indexOf(point);
        return <g key={point.day}><circle cx={x(index)} cy={y(point.views)} r="4" fill="#3d8bce"><title>{dateLabel(point.day)}: {formatNumber(point.views)} kunjungan</title></circle><circle cx={x(index)} cy={y(point.clicks)} r="3.5" fill="#23b39b"><title>{dateLabel(point.day)}: {formatNumber(point.clicks)} klik</title></circle></g>;
      })}
    </svg>
    <div className="flex justify-between text-[11px] font-medium text-[var(--muted)]">{labels.map((index, position) => <span key={`${index}-${position}`}>{dateLabel(daily[index].day)}</span>)}</div>
  </div>;
}

export const CatalogInsightsDashboard: React.FC<{
  client: any;
  page: CatalogPage;
  publicUrl: string;
  onEdit: () => void;
}> = ({ client, page, publicUrl, onEdit }) => {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [data, setData] = useState<DashboardData>(emptyDashboard);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      const result = await client.rpc('get_catalog_dashboard', { p_catalog_id: page.id, p_days: days });
      if (!active) return;
      if (result.error || !result.data) {
        setError('Statistik belum tersedia. Terapkan SQL dashboard katalog terbaru di Supabase, lalu refresh.');
        setData(emptyDashboard);
      } else {
        setError('');
        setData(normalizeDashboard(result.data));
      }
      setIsLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [client, page.id, days, refreshKey]);

  const activeItems = page.items.filter(item => item.isVisible !== false).length;
  const clickRate = data.views ? (data.clicks / data.views) * 100 : 0;
  const highestClicks = Math.max(1, ...data.topItems.map(item => item.clicks));
  const ranked = useMemo(() => data.topItems.map(entry => ({ ...entry, item: page.items.find(item => item.id === entry.itemId) })), [data.topItems, page.items]);
  const metrics = [
    { label: 'Kunjungan katalog', value: formatNumber(data.views), icon: Eye, note: 'Sesi kunjungan publik' },
    { label: 'Pengunjung unik', value: formatNumber(data.uniqueVisitors), icon: Users, note: 'ID pengunjung berbeda' },
    { label: 'Klik kartu', value: formatNumber(data.clicks), icon: MousePointer2, note: 'Produk dan tautan' },
    { label: 'Klik / kunjungan', value: `${clickRate.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`, icon: BarChart3, note: 'Indikator interaksi, bukan penjualan' }
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { setCopied(false); }
  };

  return <div className="space-y-5">
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.85fr)]">
      <Card className="flex min-w-0 flex-col justify-between gap-5 overflow-hidden bg-[var(--surface)] p-5 sm:p-6">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Etalase produk</p><div className="mt-4 flex items-center gap-4"><span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">{page.avatarUrl ? <img src={page.avatarUrl} alt="" className="h-full w-full object-cover" /> : <Package size={27} />}</span><div className="min-w-0"><h2 className="truncate text-xl font-bold text-[var(--text)]">{page.title}</h2><p className="mt-1 truncate text-sm text-[var(--muted)]">{publicUrl}</p></div></div></div>
        <div className="flex flex-wrap items-center gap-2"><Button type="button" variant="secondary" icon={Copy} onClick={() => void copyLink()}>{copied ? 'Link tersalin' : 'Salin link'}</Button><Button type="button" variant="secondary" icon={ExternalLink} disabled={page.status !== 'published'} onClick={() => window.open(publicUrl, '_blank', 'noopener,noreferrer')}>Lihat publik</Button><Button type="button" icon={ArrowRight} onClick={onEdit}>Buka editor</Button></div>
      </Card>
      <Card className="relative flex min-h-[205px] flex-col justify-between overflow-hidden border-[var(--accent)]/20 bg-[var(--accent-soft)]/55 p-5 sm:p-6"><div className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full bg-[var(--accent)]/10" /><div className="relative"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--accent-strong)]"><LinkIcon size={20} /></span><p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Kartu aktif</p><p className="mt-1 text-4xl font-bold text-[var(--text)]">{activeItems}</p></div><p className="relative text-xs leading-relaxed text-[var(--muted)]">{page.status === 'published' ? 'Katalog publik siap menerima kunjungan dan klik.' : 'Publikasikan katalog di tab Editor agar pengunjung bisa membukanya.'}</p></Card>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-[var(--text)]">Performa katalog</h2><p className="mt-1 text-xs text-[var(--muted)]">Data nyata dari halaman publik; preview editor tidak dihitung.</p></div><div className="flex items-center gap-2"><label className="sr-only" htmlFor="catalog-date-range">Rentang waktu</label><select id="catalog-date-range" value={days} onChange={event => setDays(Number(event.target.value) as 7 | 30 | 90)} className="min-h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text)]"><option value={7}>7 hari terakhir</option><option value={30}>30 hari terakhir</option><option value={90}>90 hari terakhir</option></select><button type="button" onClick={() => setRefreshKey(value => value + 1)} aria-label="Refresh statistik" className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]"><RefreshCw size={17} /></button></div></div>

    {error ? <Card className="p-5 text-sm text-[var(--danger-text)]">{error}</Card> : <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(metric => <Card key={metric.label} className="p-4"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]"><metric.icon size={17} /></span><p className="mt-3 text-xs font-semibold text-[var(--muted)]">{metric.label}</p><p className="mt-1 text-2xl font-bold text-[var(--text)]">{isLoading ? '—' : metric.value}</p><p className="mt-1 text-[11px] text-[var(--muted)]">{metric.note}</p></Card>)}</div>
      <Card className="space-y-4 p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold text-[var(--text)]">Tren kunjungan & klik</h3><p className="mt-1 text-xs text-[var(--muted)]">Perubahan harian sepanjang periode yang dipilih</p></div><div className="flex flex-wrap items-center gap-4 text-xs font-semibold"><span className="flex items-center gap-1.5 text-[var(--muted)]"><i className="h-2.5 w-2.5 rounded-full bg-[#3d8bce]" />Kunjungan</span><span className="flex items-center gap-1.5 text-[var(--muted)]"><i className="h-2.5 w-2.5 rounded-full bg-[#23b39b]" />Klik</span></div></div>{isLoading ? <div className="flex h-[280px] items-center justify-center gap-2 text-sm text-[var(--muted)]"><Loader2 size={17} className="animate-spin" /> Memuat grafik...</div> : <CatalogTrendChart daily={data.daily} />}</Card>
      <Card className="space-y-4 p-5 sm:p-6"><div><h3 className="text-lg font-bold text-[var(--text)]">Kartu paling diminati</h3><p className="mt-1 text-xs text-[var(--muted)]">Urutan berdasarkan klik dalam {days} hari terakhir</p></div>{ranked.length ? <div className="space-y-4">{ranked.slice(0, 6).map((entry, index) => <div key={entry.itemId} className="grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1"><span className="text-xs font-bold text-[var(--muted)]">{index + 1}</span><span className="min-w-0 truncate text-sm font-semibold text-[var(--text)]">{entry.item?.title || (entry.item?.itemType === 'link' ? 'Link tanpa judul' : 'Produk tanpa judul')}</span><span className="text-sm font-bold text-[var(--accent-strong)]">{formatNumber(entry.clicks)} klik</span><span className="col-start-2 col-end-4 h-1.5 overflow-hidden rounded-full bg-[var(--surface-soft)]"><span className="block h-full rounded-full bg-[var(--accent)]" style={{ width: `${(entry.clicks / highestClicks) * 100}%` }} /></span></div>)}</div> : <p className="rounded-xl bg-[var(--surface-soft)] p-5 text-sm text-[var(--muted)]">Belum ada klik pada periode ini. Bagikan link katalog untuk mulai mengumpulkan data.</p>}</Card>
      <p className="text-xs leading-relaxed text-[var(--muted)]">Kunjungan dihitung satu kali per pengunjung dalam 30 menit. Rasio klik dapat melebihi 100% jika satu kunjungan membuka beberapa kartu. Statistik penjualan tidak ditampilkan karena pembayaran belum terhubung ke data katalog.</p>
    </>}
  </div>;
};
