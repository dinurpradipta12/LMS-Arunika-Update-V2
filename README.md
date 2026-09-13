<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/290b0712-77c2-461a-a62e-81b78a236da8

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and set the public app and Supabase variables. These values are used by every public course link and do not depend on an admin browser's saved settings.
3. Set the `GEMINI_API_KEY` in `.env.local` when the AI Studio integration requires it.
4. Run the app:
   `npm run dev`

## Public course links

Set the canonical public base URL in the deployment environment:

```env
VITE_PUBLIC_APP_URL=https://arunika.space/
VITE_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

The Copy Link and Share buttons then generate a unique hash route for each course, for example `https://arunika.space/#/c/2t`. Public course pages always read from the canonical public Supabase configuration, so stale Supabase settings stored in an admin browser cannot redirect visitors to a different project. When `VITE_PUBLIC_APP_URL` is not set, the app uses `https://arunika.space` for local admin sessions and the current deployed origin for other hosts.

## Landing page insights

Landing page publik mencatat views, pengunjung unik anonim, dan klik CTA melalui RPC Supabase yang tervalidasi. Ringkasan metrik tampil di daftar Landing Page; tombol **Lihat insight** membuka tren harian, perangkat, sumber kunjungan, dan rasio klik CTA. Jalankan migration `supabase/migrations/20260914000000_landing_page_analytics.sql` setelah migration Landing Page Maker agar event dan insight tersedia.

## Secure database dan admin setup

The dashboard uses Supabase Auth plus a database admin allow-list. Public pages can only read published content, while analytics, quiz answer keys, participant attempts, and the admin allow-list remain protected by RLS.

For a fresh project or an existing project that still appears as `UNRESTRICTED`, follow [supabase/new-project/README.md](supabase/new-project/README.md). Never put a Supabase service-role key in this frontend.
