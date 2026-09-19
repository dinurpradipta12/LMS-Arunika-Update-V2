import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, Download, FileVideo, Loader2, Play, RotateCcw, Scissors, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge, Button, Card, Input } from './UI';

const MAX_SOURCE_BYTES = 200 * 1024 * 1024;

type ClipStatus = 'idle' | 'exporting' | 'ready';

const formatDuration = (value: number) => {
  const seconds = Math.max(0, Math.floor(value || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}` : `${minutes}:${String(remainder).padStart(2, '0')}`;
};

const sanitizeFileName = (value: string) => value
  .replace(/\.[^/.]+$/, '')
  .replace(/[^a-z0-9_-]+/gi, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 70) || 'video-preview';

const isYouTubePageUrl = (value: string) => {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    return hostname === 'youtu.be' || hostname.endsWith('youtube.com');
  } catch {
    return false;
  }
};

const seekVideo = (video: HTMLVideoElement, time: number) => new Promise<void>(resolve => {
  if (Math.abs(video.currentTime - time) < 0.05) {
    resolve();
    return;
  }
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    video.removeEventListener('seeked', finish);
    resolve();
  };
  video.addEventListener('seeked', finish, { once: true });
  video.currentTime = time;
  window.setTimeout(finish, 1000);
});

export const VideoClipperPage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sourceObjectUrlRef = useRef('');
  const outputObjectUrlRef = useRef('');
  const isExportingRef = useRef(false);
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [directUrl, setDirectUrl] = useState('');
  const [duration, setDuration] = useState(0);
  const [startSeconds, setStartSeconds] = useState(0);
  const [endSeconds, setEndSeconds] = useState(0);
  const [clipStatus, setClipStatus] = useState<ClipStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [outputUrl, setOutputUrl] = useState('');
  const [outputName, setOutputName] = useState('video-preview.webm');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => () => {
    if (sourceObjectUrlRef.current) URL.revokeObjectURL(sourceObjectUrlRef.current);
    if (outputObjectUrlRef.current) URL.revokeObjectURL(outputObjectUrlRef.current);
  }, []);

  const clearOutput = () => {
    if (outputObjectUrlRef.current) URL.revokeObjectURL(outputObjectUrlRef.current);
    outputObjectUrlRef.current = '';
    setOutputUrl('');
    setClipStatus('idle');
    setProgress(0);
  };

  const setSource = (url: string, name: string, objectUrl = '') => {
    if (sourceObjectUrlRef.current && sourceObjectUrlRef.current !== objectUrl) URL.revokeObjectURL(sourceObjectUrlRef.current);
    sourceObjectUrlRef.current = objectUrl;
    clearOutput();
    setSourceUrl(url);
    setSourceName(name);
    setDuration(0);
    setStartSeconds(0);
    setEndSeconds(0);
    setError('');
    setNotice('');
  };

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setError('Pilih file video yang valid.');
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setError('Ukuran sumber maksimal 200 MB agar proses tetap berjalan di browser.');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setSource(objectUrl, file.name, objectUrl);
  };

  const handleDirectUrl = () => {
    const value = directUrl.trim();
    if (!value || !/^https?:\/\//i.test(value)) {
      setError('Masukkan URL file video langsung, misalnya https://domain.com/video.mp4.');
      return;
    }
    if (isYouTubePageUrl(value)) {
      setError('URL halaman YouTube tidak bisa diekspor langsung. Gunakan file video yang Anda miliki atau URL MP4/WebM yang mengizinkan akses CORS.');
      return;
    }
    const fileName = decodeURIComponent(value.split('/').pop()?.split('?')[0] || 'video-online');
    setSource(value, fileName);
  };

  const handleMetadata = () => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    setDuration(video.duration);
    setEndSeconds(current => current > 0 && current <= video.duration ? current : video.duration);
  };

  const validRange = Boolean(sourceUrl) && duration > 0 && startSeconds >= 0 && endSeconds > startSeconds && endSeconds <= duration + 0.25;

  const updateStart = (value: number) => {
    const next = Math.max(0, Math.min(Number.isFinite(value) ? value : 0, Math.max(0, endSeconds - 0.1)));
    setStartSeconds(next);
    setError('');
  };

  const updateEnd = (value: number) => {
    const next = Math.max(Math.min(Number.isFinite(value) ? value : duration, duration), startSeconds + 0.1);
    setEndSeconds(next);
    setError('');
  };

  const previewClip = async () => {
    const video = videoRef.current;
    if (!video || !validRange) {
      setError('Atur rentang waktu yang valid terlebih dahulu.');
      return;
    }
    setError('');
    await seekVideo(video, startSeconds);
    try {
      await video.play();
    } catch {
      setNotice('Tekan tombol play pada pemutar untuk memulai preview.');
    }
  };

  const exportClip = async () => {
    const video = videoRef.current;
    if (!video || !validRange) {
      setError('Atur rentang waktu yang valid terlebih dahulu.');
      return;
    }
    const capture = (video as HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream }).captureStream
      || (video as HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream }).mozCaptureStream;
    if (!capture || typeof MediaRecorder === 'undefined') {
      setError('Browser ini belum mendukung export video langsung. Gunakan Chrome atau Edge versi terbaru.');
      return;
    }

    let stream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    try {
      await seekVideo(video, startSeconds);
      stream = capture.call(video);
      if (!stream.getTracks().length) throw new Error('Stream video tidak tersedia.');
      const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type)) || '';
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks: Blob[] = [];
      setError('');
      setNotice('Export berjalan di browser. Jangan tutup halaman sampai selesai.');
      setClipStatus('exporting');
      isExportingRef.current = true;
      setProgress(0);

      await new Promise<void>((resolve, reject) => {
        let intervalId = 0;
        let timeoutId = 0;
        const stopRecording = () => {
          if (!recorder || recorder.state === 'inactive') return;
          video.pause();
          recorder.stop();
        };
        recorder!.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
        recorder!.onerror = () => { window.clearInterval(intervalId); window.clearTimeout(timeoutId); reject(new Error('Export video gagal diproses.')); };
        recorder!.onstop = () => {
          window.clearInterval(intervalId);
          window.clearTimeout(timeoutId);
          resolve();
        };
        recorder!.start(200);
        intervalId = window.setInterval(() => {
          const elapsed = Math.max(0, video.currentTime - startSeconds);
          setProgress(Math.min(100, (elapsed / (endSeconds - startSeconds)) * 100));
          if (video.currentTime >= endSeconds || video.ended) stopRecording();
        }, 100);
        timeoutId = window.setTimeout(stopRecording, Math.ceil((endSeconds - startSeconds + 2) * 1000));
        video.play().catch(() => {
          stopRecording();
          reject(new Error('Video tidak dapat diputar untuk proses export.'));
        });
      });

      const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
      const url = URL.createObjectURL(blob);
      if (outputObjectUrlRef.current) URL.revokeObjectURL(outputObjectUrlRef.current);
      outputObjectUrlRef.current = url;
      const name = `preview-${sanitizeFileName(sourceName)}.webm`;
      setOutputName(name);
      setOutputUrl(url);
      setClipStatus('ready');
      setProgress(100);
      setNotice('Clip berhasil dibuat dan siap diunduh.');
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = name;
      anchor.click();
    } catch (exportError: any) {
      setClipStatus('idle');
      setError(exportError?.message || 'Clip gagal dibuat.');
    } finally {
      isExportingRef.current = false;
      stream?.getTracks().forEach(track => track.stop());
      video.pause();
      try { video.currentTime = startSeconds; } catch { /* ignore seek reset */ }
    }
  };

  const reset = () => {
    setSource('', '');
    setDirectUrl('');
    setError('');
    setNotice('');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-28 md:p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Link to="/admin" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent-strong)]"><ArrowLeft size={14} /> Semua Space</Link>
          <div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold">Video Clipper</h1><Badge color="var(--accent-soft)">Browser tool</Badge></div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">Potong file video yang Anda miliki menjadi preview pendek, lalu simpan hasilnya ke komputer untuk dipakai di Landing Page.</p>
        </div>
        <Button type="button" variant="secondary" icon={RotateCcw} onClick={reset} disabled={!sourceUrl && !outputUrl}>Reset</Button>
      </div>

      {(error || notice) && <div className={`rounded-xl border p-4 text-sm ${error ? 'border-[var(--border)] bg-[var(--danger-soft)] text-[var(--danger-text)]' : 'border-[var(--border)] bg-[var(--success-soft)] text-[var(--success-text)]'}`}>{error || notice}</div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="space-y-5">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Sumber video</p><h2 className="mt-2 text-xl font-bold">Upload atau masukkan URL file</h2><p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">Gunakan MP4/WebM lokal atau URL file video langsung yang mengizinkan pemutaran lintas domain.</p></div>
          <input id="video-clipper-file" type="file" accept="video/*" className="hidden" onChange={handleFile} />
          <label htmlFor="video-clipper-file" className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] px-5 py-8 text-center transition-colors hover:border-[var(--accent)]"><FileVideo size={30} className="text-[var(--accent-strong)]" /><span className="text-sm font-semibold">Pilih file video dari komputer</span><span className="text-xs text-[var(--muted)]">Maksimal 200 MB · export dilakukan di browser</span></label>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"><Input label="URL file video langsung" value={directUrl} onChange={event => setDirectUrl(event.target.value)} placeholder="https://domain.com/video.mp4" /><Button type="button" variant="secondary" icon={Upload} onClick={handleDirectUrl}>Muat URL</Button></div>
          <p className="flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 text-[11px] leading-relaxed text-[var(--muted)]"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--accent-strong)]" />URL halaman YouTube tidak dapat dipotong atau diunduh langsung dari browser. Gunakan file yang Anda miliki atau hasil export resmi dari sumber video.</p>
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-black">
            {sourceUrl ? <video ref={videoRef} src={sourceUrl} crossOrigin="anonymous" className="aspect-video w-full object-contain" controls preload="metadata" onLoadedMetadata={handleMetadata} onTimeUpdate={event => { if (!isExportingRef.current && endSeconds > 0 && event.currentTarget.currentTime >= endSeconds) { event.currentTarget.pause(); event.currentTarget.currentTime = startSeconds; } }} /> : <div className="flex aspect-video items-center justify-center px-5 text-center text-sm text-white/70">Preview video akan tampil di sini.</div>}
          </div>
          {sourceName && <p className="truncate text-xs text-[var(--muted)]">File: {sourceName}{duration > 0 ? ` · Durasi ${formatDuration(duration)}` : ''}</p>}
        </Card>

        <Card className="space-y-5">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Atur potongan</p><h2 className="mt-2 text-xl font-bold">Tentukan bagian preview</h2><p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">Masukkan waktu mulai dan selesai. Hasil export berupa file WebM yang bisa langsung diunduh.</p></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><Input label="Mulai (detik)" type="number" min="0" max={Math.max(0, endSeconds - 0.1)} step="0.1" value={startSeconds} onChange={event => updateStart(Number(event.target.value))} disabled={!sourceUrl} /><Input label="Selesai (detik)" type="number" min={Math.min(duration, startSeconds + 0.1)} max={duration || undefined} step="0.1" value={endSeconds} onChange={event => updateEnd(Number(event.target.value))} disabled={!sourceUrl || !duration} /></div>
          <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
            <label className="flex flex-col gap-2"><span className="flex items-center justify-between gap-3 text-xs font-semibold text-[var(--muted)]"><span>Mulai</span><span className="text-[var(--text)]">{formatDuration(startSeconds)}</span></span><input type="range" min="0" max={duration || 1} step="0.1" value={Math.min(startSeconds, duration || 1)} onChange={event => updateStart(Number(event.target.value))} disabled={!sourceUrl || !duration} className="h-2 w-full cursor-pointer accent-[var(--accent)]" /></label>
            <label className="flex flex-col gap-2"><span className="flex items-center justify-between gap-3 text-xs font-semibold text-[var(--muted)]"><span>Selesai</span><span className="text-[var(--text)]">{formatDuration(endSeconds)}</span></span><input type="range" min="0.1" max={duration || 1} step="0.1" value={Math.min(endSeconds || 0.1, duration || 0.1)} onChange={event => updateEnd(Number(event.target.value))} disabled={!sourceUrl || !duration} className="h-2 w-full cursor-pointer accent-[var(--accent)]" /></label>
          </div>
          <p className="text-xs text-[var(--muted)]">Durasi clip: <strong className="text-[var(--text)]">{validRange ? formatDuration(endSeconds - startSeconds) : '-'}</strong></p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1"><Button type="button" variant="secondary" icon={Play} onClick={() => void previewClip()} disabled={!validRange}>Preview potongan</Button><Button type="button" icon={Scissors} onClick={() => void exportClip()} disabled={!validRange || clipStatus === 'exporting'} isLoading={clipStatus === 'exporting'}>Buat & download clip</Button></div>
          {clipStatus === 'exporting' && <div className="space-y-2"><div className="h-2 overflow-hidden rounded-full bg-[var(--surface-soft)]"><div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${progress}%` }} /></div><p className="flex items-center gap-2 text-xs text-[var(--muted)]"><Loader2 size={14} className="animate-spin" /> Memproses {Math.round(progress)}%</p></div>}
          {clipStatus === 'ready' && outputUrl && <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--success-soft)] p-3"><p className="flex items-center gap-2 text-sm font-semibold text-[var(--success-text)]"><Check size={16} /> Clip siap digunakan</p><a href={outputUrl} download={outputName} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)] hover:underline"><Download size={15} /> Download ulang {outputName}</a></div>}
        </Card>
      </div>

      <Card className="flex items-start gap-3"><Scissors size={18} className="mt-0.5 shrink-0 text-[var(--accent-strong)]" /><div><p className="text-sm font-semibold">Alur untuk Landing Page</p><p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">Upload video Anda di sini, atur potongan, download hasilnya, lalu buka blok Video di Landing Page dan pilih mode <strong className="text-[var(--text)]">Upload video preview</strong>. File hasil clip tidak lagi bergantung pada link YouTube full.</p></div></Card>
    </div>
  );
};
