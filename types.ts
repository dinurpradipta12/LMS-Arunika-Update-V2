
export type ContentType = 'video' | 'text';
export type AssetType = 'link' | 'file';

export interface Module {
  id: string;
  title: string;
  type: ContentType;
  content: string; // YouTube URL or Markdown Text
  duration?: string;
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  url: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  modules: Module[];
  assets: Asset[];
  mentorId: string;
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
  };
}

export interface Branding {
  logo: string;
  siteName: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}
