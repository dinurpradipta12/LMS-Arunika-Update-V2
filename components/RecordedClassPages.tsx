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
  Layout,
  LayoutGrid,
  Link as LinkIcon,
  Loader2,
  LockKeyhole,
  Mail,
  Plus,
  RefreshCw,
  Save,
  Share2,
  Scissors,
  Trash2,
  UserRound,
  Users,
  Video,
  X,
  XCircle
} from 'lucide-react';

import {
  ClassFeedbackSubmission,
  Course,
  CourseQuiz,
  Mentor,
  Module,
  PublicCourseQuiz,
  QuizAttempt,
  QuizAnswerReview,
  QuizQuestion,
  QuizQuestionType,
  QuizSubmissionResult
} from '../types';
import { Badge, Button, Card, Input, Textarea } from './UI';
import { setPublicMetadata } from './PublicMetadata';
import logoUtama from '../src/logo-utama.png';

const DEFAULT_QUIZ_TITLE = 'Post-Test Kelas';
export const RECORDED_CLASS_SPACE_LABEL = 'Intensive & Mini Class Series';
type PublicClassTab = 'materials' | 'post_test' | 'feedback';
const PUBLIC_CLASS_CONTENT_CLASS = 'w-full max-w-4xl mx-auto';

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
  published: row.published !== false,
  overallFeedbackEnabled: row.overall_feedback_enabled !== false
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
  reviewedAnswers: row.reviewed_answers && typeof row.reviewed_answers === 'object' && !Array.isArray(row.reviewed_answers) ? row.reviewed_answers : {},
  reviewFeedback: row.review_feedback || null,
  reviewedAt: row.reviewed_at || null,
  attemptNumber: Number(row.attempt_number || 1),
  submittedAt: row.submitted_at
});

const mapClassFeedbackRow = (row: any): ClassFeedbackSubmission => ({
  id: row.id,
  courseId: row.course_id,
  participantName: row.participant_name,
  participantEmail: row.participant_email,
  certificateEmail: row.certificate_email,
  rating: Number(row.rating || 0),
  feedback: row.feedback || '',
  submittedAt: row.created_at,
  updatedAt: row.updated_at
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
    || message.includes('overall_feedback_enabled')
    || message.includes('class_feedback')
    || message.includes('reviewed_answers')
    || message.includes('review_feedback')
    || message.includes('reviewed_at')
  ) {
    return 'Database kelas recording belum siap. Jalankan migration terbaru untuk fitur post-test dan feedback.';
  }
  if (message.includes('FEEDBACK_REQUIRED')) return 'Feedback kelas wajib diisi sebelum jawaban dikirim.';
  if (message.includes('FEEDBACK_TOO_LONG')) return 'Feedback kelas terlalu panjang. Maksimal 5.000 karakter.';
  if (message.includes('INCOMPLETE_ANSWERS')) return 'Jawab seluruh pertanyaan sebelum mengirim post-test.';
  if (message.includes('FEEDBACK_NOT_READY')) return 'Selesaikan dan tandai semua materi kelas sebelum mengirim feedback keseluruhan.';
  if (message.includes('INVALID_CERTIFICATE_EMAIL')) return 'Email sertifikat belum valid.';
  if (message.includes('INVALID_FEEDBACK_RATING')) return 'Pilih penilaian kelas dari 1 sampai 5.';
  if (message.includes('INVALID_FEEDBACK_TEXT')) return 'Feedback keseluruhan wajib diisi maksimal 5.000 karakter.';
  if (message.includes('submit_class_feedback') || message.includes('class_feedback_submissions')) return 'Database feedback keseluruhan belum siap. Jalankan migration terbaru.';
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

const plainText = (value: unknown) => String(value ?? '')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&amp;/gi, '&')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, '\n')
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

type QuizAnswerReviewEntry = {
  id: string;
  number: number;
  prompt: string;
  answer: string;
  rawAnswer: string;
  type: QuizQuestionType | string;
  correct: boolean | null;
  correctAnswer: string;
  feedback: string;
  points: number;
  question: QuizQuestion | null;
};

const normalizedQuizValue = (value: unknown) => plainText(value).trim().toLowerCase();

const automaticAnswerCorrect = (question: QuizQuestion, rawAnswer: string): boolean | null => {
  if (question.type === 'long_answer') return null;
  const expectedAnswer = normalizedQuizValue(question.correctAnswer);
  if (!expectedAnswer) return rawAnswer ? null : false;
  return normalizedQuizValue(rawAnswer) === expectedAnswer;
};

const buildQuizAnswerEntries = (attempt: QuizAttempt, quiz: CourseQuiz | null): QuizAnswerReviewEntry[] => {
  const answers = attempt.answers || {};
  const storedReviews = attempt.reviewedAnswers || {};
  const knownQuestionIds = new Set<string>();
  const entries: QuizAnswerReviewEntry[] = [];

  (quiz?.questions || []).forEach((question, index) => {
    knownQuestionIds.add(question.id);
    const rawAnswer = String(answers[question.id] ?? '').trim();
    const storedReview = storedReviews[question.id];
    entries.push({
      id: question.id,
      number: index + 1,
      prompt: plainText(question.prompt) || `Pertanyaan ${index + 1}`,
      answer: plainText(rawAnswer) || 'Tidak ada jawaban',
      rawAnswer,
      type: question.type || 'multiple_choice',
      correct: storedReview && typeof storedReview.correct === 'boolean'
        ? storedReview.correct
        : automaticAnswerCorrect(question, rawAnswer),
      correctAnswer: plainText(question.correctAnswer),
      feedback: plainText(storedReview?.feedback),
      points: Math.max(0, Number(question.points) || 0),
      question
    });
  });

  Object.entries(answers).forEach(([answerId, value], index) => {
    if (knownQuestionIds.has(answerId)) return;
    const rawAnswer = String(value ?? '').trim();
    const storedReview = storedReviews[answerId];
    entries.push({
      id: answerId,
      number: entries.length + 1,
      prompt: `Pertanyaan tambahan ${index + 1}`,
      answer: plainText(rawAnswer) || 'Tidak ada jawaban',
      rawAnswer,
      type: 'long_answer',
      correct: storedReview && typeof storedReview.correct === 'boolean' ? storedReview.correct : null,
      correctAnswer: '',
      feedback: plainText(storedReview?.feedback),
      points: 0,
      question: null
    });
  });

  return entries;
};

const calculateReviewedAttempt = (
  attempt: QuizAttempt,
  quiz: CourseQuiz | null,
  reviews: Record<string, QuizAnswerReview>
) => {
  const entries = buildQuizAnswerEntries({ ...attempt, reviewedAnswers: reviews }, quiz);
  const questionEntries = entries.filter(entry => entry.question);
  const totalQuestions = questionEntries.length;
  const correctAnswers = questionEntries.filter(entry => entry.correct === true).length;
  const gradedQuestions = questionEntries.filter(entry => entry.correct !== null).length;
  const needsReview = questionEntries.some(entry => entry.correct === null);
  const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  return {
    score,
    needsReview,
    passed: !needsReview && score >= (quiz?.passingScore ?? 0),
    totalQuestions,
    gradedQuestions,
    correctAnswers
  };
};

const reviewStatusLabel = (correct: boolean | null) => {
  if (correct === true) return 'Benar';
  if (correct === false) return 'Salah';
  return 'Menunggu review';
};

const reportText = (value: unknown, fallback = '—') => plainText(value) || fallback;

const normalizedPdfText = (value: unknown) => reportText(value, '')
  .normalize('NFKD')
  .replace(/[“”]/g, '"')
  .replace(/[‘’]/g, "'")
  .replace(/[–—]/g, '-')
  .replace(/…/g, '...')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\x20-\x7E]/g, '?');

const pdfEscape = (value: unknown) => normalizedPdfText(value)
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)');

