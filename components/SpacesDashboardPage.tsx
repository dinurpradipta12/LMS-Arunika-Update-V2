import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  HelpCircle,
  Layout,
  LayoutGrid,
  MessageCircle,
  Scissors,
  Search,
  Users,
  X
} from 'lucide-react';
import { Course } from '../types';
import { CHAT_CENTER_SPACE_LABEL } from './ChatCenterPages';

type Space = {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  tag: string;
  count?: string;
};

type SpaceGroup = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  accent: string;
  soft: string;
  spaces: Space[];
};

type TimeOfDay = 'morning' | 'noon' | 'evening' | 'night';

const getTimeOfDay = (hour: number): TimeOfDay => {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 15) return 'noon';
  if (hour >= 15 && hour < 18) return 'evening';
  return 'night';
};

const greetingByTime: Record<TimeOfDay, { title: string; message: string }> = {
  morning: { title: 'Selamat pagi!', message: 'Awali hari dengan ide baru. Ruang mana yang ingin Anda kelola?' },
  noon: { title: 'Selamat siang!', message: 'Semoga harimu berjalan lancar. Lanjutkan pekerjaan dari ruang pilihanmu.' },
  evening: { title: 'Selamat sore!', message: 'Saatnya merapikan progres hari ini. Pilih ruang untuk melanjutkan.' },
  night: { title: 'Selamat malam!', message: 'Terima kasih untuk kerja keras hari ini. Semua ruang tetap siap saat Anda membutuhkannya.' }
};

