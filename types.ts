
export type ContentType = 'video' | 'text';
export type AssetType = 'link' | 'file';
export type SpaceType = 'product_tutorial' | 'recorded_class';
export type QuizQuestionType = 'multiple_choice' | 'true_false';

export interface Module {
  id: string;
  title: string;
  type: ContentType;
  content: string; // YouTube URL or Markdown Text
  description: string; // New: Description below video
  duration?: string;
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  url: string;
  fileName?: string;
}

export interface Category {
  label: string;
  color: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  modules: Module[];
  assets: Asset[];
  mentorId: string;
  categories?: Category[];
  spaceType?: SpaceType;
  published?: boolean;
}

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  options: string[];
  correctAnswer: string;
  points: number;
}

export interface PublicQuizQuestion {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  options: string[];
  points: number;
}

export interface CourseQuiz {
  id?: string;
  courseId: string;
  title: string;
  description: string;
  enabled: boolean;
  passingScore: number;
  maxAttempts: number;
  showAnswers: boolean;
  questions: QuizQuestion[];
}

export interface PublicCourseQuiz {
  id: string;
  courseId: string;
  title: string;
  description: string;
  passingScore: number;
  maxAttempts: number;
  questions: PublicQuizQuestion[];
}

export interface QuizAttempt {
  id: string;
  courseId: string;
  quizId: string;
  participantName: string;
  participantEmail: string;
  answers: Record<string, string>;
  score: number;
  passed: boolean;
  attemptNumber: number;
  submittedAt: string;
}

export interface QuizSubmissionResult {
  attemptId: string;
  attemptNumber: number;
  maxAttempts: number;
  score: number;
  passed: boolean;
  passingScore: number;
  feedback?: Array<{
    questionId: string;
    answer: string | null;
    correctAnswer: string;
    correct: boolean;
  }> | null;
}

export interface Mentor {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo: string;
  socials: {
    instagram?: string;
    linkedin?: string;
    website?: string;
    twitter?: string;
    tiktok?: string;
  };
}

export interface Branding {
  logo: string;
  favicon: string;
  siteName: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}