const wrapReportText = (value: unknown, maxLength = 88) => {
  const text = normalizedPdfText(value);
  if (!text) return ['—'];
  const lines: string[] = [];
  text.split(/\r?\n/).forEach(paragraph => {
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
  return lines.length ? lines : ['—'];
};

const createQuizReportPdf = (attempt: QuizAttempt, quiz: CourseQuiz | null, courseTitle: string) => {
  const reportEntries = buildQuizAnswerEntries(attempt, quiz);
  const reportSummary = calculateReviewedAttempt(attempt, quiz, attempt.reviewedAnswers || {});
  const pageWidth = 842;
  const pageHeight = 595;
  const navy = '#173f5f';
  const teal = '#0f766e';
  const gold = '#d89b3c';
  const ink = '#1f3448';
  const muted = '#667b8f';
  const border = '#c9d9e4';
  const surface = '#ffffff';
  const soft = '#edf4f8';
  const background = '#f6f9fb';
  const commands: string[] = [];
  const rgb = (hex: string) => {
    const value = hex.replace('#', '');
    return [0, 2, 4].map(offset => (parseInt(value.slice(offset, offset + 2), 16) / 255).toFixed(3)).join(' ');
  };
  const fillRect = (x: number, y: number, width: number, height: number, color: string) => commands.push(`${rgb(color)} rg ${x} ${y} ${width} ${height} re f`);
  const strokeRect = (x: number, y: number, width: number, height: number, color: string, lineWidth = 1) => commands.push(`${rgb(color)} RG ${lineWidth} w ${x} ${y} ${width} ${height} re S`);
  const drawLine = (x1: number, y1: number, x2: number, y2: number, color: string, lineWidth = 1) => commands.push(`${rgb(color)} RG ${lineWidth} w ${x1} ${y1} m ${x2} ${y2} l S`);
  const drawText = (value: unknown, x: number, y: number, size: number, color = ink, align: 'left' | 'center' | 'right' = 'left') => {
    const clean = normalizedPdfText(value);
    const approximateWidth = clean.length * size * 0.48;
    const textX = align === 'center' ? x - approximateWidth / 2 : align === 'right' ? x - approximateWidth : x;
    commands.push(`${rgb(color)} rg BT /F1 ${size} Tf 1 0 0 1 ${textX.toFixed(2)} ${y.toFixed(2)} Tm (${pdfEscape(clean)}) Tj ET`);
  };
  const cellLines = (value: unknown, maxChars: number, maxLines: number) => {
    const lines = wrapReportText(value, maxChars);
    if (lines.length <= maxLines) return lines;
    const truncated = lines[maxLines - 1].slice(0, Math.max(1, maxChars - 3));
    return [...lines.slice(0, maxLines - 1), `${truncated}...`];
  };
  const drawCellText = (value: unknown, x: number, topY: number, maxChars: number, maxLines: number, size: number, color = ink) => {
    cellLines(value, maxChars, maxLines).forEach((line, index) => drawText(line, x, topY - index * (size + 2), size, color));
  };
  const drawField = (label: string, value: unknown, x: number, y: number, maxChars = 42) => {
    drawText(label.toUpperCase(), x, y, 6.5, muted);
    drawCellText(value, x, y - 12, maxChars, 1, 8.5, ink);
  };

  fillRect(0, 0, pageWidth, pageHeight, background);
  strokeRect(18, 18, pageWidth - 36, pageHeight - 36, navy, 2);
  strokeRect(27, 27, pageWidth - 54, pageHeight - 54, teal, 0.8);
  fillRect(44, 542, 74, 5, teal);
  fillRect(123, 542, 36, 5, gold);
  drawText('ARUNIKA LEARNING HUB', 44, 528, 8, teal);
  drawText('LAPORAN PENILAIAN POST-TEST', 44, 498, 22, navy);
  drawText('Ringkasan penilaian peserta dalam format satu halaman.', 44, 478, 9, muted);

  fillRect(655, 445, 143, 92, soft);
  strokeRect(655, 445, 143, 92, border, 1);
  drawText('NILAI AKHIR', 726.5, 518, 7, muted, 'center');
  drawText(`${reportSummary.score}/100`, 726.5, 487, 25, navy, 'center');
  drawText(reportSummary.needsReview ? 'Menunggu review' : reportSummary.passed ? 'Lulus' : 'Belum lulus', 726.5, 463, 8, reportSummary.needsReview ? gold : reportSummary.passed ? teal : '#a84949', 'center');

  drawField('Peserta', attempt.participantName, 44, 443, 32);
  drawField('Email', attempt.participantEmail, 260, 443, 34);
  drawField('Kelas', courseTitle, 480, 443, 28);
  drawField('Waktu submit', attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString('id-ID') : '—', 44, 405, 32);
  drawField('Percobaan', `#${attempt.attemptNumber}`, 260, 405, 18);
  drawField('Direview', attempt.reviewedAt ? new Date(attempt.reviewedAt).toLocaleString('id-ID') : 'Belum direview', 480, 405, 28);

  const summaryX = 44;
  const summaryY = 343;
  const summaryWidth = 754;
  const summaryHeight = 45;
  const summaryCellWidth = summaryWidth / 4;
  fillRect(summaryX, summaryY, summaryWidth, summaryHeight, soft);
  strokeRect(summaryX, summaryY, summaryWidth, summaryHeight, border, 1);
  [1, 2, 3].forEach(index => drawLine(summaryX + summaryCellWidth * index, summaryY, summaryX + summaryCellWidth * index, summaryY + summaryHeight, border, 0.7));
  const summaryItems = [
    ['JUMLAH SOAL', `${reportSummary.totalQuestions}`],
    ['SUDAH DINILAI', `${reportSummary.gradedQuestions}/${reportSummary.totalQuestions}`],
    ['JAWABAN BENAR', `${reportSummary.correctAnswers}/${reportSummary.totalQuestions}`],
    ['RUMUS NILAI', reportSummary.totalQuestions > 0 ? `${reportSummary.correctAnswers} / ${reportSummary.totalQuestions} x 100` : 'Belum ada soal']
  ];
  summaryItems.forEach(([label, value], index) => {
    const centerX = summaryX + summaryCellWidth * index + summaryCellWidth / 2;
    drawText(label, centerX, summaryY + 29, 6.5, muted, 'center');
    drawText(value, centerX, summaryY + 13, 11, navy, 'center');
  });

  const tableX = 44;
  const tableTop = 326;
  const tableWidth = summaryWidth;
  const headerHeight = 23;
  const tableBottom = 86;
  const tableDataHeight = tableTop - headerHeight - tableBottom;
  const maxRows = 11;
  const visibleEntries = reportEntries.slice(0, maxRows);
  const rows = visibleEntries.length || 1;
  const rowHeight = Math.max(18, Math.min(45, tableDataHeight / rows));
  const columns = [44, 258, 258, 72, 122];
  const headers = ['NO', 'RINGKASAN SOAL', 'JAWABAN PESERTA', 'NILAI', 'FEEDBACK'];
  fillRect(tableX, tableTop - headerHeight, tableWidth, headerHeight, navy);
  let headerX = tableX;
  headers.forEach((header, index) => {
    drawText(header, headerX + columns[index] / 2, tableTop - 15, 6.5, surface, 'center');
    headerX += columns[index];
  });
  let currentY = tableTop - headerHeight;
  const rowEntries = visibleEntries.length ? visibleEntries : [{ number: 0, prompt: 'Belum ada jawaban untuk ditampilkan.', answer: '', correct: null, feedback: '' } as QuizAnswerReviewEntry];
  rowEntries.forEach((entry, index) => {
    const rowY = currentY - rowHeight;
    fillRect(tableX, rowY, tableWidth, rowHeight, index % 2 === 0 ? surface : background);
    strokeRect(tableX, rowY, tableWidth, rowHeight, border, 0.5);
    let columnX = tableX;
    columns.slice(0, -1).forEach(width => {
      columnX += width;
      drawLine(columnX, rowY, columnX, rowY + rowHeight, border, 0.5);
    });
    if (entry.number === 0) {
      drawText(entry.prompt, tableX + columns[0] + 8, rowY + rowHeight / 2 - 2, 8, muted);
    } else {
      const compact = rowHeight < 30;
      const textTop = rowY + rowHeight - (compact ? 10 : 13);
      drawText(`${entry.number}`, tableX + columns[0] / 2, rowY + rowHeight / 2 - 2, 8, navy, 'center');
      drawCellText(entry.prompt, tableX + columns[0] + 8, textTop, compact ? 42 : 50, compact ? 1 : 2, compact ? 6.5 : 7.2, ink);
      drawCellText(entry.answer, tableX + columns[0] + columns[1] + 8, textTop, compact ? 42 : 50, compact ? 1 : 2, compact ? 6.5 : 7.2, ink);
      const mark = entry.correct === null ? '-' : entry.correct ? '1/1' : '0/1';
      const markX = tableX + columns[0] + columns[1] + columns[2] + columns[3] / 2;
      drawText(mark, markX, rowY + rowHeight / 2 + (compact ? 1 : 4), compact ? 7.5 : 8.5, entry.correct === true ? teal : entry.correct === false ? '#a84949' : gold, 'center');
      if (!compact) drawText(reviewStatusLabel(entry.correct), markX, rowY + rowHeight / 2 - 8, 5.5, muted, 'center');
      drawCellText(entry.feedback || '—', tableX + columns[0] + columns[1] + columns[2] + columns[3] + 7, textTop, compact ? 18 : 22, compact ? 1 : 2, compact ? 6.5 : 7.2, muted);
    }
    currentY = rowY;
  });

  const remaining = reportEntries.length - visibleEntries.length;
  const footerText = remaining > 0
    ? `+ ${remaining} soal lainnya diringkas di aplikasi. `
    : '';
  const reviewerNote = attempt.reviewFeedback ? `Catatan korektor: ${normalizedPdfText(attempt.reviewFeedback).slice(0, 120)}` : '';
  drawText(`${footerText}${reviewerNote}`, 44, 63, 7, muted);
  drawText('Dokumen ini merupakan ringkasan penilaian post-test peserta.', 798, 63, 7, muted, 'right');

  const content = commands.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
  ];
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

const downloadQuizReport = (attempt: QuizAttempt, quiz: CourseQuiz | null, courseTitle: string) => {
  const blob = createQuizReportPdf(attempt, quiz, courseTitle);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `raport-post-test-${reviewFilePart(attempt.participantName)}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const drawCanvasRoundedRect = (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
};

const wrapCanvasText = (context: CanvasRenderingContext2D, value: string, maxWidth: number, maxLines: number) => {
  const paragraphs = value.split(/\r?\n/);
  const lines: string[] = [];
  let wasTruncated = false;

  paragraphLoop: for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex += 1) {
    const paragraph = paragraphs[paragraphIndex];
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      if (lines.length < maxLines) lines.push('');
      else wasTruncated = true;
      continue;
    }

    let line = '';
    for (let wordIndex = 0; wordIndex < words.length; wordIndex += 1) {
      const word = words[wordIndex];
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width <= maxWidth || !line) {
        line = candidate;
        continue;
      }
      lines.push(line);
      if (lines.length >= maxLines) {
        wasTruncated = true;
        break paragraphLoop;
      }
      line = word;
    }
    if (wasTruncated) break;
    if (line) lines.push(line);
    if (lines.length >= maxLines) {
      wasTruncated = paragraphIndex < paragraphs.length - 1;
      break;
    }
  }

  const visibleLines = lines.slice(0, maxLines);
  if (wasTruncated && visibleLines.length) {
    let lastLine = visibleLines[visibleLines.length - 1].replace(/\s+$/, '');
    while (lastLine.length > 1 && context.measureText(`${lastLine}…`).width > maxWidth) lastLine = lastLine.slice(0, -1);
    visibleLines[visibleLines.length - 1] = `${lastLine}…`;
  }
  return visibleLines.length ? visibleLines : [''];
};

const loadCanvasImage = (source: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Logo gagal dimuat.'));
  image.src = source;
});

const drawCanvasImageContain = (context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) => {
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
};

const createReviewCardImage = async (feedback: ClassFeedbackSubmission, courseTitle: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1350;
  const measurementContext = canvas.getContext('2d');
  if (!measurementContext) throw new Error('Browser tidak mendukung pembuatan gambar review.');

  const colors = {
    background: '#f3f7fa',
    surface: '#ffffff',
    navy: '#173b5e',
    muted: '#65798d',
    border: '#d8e3ec',
    teal: '#0f766e',
    star: '#f59e0b'
  };
  const cardX = 72;
  const cardTop = 370;
  const cardWidth = canvas.width - cardX * 2;
  const feedbackText = plainText(feedback.feedback) || 'Tidak ada feedback tertulis.';
  measurementContext.font = '500 36px Arial, sans-serif';
  const feedbackLines = wrapCanvasText(measurementContext, feedbackText, cardWidth - 150, 14);
  const feedbackTopOffset = 190;
  const feedbackLineHeight = 56;
  const starsOffset = feedbackTopOffset + feedbackLines.length * feedbackLineHeight + 44;
  const authorOffset = starsOffset + 72;
  const dateOffset = authorOffset + 42;
  const cardHeight = Math.max(720, dateOffset + 52);
  const footerY = cardTop + cardHeight + 130;
  canvas.height = footerY + 60;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Browser tidak mendukung pembuatan gambar review.');

  context.fillStyle = colors.background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = colors.navy;
  context.fillRect(0, 0, canvas.width, 14);

  try {
    const logo = await loadCanvasImage(logoUtama);
    drawCanvasImageContain(context, logo, 82, 56, 92, 66);
  } catch {
    // Kartu tetap dapat dibuat bila logo gagal dimuat.
  }
  context.fillStyle = colors.navy;
  context.font = '700 24px Arial, sans-serif';
  context.fillText('ARUNIKA LEARNING HUB', 204, 92);
  context.fillStyle = colors.navy;
  context.font = '700 52px Arial, sans-serif';
  const titleLines = wrapCanvasText(context, plainText(courseTitle) || 'Kelas Arunika', cardWidth, 2);
  titleLines.forEach((line, index) => context.fillText(line, cardX, 276 + index * 62));

  drawCanvasRoundedRect(context, cardX, cardTop, cardWidth, cardHeight, 34);
  context.fillStyle = colors.surface;
  context.fill();
  context.strokeStyle = colors.border;
  context.lineWidth = 3;
  context.stroke();

  context.fillStyle = colors.teal;
  context.font = '700 86px Georgia, serif';
  context.fillText('“', cardX + 54, cardTop + 134);

  context.fillStyle = colors.navy;
  context.font = '500 36px Arial, sans-serif';
  feedbackLines.forEach((line, index) => context.fillText(line, cardX + 70, cardTop + 190 + index * 56));

  const rating = Math.min(5, Math.max(0, Number(feedback.rating) || 0));
  const starsY = cardTop + starsOffset;
  context.font = '700 48px Arial, sans-serif';
  context.fillStyle = colors.star;
  context.fillText('★'.repeat(rating), cardX + 70, starsY);
  const filledStarWidth = context.measureText('★'.repeat(rating)).width;
  context.fillStyle = colors.border;
  context.fillText('★'.repeat(5 - rating), cardX + 70 + filledStarWidth, starsY);
  context.fillStyle = colors.navy;
  context.font = '700 28px Arial, sans-serif';
  context.fillText(`${rating}/5`, cardX + 385, starsY - 4);

  context.font = '700 30px Arial, sans-serif';
  context.fillText(plainText(feedback.participantName) || 'Peserta kelas', cardX + 70, cardTop + authorOffset);
  context.fillStyle = colors.muted;
  context.font = '500 22px Arial, sans-serif';
  const submittedAt = feedback.submittedAt ? new Date(feedback.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  context.fillText(submittedAt, cardX + 70, cardTop + dateOffset);

  context.fillStyle = colors.muted;
  context.font = '600 22px Arial, sans-serif';
  context.textAlign = 'center';
  context.fillText('Made with @arunika 2026', canvas.width / 2, footerY);
  context.textAlign = 'start';
  return canvas.toDataURL('image/png');
};

const reviewFilePart = (value: unknown) => plainText(value)
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 70) || 'kelas';

const ReviewCardModal: React.FC<{
  feedback: ClassFeedbackSubmission;
  courseTitle: string;
  onClose: () => void;
}> = ({ feedback, courseTitle, onClose }) => {
  const [imageUrl, setImageUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    let isCancelled = false;
    setImageUrl('');
    setIsGenerating(true);
    setError(null);
    void createReviewCardImage(feedback, courseTitle)
      .then(url => {
        if (isCancelled) return;
        setImageUrl(url);
        setIsGenerating(false);
      })
      .catch(generationError => {
        if (isCancelled) return;
        setError(generationError instanceof Error ? generationError.message : 'Card review gagal dibuat.');
        setIsGenerating(false);
      });
    return () => { isCancelled = true; };
  }, [courseTitle, feedback]);

  const handleDownload = () => {
    if (!imageUrl) return;
    const anchor = document.createElement('a');
    anchor.href = imageUrl;
    anchor.download = `card-review-${reviewFilePart(feedback.participantName)}-${reviewFilePart(courseTitle)}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  return (
    <div
      className="fixed inset-0 z-[1150] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="arunika-review-card-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5 sm:p-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Card review otomatis</p>
            <h2 id="arunika-review-card-title" className="mt-2 text-xl font-bold">Review {feedback.participantName || 'peserta'}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{courseTitle || 'Kelas Arunika'} · {feedback.rating}/5</p>
          </div>
          <button type="button" aria-label="Tutup card review" onClick={onClose} className="rounded-xl p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--text)]"><X size={19} /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {isGenerating ? (
            <div className="flex min-h-80 items-center justify-center gap-3 text-sm text-[var(--muted)]"><Loader2 size={18} className="animate-spin" /> Membuat card review...</div>
          ) : error ? (
            <div className="flex min-h-80 items-center justify-center rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] p-5 text-center text-sm text-[var(--danger-text)]">{error}</div>
          ) : imageUrl ? (
            <img src={imageUrl} alt={`Card review ${feedback.participantName || 'peserta'} untuk ${courseTitle || 'kelas'}`} className="mx-auto w-full max-w-lg rounded-xl border border-[var(--border)] shadow-sm" />
          ) : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] p-4 sm:p-5">
          <Button type="button" variant="secondary" onClick={onClose}>Tutup</Button>
          <Button type="button" icon={Download} onClick={handleDownload} disabled={!imageUrl}>Download PNG</Button>
        </div>
      </div>
    </div>
  );
};

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

type NoticeTone = 'success' | 'error';

const NoticeModal: React.FC<{
  notice: { tone: NoticeTone; title: string; message: string } | null;
  onClose: () => void;
}> = ({ notice, onClose }) => {
  if (!notice) return null;
  const isSuccess = notice.tone === 'success';
  const Icon = isSuccess ? CheckCircle2 : XCircle;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-sm" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="arunika-notice-title"
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
      >
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isSuccess ? 'bg-[var(--success-soft)] text-[var(--success-text)]' : 'bg-[var(--danger-soft)] text-[var(--danger-text)]'}`}>
            <Icon size={23} />
          </div>
          <div className="min-w-0">
            <h2 id="arunika-notice-title" className="text-lg font-semibold">{notice.title}</h2>
            <p className="text-sm text-[var(--muted)] leading-relaxed mt-2">{notice.message}</p>
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <Button variant={isSuccess ? 'green' : 'secondary'} onClick={onClose}>Tutup</Button>
        </div>
      </div>
    </div>
  );
};

const CopyLinkModal: React.FC<{ url: string | null; onClose: () => void }> = ({ url, onClose }) => {
  if (!url) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-sm" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="arunika-copy-link-title" className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
        <h2 id="arunika-copy-link-title" className="text-lg font-semibold">Salin link publik</h2>
        <p className="text-sm text-[var(--muted)] leading-relaxed mt-2">Salin link berikut untuk membagikan kelas kepada peserta.</p>
        <Input label="Link kelas" value={url} readOnly onFocus={event => event.currentTarget.select()} className="mt-5 text-xs" />
        <div className="flex justify-end mt-6">
          <Button variant="secondary" onClick={onClose}>Tutup</Button>
        </div>
      </div>
    </div>
  );
};

const questionTypeLabel = (type: QuizQuestionType | string | undefined) => {
  if (type === 'long_answer') return 'Jawaban panjang';
  if (type === 'true_false') return 'Benar / Salah';
  return 'Pilihan ganda';
};

const AssessmentReportPreviewModal: React.FC<{
  attempt: QuizAttempt;
  quiz: CourseQuiz | null;
  courseTitle: string;
  onClose: () => void;
  onDownload: () => void;
}> = ({ attempt, quiz, courseTitle, onClose, onDownload }) => {
  const entries = buildQuizAnswerEntries(attempt, quiz);
  const summary = calculateReviewedAttempt(attempt, quiz, attempt.reviewedAnswers || {});
  const statusLabel = summary.needsReview ? 'Menunggu review' : summary.passed ? 'Lulus' : 'Belum lulus';
  const visibleEntries = entries.slice(0, 11);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[1250] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-5"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="arunika-report-preview-title"
        className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-4 sm:p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Preview raport PDF</p>
            <h2 id="arunika-report-preview-title" className="mt-1 text-lg font-bold">Raport penilaian {attempt.participantName}</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">Periksa ringkasan satu halaman sebelum mengunduh file PDF.</p>
          </div>
          <button type="button" aria-label="Tutup preview raport" onClick={onClose} className="rounded-xl p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--text)]"><X size={19} /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3 sm:p-6">
          <div className="mx-auto min-w-[760px] max-w-[1040px] rounded-lg border-[3px] border-[#173f5f] bg-[#f6f9fb] p-4 shadow-lg sm:p-7">
            <div className="rounded-md border border-[#0f766e] p-4 sm:p-6">
              <div className="flex items-start justify-between gap-6 border-b border-[#c9d9e4] pb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><span className="h-1.5 w-12 bg-[#0f766e]" /><span className="h-1.5 w-6 bg-[#d89b3c]" /></div>
                  <p className="mt-3 text-[10px] font-bold tracking-[0.2em] text-[#0f766e]">ARUNIKA LEARNING HUB</p>
                  <h3 className="mt-2 text-xl font-bold tracking-tight text-[#173f5f] sm:text-3xl">LAPORAN PENILAIAN POST-TEST</h3>
                  <p className="mt-1 text-xs text-[#667b8f]">Ringkasan penilaian peserta</p>
                </div>
                <div className="w-32 shrink-0 rounded-lg border border-[#c9d9e4] bg-[#edf4f8] px-3 py-3 text-center sm:w-40 sm:px-4">
                  <p className="text-[9px] font-bold tracking-[0.15em] text-[#667b8f]">NILAI AKHIR</p>
                  <p className="mt-1 text-2xl font-bold text-[#173f5f] sm:text-3xl">{summary.score}/100</p>
                  <p className={`mt-1 text-[10px] font-bold ${summary.needsReview ? 'text-[#b7791f]' : summary.passed ? 'text-[#0f766e]' : 'text-[#a84949]'}`}>{statusLabel}</p>
                </div>
              </div>

              <div className="grid gap-x-6 gap-y-3 border-b border-[#c9d9e4] py-4 text-xs sm:grid-cols-3">
                <div><p className="text-[9px] font-bold uppercase tracking-wide text-[#667b8f]">Peserta</p><p className="mt-1 truncate font-semibold text-[#1f3448]">{attempt.participantName || '—'}</p></div>
                <div><p className="text-[9px] font-bold uppercase tracking-wide text-[#667b8f]">Email</p><p className="mt-1 truncate font-semibold text-[#1f3448]">{attempt.participantEmail || '—'}</p></div>
                <div><p className="text-[9px] font-bold uppercase tracking-wide text-[#667b8f]">Kelas</p><p className="mt-1 truncate font-semibold text-[#1f3448]">{courseTitle || 'Kelas Arunika'}</p></div>
                <div><p className="text-[9px] font-bold uppercase tracking-wide text-[#667b8f]">Percobaan</p><p className="mt-1 font-semibold text-[#1f3448]">#{attempt.attemptNumber}</p></div>
                <div><p className="text-[9px] font-bold uppercase tracking-wide text-[#667b8f]">Waktu submit</p><p className="mt-1 font-semibold text-[#1f3448]">{attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString('id-ID') : '—'}</p></div>
                <div><p className="text-[9px] font-bold uppercase tracking-wide text-[#667b8f]">Direview</p><p className="mt-1 font-semibold text-[#1f3448]">{attempt.reviewedAt ? new Date(attempt.reviewedAt).toLocaleString('id-ID') : 'Belum direview'}</p></div>
              </div>

              <div className="grid grid-cols-4 gap-2 py-4 text-center sm:gap-3">
                <div className="rounded border border-[#c9d9e4] bg-white px-2 py-2"><p className="text-[8px] font-bold tracking-wide text-[#667b8f]">JUMLAH SOAL</p><p className="mt-1 text-sm font-bold text-[#173f5f]">{summary.totalQuestions}</p></div>
                <div className="rounded border border-[#c9d9e4] bg-white px-2 py-2"><p className="text-[8px] font-bold tracking-wide text-[#667b8f]">SUDAH DINILAI</p><p className="mt-1 text-sm font-bold text-[#173f5f]">{summary.gradedQuestions}/{summary.totalQuestions}</p></div>
                <div className="rounded border border-[#c9d9e4] bg-white px-2 py-2"><p className="text-[8px] font-bold tracking-wide text-[#667b8f]">JAWABAN BENAR</p><p className="mt-1 text-sm font-bold text-[#173f5f]">{summary.correctAnswers}/{summary.totalQuestions}</p></div>
                <div className="rounded border border-[#c9d9e4] bg-white px-2 py-2"><p className="text-[8px] font-bold tracking-wide text-[#667b8f]">RUMUS NILAI</p><p className="mt-1 text-[11px] font-bold text-[#173f5f]">{summary.totalQuestions > 0 ? `${summary.correctAnswers}/${summary.totalQuestions} x 100` : '—'}</p></div>
              </div>

              <div className="overflow-hidden rounded border border-[#c9d9e4] bg-white">
                <table className="w-full table-fixed text-left text-[10px] text-[#1f3448]">
                  <colgroup><col className="w-[7%]" /><col className="w-[30%]" /><col className="w-[30%]" /><col className="w-[11%]" /><col className="w-[22%]" /></colgroup>
                  <thead className="bg-[#173f5f] text-[9px] font-bold tracking-wide text-white"><tr><th className="px-2 py-2 text-center">NO</th><th className="px-2 py-2">RINGKASAN SOAL</th><th className="px-2 py-2">JAWABAN PESERTA</th><th className="px-2 py-2 text-center">NILAI</th><th className="px-2 py-2">FEEDBACK</th></tr></thead>
                  <tbody>
                    {visibleEntries.length > 0 ? visibleEntries.map((entry, index) => (
                      <tr key={`${attempt.id}-preview-${entry.id}`} className={index % 2 === 0 ? 'bg-white' : 'bg-[#f6f9fb]'}>
                        <td className="border-t border-[#c9d9e4] px-2 py-2 text-center font-bold">{entry.number}</td>
                        <td className="max-h-12 overflow-hidden border-t border-[#c9d9e4] px-2 py-2 align-top"><p className="max-h-9 overflow-hidden leading-tight">{entry.prompt}</p></td>
                        <td className="max-h-12 overflow-hidden border-t border-[#c9d9e4] px-2 py-2 align-top"><p className="max-h-9 overflow-hidden leading-tight">{entry.answer}</p></td>
                        <td className={`border-t border-[#c9d9e4] px-2 py-2 text-center align-top font-bold ${entry.correct === true ? 'text-[#0f766e]' : entry.correct === false ? 'text-[#a84949]' : 'text-[#b7791f]'}`}><p>{entry.correct === null ? '—' : entry.correct ? '1/1' : '0/1'}</p><p className="mt-0.5 text-[8px] font-medium text-[#667b8f]">{reviewStatusLabel(entry.correct)}</p></td>
                        <td className="max-h-12 overflow-hidden border-t border-[#c9d9e4] px-2 py-2 align-top text-[#667b8f]"><p className="max-h-9 overflow-hidden leading-tight">{entry.feedback || '—'}</p></td>
                      </tr>
                    )) : <tr><td colSpan={5} className="px-3 py-6 text-center text-[#667b8f]">Belum ada jawaban untuk ditampilkan.</td></tr>}
                  </tbody>
                </table>
              </div>

              <div className="flex items-end justify-between gap-4 pt-4 text-[9px] text-[#667b8f]"><p className="max-w-[70%] truncate">{entries.length > visibleEntries.length ? `+ ${entries.length - visibleEntries.length} soal lainnya diringkas di aplikasi.` : attempt.reviewFeedback ? `Catatan korektor: ${plainText(attempt.reviewFeedback).slice(0, 130)}` : 'Dokumen ini merupakan ringkasan penilaian post-test peserta.'}</p><p className="shrink-0 font-semibold">Made with @arunika 2026</p></div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] p-4 sm:p-5">
          <Button type="button" variant="secondary" onClick={onClose}>Tutup preview</Button>
          <Button type="button" icon={Download} onClick={onDownload}>Download PDF</Button>
        </div>
      </div>
    </div>
  );
};