const SpacesDashboardPage: React.FC<{ courses: Course[] }> = ({ courses }) => {
  const [query, setQuery] = useState('');
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  const timeOfDay = getTimeOfDay(now.getHours());
  const greeting = greetingByTime[timeOfDay];
  const today = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  const productCount = courses.filter(course => (course.spaceType || 'product_tutorial') === 'product_tutorial').length;
  const classCount = courses.filter(course => course.spaceType === 'recorded_class').length;

  const groups: SpaceGroup[] = [
    {
      id: 'learning',
      eyebrow: '01 / BELAJAR',
      title: 'Pembelajaran & mentoring',
      description: 'Kelola materi, kelas, dan perkembangan mentee dalam satu alur.',
      accent: '#35776a',
      soft: '#e6f2ec',
      spaces: [
        { title: 'Tutorial Produk Digital', description: 'Tutorial produk, video panduan, dan aset unduhan untuk pelanggan.', href: '/admin/products', icon: BookOpen, tag: 'Materi', count: `${productCount} kursus` },
        { title: 'Intensive & Mini Class Series', description: 'Recording, materi kelas, post-test, dan hasil peserta.', href: '/admin/classes', icon: GraduationCap, tag: 'Kelas', count: `${classCount} kelas` },
        { title: '1:1 Mentorship', description: 'Booking, ruang mentee, jadwal, task, dan raport perkembangan.', href: '/admin/one-to-one', icon: Users, tag: 'Privat' }
      ]
    },
    {
      id: 'growth',
      eyebrow: '02 / PROMOSI',
      title: 'Promosi & pendaftaran',
      description: 'Siapkan halaman penawaran, katalog, dan formulir untuk calon pelanggan.',
      accent: '#416d9a',
      soft: '#e8f0f8',
      spaces: [
        { title: 'Landing Page', description: 'Susun halaman promosi, CTA, paket, dan informasi pembayaran.', href: '/admin/landing-pages', icon: Layout, tag: 'Halaman' },
        { title: 'Katalog Produk', description: 'Satukan produk dan link dalam katalog yang mudah dibagikan.', href: '/admin/catalog-pages', icon: LayoutGrid, tag: 'Link-in-bio' },
        { title: 'Form Maker', description: 'Buat form pendaftaran dan kelola respons serta konfirmasi.', href: '/admin/forms', icon: ClipboardCheck, tag: 'Form' }
      ]
    },
    {
      id: 'connect',
      eyebrow: '03 / INTERAKSI',
      title: 'Interaksi & konten',
      description: 'Tangani percakapan audiens dan siapkan konten pendukung.',
      accent: '#9b695c',
      soft: '#f8eeea',
      spaces: [
        { title: 'Q&A Audience', description: 'Moderasi pertanyaan, voting, dan layar presenter saat webinar.', href: '/admin/qna', icon: HelpCircle, tag: 'Realtime' },
        { title: CHAT_CENTER_SPACE_LABEL, description: 'Kelola percakapan 1:1 melalui link publik dengan akses terukur.', href: '/admin/chat-center', icon: MessageCircle, tag: 'Percakapan' },
        { title: 'Video Clipper', description: 'Potong video menjadi preview singkat untuk materi promosi.', href: '/admin/video-clipper', icon: Scissors, tag: 'Tools' }
      ]
    }
  ];

  const normalizedQuery = query.trim().toLocaleLowerCase('id');
  const visibleGroups = groups.map(group => ({
    ...group,
    spaces: group.spaces.filter(space => `${space.title} ${space.description} ${space.tag}`.toLocaleLowerCase('id').includes(normalizedQuery))
  })).filter(group => group.spaces.length > 0);

  return (
    <main className="spaces-dashboard mx-auto w-full max-w-[1500px] p-4 md:p-6 xl:p-8">
      <div className={`spaces-dashboard-hero spaces-dashboard-hero--${timeOfDay}`}>
        <div className="spaces-dashboard-hero-copy">
          <span className="spaces-dashboard-eyebrow">{today}</span>
          <h1>{greeting.title}</h1>
          <p>{greeting.message}</p>
        </div>
        <div className="spaces-dashboard-sky" aria-hidden="true">
          <span className="spaces-dashboard-sky-glow" />
          {timeOfDay === 'night' ? <>
            <span className="spaces-dashboard-moon" />
            <span className="spaces-dashboard-stars spaces-dashboard-stars-a" />
            <span className="spaces-dashboard-stars spaces-dashboard-stars-b" />
          </> : <>
            <span className="spaces-dashboard-sun" />
            <span className="spaces-dashboard-cloud spaces-dashboard-cloud-a" />
            <span className="spaces-dashboard-cloud spaces-dashboard-cloud-b" />
            <span className="spaces-dashboard-cloud spaces-dashboard-cloud-c" />
          </>}
        </div>
      </div>

      <div className="spaces-dashboard-toolbar">
        <div>
          <span className="spaces-dashboard-eyebrow">LEARNING SPACES</span>
          <h2>Jelajahi ruang</h2>
        </div>
        <div className="spaces-dashboard-search" role="search">
          <Search size={18} aria-hidden="true" />
          <input aria-label="Cari ruang kerja" value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari ruang kerja..." />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Hapus pencarian"><X size={16} /></button>}
        </div>
      </div>

      {visibleGroups.length ? visibleGroups.map(group => (
        <section key={group.id} className="spaces-dashboard-group" aria-labelledby={`spaces-${group.id}`} style={{ '--space-accent': group.accent, '--space-soft': group.soft } as React.CSSProperties}>
          <div className="spaces-dashboard-group-heading">
            <div>
              <span className="spaces-dashboard-group-eyebrow">{group.eyebrow}</span>
              <h3 id={`spaces-${group.id}`}>{group.title}</h3>
              <p>{group.description}</p>
            </div>
            <span className="spaces-dashboard-group-count">{group.spaces.length} ruang</span>
          </div>
          <div className="spaces-dashboard-grid">
            {group.spaces.map(space => {
              const Icon = space.icon;
              return (
                <Link key={space.href} to={space.href} className="spaces-dashboard-card">
                  <div className="spaces-dashboard-card-top">
                    <span className="spaces-dashboard-card-icon"><Icon size={22} strokeWidth={1.9} /></span>
                    <span className="spaces-dashboard-card-arrow" aria-hidden="true"><ArrowUpRight size={19} /></span>
                  </div>
                  <div className="spaces-dashboard-card-copy">
                    <h4>{space.title}</h4>
                    <p>{space.description}</p>
                  </div>
                  <div className="spaces-dashboard-card-footer">
                    <span className="spaces-dashboard-card-tag">{space.tag}</span>
                    <span>{space.count || 'Buka ruang'}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )) : <div className="spaces-dashboard-empty"><Search size={24} /><h3>Ruang tidak ditemukan</h3><p>Coba kata kunci lain atau hapus pencarian.</p></div>}
    </main>
  );
};

export default SpacesDashboardPage;
