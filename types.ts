
export type ContentType = 'video' | 'text';
export type AssetType = 'link' | 'file';
export type SpaceType = 'product_tutorial' | 'recorded_class';
export type QuizQuestionType = 'multiple_choice' | 'true_false' | 'long_answer';

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
  overallFeedbackEnabled?: boolean;
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
  feedbackEnabled: boolean;
  feedbackRequired: boolean;
  feedbackPrompt: string;
  questions: QuizQuestion[];
}

export interface PublicCourseQuiz {
  id: string;
  courseId: string;
  title: string;
  description: string;
  passingScore: number;
  maxAttempts: number;
  feedbackEnabled: boolean;
  feedbackRequired: boolean;
  feedbackPrompt: string;
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
  needsReview: boolean;
  classFeedback: string | null;
  attemptNumber: number;
  submittedAt: string;
}

export interface ClassFeedbackSubmission {
  id: string;
  courseId: string;
  participantName: string;
  participantEmail: string;
  certificateEmail: string;
  rating: number;
  feedback: string;
  submittedAt: string;
  updatedAt?: string;
}

export interface QuizSubmissionResult {
  attemptId: string;
  attemptNumber: number;
  maxAttempts: number;
  score: number;
  passed: boolean;
  needsReview: boolean;
  passingScore: number;
  feedback?: Array<{
    questionId: string;
    answer: string | null;
    correctAnswer: string | null;
    correct: boolean | null;
    review?: boolean;
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

export type FormFieldType = 'short_text' | 'long_text' | 'email' | 'link' | 'number' | 'multiple_choice' | 'dropdown' | 'checkbox' | 'date';

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  description: string;
  placeholder: string;
  required: boolean;
  options: string[];
}

export type FormStatus = 'draft' | 'published' | 'archived';
export type FormPostSubmitMode = 'confirmation' | 'payment' | 'redirect';

export interface FormDefinition {
  id: string;
  slug: string;
  title: string;
  eventName: string;
  description: string;
  status: FormStatus;
  fields: FormField[];
  postSubmitMode: FormPostSubmitMode;
  postSubmitTitle: string;
  postSubmitMessage: string;
  paymentInstructions: string;
  paymentLink: string;
  paymentQrCode: string;
  paymentAccountNumber: string;
  paymentWhatsapp: string;
  redirectUrl: string;
  allowMultiple: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type FormResponseStatus = 'pending' | 'confirmed' | 'paid' | 'cancelled';

export interface FormResponse {
  id: string;
  formId: string;
  responderName: string;
  responderEmail: string;
  answers: Record<string, string | string[]>;
  status: FormResponseStatus;
  paymentReference: string;
  adminNote: string;
  submittedAt: string;
  confirmedAt?: string | null;
  paidAt?: string | null;
  updatedAt?: string;
}