const AnswerReviewModal: React.FC<{
  attempt: QuizAttempt;
  quiz: CourseQuiz | null;
  overallFeedback: ClassFeedbackSubmission | null;
  onClose: () => void;
  onSave: (reviews: Record<string, QuizAnswerReview>, reviewFeedback: string | null) => Promise<void>;
  onOpenReportPreview: () => void;
}> = ({ attempt, quiz, overallFeedback, onClose, onSave, onOpenReportPreview }) => {
  const createInitialReviews = useCallback(() => buildQuizAnswerEntries(attempt, quiz).reduce<Record<string, QuizAnswerReview>>((reviews, entry) => {
    reviews[entry.id] = { correct: entry.correct, feedback: entry.feedback };
    return reviews;
  }, {}), [attempt, quiz]);
  const [draftReviews, setDraftReviews] = useState<Record<string, QuizAnswerReview>>(createInitialReviews);
  const [draftReviewFeedback, setDraftReviewFeedback] = useState(attempt.reviewFeedback || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setDraftReviews(createInitialReviews());
    setDraftReviewFeedback(attempt.reviewFeedback || '');
    setSaveError(null);
    setSaveSuccess(false);
  }, [attempt.id, attempt.reviewedAt, createInitialReviews, attempt.reviewFeedback]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSaving, onClose]);

  const answerEntries = useMemo(() => buildQuizAnswerEntries({ ...attempt, reviewedAnswers: draftReviews }, quiz), [attempt, draftReviews, quiz]);
  const reviewSummary = useMemo(() => calculateReviewedAttempt(attempt, quiz, draftReviews), [attempt, draftReviews, quiz]);
  const statusLabel = reviewSummary.needsReview ? 'Menunggu review' : reviewSummary.passed ? 'Lulus' : 'Belum lulus';
  const statusClass = reviewSummary.needsReview
    ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]'
    : reviewSummary.passed
      ? 'bg-[var(--success-soft)] text-[var(--success-text)]'
      : 'bg-[var(--danger-soft)] text-[var(--danger-text)]';
  const submittedAt = attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString('id-ID') : '—';
  const postTestFeedback = plainText(attempt.classFeedback);
  const overallFeedbackText = plainText(overallFeedback?.feedback);

  const updateReviewStatus = (id: string, value: string) => {
    setDraftReviews(current => ({
      ...current,
      [id]: { correct: value === 'pending' ? null : value === 'correct', feedback: current[id]?.feedback || '' }
    }));
    setSaveSuccess(false);
  };

  const updateReviewFeedback = (id: string, feedback: string) => {
    setDraftReviews(current => ({
      ...current,
      [id]: { correct: current[id]?.correct ?? null, feedback }
    }));
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await onSave(draftReviews, draftReviewFeedback.trim() || null);
      setSaveSuccess(true);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Review gagal disimpan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1200] !mt-0 isolate flex h-[100dvh] min-h-screen w-full items-center justify-center overflow-y-auto overscroll-contain bg-slate-950/75 p-4 backdrop-blur-md sm:p-6"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="arunika-answer-review-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5 sm:p-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Review post-test</p>
            <h2 id="arunika-answer-review-title" className="mt-2 text-xl font-bold">{attempt.participantName}</h2>
            <p className="mt-1 break-all text-sm text-[var(--muted)]">{attempt.participantEmail}</p>
            <p className="mt-2 text-xs text-[var(--muted)]">Tandai tiap jawaban, tulis feedback, lalu simpan penilaian peserta.</p>
          </div>
          <button type="button" aria-label="Tutup detail peserta" onClick={onClose} disabled={isSaving} className="rounded-xl p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--text)] disabled:opacity-50"><X size={19} /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Nilai</p><p className="mt-1 text-lg font-bold">{reviewSummary.score}</p></div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Jawaban benar</p><p className="mt-1 text-lg font-bold">{reviewSummary.correctAnswers}/{reviewSummary.totalQuestions}</p></div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Status</p><span className={`mt-1 inline-flex rounded-lg px-2 py-1 text-xs font-semibold ${statusClass}`}>{statusLabel}</span></div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Percobaan</p><p className="mt-1 text-lg font-bold">#{attempt.attemptNumber}</p></div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Dikirim</p><p className="mt-1 text-xs font-semibold leading-relaxed">{submittedAt}</p></div>
          </div>

          {(postTestFeedback || overallFeedback) && (
            <section className="space-y-3">
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Feedback peserta</p><h3 className="mt-1 text-lg font-bold">Konteks feedback kelas</h3></div>
              <div className="grid gap-3 md:grid-cols-2">
                {postTestFeedback && <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4"><p className="text-xs font-semibold text-[var(--muted)]">Feedback saat post-test</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{postTestFeedback}</p></div>}
                {overallFeedback && <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-[var(--muted)]">Feedback keseluruhan kelas</p><span className="rounded-lg bg-[var(--success-soft)] px-2 py-1 text-xs font-semibold text-[var(--success-text)]">{overallFeedback.rating}/5</span></div>{overallFeedbackText && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{overallFeedbackText}</p>}<p className="mt-3 break-all text-xs text-[var(--muted)]">Email sertifikat: {overallFeedback.certificateEmail || '—'}</p></div>}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Koreksi jawaban</p><h3 className="mt-1 text-lg font-bold">Nilai dan feedback per pertanyaan</h3></div><p className="text-xs text-[var(--muted)]">{answerEntries.length} pertanyaan</p></div>
            {answerEntries.length > 0 ? (
              <div className="space-y-3">
                {answerEntries.map(entry => {
                  const draft = draftReviews[entry.id] || { correct: entry.correct, feedback: entry.feedback };
                  const statusValue = draft.correct === true ? 'correct' : draft.correct === false ? 'incorrect' : 'pending';
                  return (
                    <article key={`${attempt.id}-${entry.id}`} className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3"><p className="min-w-0 flex-1 text-sm font-semibold leading-relaxed"><span className="mr-2 text-[var(--muted)]">{entry.number}.</span>{entry.prompt}</p><span className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{questionTypeLabel(entry.type)}</span></div>
                      <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Jawaban peserta</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">{entry.answer}</p></div>
                      {entry.correctAnswer && <p className="mt-3 text-xs text-[var(--muted)]">Kunci jawaban: <span className="font-semibold text-[var(--text)]">{entry.correctAnswer}</span></p>}
                      <p className="mt-3 text-xs text-[var(--muted)]">Penilaian soal: <span className="font-semibold text-[var(--text)]">{entry.correct === null ? 'Belum dinilai' : entry.correct ? '1/1' : '0/1'}</span></p>
                      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,220px)_1fr] md:items-end">
                        <label className="flex flex-col gap-2"><span className="text-xs font-semibold text-[var(--muted)]">Status koreksi</span><select value={statusValue} onChange={event => updateReviewStatus(entry.id, event.target.value)} className="min-h-[46px] w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"><option value="pending">Menunggu review</option><option value="correct">Benar</option><option value="incorrect">Salah</option></select></label>
                        <Textarea label="Feedback untuk peserta (opsional)" value={draft.feedback} onChange={event => updateReviewFeedback(entry.id, event.target.value)} placeholder="Tulis catatan untuk jawaban ini..." className="min-h-[88px]" maxLength={2000} />
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--muted)]">Tidak ada jawaban yang tersimpan untuk percobaan ini.</div>}
          </section>

          <Textarea label="Catatan korektor keseluruhan (opsional)" value={draftReviewFeedback} onChange={event => { setDraftReviewFeedback(event.target.value); setSaveSuccess(false); }} placeholder="Tambahkan ringkasan penilaian peserta..." maxLength={5000} />
          {saveError && <p className="rounded-xl border border-[var(--danger-text)]/30 bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger-text)]">{saveError}</p>}
          {saveSuccess && <p className="rounded-xl border border-[var(--success-text)]/30 bg-[var(--success-soft)] p-3 text-sm text-[var(--success-text)]">Review dan nilai peserta berhasil disimpan.</p>}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] p-4 sm:p-5">
          <Button variant="secondary" icon={FileText} onClick={onOpenReportPreview}>Preview raport PDF</Button>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>Tutup</Button>
          <Button icon={Save} onClick={handleSave} isLoading={isSaving}>Simpan penilaian</Button>
        </div>
      </div>
    </div>
  );
};

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

const CoverUploader: React.FC<{ value: string; onChange: (value: string) => void; onError?: (message: string) => void }> = ({ value, onChange, onError }) => {
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
      onError?.(error?.message || 'Gambar gagal diproses.');
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
            <p className="text-xs">Cover {RECORDED_CLASS_SPACE_LABEL} 16:9</p>
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
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-6 xl:p-8">
      <div>
        <Badge>Learning Spaces</Badge>
        <h1 className="text-3xl font-bold mt-4">Pilih ruang yang ingin dikelola</h1>
        <p className="text-sm text-[var(--muted)] mt-2 max-w-2xl leading-relaxed">
          Tutorial produk dan {RECORDED_CLASS_SPACE_LABEL} memakai alur publik yang berbeda, sehingga materi produk tetap rapi sementara webinar dapat memiliki post-test dan hasil peserta.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Link to="/admin/products" className="group block">
          <Card className="h-full p-4 group-hover:border-[var(--border-strong)] md:p-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
              <BookOpen size={19} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Space 01</p>
                <h2 className="mt-1.5 text-lg font-bold">Tutorial Produk Digital</h2>
              </div>
              <Badge>{productCount} Kursus</Badge>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">Materi tutorial produk, video panduan, teks, dan asset unduhan seperti yang sudah digunakan saat ini.</p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent-strong)]">Buka ruang <ChevronRight size={15} /></span>
          </Card>
        </Link>

        <Link to="/admin/classes" className="group block">
          <Card className="h-full p-4 group-hover:border-[var(--border-strong)] md:p-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--success-soft)] text-[var(--success-text)]">
              <GraduationCap size={19} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Space 02</p>
                <h2 className="mt-1.5 text-lg font-bold">{RECORDED_CLASS_SPACE_LABEL}</h2>
              </div>
              <Badge color="var(--success-soft)">{classCount} Kelas</Badge>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">Recording webinar, materi pendukung, asset kelas, post-test otomatis, dan rekap hasil peserta.</p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[var(--success-text)]">Buka ruang <ChevronRight size={15} /></span>
          </Card>
        </Link>

        <Link to="/admin/forms" className="group block">
          <Card className="h-full p-4 group-hover:border-[var(--border-strong)] md:p-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
              <ClipboardCheck size={19} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Space 03</p>
                <h2 className="mt-1.5 text-lg font-bold">Form Maker</h2>
              </div>
              <Badge>Event</Badge>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">Bangun form pendaftaran, kumpulkan responder, dan kelola status konfirmasi atau pembayaran.</p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent-strong)]">Buka ruang <ChevronRight size={15} /></span>
          </Card>
        </Link>

        <Link to="/admin/qna" className="group block">
          <Card className="h-full p-4 group-hover:border-[var(--border-strong)] md:p-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-[var(--accent-strong)]">
              <HelpCircle size={19} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Space 04</p>
                <h2 className="mt-1.5 text-lg font-bold">Q&amp;A Audience</h2>
              </div>
              <Badge>Realtime</Badge>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">Kumpulkan pertanyaan audience, moderasi sebelum tampil, voting, dan layar presenter untuk webinar.</p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent-strong)]">Buka ruang <ChevronRight size={15} /></span>
          </Card>
        </Link>

        <Link to="/admin/landing-pages" className="group block">
          <Card className="h-full p-4 group-hover:border-[var(--border-strong)] md:p-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
              <Layout size={19} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Space 05</p>
                <h2 className="mt-1.5 text-lg font-bold">Landing Page</h2>
              </div>
              <Badge>Promosi</Badge>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">Susun halaman promosi produk dengan blok drag-and-drop, CTA, dan informasi pembayaran QR Code.</p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent-strong)]">Buka ruang <ChevronRight size={15} /></span>
          </Card>
        </Link>

        <Link to="/admin/catalog-pages" className="group block">
          <Card className="h-full p-4 group-hover:border-[var(--border-strong)] md:p-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--success-soft)] text-[var(--success-text)]">
              <LayoutGrid size={19} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Space 06</p>
                <h2 className="mt-1.5 text-lg font-bold">Katalog Produk</h2>
              </div>
              <Badge color="var(--success-soft)">Link-in-bio</Badge>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">Satukan beberapa landing page dalam satu katalog produk yang mudah dibagikan.</p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[var(--success-text)]">Buka ruang <ChevronRight size={15} /></span>
          </Card>
        </Link>

        <Link to="/admin/video-clipper" className="group block">
          <Card className="h-full p-4 group-hover:border-[var(--border-strong)] md:p-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
              <Scissors size={19} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Space 07</p>
                <h2 className="mt-1.5 text-lg font-bold">Video Clipper</h2>
              </div>
              <Badge>Tools</Badge>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">Potong video yang Anda miliki menjadi preview pendek dan download hasilnya untuk Landing Page.</p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent-strong)]">Buka tools <ChevronRight size={15} /></span>
          </Card>
        </Link>

        <Link to="/admin/one-to-one" className="group block">
          <Card className="h-full p-4 group-hover:border-[var(--border-strong)] md:p-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--success-soft)] text-[var(--success-text)]">
              <Users size={19} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Space 08</p>
                <h2 className="mt-1.5 text-lg font-bold">1:1 Mentorship</h2>
              </div>
              <Badge color="var(--success-soft)">Privat</Badge>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]">Buat dashboard personal per mentee untuk recording, kalender, task, dan catatan mentor dengan link tanpa login.</p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[var(--success-text)]">Buka ruang <ChevronRight size={15} /></span>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export const RecordedClassesPage: React.FC<{
  courses: Course[];
  onCreateCourse: (course: Course) => Promise<void>;
  onDuplicateCourse: (course: Course) => Promise<Course>;
  onDeleteCourse: (id: string) => Promise<void>;
  generateShareLink: (courseId: string) => string;
  copyText: (text: string) => Promise<void>;
}> = ({ courses, onCreateCourse, onDuplicateCourse, onDeleteCourse, generateShareLink, copyText }) => {
  const navigate = useNavigate();
  const recordedClasses = courses.filter(course => course.spaceType === 'recorded_class');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: NoticeTone; title: string; message: string } | null>(null);
  const [copyFallbackUrl, setCopyFallbackUrl] = useState<string | null>(null);

  const handleAdd = async () => {
    const newClass: Course = {
      id: `course-${Date.now()}`,
      title: `${RECORDED_CLASS_SPACE_LABEL} Baru`,
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
      setNotice({ tone: 'error', title: 'Kelas belum dapat dibuat', message: databaseErrorMessage(error) });
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
      setCopyFallbackUrl(url);
    }
  };

  const handleDuplicate = async (course: Course) => {
    setDuplicatingId(course.id);
    try {
      const duplicatedCourse = await onDuplicateCourse(course);
      navigate(`/admin/classes/${duplicatedCourse.id}`);
    } catch (error) {
      console.error('Recorded class duplication failed', error);
      setNotice({ tone: 'error', title: 'Kelas belum dapat diduplikasi', message: databaseErrorMessage(error) });
    } finally {
      setDuplicatingId(null);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <Link to="/admin" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent-strong)] mb-3">
            <ArrowLeft size={14} /> Semua Space
          </Link>
          <h1 className="text-3xl font-bold">{RECORDED_CLASS_SPACE_LABEL}</h1>
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
                <Badge color="var(--success-soft)">{RECORDED_CLASS_SPACE_LABEL}</Badge>
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
                <Button
                  variant="secondary"
                  className="col-span-2 text-xs px-2"
                  icon={Copy}
                  isLoading={duplicatingId === course.id}
                  disabled={duplicatingId !== null}
                  onClick={() => { void handleDuplicate(course); }}
                >
                  Duplikasi kelas
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
            <p className="font-semibold">Belum ada {RECORDED_CLASS_SPACE_LABEL}</p>
            <p className="text-[var(--muted)] text-sm mt-1">Buat kelas pertama untuk webinar atau kelas rekaman Anda.</p>
          </div>
          <Button icon={Plus} onClick={handleAdd} isLoading={isCreating} disabled={isCreating} className="mx-auto">Buat Kelas Pertama</Button>
        </div>
      )}

      <NoticeModal notice={notice} onClose={() => setNotice(null)} />
      <CopyLinkModal url={copyFallbackUrl} onClose={() => setCopyFallbackUrl(null)} />
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
  const [notice, setNotice] = useState<{ tone: NoticeTone; title: string; message: string } | null>(null);

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
    if (!course.title.trim()) {
      setNotice({ tone: 'error', title: 'Judul kelas belum diisi', message: 'Isi judul kelas terlebih dahulu sebelum menyimpan perubahan.' });
      return;
    }
    const quizValidation = validateQuiz();
    if (quizValidation) {
      setNotice({ tone: 'error', title: 'Post-test belum siap disimpan', message: quizValidation });
      return;
    }
    if (!client) {
      setNotice({ tone: 'error', title: 'Koneksi belum tersedia', message: 'Koneksi database belum tersedia. Periksa konfigurasi lalu coba lagi.' });
      return;
    }

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
      setNotice({
        tone: 'success',
        title: course.published ? 'Kelas berhasil dipublikasikan' : 'Draft kelas berhasil disimpan',
        message: course.published ? 'Kelas dan post-test berhasil disimpan serta dipublikasikan.' : 'Perubahan kelas dan post-test berhasil disimpan sebagai draft.'
      });
    } catch (error: any) {
      console.error('Recorded class save failed', error);
      setNotice({ tone: 'error', title: 'Gagal menyimpan kelas', message: databaseErrorMessage(error) });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 pb-28">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link to="/admin/classes" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent-strong)] mb-3">
            <ArrowLeft size={14} /> Daftar {RECORDED_CLASS_SPACE_LABEL}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">Editor {RECORDED_CLASS_SPACE_LABEL}</h1>
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

      <Card className="space-y-4">
        <div>
          <h2 className="font-semibold">Feedback Akhir Kelas</h2>
          <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">Atur apakah tab feedback keseluruhan dan form email sertifikat muncul di halaman publik kelas.</p>
        </div>
        <ToggleField
          checked={course.overallFeedbackEnabled !== false}
          onChange={overallFeedbackEnabled => updateCourse({ ...course, overallFeedbackEnabled })}
          label="Tampilkan tab Feedback Kelas"
          description="Jika dimatikan, peserta hanya melihat tab Materi dan Post-Test. Feedback post-test tetap mengikuti pengaturan di bawah."
        />
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
            <CoverUploader value={course.coverImage} onChange={coverImage => updateCourse({ ...course, coverImage })} onError={message => setNotice({ tone: 'error', title: 'Cover gagal diproses', message })} />
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

      <NoticeModal notice={notice} onClose={() => setNotice(null)} />
    </div>
  );
};

