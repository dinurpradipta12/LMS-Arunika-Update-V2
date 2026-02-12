
import { Course, Mentor, Branding } from './types';

export const initialBranding: Branding = {
  logo: 'https://api.dicebear.com/7.x/shapes/svg?seed=arunika',
  siteName: 'Arunika Learning'
};

export const initialMentor: Mentor = {
  id: 'mentor-1',
  name: 'Alex Rivera',
  role: 'Senior Product Designer',
  bio: 'Helping creative minds build better digital products for over 10 years.',
  photo: 'https://picsum.photos/seed/mentor1/300/300',
  socials: {
    instagram: 'alexrivera',
    linkedin: 'alex-rivera',
    website: 'https://alexdesign.io',
    twitter: 'alex_tweets'
  }
};

export const initialCourses: Course[] = [
  {
    id: 'course-101',
    title: 'Modern UI/UX Principles',
    description: 'Master the foundations of modern digital interfaces with a focus on geometric playfulness.',
    coverImage: 'https://picsum.photos/seed/uiux/800/450',
    mentorId: 'mentor-1',
    modules: [
      {
        id: 'm1',
        title: 'Introduction to Memphis Design',
        type: 'video',
        content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        duration: '10:00'
      },
      {
        id: 'm2',
        title: 'Color Theory & Accessibility',
        type: 'text',
        content: '# Color Theory\n\nUnderstanding saturation and contrast in playful designs...',
        duration: '5 mins read'
      }
    ],
    assets: [
      {
        id: 'a1',
        name: 'Design Checklist PDF',
        type: 'link',
        url: 'https://example.com/checklist.pdf'
      }
    ]
  }
];
