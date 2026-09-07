import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart2,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Download,
  ExternalLink,
  FileDown,
  FileText,
  GraduationCap,
  HelpCircle,
  Link as LinkIcon,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Save,
  Share2,
  Trash2,
  UserRound,
  Video,
  X,
  XCircle
} from 'lucide-react';

import {
  Course,
  CourseQuiz,
  Mentor,
  Module,
  PublicCourseQuiz,
  QuizAttempt,
  QuizQuestion,
  QuizQuestionType,
  QuizSubmissionResult
} from '../types';
import { Badge, Button, Card, Input, Textarea } from './UI';

const DEFAULT_QUIZ_TITLE = 'Post-Test Kelas';

const createDefaultQuiz = (courseId: string): CourseQuiz => ({
  courseId,
  title: DEFAULT_QUIZ_TITLE,
  description: 'Kerjakan post-test setelah menyelesaikan seluruh materi recording.',
  enabled: false,
  passingScore: 70,
  maxAttempts: 3,
  showAnswers: false,
  feedbackEnabled: false,
  feedbackRequired: false,
  feedbackPrompt: 'Bagaimana pengalaman Anda mengikuti kelas ini?',
  questions: []
});

const createQuestion = (type: QuizQuestionType = 'multiple_choice'): QuizQuestion => ({
  id: `question-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  type,
  prompt: '',
  options: type === 'true_false' ? ['Benar', 'Salah'] : type === 'long_answer' ? [] : ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'],
  correctAnswer: type === 'true_false' ? 'Benar' : type === 'long_answer' ? '' : 'Pilihan A',
  points: 1
});

const mapCourseRow = (row: any): Course => ({
  ...row,
  coverImage: row.cover_image || '',
  mentorId: row.mentor_id || 'profile',
  modules: row.modules || [],
  assets: row.assets || [],
  categories: row.categories || [],
  spaceType: row.space_type || 'product_tutorial',
  published: row.published !== false
});

const mapQuizRow = (row: any): CourseQuiz => ({
  id: row.id,
  courseId: row.course_id,
  title: row.title || DEFAULT_QUIZ_TITLE,
  description: row.description || '',
  enabled: row.is_enabled === true,
  passingScore: Number(row.passing_score ?? 70),
  maxAttempts: Number(row.max_attempts ?? 3),
  showAnswers: row.show_answers === true,
  feedbackEnabled: row.feedback_enabled === true,
  feedbackRequired: row.feedback_required === true,
  feedbackPrompt: row.feedback_prompt || 'Bagaimana pengalaman Anda mengikuti kelas ini?',
  questions: Array.isArray(row.questions) ? row.questions : []
});

const mapAttemptRow = (row: any): QuizAttempt => ({
  id: row.id,
  courseId: row.course_id,
  quizId: row.quiz_id,
  participantName: row.participant_name,
  participantEmail: row.participant_email,
  answers: row.answers || {},
  score: Number(row.score || 0),
  passed: row.passed === true,
  needsReview: row.needs_review === true,
  classFeedback: row.class_feedback || null,
  attemptNumber: Number(row.attempt_number || 1),
  submittedAt: row.submitted_at
});

const databaseErrorMessage = (error: any) => {
  const message = String(error?.message || error || 'Terjadi kesalahan yang tidak diketahui.');
  if (
    message.includes('course_quizzes')
    || message.includes('quiz_attempts')
    || message.includes('space_type')
    || message.includes('published')
    || message.includes('get_public_class_quiz')
    || message.includes('submit_class_post_test')
    || message.includes('feedback_enabled')
    || message.includes('class_feedback')
  ) {
    return 'Database kelas recording belum siap. Jalankan migration terbaru untuk fitur post-test dan feedback.';
  }
  if (message.includes('FEEDBACK_REQUIRED')) return 'Feedback kelas wajib diisi sebelum jawaban dikirim.';
  if (message.includes('FEEDBACK_TOO_LONG')) return 'Feedback kelas terlalu panjang. Maksimal 5.000 karakter.';
  if (message.includes('INCOMPLETE_ANSWERS')) return 'Jawab seluruh pertanyaan sebelum mengirim post-test.';
  return message;
};

const getVideoEmbedUrl = (value: string) => {
  if (!value) return '';
  try {
    const url = new URL(value);
    if (url.hostname.includes('youtu.be')) {
      return `https://www.youtube.com/embed/${url.pathname.split('/').filter(Boolean)[0] || ''}`;
    }
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname.startsWith('/embed/')) return value;
      const videoId = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop();
      return videoId ? `https://www.youtube.com/embed/${videoId}` : value;
    }
    return value;
  } catch {
    return value;
  }
};

const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const withRequestTimeout = <T,>(request: PromiseLike<T>, timeoutMs = 15000): Promise<T> => new Promise((resolve, reject) => {
  const timeoutId = window.setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), timeoutMs);
  Promise.resolve(request).then(
    value => { window.clearTimeout(timeoutId); resolve(value); },
    error => { window.clearTimeout(timeoutId); reject(error); }
  );
});

const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, className = '', children, ...props }) => (
  <label className="flex flex-col gap-2">
    <span className="text-xs font-semibold text-[var(--muted)]">{label}</span>
    <select
      className={`w-full min-h-[46px] bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--accent)_12%,transparent)] ${className}`}
      {...props}
    >
      {children}
    </select>
  </label>
);

const ToggleField: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}> = ({ checked, onChange, label, description }) => (
  <label className="flex items-start gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={event => onChange(event.target.checked)}
      className="mt-1 h-4 w-4 accent-[var(--accent)]"
    />
    <span>
      <span className="block text-sm font-semibold text-[var(--text)]">{label}</span>
      <span className="block text-xs text-[var(--muted)] mt-1 leading-relaxed">{description}</span>
    </span>
  </label>
);

