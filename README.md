# GrinScreen Admin

Admin panel for the GrinScreen website: reels, posters, case studies, testimonials and meeting bookings.

## First-time setup

1. `cp .env.example .env` and fill it in (Supabase URL + keys, `SESSION_URL`, a random `SESSION_SECRET`, a shared `REVALIDATE_SECRET`).
2. `npm install`
3. `npm run db:migrate` – creates the `gs_*` tables, security policies and storage buckets.
4. Sign-in uses **Supabase Auth**: create a user (email + password) in Supabase → Authentication → Users, every user in Supabase Auth can sign in; there is no email list in this app. **Recommended:** turn off public sign-ups (Authentication → Sign In / Providers → “Allow new users to sign up”) so that only users you create exist.
5. Optional, one-time: `npm run db:seed` imports the original reels/posters/case studies. It has already been run for the live project, and it expects the client repo checked out next to this one at `../grinscreen-client`.
6. `npm run dev` → http://localhost:3001

## Booking emails

Set `GMAIL_USER` and `GMAIL_APP_PASSWORD` (Google Account → Security → turn on 2-Step Verification → App passwords). Add the owners who should be alerted on the **Notifications** page. The client site needs `ADMIN_URL` and the same `NOTIFY_SECRET`.

## Deploying (Vercel)

Create a separate Vercel project with **Root Directory = `grinscreen-admin`**. Add every variable from `.env.example`.
Set `CLIENT_SITE_URL` to the public site's URL so edits appear on the site immediately.

## Limits

Everything is compressed automatically in the browser before upload, so you can drop in originals. Reels end up as a 720p-or-smaller MP4 under 5 MB with no audio (very long clips, over about 60 s, may need trimming to fit); images become resized WebP under 1 MB. Video compression runs in a recent Chrome, Edge or Safari. Formats the browser can't decode natively (some iPhone/HEVC `.mov`, ProRes, AVI, MKV) are handled by a slower built-in ffmpeg converter that downloads about 30 MB the first time it's needed.
