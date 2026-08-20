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
2. Copy `.env.example` to `.env.local` and set `VITE_PUBLIC_APP_URL` to the public deployment URL. This URL is used by every course card when generating its public share link.
3. Set the `GEMINI_API_KEY` in `.env.local` when the AI Studio integration requires it.
4. Run the app:
   `npm run dev`

## Public course links

Set the canonical public base URL in the deployment environment:

```env
VITE_PUBLIC_APP_URL=https://lms.example.com/
```

The Copy Link and Share buttons then generate a unique hash route for each course, for example `https://lms.example.com/#/c/2t`. Without this variable, the app falls back to the host currently displaying the dashboard, which is useful locally but should not be used as the production share URL.