const CoverUploader: React.FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIsProcessing(true);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Gambar gagal dibaca.'));
        reader.onload = () => {
          const image = new Image();
          image.onerror = () => reject(new Error('Format gambar tidak didukung.'));
          image.onload = () => {
            const maxWidth = 1200;
            const scale = Math.min(1, maxWidth / image.width);
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            const context = canvas.getContext('2d');
            if (!context) return reject(new Error('Gambar gagal diproses.'));
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.82));
          };
          image.src = String(reader.result);
        };
        reader.readAsDataURL(file);
      });
      onChange(dataUrl);
    } catch (error: any) {
      alert(error?.message || 'Gambar gagal diproses.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      <Input label="URL Cover atau gambar tersimpan" value={value} onChange={event => onChange(event.target.value)} placeholder="https://..." />
      <div className="aspect-video rounded-2xl border border-dashed border-[var(--border-strong)] overflow-hidden bg-[var(--surface-soft)] flex items-center justify-center">
        {value ? (
          <img src={value} alt="Preview cover kelas" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center text-[var(--muted)] px-4">
            <Video size={28} className="mx-auto mb-2" />
            <p className="text-xs">Cover kelas recording 16:9</p>
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()} isLoading={isProcessing} className="w-full">
        Upload Cover
      </Button>
    </div>
  );
};

export const SpacesDashboard: React.FC<{ courses: Course[] }> = ({ courses }) => {
  const productCount = courses.filter(course => (course.spaceType || 'product_tutorial') === 'product_tutorial').length;
  const classCount = courses.filter(course => course.spaceType === 'recorded_class').length;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <Badge>Learning Spaces</Badge>
        <h1 className="text-3xl font-bold mt-4">Pilih ruang yang ingin dikelola</h1>
        <p className="text-sm text-[var(--muted)] mt-2 max-w-2xl leading-relaxed">
          Tutorial produk dan kelas recording memakai alur publik yang berbeda, sehingga materi produk tetap rapi sementara webinar dapat memiliki post-test dan hasil peserta.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Link to="/admin/products" className="group block">
          <Card className="h-full p-7 md:p-8 group-hover:border-[var(--border-strong)]">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)] flex items-center justify-center mb-6">
              <BookOpen size={23} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Space 01</p>
                <h2 className="text-xl font-bold mt-2">Tutorial Produk Digital</h2>
              </div>
              <Badge>{productCount} Kursus</Badge>
            </div>
            <p className="text-sm text-[var(--muted)] mt-4 leading-relaxed">Materi tutorial produk, video panduan, teks, dan asset unduhan seperti yang sudah digunakan saat ini.</p>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)] mt-7">Buka ruang <ChevronRight size={16} /></span>
          </Card>
        </Link>

        <Link to="/admin/classes" className="group block">
          <Card className="h-full p-7 md:p-8 group-hover:border-[var(--border-strong)]">
            <div className="w-12 h-12 rounded-2xl bg-[var(--success-soft)] text-[var(--success-text)] flex items-center justify-center mb-6">
              <GraduationCap size={24} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Space 02</p>
                <h2 className="text-xl font-bold mt-2">Kelas Recording</h2>
              </div>
              <Badge color="var(--success-soft)">{classCount} Kelas</Badge>
            </div>
            <p className="text-sm text-[var(--muted)] mt-4 leading-relaxed">Recording webinar, materi pendukung, asset kelas, post-test otomatis, dan rekap hasil peserta.</p>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--success-text)] mt-7">Buka ruang <ChevronRight size={16} /></span>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export const RecordedClassesPage: React.FC<{
  courses: Course[];
  onCreateCourse: (course: Course) => Promise<void>;
  onDeleteCourse: (id: string) => Promise<void>;
  generateShareLink: (courseId: string) => string;
  copyText: (text: string) => Promise<void>;
}> = ({ courses, onCreateCourse, onDeleteCourse, generateShareLink, copyText }) => {
  const navigate = useNavigate();
  const recordedClasses = courses.filter(course => course.spaceType === 'recorded_class');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleAdd = async () => {
    const newClass: Course = {
      id: `course-${Date.now()}`,
      title: 'Kelas Recording Baru',
      description: 'Tuliskan ringkasan kelas atau webinar di sini.',
      coverImage: '',
      mentorId: 'profile',
      modules: [],
      assets: [],
      categories: [],
      spaceType: 'recorded_class',
      published: false
    };
    setIsCreating(true);
    try {
      await onCreateCourse(newClass);
      navigate(`/admin/classes/${newClass.id}`);
    } catch (error) {
      console.error('Recorded class creation failed', error);
      alert(`Kelas belum dapat dibuat: ${databaseErrorMessage(error)}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async (courseId: string) => {
    const url = generateShareLink(courseId);
    try {
      await copyText(url);
      setCopiedId(courseId);
      window.setTimeout(() => setCopiedId(current => current === courseId ? null : current), 2000);
    } catch (error) {
      console.error('Class link copy failed', error);
      window.prompt('Salin link kelas publik berikut:', url);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <Link to="/admin" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent-strong)] mb-3">
            <ArrowLeft size={14} /> Semua Space
          </Link>
          <h1 className="text-3xl font-bold">Kelas Recording</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Kelola recording, asset, post-test, dan hasil peserta.</p>
        </div>
        <Button icon={Plus} onClick={handleAdd} isLoading={isCreating} disabled={isCreating}>Tambah Kelas</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {recordedClasses.map(course => (
          <Card key={course.id} className="group relative overflow-hidden !p-0">
            <button
              type="button"
              onClick={() => onDeleteCourse(course.id)}
              aria-label={`Hapus ${course.title}`}
              className="absolute top-3 right-3 z-10 p-2 bg-[var(--surface)] text-[var(--danger-text)] border border-[var(--border)] rounded-lg shadow-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all"
            >
              <Trash2 size={16} />
            </button>
            <div className="aspect-video overflow-hidden border-b border-[var(--border)] bg-[var(--surface-soft)]">
              {course.coverImage ? (
                <img src={course.coverImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--muted)]"><GraduationCap size={34} /></div>
              )}
            </div>
            <div className="p-5 min-h-[310px] flex flex-col">
              <div className="flex items-center justify-between gap-3 mb-3">
                <Badge color="var(--success-soft)">Kelas Recording</Badge>
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg border ${course.published ? 'bg-[var(--success-soft)] text-[var(--success-text)] border-[var(--border)]' : 'bg-[var(--surface-soft)] text-[var(--muted)] border-[var(--border)]'}`}>
                  {course.published ? 'Publik' : 'Draft'}
                </span>
              </div>
              <h2 className="text-lg font-semibold leading-snug">{course.title}</h2>
              <p className="text-sm text-[var(--muted)] line-clamp-2 mt-2 leading-relaxed">{course.description}</p>
              <div className="grid grid-cols-2 gap-2 mt-5 text-xs text-[var(--muted)]">
                <span className="flex items-center gap-2"><Video size={14} /> {course.modules.length} materi</span>
                <span className="flex items-center gap-2"><Download size={14} /> {course.assets.length} asset</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-auto pt-6">
                <Button variant="secondary" className="text-xs px-2" onClick={() => navigate(`/admin/classes/${course.id}`)}>Edit Kelas</Button>
                <Button variant="secondary" className="text-xs px-2" icon={BarChart2} onClick={() => navigate(`/admin/classes/${course.id}/results`)}>Hasil</Button>
                <Button variant={copiedId === course.id ? 'green' : 'secondary'} className="text-xs px-2" icon={copiedId === course.id ? Check : Copy} onClick={() => handleCopy(course.id)}>
                  {copiedId === course.id ? 'Tersalin' : 'Copy Link'}
                </Button>
                <Button className="text-xs px-2" icon={Share2} disabled={!course.published} title={!course.published ? 'Publikasikan kelas terlebih dahulu' : undefined} onClick={() => window.open(generateShareLink(course.id), '_blank', 'noopener,noreferrer')}>
                  Buka Publik
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {recordedClasses.length === 0 && (
        <div className="py-20 text-center space-y-4">
          <div className="bg-[var(--surface-soft)] w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border border-[var(--border)]">
            <GraduationCap size={29} className="text-[var(--muted)]" />
          </div>
          <div>
            <p className="font-semibold">Belum ada kelas recording</p>
            <p className="text-[var(--muted)] text-sm mt-1">Buat kelas pertama untuk webinar atau kelas rekaman Anda.</p>
          </div>
          <Button icon={Plus} onClick={handleAdd} isLoading={isCreating} disabled={isCreating} className="mx-auto">Buat Kelas Pertama</Button>
        </div>
      )}
    </div>
  );
};

export const RecordedClassEditor: React.FC<{
  courses: Course[];
  client: any;
  onSaveCourse: (course: Course) => Promise<void>;
  onLocalEdit: () => void;
}> = ({ courses, client, onSaveCourse, onLocalEdit }) => {
  const { id } = useParams<{ id: string }>();
  const sourceCourse = courses.find(course => course.id === id);
  const [course, setCourse] = useState<Course | null>(null);
  const [quiz, setQuiz] = useState<CourseQuiz | null>(null);
  const [isQuizLoading, setIsQuizLoading] = useState(true);
  const [quizLoadError, setQuizLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (sourceCourse) {
      setCourse({
        ...sourceCourse,
        spaceType: 'recorded_class',
        published: sourceCourse.published === true,
        modules: sourceCourse.modules || [],
        assets: sourceCourse.assets || []
      });
    }
  }, [sourceCourse]);

  const fetchQuiz = useCallback(async () => {
    if (!id) return;
    setIsQuizLoading(true);
    setQuizLoadError(null);
    if (!client) {
      setQuiz(createDefaultQuiz(id));
      setQuizLoadError('Koneksi Supabase belum tersedia.');
      setIsQuizLoading(false);
      return;
    }

    const { data, error } = await client.from('course_quizzes').select('*').eq('course_id', id).maybeSingle();
    if (error) {
      console.warn('Quiz editor fetch failed', error);
      setQuiz(createDefaultQuiz(id));
      setQuizLoadError(databaseErrorMessage(error));
    } else {
      setQuiz(data ? mapQuizRow(data) : createDefaultQuiz(id));
    }
    setIsQuizLoading(false);
  }, [client, id]);

  useEffect(() => { void fetchQuiz(); }, [fetchQuiz]);

  const updateCourse = (next: Course) => {
    onLocalEdit();
    setCourse(next);
  };

  const updateQuiz = (next: CourseQuiz) => {
    onLocalEdit();
    setQuiz(next);
  };

  if (!id) return null;
  if (!course) {
    return (
      <div className="p-6 min-h-[60vh] flex items-center justify-center">
        <Card className="max-w-md text-center space-y-4">
          <GraduationCap size={30} className="mx-auto text-[var(--muted)]" />
          <h1 className="text-lg font-semibold">Kelas tidak ditemukan</h1>
          <p className="text-sm text-[var(--muted)]">Kembali ke daftar kelas dan pilih kelas yang masih tersedia.</p>
          <Link to="/admin/classes"><Button variant="secondary" className="w-full">Kembali</Button></Link>
        </Card>
      </div>
    );
  }

  const addModule = (type: 'video' | 'text') => {
    const nextModule: Module = {
      id: `module-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: type === 'video' ? 'Recording Baru' : 'Materi Teks Baru',
      type,
      content: '',
      description: '',
      duration: type === 'video' ? '00:00' : '5 menit'
    };
    updateCourse({ ...course, modules: [...course.modules, nextModule] });
  };

  const updateModule = (index: number, patch: Partial<Module>) => {
    const modules = course.modules.map((module, moduleIndex) => moduleIndex === index ? { ...module, ...patch } : module);
    updateCourse({ ...course, modules });
  };

  const addAsset = () => updateCourse({
    ...course,
    assets: [...course.assets, { id: `asset-${Date.now()}`, name: 'Asset Baru', type: 'link', url: '' }]
  });

  const updateQuestion = (index: number, patch: Partial<QuizQuestion>) => {
    if (!quiz) return;
    const questions = quiz.questions.map((question, questionIndex) => questionIndex === index ? { ...question, ...patch } : question);
    updateQuiz({ ...quiz, questions });
  };

  const changeQuestionType = (index: number, type: QuizQuestionType) => {
    const options = type === 'true_false' ? ['Benar', 'Salah'] : type === 'long_answer' ? [] : ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'];
    updateQuestion(index, { type, options, correctAnswer: options[0] || '' });
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    if (!quiz) return;
    const question = quiz.questions[questionIndex];
    const previousValue = question.options[optionIndex];
    const options = question.options.map((option, index) => index === optionIndex ? value : option);
    updateQuestion(questionIndex, {
      options,
      correctAnswer: question.correctAnswer === previousValue ? value : question.correctAnswer
    });
  };

  const validateQuiz = () => {
    if (!quiz?.enabled) return null;
    if (quiz.questions.length === 0) return 'Tambahkan minimal satu pertanyaan sebelum post-test diaktifkan.';
    for (let index = 0; index < quiz.questions.length; index += 1) {
      const question = quiz.questions[index];
      if (!question.prompt.trim()) return `Pertanyaan #${index + 1} belum diisi.`;
      if (question.type === 'long_answer') continue;
      if (question.options.length < 2 || question.options.some(option => !option.trim())) return `Pilihan jawaban pertanyaan #${index + 1} belum lengkap.`;
      if (new Set(question.options.map(option => option.trim().toLowerCase())).size !== question.options.length) return `Pilihan jawaban pertanyaan #${index + 1} tidak boleh sama.`;
      if (!question.options.includes(question.correctAnswer)) return `Jawaban benar pertanyaan #${index + 1} belum dipilih.`;
    }
    return null;
  };

  const handleSave = async () => {
    if (!quiz) return;
    if (!course.title.trim()) return alert('Judul kelas wajib diisi.');
    const quizValidation = validateQuiz();
    if (quizValidation) return alert(quizValidation);
    if (!client) return alert('Koneksi Supabase belum tersedia.');

    setIsSaving(true);
    try {
      await onSaveCourse({ ...course, spaceType: 'recorded_class' });
      const quizRow: Record<string, unknown> = {
        course_id: course.id,
        title: quiz.title,
        description: quiz.description,
        is_enabled: quiz.enabled,
        passing_score: Math.max(0, Math.min(100, Number(quiz.passingScore) || 0)),
        max_attempts: Math.max(1, Number(quiz.maxAttempts) || 1),
        show_answers: quiz.showAnswers,
        feedback_enabled: quiz.feedbackEnabled,
        feedback_required: quiz.feedbackEnabled && quiz.feedbackRequired,
        feedback_prompt: quiz.feedbackPrompt.trim() || 'Bagaimana pengalaman Anda mengikuti kelas ini?',
        questions: quiz.questions,
        updated_at: new Date().toISOString()
      };
      if (quiz.id) quizRow.id = quiz.id;

      const { data, error } = await client.from('course_quizzes').upsert(quizRow, { onConflict: 'course_id' }).select('*').single();
      if (error) throw error;
      setQuiz(mapQuizRow(data));
      setQuizLoadError(null);
      alert(course.published ? 'Kelas dan post-test berhasil disimpan serta dipublikasikan.' : 'Draft kelas dan post-test berhasil disimpan.');
    } catch (error: any) {
      console.error('Recorded class save failed', error);
      alert(`Gagal menyimpan: ${databaseErrorMessage(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 pb-28">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link to="/admin/classes" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent-strong)] mb-3">
            <ArrowLeft size={14} /> Daftar Kelas Recording
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">Editor Kelas Recording</h1>
            <Badge color="var(--success-soft)">Space Terpisah</Badge>
          </div>
          <p className="text-sm text-[var(--muted)] mt-2">Atur recording, asset peserta, dan post-test dalam satu halaman.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Link to={`/admin/classes/${course.id}/results`} className="w-full sm:w-auto"><Button variant="secondary" icon={BarChart2} className="w-full">Lihat Hasil</Button></Link>
          <Button onClick={handleSave} icon={Save} isLoading={isSaving} className="w-full sm:w-auto">Simpan Kelas</Button>
        </div>
      </div>

      <Card className="grid md:grid-cols-[1fr_auto] gap-5 items-center">
        <div>
          <h2 className="font-semibold">Status publik kelas</h2>
          <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">Draft tidak dapat dibuka dari link publik. Aktifkan setelah isi kelas siap dibagikan.</p>
        </div>
        <label className="inline-flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={course.published === true} onChange={event => updateCourse({ ...course, published: event.target.checked })} className="h-5 w-5 accent-[var(--accent)]" />
          <span className="font-semibold text-sm">{course.published ? 'Dipublikasikan' : 'Masih Draft'}</span>
        </label>
      </Card>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8 min-w-0">
          <Card className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--success-soft)] text-[var(--success-text)] flex items-center justify-center"><GraduationCap size={20} /></div>
              <div><h2 className="font-semibold text-lg">Informasi Kelas</h2><p className="text-xs text-[var(--muted)]">Tampil di bagian atas halaman publik.</p></div>
            </div>
            <Input label="Judul Kelas / Webinar" value={course.title} onChange={event => updateCourse({ ...course, title: event.target.value })} />
            <Textarea label="Deskripsi Kelas" value={course.description} onChange={event => updateCourse({ ...course, description: event.target.value })} />
            <CoverUploader value={course.coverImage} onChange={coverImage => updateCourse({ ...course, coverImage })} />
          </Card>

          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-lg flex items-center gap-2"><Video size={19} className="text-[var(--accent-strong)]" /> Recording & Materi</h2>
                <p className="text-xs text-[var(--muted)] mt-1">Susun video webinar dan materi teks pendamping.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="text-xs px-3" icon={Video} onClick={() => addModule('video')}>Video</Button>
                <Button variant="secondary" className="text-xs px-3" icon={FileText} onClick={() => addModule('text')}>Teks</Button>
              </div>
            </div>

            {course.modules.map((module, index) => (
              <Card key={module.id} className="space-y-5 relative">
                <button type="button" aria-label={`Hapus materi ${index + 1}`} onClick={() => updateCourse({ ...course, modules: course.modules.filter((_, moduleIndex) => moduleIndex !== index) })} className="absolute top-4 right-4 p-2 text-[var(--danger-text)] hover:bg-[var(--danger-soft)] rounded-lg"><Trash2 size={17} /></button>
                <div className="flex items-center gap-2 pr-12"><Badge>{module.type === 'video' ? 'Recording' : 'Teks'}</Badge><span className="text-sm font-semibold">Materi #{index + 1}</span></div>
                <Input label="Judul Materi" value={module.title} onChange={event => updateModule(index, { title: event.target.value })} />
                {module.type === 'video' ? (
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="md:col-span-3"><Input label="Link YouTube / Video Embed" icon={LinkIcon} value={module.content} onChange={event => updateModule(index, { content: event.target.value })} placeholder="https://youtube.com/watch?v=..." /></div>
                    <Input label="Durasi" value={module.duration || ''} onChange={event => updateModule(index, { duration: event.target.value })} placeholder="01:30:00" />
                  </div>
                ) : (
                  <Textarea label="Isi Materi" value={module.content} onChange={event => updateModule(index, { content: event.target.value })} className="min-h-[180px]" />
                )}
                <Textarea label="Catatan / Ringkasan" value={module.description} onChange={event => updateModule(index, { description: event.target.value })} />
              </Card>
            ))}

            {course.modules.length === 0 && (
              <div className="border border-dashed border-[var(--border-strong)] rounded-2xl p-10 text-center bg-[var(--surface)]">
                <Video size={28} className="mx-auto text-[var(--muted)] mb-3" />
                <p className="text-sm text-[var(--muted)]">Belum ada recording atau materi kelas.</p>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-8 min-w-0">
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="font-semibold text-lg flex items-center gap-2"><Download size={18} className="text-[var(--accent-strong)]" /> Asset Kelas</h2><p className="text-xs text-[var(--muted)] mt-1">Workbook, template, atau link.</p></div>
              <Button variant="secondary" className="px-3 text-xs" icon={Plus} onClick={addAsset}>Tambah</Button>
            </div>
            <Card className="space-y-4">
              {course.assets.map((asset, index) => (
                <div key={asset.id} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] relative space-y-3">
                  <button type="button" aria-label={`Hapus asset ${index + 1}`} onClick={() => updateCourse({ ...course, assets: course.assets.filter((_, assetIndex) => assetIndex !== index) })} className="absolute top-2 right-2 p-1.5 text-[var(--danger-text)] hover:bg-[var(--danger-soft)] rounded-lg"><X size={15} /></button>
                  <Input label="Nama Asset" value={asset.name} onChange={event => {
                    const assets = course.assets.map((item, assetIndex) => assetIndex === index ? { ...item, name: event.target.value } : item);
                    updateCourse({ ...course, assets });
                  }} />
                  <Input label="URL Asset" value={asset.url} onChange={event => {
                    const assets = course.assets.map((item, assetIndex) => assetIndex === index ? { ...item, url: event.target.value } : item);
                    updateCourse({ ...course, assets });
                  }} placeholder="https://..." />
                </div>
              ))}
              {course.assets.length === 0 && <p className="text-xs text-center text-[var(--muted)] py-3">Belum ada asset kelas.</p>}
            </Card>
          </section>
        </aside>
      </div>

      <section className="space-y-5">
        <div>
          <h2 className="font-semibold text-xl flex items-center gap-2"><ClipboardCheck size={21} className="text-[var(--accent-strong)]" /> Post-Test</h2>
          <p className="text-sm text-[var(--muted)] mt-1">Pilihan ganda dan benar/salah dinilai otomatis. Jawaban panjang masuk ke review admin.</p>
        </div>

        {isQuizLoading || !quiz ? (
          <Card className="flex items-center justify-center gap-3 py-12 text-sm text-[var(--muted)]"><Loader2 size={18} className="animate-spin" /> Memuat pengaturan post-test...</Card>
        ) : (
          <div className="space-y-5">
            {quizLoadError && (
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--danger-soft)] text-sm text-[var(--danger-text)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span>{quizLoadError}</span>
                <Button variant="secondary" icon={RefreshCw} onClick={fetchQuiz} className="text-xs">Coba Lagi</Button>
              </div>
            )}

            <Card className="space-y-6">
              <ToggleField checked={quiz.enabled} onChange={enabled => updateQuiz({ ...quiz, enabled })} label="Aktifkan post-test untuk peserta" description="Post-test akan tampil setelah materi pada halaman publik kelas." />
              <div className="grid md:grid-cols-2 gap-5">
                <Input label="Judul Post-Test" value={quiz.title} onChange={event => updateQuiz({ ...quiz, title: event.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Nilai Lulus (%)" type="number" min={0} max={100} value={quiz.passingScore} onChange={event => updateQuiz({ ...quiz, passingScore: Number(event.target.value) })} />
                  <Input label="Maks. Percobaan" type="number" min={1} max={20} value={quiz.maxAttempts} onChange={event => updateQuiz({ ...quiz, maxAttempts: Number(event.target.value) })} />
                </div>
              </div>
              <Textarea label="Petunjuk Post-Test" value={quiz.description} onChange={event => updateQuiz({ ...quiz, description: event.target.value })} />
              <ToggleField checked={quiz.showAnswers} onChange={showAnswers => updateQuiz({ ...quiz, showAnswers })} label="Tampilkan pembahasan jawaban setelah submit" description="Jika aktif, peserta dapat melihat jawaban benar. Nonaktifkan bila peserta masih boleh mencoba kembali." />
              <div className="space-y-4 pt-1">
                <ToggleField checked={quiz.feedbackEnabled} onChange={feedbackEnabled => updateQuiz({ ...quiz, feedbackEnabled, feedbackRequired: feedbackEnabled ? quiz.feedbackRequired : false })} label="Aktifkan feedback kelas" description="Peserta dapat menuliskan kesan, saran, atau evaluasi setelah mengerjakan post-test." />
                {quiz.feedbackEnabled && (
                  <div className="space-y-4 pl-7 border-l-2 border-[var(--border)]">
                    <Textarea label="Pertanyaan feedback" value={quiz.feedbackPrompt} onChange={event => updateQuiz({ ...quiz, feedbackPrompt: event.target.value })} placeholder="Bagaimana pengalaman Anda mengikuti kelas ini?" />
                    <ToggleField checked={quiz.feedbackRequired} onChange={feedbackRequired => updateQuiz({ ...quiz, feedbackRequired })} label="Wajib diisi peserta" description="Jika aktif, peserta harus mengisi feedback sebelum pengiriman berhasil." />
                  </div>
                )}
              </div>
            </Card>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="font-semibold">Daftar Pertanyaan ({quiz.questions.length})</h3>
              <div className="flex gap-2">
                <Button variant="secondary" className="text-xs px-3" icon={Plus} onClick={() => updateQuiz({ ...quiz, questions: [...quiz.questions, createQuestion('multiple_choice')] })}>Pilihan Ganda</Button>
                <Button variant="secondary" className="text-xs px-3" icon={Plus} onClick={() => updateQuiz({ ...quiz, questions: [...quiz.questions, createQuestion('true_false')] })}>Benar / Salah</Button>
                <Button variant="secondary" className="text-xs px-3" icon={Plus} onClick={() => updateQuiz({ ...quiz, questions: [...quiz.questions, createQuestion('long_answer')] })}>Jawaban Panjang</Button>
              </div>
            </div>

            {quiz.questions.map((question, questionIndex) => (
              <Card key={question.id} className="space-y-5 relative">
                <button type="button" aria-label={`Hapus pertanyaan ${questionIndex + 1}`} onClick={() => updateQuiz({ ...quiz, questions: quiz.questions.filter((_, index) => index !== questionIndex) })} className="absolute top-4 right-4 p-2 text-[var(--danger-text)] hover:bg-[var(--danger-soft)] rounded-lg"><Trash2 size={17} /></button>
                <div className="grid md:grid-cols-[1fr_220px] gap-4 pr-10">
                  <div><Badge>Pertanyaan #{questionIndex + 1}</Badge></div>
                  <SelectField label="Tipe Soal" value={question.type} onChange={event => changeQuestionType(questionIndex, event.target.value as QuizQuestionType)}>
                    <option value="multiple_choice">Pilihan Ganda</option>
                    <option value="true_false">Benar / Salah</option>
                    <option value="long_answer">Jawaban Panjang</option>
                  </SelectField>
                </div>
                <Textarea label="Pertanyaan" value={question.prompt} onChange={event => updateQuestion(questionIndex, { prompt: event.target.value })} placeholder="Tuliskan pertanyaan..." />
                {question.type === 'long_answer' ? (
                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-sm text-[var(--muted)] leading-relaxed">
                    Jawaban peserta akan disimpan sebagai teks panjang dan ditandai <strong className="text-[var(--text)]">menunggu review admin</strong>. Soal ini tidak dinilai otomatis.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-[var(--muted)]">Pilihan Jawaban — tandai satu jawaban benar</p>
                    {question.options.map((option, optionIndex) => (
                      <div key={`${question.id}-${optionIndex}`} className="flex items-center gap-3">
                        <input type="radio" name={`correct-${question.id}`} checked={question.correctAnswer === option} onChange={() => updateQuestion(questionIndex, { correctAnswer: option })} aria-label={`Jadikan pilihan ${optionIndex + 1} sebagai jawaban benar`} className="h-4 w-4 flex-shrink-0 accent-[var(--accent)]" />
                        <Input aria-label={`Pilihan jawaban ${optionIndex + 1}`} value={option} disabled={question.type === 'true_false'} onChange={event => updateOption(questionIndex, optionIndex, event.target.value)} className="flex-1" />
                        {question.type === 'multiple_choice' && question.options.length > 2 && (
                          <button type="button" aria-label={`Hapus pilihan ${optionIndex + 1}`} onClick={() => {
                            const options = question.options.filter((_, index) => index !== optionIndex);
                            updateQuestion(questionIndex, { options, correctAnswer: option === question.correctAnswer ? options[0] : question.correctAnswer });
                          }} className="p-2 text-[var(--muted)] hover:text-[var(--danger-text)]"><X size={16} /></button>
                        )}
                      </div>
                    ))}
                    {question.type === 'multiple_choice' && (
                      <Button variant="secondary" className="text-xs" icon={Plus} onClick={() => updateQuestion(questionIndex, { options: [...question.options, `Pilihan ${question.options.length + 1}`] })}>Tambah Pilihan</Button>
                    )}
                  </div>
                )}
              </Card>
            ))}

            {quiz.questions.length === 0 && (
              <div className="border border-dashed border-[var(--border-strong)] rounded-2xl p-10 text-center bg-[var(--surface)]">
                <HelpCircle size={29} className="mx-auto text-[var(--muted)] mb-3" />
                <p className="text-sm text-[var(--muted)]">Tambahkan pertanyaan untuk mulai membuat post-test.</p>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <Button onClick={handleSave} icon={Save} isLoading={isSaving} className="w-full sm:w-auto">Simpan Semua Perubahan</Button>
      </div>
    </div>
  );
};

export const ClassResultsPage: React.FC<{ courses: Course[]; client: any }> = ({ courses, client }) => {
  const { id } = useParams<{ id: string }>();
  const course = courses.find(item => item.id === id);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchAttempts = useCallback(async () => {
    if (!id || !client) {
      setLoadError('Koneksi Supabase belum tersedia.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    const { data, error } = await client.from('quiz_attempts').select('*').eq('course_id', id).order('submitted_at', { ascending: false });
    if (error) {
      console.error('Quiz result fetch failed', error);
      setLoadError(databaseErrorMessage(error));
    } else {
      setAttempts((data || []).map(mapAttemptRow));
    }
    setIsLoading(false);
  }, [client, id]);

  useEffect(() => { void fetchAttempts(); }, [fetchAttempts]);

  const stats = useMemo(() => {
    const participantCount = new Set(attempts.map(attempt => attempt.participantEmail.toLowerCase())).size;
    const average = attempts.length ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length) : 0;
    const reviewedAttempts = attempts.filter(attempt => !attempt.needsReview);
    const passRate = reviewedAttempts.length ? Math.round((reviewedAttempts.filter(attempt => attempt.passed).length / reviewedAttempts.length) * 100) : 0;
    const pendingReview = attempts.filter(attempt => attempt.needsReview).length;
    return { participantCount, average, passRate, pendingReview };
  }, [attempts]);

  const exportCsv = () => {
    const rows = [
      ['Nama', 'Email', 'Nilai', 'Status', 'Percobaan', 'Feedback Kelas', 'Jawaban', 'Waktu Submit'],
      ...attempts.map(attempt => [attempt.participantName, attempt.participantEmail, attempt.score, attempt.needsReview ? 'Menunggu review' : attempt.passed ? 'Lulus' : 'Belum Lulus', attempt.attemptNumber, attempt.classFeedback || '', JSON.stringify(attempt.answers), new Date(attempt.submittedAt).toLocaleString('id-ID')])
    ];
    const csv = rows.map(row => row.map(escapeCsv).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `hasil-post-test-${id}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Link to="/admin/classes" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent-strong)] mb-3"><ArrowLeft size={14} /> Daftar Kelas</Link>
          <h1 className="text-3xl font-bold">Hasil Post-Test</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{course?.title || 'Kelas Recording'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={RefreshCw} onClick={fetchAttempts}>Refresh</Button>
          <Button icon={FileDown} disabled={attempts.length === 0} onClick={exportCsv}>Export CSV</Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><p className="text-xs text-[var(--muted)]">Peserta Unik</p><p className="text-3xl font-bold mt-2">{stats.participantCount}</p></Card>
        <Card><p className="text-xs text-[var(--muted)]">Rata-rata Nilai</p><p className="text-3xl font-bold mt-2">{stats.average}</p></Card>
        <Card><p className="text-xs text-[var(--muted)]">Tingkat Kelulusan</p><p className="text-3xl font-bold mt-2">{stats.passRate}%</p></Card>
        <Card><p className="text-xs text-[var(--muted)]">Menunggu Review</p><p className="text-3xl font-bold mt-2">{stats.pendingReview}</p></Card>
      </div>

      {isLoading ? (
        <Card className="py-14 flex items-center justify-center gap-3 text-sm text-[var(--muted)]"><Loader2 size={18} className="animate-spin" /> Memuat hasil peserta...</Card>
      ) : loadError ? (
        <Card className="text-center py-12 space-y-4"><XCircle size={30} className="mx-auto text-[var(--danger-text)]" /><p className="text-sm text-[var(--danger-text)]">{loadError}</p><Button variant="secondary" onClick={fetchAttempts} className="mx-auto">Coba Lagi</Button></Card>
      ) : attempts.length === 0 ? (
        <Card className="text-center py-14"><ClipboardCheck size={31} className="mx-auto text-[var(--muted)] mb-3" /><p className="font-semibold">Belum ada hasil post-test</p><p className="text-sm text-[var(--muted)] mt-1">Data akan muncul setelah peserta mengirim jawaban.</p></Card>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--surface-soft)] text-xs text-[var(--muted)]">
                <tr><th className="p-4">Peserta</th><th className="p-4">Nilai</th><th className="p-4">Status</th><th className="p-4">Percobaan</th><th className="p-4">Dikirim</th><th className="p-4">Detail</th></tr>
              </thead>
              <tbody>
                {attempts.map(attempt => (
                  <tr key={attempt.id} className="border-t border-[var(--border)]">
                    <td className="p-4"><p className="font-semibold">{attempt.participantName}</p><p className="text-xs text-[var(--muted)] mt-1">{attempt.participantEmail}</p></td>
                    <td className="p-4 font-bold">{attempt.score}</td>
                    <td className="p-4"><span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${attempt.needsReview ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : attempt.passed ? 'bg-[var(--success-soft)] text-[var(--success-text)]' : 'bg-[var(--danger-soft)] text-[var(--danger-text)]'}`}>{attempt.needsReview ? 'Menunggu review' : attempt.passed ? 'Lulus' : 'Belum Lulus'}</span></td>
                    <td className="p-4">#{attempt.attemptNumber}</td>
                    <td className="p-4 text-xs text-[var(--muted)]">{new Date(attempt.submittedAt).toLocaleString('id-ID')}</td>
                    <td className="p-4">
                      <details className="max-w-sm">
                        <summary className="cursor-pointer text-xs font-semibold text-[var(--accent-strong)]">Lihat jawaban</summary>
                        <div className="mt-3 space-y-3 text-xs">
                          {attempt.classFeedback && <div><p className="font-semibold">Feedback kelas</p><p className="mt-1 whitespace-pre-wrap text-[var(--muted)]">{attempt.classFeedback}</p></div>}
                          <div><p className="font-semibold">Jawaban</p><pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words text-[var(--muted)]">{JSON.stringify(attempt.answers, null, 2)}</pre></div>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {attempts.map(attempt => (
              <Card key={attempt.id} className="space-y-4">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold truncate">{attempt.participantName}</p><p className="text-xs text-[var(--muted)] break-all mt-1">{attempt.participantEmail}</p></div><span className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${attempt.needsReview ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : attempt.passed ? 'bg-[var(--success-soft)] text-[var(--success-text)]' : 'bg-[var(--danger-soft)] text-[var(--danger-text)]'}`}>{attempt.needsReview ? 'Menunggu review' : attempt.passed ? 'Lulus' : 'Belum Lulus'}</span></div>
                <div className="grid grid-cols-3 gap-3 text-xs"><div><p className="text-[var(--muted)]">Nilai</p><p className="font-bold text-lg mt-1">{attempt.score}</p></div><div><p className="text-[var(--muted)]">Percobaan</p><p className="font-semibold mt-2">#{attempt.attemptNumber}</p></div><div><p className="text-[var(--muted)]">Dikirim</p><p className="font-semibold mt-2">{new Date(attempt.submittedAt).toLocaleDateString('id-ID')}</p></div></div>
                <details className="border-t border-[var(--border)] pt-3"><summary className="cursor-pointer text-xs font-semibold text-[var(--accent-strong)]">Lihat jawaban dan feedback</summary><div className="mt-3 space-y-3 text-xs">{attempt.classFeedback && <div><p className="font-semibold">Feedback kelas</p><p className="mt-1 whitespace-pre-wrap text-[var(--muted)]">{attempt.classFeedback}</p></div>}<div><p className="font-semibold">Jawaban</p><pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words text-[var(--muted)]">{JSON.stringify(attempt.answers, null, 2)}</pre></div></div></details>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const PublicRecordedClassView: React.FC<{
  client: any;
  mentor: Mentor;
  resolveCourseId: (code: string) => string;
}> = ({ client, mentor, resolveCourseId }) => {
  const { id: routeCode } = useParams<{ id: string }>();
  const courseId = routeCode ? resolveCourseId(routeCode) : '';
  const [course, setCourse] = useState<Course | null>(null);
  const [quiz, setQuiz] = useState<PublicCourseQuiz | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isQuizLoading, setIsQuizLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [participantName, setParticipantName] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [classFeedback, setClassFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizSubmissionResult | null>(null);

  const fetchClass = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setQuizError(null);
    setIsQuizLoading(true);
    setCourse(null);
    setQuiz(null);
    if (!client || !courseId) {
      setLoadError('Link kelas tidak valid atau koneksi publik belum tersedia.');
      setIsLoading(false);
      setIsQuizLoading(false);
      return;
    }

    try {
      const { data: courseRow, error: courseError } = await withRequestTimeout<any>(
        client.from('courses').select('*').eq('id', courseId).maybeSingle() as PromiseLike<any>
      );
      if (courseError) throw courseError;
      if (!courseRow || courseRow.space_type !== 'recorded_class' || courseRow.published !== true) {
        setLoadError('Kelas recording tidak ditemukan atau masih berstatus draft.');
        setIsLoading(false);
        setIsQuizLoading(false);
        return;
      }
      const mappedCourse = mapCourseRow(courseRow);
      setCourse(mappedCourse);
      setSelectedModule(mappedCourse.modules[0] || null);
      setIsLoading(false);

      try {
        const { data: quizData, error: quizRequestError } = await withRequestTimeout<any>(
          client.rpc('get_public_class_quiz', { p_course_id: courseId }) as PromiseLike<any>
        );
        if (quizRequestError) {
          console.warn('Public quiz fetch failed', quizRequestError);
          setQuizError(databaseErrorMessage(quizRequestError));
        } else if (quizData) {
          setQuiz(quizData as PublicCourseQuiz);
        }
      } catch (quizRequestError) {
        console.warn('Public quiz request failed', quizRequestError);
        const timedOut = quizRequestError instanceof Error && quizRequestError.message === 'REQUEST_TIMEOUT';
        setQuizError(timedOut ? 'Post-test terlalu lama dimuat. Silakan muat ulang halaman.' : databaseErrorMessage(quizRequestError));
      } finally {
        setIsQuizLoading(false);
      }
    } catch (error) {
      console.error('Public recorded class fetch failed', error);
      const timedOut = error instanceof Error && error.message === 'REQUEST_TIMEOUT';
      setLoadError(timedOut ? 'Server kelas terlalu lama merespons. Silakan coba lagi.' : databaseErrorMessage(error));
      setIsLoading(false);
      setIsQuizLoading(false);
    }
  }, [client, courseId]);

  useEffect(() => { void fetchClass(); }, [fetchClass]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!quiz || !client) return;
    if (!participantName.trim() || !participantEmail.trim()) {
      setSubmissionError('Nama dan email peserta wajib diisi.');
      return;
    }
    const unanswered = quiz.questions.find(question => !String(answers[question.id] || '').trim());
    if (unanswered) {
      setSubmissionError('Jawab seluruh pertanyaan sebelum mengirim post-test.');
      return;
    }
    if (quiz.feedbackEnabled && quiz.feedbackRequired && !classFeedback.trim()) {
      setSubmissionError('Feedback kelas wajib diisi sebelum mengirim post-test.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      const { data, error } = await withRequestTimeout<any>(client.rpc('submit_class_post_test', {
        p_course_id: courseId,
        p_participant_name: participantName.trim(),
        p_participant_email: participantEmail.trim(),
        p_answers: answers,
        p_class_feedback: quiz.feedbackEnabled ? classFeedback.trim() || null : null
      }) as PromiseLike<any>);
      if (error) {
        const message = String(error.message || 'Post-test gagal dikirim.');
        setSubmissionError(message.includes('MAX_ATTEMPTS_REACHED') ? 'Batas percobaan post-test untuk email ini sudah tercapai.' : databaseErrorMessage(error));
      } else {
        setResult(data as QuizSubmissionResult);
      }
    } catch (error) {
      const timedOut = error instanceof Error && error.message === 'REQUEST_TIMEOUT';
      setSubmissionError(timedOut ? 'Server terlalu lama merespons. Jawaban belum dapat dipastikan tersimpan; tunggu sebentar sebelum mencoba lagi.' : databaseErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center gap-3 text-sm text-[var(--muted)]"><Loader2 size={18} className="animate-spin" /> Mencari kelas recording...</div>;
  }

  if (loadError || !course) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center py-10 space-y-5">
          <GraduationCap size={34} className="mx-auto text-[var(--muted)]" />
          <div><h1 className="text-xl font-semibold">Kelas tidak dapat dibuka</h1><p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">{loadError}</p></div>
          <Button icon={RefreshCw} onClick={fetchClass} className="w-full">Coba Lagi</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <header className="sticky top-0 z-40 bg-[var(--surface)]/95 backdrop-blur border-b border-[var(--border)] px-4">
        <div className="max-w-7xl mx-auto min-h-[68px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0"><div className="w-9 h-9 rounded-xl bg-[var(--success-soft)] text-[var(--success-text)] flex items-center justify-center flex-shrink-0"><GraduationCap size={19} /></div><div className="min-w-0"><p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)] font-semibold">Arunika LMS</p><p className="text-sm font-semibold truncate">Kelas Recording</p></div></div>
          <Badge color="var(--success-soft)">{course.modules.length} Materi</Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        <section className="relative h-[220px] sm:h-[250px] lg:h-[280px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          {course.coverImage ? (
            <img src={course.coverImage} alt={`Cover ${course.title}`} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface-soft)] text-[var(--muted)]"><GraduationCap size={48} /></div>
          )}
          <div className={`absolute inset-0 ${course.coverImage ? 'bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-transparent' : 'bg-gradient-to-t from-[var(--surface)] via-[var(--surface)]/45 to-transparent'}`} />
          <div className={`absolute inset-x-0 bottom-0 p-5 md:p-7 ${course.coverImage ? 'text-white' : 'text-[var(--text)]'}`}>
            <Badge color="var(--success-soft)">On-demand Class</Badge>
            <h1 className="text-2xl md:text-3xl font-bold leading-tight mt-3 max-w-4xl">{course.title}</h1>
            <p className={`text-sm leading-6 mt-2 max-w-3xl line-clamp-2 ${course.coverImage ? 'text-white/85' : 'text-[var(--muted)]'}`}>{course.description}</p>
            <div className={`flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm ${course.coverImage ? 'text-white/90' : 'text-[var(--muted)]'}`}>
              <span className="flex items-center gap-2"><Video size={16} /> {course.modules.length} materi</span>
              <span className="flex items-center gap-2"><Download size={16} /> {course.assets.length} asset</span>
            </div>
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          <div className="lg:col-span-2 space-y-8 min-w-0">
            <section className="space-y-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Materi Kelas</p><h2 className="text-2xl font-bold mt-2">Tonton Recording</h2></div>
              {selectedModule ? (
                <Card className="!p-0 overflow-hidden">
                  {selectedModule.type === 'video' ? (
                    <iframe title={selectedModule.title} className="w-full aspect-video bg-black" src={getVideoEmbedUrl(selectedModule.content)} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  ) : (
                    <div className="p-6 md:p-9 min-h-[260px] whitespace-pre-wrap leading-7 text-sm md:text-base">{selectedModule.content}</div>
                  )}
                  <div className="p-5 md:p-7 border-t border-[var(--border)]"><Badge>{selectedModule.type === 'video' ? 'Recording' : 'Materi Teks'}</Badge><h3 className="text-xl font-semibold mt-3">{selectedModule.title}</h3>{selectedModule.description && <p className="text-sm text-[var(--muted)] leading-7 mt-3 whitespace-pre-wrap">{selectedModule.description}</p>}</div>
                </Card>
              ) : (
                <Card className="py-12 text-center text-sm text-[var(--muted)]">Materi kelas belum ditambahkan.</Card>
              )}
            </section>

            <section id="post-test" className="space-y-5 scroll-mt-24">
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Evaluasi</p><h2 className="text-2xl font-bold mt-2">Post-Test Kelas</h2></div>
              {isQuizLoading ? (
                <Card className="py-10 flex items-center justify-center gap-3 text-sm text-[var(--muted)]"><Loader2 size={18} className="animate-spin" /> Memuat post-test...</Card>
              ) : quizError ? (
                <Card className="py-10 text-center"><p className="text-sm text-[var(--danger-text)]">{quizError}</p></Card>
              ) : !quiz ? (
                <Card className="py-10 text-center"><ClipboardCheck size={30} className="mx-auto text-[var(--muted)] mb-3" /><p className="text-sm text-[var(--muted)]">Post-test belum diaktifkan untuk kelas ini.</p></Card>
              ) : result ? (
                <Card className="p-7 md:p-10 text-center">
                  {result.needsReview ? <ClipboardCheck size={46} className="mx-auto text-[var(--accent-strong)]" /> : result.passed ? <CheckCircle2 size={46} className="mx-auto text-[var(--success-text)]" /> : <XCircle size={46} className="mx-auto text-[var(--danger-text)]" />}
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)] font-semibold mt-5">Hasil Percobaan #{result.attemptNumber}</p>
                  <p className="text-5xl font-bold mt-3">{result.score}</p>
                  <h3 className="text-xl font-semibold mt-4">{result.needsReview ? 'Jawaban terkirim, menunggu review admin' : result.passed ? 'Selamat, Anda lulus!' : 'Nilai belum mencapai batas lulus'}</h3>
                  <p className="text-sm text-[var(--muted)] mt-2">{result.needsReview ? 'Nilai di atas adalah nilai sementara dari soal otomatis.' : `Nilai minimum ${result.passingScore}. Maksimal ${result.maxAttempts} percobaan.`}</p>
                  {result.feedback && result.feedback.length > 0 && (
                    <div className="text-left mt-8 space-y-3">
                      {result.feedback.map((feedback, index) => {
                        const question = quiz.questions.find(item => item.id === feedback.questionId);
                        return <div key={feedback.questionId} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)]"><p className="text-sm font-semibold">{index + 1}. {question?.prompt}</p><p className={`text-xs mt-2 ${feedback.review ? 'text-[var(--accent-strong)]' : feedback.correct ? 'text-[var(--success-text)]' : 'text-[var(--danger-text)]'}`}>{feedback.review ? 'Jawaban panjang menunggu review admin.' : feedback.correct ? 'Jawaban benar' : `Jawaban benar: ${feedback.correctAnswer}`}</p></div>;
                      })}
                    </div>
                  )}
                  {!result.passed && !result.needsReview && result.attemptNumber < result.maxAttempts && (
                    <Button variant="secondary" className="mx-auto mt-7" onClick={() => { setResult(null); setAnswers({}); setClassFeedback(''); }}>Coba Lagi</Button>
                  )}
                </Card>
              ) : (
                <Card className="p-5 md:p-8">
                  <div className="pb-6 border-b border-[var(--border)]"><h3 className="text-xl font-semibold">{quiz.title}</h3><p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">{quiz.description}</p><div className="flex flex-wrap gap-2 mt-4"><Badge>Nilai lulus {quiz.passingScore}</Badge><Badge>Maks. {quiz.maxAttempts} percobaan</Badge></div></div>
                  <form onSubmit={handleSubmit} className="space-y-7 pt-7">
                    <div className="grid md:grid-cols-2 gap-4"><Input label="Nama Lengkap" icon={UserRound} value={participantName} onChange={event => setParticipantName(event.target.value)} required /><Input label="Email" icon={Mail} type="email" value={participantEmail} onChange={event => setParticipantEmail(event.target.value)} required /></div>
                    {quiz.questions.map((question, questionIndex) => (
                      <fieldset key={question.id} className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] min-w-0">
                        <legend className="sr-only">Pertanyaan {questionIndex + 1}</legend>
                        <p className="font-semibold leading-relaxed"><span className="text-[var(--accent-strong)] mr-2">{questionIndex + 1}.</span>{question.prompt}</p>
                        {question.type === 'long_answer' ? (
                          <div className="mt-4">
                            <Textarea
                              label="Jawaban panjang"
                              value={answers[question.id] || ''}
                              onChange={event => setAnswers(current => ({ ...current, [question.id]: event.target.value }))}
                              placeholder="Tuliskan jawaban Anda secara lengkap..."
                              className="min-h-[160px]"
                              maxLength={5000}
                              required
                            />
                            <p className="text-[11px] text-[var(--muted)] text-right mt-1">{(answers[question.id] || '').length}/5.000</p>
                          </div>
                        ) : (
                          <div className="space-y-2.5 mt-4">
                            {question.options.map((option, optionIndex) => (
                              <label key={`${question.id}-${optionIndex}`} className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${answers[question.id] === option ? 'bg-[var(--accent-soft)] border-[var(--border-strong)]' : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-strong)]'}`}>
                                <input type="radio" name={question.id} value={option} checked={answers[question.id] === option} onChange={() => setAnswers(current => ({ ...current, [question.id]: option }))} className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[var(--accent)]" />
                                <span className="text-sm break-words min-w-0">{option}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </fieldset>
                    ))}
                    {quiz.feedbackEnabled && (
                      <div className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)]">
                        <Textarea
                          label={`Feedback Kelas${quiz.feedbackRequired ? ' (Wajib)' : ' (Opsional)'}`}
                          value={classFeedback}
                          onChange={event => setClassFeedback(event.target.value)}
                          placeholder={quiz.feedbackPrompt || 'Bagaimana pengalaman Anda mengikuti kelas ini?'}
                          className="min-h-[140px] bg-[var(--surface)]"
                          maxLength={5000}
                          required={quiz.feedbackRequired}
                        />
                        <p className="text-[11px] text-[var(--muted)] text-right mt-1">{classFeedback.length}/5.000</p>
                      </div>
                    )}
                    {submissionError && <div className="p-4 rounded-xl bg-[var(--danger-soft)] border border-[var(--border)] text-sm text-[var(--danger-text)]">{submissionError}</div>}
                    <Button type="submit" icon={ClipboardCheck} isLoading={isSubmitting} disabled={isSubmitting} className="w-full">Kirim Jawaban</Button>
                  </form>
                </Card>
              )}
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:pt-16 min-w-0">
            <Card className="text-center">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-[var(--border)] bg-[var(--surface-soft)] mx-auto">
                {mentor.photo ? <img src={mentor.photo} alt={mentor.name} className="w-full h-full object-cover" /> : <UserRound size={26} className="m-5 text-[var(--muted)]" />}
              </div>
              <p className="font-semibold mt-3">{mentor.name || 'Mentor Kelas'}</p>
              <p className="text-xs text-[var(--muted)] mt-1">{mentor.role}</p>
            </Card>

            <Card className="space-y-3">
              <h2 className="font-semibold flex items-center gap-2"><BookOpen size={18} className="text-[var(--accent-strong)]" /> Daftar Materi</h2>
              {course.modules.map((module, index) => (
                <button key={module.id} type="button" onClick={() => setSelectedModule(module)} className={`w-full text-left p-3 rounded-xl border transition-colors ${selectedModule?.id === module.id ? 'bg-[var(--accent-soft)] border-[var(--border-strong)]' : 'border-transparent hover:bg-[var(--surface-soft)]'}`}>
                  <div className="flex gap-3"><span className="w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center text-xs font-semibold flex-shrink-0">{index + 1}</span><div className="min-w-0"><p className="text-xs font-semibold break-words leading-snug">{module.title}</p><p className="text-[10px] text-[var(--muted)] mt-1">{module.duration || (module.type === 'video' ? 'Video' : 'Teks')}</p></div></div>
                </button>
              ))}
              {course.modules.length === 0 && <p className="text-xs text-[var(--muted)]">Belum ada materi.</p>}
            </Card>

            {course.assets.length > 0 && (
              <Card className="space-y-3">
                <h2 className="font-semibold flex items-center gap-2"><Download size={18} className="text-[var(--accent-strong)]" /> Asset Kelas</h2>
                {course.assets.map(asset => (
                  <a key={asset.id} href={asset.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--border-strong)] bg-[var(--surface-soft)]">
                    <span className="text-xs font-semibold break-words min-w-0">{asset.name}</span><ExternalLink size={14} className="flex-shrink-0 text-[var(--muted)]" />
                  </a>
                ))}
              </Card>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
};