export const ClassResultsPage: React.FC<{ courses: Course[]; client: any }> = ({ courses, client }) => {
  const { id } = useParams<{ id: string }>();
  const course = courses.find(item => item.id === id);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [feedbackSubmissions, setFeedbackSubmissions] = useState<ClassFeedbackSubmission[]>([]);
  const [quiz, setQuiz] = useState<CourseQuiz | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttempt | null>(null);
  const [reportPreviewAttempt, setReportPreviewAttempt] = useState<QuizAttempt | null>(null);
  const [selectedFeedbackForCard, setSelectedFeedbackForCard] = useState<ClassFeedbackSubmission | null>(null);
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
    const [attemptResult, feedbackResult, quizResult] = await Promise.all([
      client.from('quiz_attempts').select('*').eq('course_id', id).order('submitted_at', { ascending: false }),
      client.from('class_feedback_submissions').select('*').eq('course_id', id).order('created_at', { ascending: false }),
      client.from('course_quizzes').select('*').eq('course_id', id).maybeSingle()
    ]);
    if (attemptResult.error) {
      console.error('Quiz result fetch failed', attemptResult.error);
      setLoadError(databaseErrorMessage(attemptResult.error));
    } else {
      setAttempts((attemptResult.data || []).map(mapAttemptRow));
    }
    if (feedbackResult.error) {
      console.warn('Class feedback fetch failed', feedbackResult.error);
      setFeedbackSubmissions([]);
    } else {
      setFeedbackSubmissions((feedbackResult.data || []).map(mapClassFeedbackRow));
    }
    if (quizResult.error) {
      console.warn('Quiz result question fetch failed', quizResult.error);
      setQuiz(null);
    } else {
      setQuiz(quizResult.data ? mapQuizRow(quizResult.data) : null);
    }
    setSelectedAttempt(null);
    setReportPreviewAttempt(null);
    setIsLoading(false);
  }, [client, id]);

  useEffect(() => { void fetchAttempts(); }, [fetchAttempts]);

  const stats = useMemo(() => {
    const participantCount = new Set(attempts.map(attempt => attempt.participantEmail.toLowerCase())).size;
    const average = attempts.length ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length) : 0;
    const reviewedAttempts = attempts.filter(attempt => !attempt.needsReview);
    const passRate = reviewedAttempts.length ? Math.round((reviewedAttempts.filter(attempt => attempt.passed).length / reviewedAttempts.length) * 100) : 0;
    const pendingReview = attempts.filter(attempt => attempt.needsReview).length;
    const averageRating = feedbackSubmissions.length ? (feedbackSubmissions.reduce((sum, feedback) => sum + feedback.rating, 0) / feedbackSubmissions.length).toFixed(1) : '—';
    return { participantCount, average, passRate, pendingReview, feedbackCount: feedbackSubmissions.length, averageRating };
  }, [attempts, feedbackSubmissions]);

  const exportCsv = () => {
    const rows = [
      ['Tipe', 'Nama', 'Email Peserta', 'Email Sertifikat', 'Nilai', 'Status', 'Percobaan', 'Rating', 'Feedback', 'Jawaban', 'Waktu Submit'],
      ...attempts.map(attempt => ['Post-Test', attempt.participantName, attempt.participantEmail, '', attempt.score, attempt.needsReview ? 'Menunggu review' : attempt.passed ? 'Lulus' : 'Belum Lulus', attempt.attemptNumber, '', attempt.classFeedback || '', JSON.stringify(attempt.answers), new Date(attempt.submittedAt).toLocaleString('id-ID')]),
      ...feedbackSubmissions.map(feedback => ['Feedback Kelas', feedback.participantName, feedback.participantEmail, feedback.certificateEmail, '', 'Selesai', '', feedback.rating, feedback.feedback, '', new Date(feedback.submittedAt).toLocaleString('id-ID')])
    ];
    const csv = rows.map(row => row.map(escapeCsv).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `hasil-kelas-${id}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const saveAttemptReview = async (attempt: QuizAttempt, reviews: Record<string, QuizAnswerReview>, reviewFeedback: string | null) => {
    if (!client) throw new Error('Koneksi Supabase belum tersedia.');
    const normalizedReviews = Object.entries(reviews).reduce<Record<string, QuizAnswerReview>>((result, [questionId, review]) => {
      result[questionId] = {
        correct: review?.correct === true ? true : review?.correct === false ? false : null,
        feedback: plainText(review?.feedback).slice(0, 2000)
      };
      return result;
    }, {});
    const summary = calculateReviewedAttempt(attempt, quiz, normalizedReviews);
    const { data, error } = await withRequestTimeout<any>(client
      .from('quiz_attempts')
      .update({
        reviewed_answers: normalizedReviews,
        review_feedback: reviewFeedback ? plainText(reviewFeedback).slice(0, 5000) : null,
        reviewed_at: new Date().toISOString(),
        score: summary.score,
        passed: summary.passed,
        needs_review: summary.needsReview
      })
      .eq('id', attempt.id)
      .select('*')
      .single());
    if (error) throw new Error(databaseErrorMessage(error));
    const updatedAttempt = data ? mapAttemptRow(data) : {
      ...attempt,
      reviewedAnswers: normalizedReviews,
      reviewFeedback,
      reviewedAt: new Date().toISOString(),
      ...summary
    };
    setAttempts(current => current.map(item => item.id === attempt.id ? updatedAttempt : item));
    setSelectedAttempt(updatedAttempt);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Link to="/admin/classes" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--muted)] hover:text-[var(--accent-strong)] mb-3"><ArrowLeft size={14} /> Daftar Kelas</Link>
          <h1 className="text-3xl font-bold">Hasil Kelas</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{course?.title || RECORDED_CLASS_SPACE_LABEL} · Post-test dan feedback keseluruhan</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={RefreshCw} onClick={fetchAttempts}>Refresh</Button>
          <Button icon={FileDown} disabled={attempts.length === 0 && feedbackSubmissions.length === 0} onClick={exportCsv}>Export CSV</Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card><p className="text-xs text-[var(--muted)]">Peserta Unik</p><p className="text-3xl font-bold mt-2">{stats.participantCount}</p></Card>
        <Card><p className="text-xs text-[var(--muted)]">Rata-rata Nilai</p><p className="text-3xl font-bold mt-2">{stats.average}</p></Card>
        <Card><p className="text-xs text-[var(--muted)]">Tingkat Kelulusan</p><p className="text-3xl font-bold mt-2">{stats.passRate}%</p></Card>
        <Card><p className="text-xs text-[var(--muted)]">Menunggu Review</p><p className="text-3xl font-bold mt-2">{stats.pendingReview}</p></Card>
        <Card><p className="text-xs text-[var(--muted)]">Feedback Masuk</p><p className="text-3xl font-bold mt-2">{stats.feedbackCount}</p></Card>
        <Card><p className="text-xs text-[var(--muted)]">Rating Rata-rata</p><p className="text-3xl font-bold mt-2">{stats.averageRating}</p></Card>
      </div>

      {isLoading ? (
        <Card className="py-14 flex items-center justify-center gap-3 text-sm text-[var(--muted)]"><Loader2 size={18} className="animate-spin" /> Memuat hasil peserta...</Card>
      ) : loadError ? (
        <Card className="text-center py-12 space-y-4"><XCircle size={30} className="mx-auto text-[var(--danger-text)]" /><p className="text-sm text-[var(--danger-text)]">{loadError}</p><Button variant="secondary" onClick={fetchAttempts} className="mx-auto">Coba Lagi</Button></Card>
      ) : attempts.length === 0 && feedbackSubmissions.length === 0 ? (
        <Card className="text-center py-14"><ClipboardCheck size={31} className="mx-auto text-[var(--muted)] mb-3" /><p className="font-semibold">Belum ada hasil kelas</p><p className="text-sm text-[var(--muted)] mt-1">Data akan muncul setelah peserta mengirim post-test atau feedback keseluruhan.</p></Card>
      ) : (
        <>
          {attempts.length > 0 && <>
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--surface-soft)] text-xs text-[var(--muted)]">
                <tr><th className="p-4">Peserta</th><th className="p-4">Nilai</th><th className="p-4">Status</th><th className="p-4">Percobaan</th><th className="p-4">Dikirim</th><th className="p-4">Detail</th><th className="p-4">Raport</th></tr>
              </thead>
              <tbody>
                {attempts.map(attempt => (
                  <tr key={attempt.id} className="border-t border-[var(--border)]">
                    <td className="p-4"><p className="font-semibold">{attempt.participantName}</p><p className="text-xs text-[var(--muted)] mt-1">{attempt.participantEmail}</p></td>
                    <td className="p-4 font-bold">{attempt.score}</td>
                    <td className="p-4"><button type="button" onClick={() => setSelectedAttempt(attempt)} className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold transition hover:ring-2 hover:ring-[var(--accent-soft)] ${attempt.needsReview ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : attempt.passed ? 'bg-[var(--success-soft)] text-[var(--success-text)]' : 'bg-[var(--danger-soft)] text-[var(--danger-text)]'}`} aria-label={`Buka review ${attempt.participantName}`}>{attempt.needsReview ? 'Menunggu review' : attempt.passed ? 'Lulus' : 'Belum Lulus'}</button></td>
                    <td className="p-4">#{attempt.attemptNumber}</td>
                    <td className="p-4 text-xs text-[var(--muted)]">{new Date(attempt.submittedAt).toLocaleString('id-ID')}</td>
                    <td className="p-4">
                      <button type="button" onClick={() => setSelectedAttempt(attempt)} className="text-xs font-semibold text-[var(--accent-strong)] hover:underline">Lihat jawaban</button>
                    </td>
                    <td className="p-4"><Button type="button" variant="secondary" icon={FileText} className="px-3 py-2 text-xs" onClick={() => setReportPreviewAttempt(attempt)}>Preview PDF</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {attempts.map(attempt => (
              <Card key={attempt.id} className="space-y-4">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold truncate">{attempt.participantName}</p><p className="text-xs text-[var(--muted)] break-all mt-1">{attempt.participantEmail}</p></div><button type="button" onClick={() => setSelectedAttempt(attempt)} className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition hover:ring-2 hover:ring-[var(--accent-soft)] ${attempt.needsReview ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : attempt.passed ? 'bg-[var(--success-soft)] text-[var(--success-text)]' : 'bg-[var(--danger-soft)] text-[var(--danger-text)]'}`} aria-label={`Buka review ${attempt.participantName}`}>{attempt.needsReview ? 'Menunggu review' : attempt.passed ? 'Lulus' : 'Belum Lulus'}</button></div>
                <div className="grid grid-cols-3 gap-3 text-xs"><div><p className="text-[var(--muted)]">Nilai</p><p className="font-bold text-lg mt-1">{attempt.score}</p></div><div><p className="text-[var(--muted)]">Percobaan</p><p className="font-semibold mt-2">#{attempt.attemptNumber}</p></div><div><p className="text-[var(--muted)]">Dikirim</p><p className="font-semibold mt-2">{new Date(attempt.submittedAt).toLocaleDateString('id-ID')}</p></div></div>
                <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3"><button type="button" onClick={() => setSelectedAttempt(attempt)} className="text-left text-xs font-semibold text-[var(--accent-strong)] hover:underline">Lihat dan koreksi jawaban</button><Button type="button" variant="secondary" icon={FileText} className="ml-auto px-3 py-2 text-xs" onClick={() => setReportPreviewAttempt(attempt)}>Preview PDF</Button></div>
              </Card>
            ))}
          </div>
          </>}

          {feedbackSubmissions.length > 0 && (
            <section className="space-y-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Evaluasi Akhir</p><h2 className="text-xl font-bold mt-2">Feedback Keseluruhan</h2></div>
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--surface-soft)] text-xs text-[var(--muted)]"><tr><th className="p-4">Peserta</th><th className="p-4">Rating</th><th className="p-4">Email Sertifikat</th><th className="p-4">Feedback</th><th className="p-4">Dikirim</th><th className="p-4">Card Review</th></tr></thead>
                  <tbody>{feedbackSubmissions.map(feedback => <tr key={feedback.id} className="border-t border-[var(--border)]"><td className="p-4"><p className="font-semibold">{feedback.participantName}</p><p className="text-xs text-[var(--muted)] mt-1">{feedback.participantEmail}</p></td><td className="p-4 font-bold">{feedback.rating}/5</td><td className="p-4 text-xs break-all">{feedback.certificateEmail}</td><td className="p-4 max-w-md whitespace-pre-wrap text-[var(--muted)]">{feedback.feedback}</td><td className="p-4 text-xs text-[var(--muted)]">{new Date(feedback.submittedAt).toLocaleString('id-ID')}</td><td className="p-4"><Button type="button" variant="secondary" icon={Share2} className="px-3 py-2 text-xs" onClick={() => setSelectedFeedbackForCard(feedback)}>Buat card review</Button></td></tr>)}</tbody>
                </table>
              </div>
              <div className="md:hidden space-y-3">{feedbackSubmissions.map(feedback => <Card key={feedback.id} className="space-y-3"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{feedback.participantName}</p><p className="text-xs text-[var(--muted)] break-all mt-1">{feedback.participantEmail}</p></div><span className="px-2 py-1 rounded-lg bg-[var(--success-soft)] text-[var(--success-text)] text-xs font-semibold">{feedback.rating}/5</span></div><p className="text-xs text-[var(--muted)] break-all">Sertifikat: {feedback.certificateEmail}</p><p className="text-sm whitespace-pre-wrap">{feedback.feedback}</p><Button type="button" variant="secondary" icon={Share2} className="w-full text-xs" onClick={() => setSelectedFeedbackForCard(feedback)}>Buat card review</Button></Card>)}</div>
            </section>
          )}
        </>
      )}
      {selectedAttempt && (
        <AnswerReviewModal
          attempt={selectedAttempt}
          quiz={quiz}
          overallFeedback={feedbackSubmissions.find(feedback => feedback.participantEmail.trim().toLowerCase() === selectedAttempt.participantEmail.trim().toLowerCase()) || null}
          onClose={() => setSelectedAttempt(null)}
          onSave={(reviews, reviewFeedback) => saveAttemptReview(selectedAttempt, reviews, reviewFeedback)}
          onOpenReportPreview={() => setReportPreviewAttempt(selectedAttempt)}
        />
      )}
      {reportPreviewAttempt && (
        <AssessmentReportPreviewModal
          attempt={reportPreviewAttempt}
          quiz={quiz}
          courseTitle={course?.title || RECORDED_CLASS_SPACE_LABEL}
          onClose={() => setReportPreviewAttempt(null)}
          onDownload={() => downloadQuizReport(reportPreviewAttempt, quiz, course?.title || RECORDED_CLASS_SPACE_LABEL)}
        />
      )}
      {selectedFeedbackForCard && <ReviewCardModal feedback={selectedFeedbackForCard} courseTitle={course?.title || 'Kelas Arunika'} onClose={() => setSelectedFeedbackForCard(null)} />}
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
  const [activeTab, setActiveTab] = useState<PublicClassTab>('materials');
  const [completedModuleIds, setCompletedModuleIds] = useState<string[]>([]);
  const [certificateEmail, setCertificateEmail] = useState('');
  const [feedbackRating, setFeedbackRating] = useState('');
  const [overallFeedback, setOverallFeedback] = useState('');
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const autoOpenedFeedbackRef = useRef(false);

  const progressStorageKey = `arunika-class-progress:${courseId}`;
  const allMaterialsCompleted = Boolean(course && course.modules.length > 0 && course.modules.every(module => completedModuleIds.includes(module.id)));
  const overallFeedbackEnabled = course?.overallFeedbackEnabled !== false;

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

  useEffect(() => {
    if (!course) return;
    setPublicMetadata({
      title: course.title,
      description: course.description,
      image: course.coverImage,
      imageAlt: `Cover ${course.title}`
    });
  }, [course]);

  useEffect(() => {
    if (!courseId || typeof window === 'undefined') return;
    try {
      const stored = JSON.parse(window.localStorage.getItem(progressStorageKey) || '[]');
      if (Array.isArray(stored)) {
        const validModuleIds = new Set((course?.modules || []).map(module => module.id));
        setCompletedModuleIds(stored.filter((value): value is string => typeof value === 'string' && validModuleIds.has(value)));
      }
    } catch {
      setCompletedModuleIds([]);
    }
  }, [course, courseId, progressStorageKey]);

  useEffect(() => {
    if (!overallFeedbackEnabled) {
      autoOpenedFeedbackRef.current = false;
      if (activeTab === 'feedback') setActiveTab('materials');
      return;
    }
    if (overallFeedbackEnabled && allMaterialsCompleted && !autoOpenedFeedbackRef.current) {
      autoOpenedFeedbackRef.current = true;
      setActiveTab('feedback');
    }
  }, [activeTab, allMaterialsCompleted, overallFeedbackEnabled]);

  const markModuleComplete = (moduleId: string) => {
    setCompletedModuleIds(current => {
      if (current.includes(moduleId)) return current;
      const next = [...current, moduleId];
      try {
        window.localStorage.setItem(progressStorageKey, JSON.stringify(next));
      } catch {
        // Progress tetap berjalan selama tab ini terbuka bila storage diblokir.
      }
      return next;
    });
  };

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

  const handleOverallFeedbackSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!client || !allMaterialsCompleted) {
      setFeedbackError('Selesaikan semua materi sebelum mengirim feedback keseluruhan.');
      return;
    }
    if (!participantName.trim() || !participantEmail.trim()) {
      setFeedbackError('Nama dan email peserta wajib diisi.');
      return;
    }
    if (!certificateEmail.trim()) {
      setFeedbackError('Email untuk sertifikat wajib diisi.');
      return;
    }
    if (!feedbackRating) {
      setFeedbackError('Pilih penilaian kelas dari 1 sampai 5.');
      return;
    }
    if (!overallFeedback.trim()) {
      setFeedbackError('Feedback keseluruhan wajib diisi.');
      return;
    }

    setIsFeedbackSubmitting(true);
    setFeedbackError(null);
    try {
      const { data, error } = await withRequestTimeout<any>(client.rpc('submit_class_feedback', {
        p_course_id: courseId,
        p_participant_name: participantName.trim(),
        p_participant_email: participantEmail.trim(),
        p_certificate_email: certificateEmail.trim(),
        p_rating: Number(feedbackRating),
        p_feedback: overallFeedback.trim(),
        p_completed_module_ids: completedModuleIds
      }) as PromiseLike<any>);
      if (error) throw error;
      if (!data) throw new Error('FEEDBACK_SUBMIT_FAILED');
      setFeedbackSubmitted(true);
    } catch (error) {
      const timedOut = error instanceof Error && error.message === 'REQUEST_TIMEOUT';
      setFeedbackError(timedOut ? 'Server terlalu lama merespons. Silakan coba lagi.' : databaseErrorMessage(error));
    } finally {
      setIsFeedbackSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center gap-3 text-sm text-[var(--muted)]"><Loader2 size={18} className="animate-spin" /> Mencari {RECORDED_CLASS_SPACE_LABEL}...</div>;
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
    <div className="min-h-screen bg-[var(--app-bg)] [scrollbar-gutter:stable]">
      <header className="sticky top-0 z-40 bg-[var(--surface)]/95 backdrop-blur border-b border-[var(--border)] px-4">
        <div className="w-full max-w-7xl mx-auto min-h-[68px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0"><div className="w-9 h-9 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 overflow-hidden"><img src={logoUtama} alt="Arunika LMS" className="h-7 w-8 object-contain" /></div><div className="min-w-0"><p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)] font-semibold">Arunika LMS</p><p className="text-sm font-semibold truncate">{RECORDED_CLASS_SPACE_LABEL}</p></div></div>
          <Badge color="var(--success-soft)">{course.modules.length} Materi</Badge>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto p-4 md:p-8 space-y-8">
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

        <div role="tablist" aria-label="Bagian kelas" className={`grid grid-cols-1 ${overallFeedbackEnabled ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-2 p-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)]`}>
          <button type="button" role="tab" aria-selected={activeTab === 'materials'} onClick={() => setActiveTab('materials')} className={`min-h-[48px] rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${activeTab === 'materials' ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : 'text-[var(--muted)] hover:bg-[var(--surface-soft)]'}`}>
            Materi <span className="text-xs font-normal ml-1">({completedModuleIds.length}/{course.modules.length})</span>
          </button>
          <button type="button" role="tab" aria-selected={activeTab === 'post_test'} onClick={() => setActiveTab('post_test')} className={`min-h-[48px] rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${activeTab === 'post_test' ? 'bg-[var(--accent-soft)] text-[var(--accent-strong)]' : 'text-[var(--muted)] hover:bg-[var(--surface-soft)]'}`}>
            <ClipboardCheck size={15} className="inline-block mr-2 -mt-0.5" />Post-Test
          </button>
          {overallFeedbackEnabled && (
            <button type="button" role="tab" aria-selected={activeTab === 'feedback'} disabled={!allMaterialsCompleted} onClick={() => allMaterialsCompleted && setActiveTab('feedback')} className={`min-h-[48px] rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${activeTab === 'feedback' ? 'bg-[var(--success-soft)] text-[var(--success-text)]' : allMaterialsCompleted ? 'text-[var(--muted)] hover:bg-[var(--surface-soft)]' : 'text-[var(--muted)]/60 cursor-not-allowed'}`} title={!allMaterialsCompleted ? 'Selesaikan semua materi terlebih dahulu' : undefined}>
              {allMaterialsCompleted ? <CheckCircle2 size={15} className="inline-block mr-2 -mt-0.5" /> : <LockKeyhole size={14} className="inline-block mr-2 -mt-0.5" />}Feedback Kelas
            </button>
          )}
        </div>

        <div className={activeTab === 'materials' ? 'grid lg:grid-cols-3 gap-6 lg:gap-8 items-start' : PUBLIC_CLASS_CONTENT_CLASS}>
          <div className={activeTab === 'materials' ? 'lg:col-span-2 space-y-8 min-w-0' : 'min-w-0'}>
            {activeTab === 'materials' && <section className="space-y-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Materi Kelas</p><h2 className="text-2xl font-bold mt-2">Tonton Recording</h2></div>
              {selectedModule ? (
                <Card className="!p-0 overflow-hidden">
                  {selectedModule.type === 'video' ? (
                    <iframe title={selectedModule.title} className="w-full aspect-video bg-black" src={getVideoEmbedUrl(selectedModule.content)} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  ) : (
                    <div className="p-6 md:p-9 min-h-[260px] whitespace-pre-wrap leading-7 text-sm md:text-base">{selectedModule.content}</div>
                  )}
                  <div className="p-5 md:p-7 border-t border-[var(--border)]">
                    <Badge>{selectedModule.type === 'video' ? 'Recording' : 'Materi Teks'}</Badge>
                    <h3 className="text-xl font-semibold mt-3">{selectedModule.title}</h3>
                    {selectedModule.description && <p className="text-sm text-[var(--muted)] leading-7 mt-3 whitespace-pre-wrap">{selectedModule.description}</p>}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 pt-5 border-t border-[var(--border)]">
                      <p className="text-xs text-[var(--muted)]">{completedModuleIds.length} dari {course.modules.length} materi selesai</p>
                      <Button type="button" variant={completedModuleIds.includes(selectedModule.id) ? 'green' : 'secondary'} icon={completedModuleIds.includes(selectedModule.id) ? CheckCircle2 : Check} onClick={() => markModuleComplete(selectedModule.id)} disabled={completedModuleIds.includes(selectedModule.id)} className="text-xs">
                        {completedModuleIds.includes(selectedModule.id) ? 'Materi selesai' : 'Tandai selesai'}
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="py-12 text-center text-sm text-[var(--muted)]">Materi kelas belum ditambahkan.</Card>
              )}
            </section>}

            {activeTab === 'post_test' && <section id="post-test" className="space-y-5 scroll-mt-24">
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
            </section>}

            {overallFeedbackEnabled && activeTab === 'feedback' && (
              <section id="class-feedback" className="space-y-5 scroll-mt-24">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Setelah Materi Selesai</p>
                  <h2 className="text-2xl font-bold mt-2">Feedback Keseluruhan Kelas</h2>
                  <p className="text-sm text-[var(--muted)] leading-relaxed mt-2">Bagikan pengalaman Anda setelah menyelesaikan seluruh materi. Email sertifikat akan dicatat sesuai alamat yang Anda masukkan.</p>
                </div>
                {feedbackSubmitted ? (
                  <Card className="p-8 md:p-10 text-center space-y-4">
                    <CheckCircle2 size={48} className="mx-auto text-[var(--success-text)]" />
                    <div><h3 className="text-xl font-semibold">Feedback berhasil dikirim</h3><p className="text-sm text-[var(--muted)] mt-2">Terima kasih. Email sertifikat Anda sudah tercatat.</p></div>
                    <Button variant="secondary" className="mx-auto" onClick={() => setFeedbackSubmitted(false)}>Ubah Feedback</Button>
                  </Card>
                ) : (
                  <Card className="p-5 md:p-8">
                    <form onSubmit={handleOverallFeedbackSubmit} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        <Input label="Nama Lengkap" icon={UserRound} value={participantName} onChange={event => setParticipantName(event.target.value)} required />
                        <Input label="Email Peserta" icon={Mail} type="email" value={participantEmail} onChange={event => setParticipantEmail(event.target.value)} required />
                      </div>
                      <Input label="Email untuk Sertifikat" icon={Mail} type="email" value={certificateEmail} onChange={event => setCertificateEmail(event.target.value)} placeholder="email penerima sertifikat" required />
                      <SelectField label="Penilaian Kelas" value={feedbackRating} onChange={event => setFeedbackRating(event.target.value)} required>
                        <option value="">Pilih penilaian</option>
                        <option value="5">5 — Sangat puas</option>
                        <option value="4">4 — Puas</option>
                        <option value="3">3 — Cukup</option>
                        <option value="2">2 — Kurang</option>
                        <option value="1">1 — Sangat kurang</option>
                      </SelectField>
                      <div>
                        <Textarea label="Feedback Keseluruhan" value={overallFeedback} onChange={event => setOverallFeedback(event.target.value)} placeholder="Apa yang paling membantu? Apa yang perlu ditingkatkan?" className="min-h-[180px]" maxLength={5000} required />
                        <p className="text-[11px] text-[var(--muted)] text-right mt-1">{overallFeedback.length}/5.000</p>
                      </div>
                      {feedbackError && <div className="p-4 rounded-xl bg-[var(--danger-soft)] border border-[var(--border)] text-sm text-[var(--danger-text)]">{feedbackError}</div>}
                      <Button type="submit" icon={CheckCircle2} isLoading={isFeedbackSubmitting} disabled={isFeedbackSubmitting} className="w-full">Kirim Feedback & Simpan Email Sertifikat</Button>
                    </form>
                  </Card>
                )}
              </section>
            )}
          </div>

          {activeTab === 'materials' && <aside className="space-y-5 lg:sticky lg:top-24 lg:pt-16 min-w-0">
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
                  <div className="flex gap-3"><span className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-semibold flex-shrink-0 ${completedModuleIds.includes(module.id) ? 'bg-[var(--success-soft)] border-[var(--border)] text-[var(--success-text)]' : 'border-[var(--border)] bg-[var(--surface)]'}`}>{completedModuleIds.includes(module.id) ? <Check size={15} /> : index + 1}</span><div className="min-w-0"><p className="text-xs font-semibold break-words leading-snug">{module.title}</p><p className="text-[10px] text-[var(--muted)] mt-1">{completedModuleIds.includes(module.id) ? 'Selesai' : module.duration || (module.type === 'video' ? 'Video' : 'Teks')}</p></div></div>
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
          </aside>}
        </div>
      </main>
    </div>
  );
};
