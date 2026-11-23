@AGENTS.md

# GrinScreen Admin

Password-protected CMS for the GrinScreen site. Architecture, data model and security rules are at the end of this file.

- Server code uses `db()` from `src/lib/supabase.ts` (secret key). Never import it into a client component (`server-only` enforces this).
- Every server action must call `requireAdmin()` first and validate input with `src/lib/action-utils.ts`.
- After mutating public content call `revalidateClient()`.
- UI: dark theme tokens in `src/app/globals.css`; shared primitives in `src/components/ui.tsx`.

## Architecture (two separate repos, one Supabase project)

- **grinscreen-client** (this repo when in the client folder): public website, http://localhost:3000. Reads published content.
- **grinscreen-admin**: password-protected admin panel, http://localhost:3001. Manages content.

They share only the Supabase project and one secret (`REVALIDATE_SECRET`). Each deploys as its own Vercel project.

### Data

All tables are prefixed `gs_` because the Supabase project is shared with other work. Never touch non-`gs_` tables or the
existing `videos` / `images` / `reels` / `kashful` buckets. Schema lives in the admin repo (`db/schema.sql`).

| table | managed in admin | shown on site |
| --- | --- | --- |
| `gs_reels` | upload/edit, `featured` = home page | home (featured), portfolio (all) |
| `gs_posters` | one or more images each | portfolio carousel |
| `gs_case_studies` | full write-up, `featured` = portfolio | `/case-studies` (all), portfolio (featured) |
| `gs_testimonials` | name, org, photo, quote | `/testimonials` (all), home + portfolio (featured) |
| `gs_bookings` | read, set status, add notes, resend emails | submitted from `/book` |
| `gs_notification_recipients` | owners who get booking alerts | n/a |

Storage buckets (public read): `grinscreen-reels` (videos), `grinscreen-images` (covers, posters, logos, photos).

### Security model

- Client uses the **publishable key**. RLS lets it `select` published rows and `insert` a booking, nothing else.
- Admin uses the **secret key on the server only** (`SUPABASE_SECRET_KEY`, never `NEXT_PUBLIC_`). Every route except `/login`
  is gated by `src/proxy.ts` (signed 24h JWT cookie issued after Supabase Auth email+password login; any user in the Supabase project's Auth can sign in. Recommended hardening: turn off public sign-ups in Supabase so only users you create can exist) and every server action / route handler re-checks the session.
- Uploads are compressed in the browser first (`src/lib/compress.ts` for images, `src/lib/compress-video.ts` for video, with an ffmpeg.wasm fallback for codecs the browser can't decode; its worker is copied to `public/ffmpeg` on `npm install`): videos -> H.264 MP4, <=720p, no audio, <5 MB; images -> resized WebP. They then go browser -> Supabase Storage via a short-lived signed URL from `/api/upload/sign`. The buckets enforce the same limits (reels 5 MB mp4-only, images 1 MB). Route every upload through `uploadFile()`.
- Freshness: after each change the admin POSTs `CLIENT_SITE_URL/api/revalidate` with `REVALIDATE_SECRET` (same value in both
  apps). Client pages also self-refresh every 60 s.

### Booking emails

When someone submits `/book`: the client route saves the booking, then (via `after()`) POSTs `ADMIN_URL/api/notify/booking`
with `x-notify-secret: NOTIFY_SECRET`. The **admin** app (which holds the Gmail credentials and the owner list) sends
(1) a confirmation to the customer and (2) an alert to every active row in `gs_notification_recipients`, via Gmail SMTP
(`GMAIL_USER` + `GMAIL_APP_PASSWORD`, an App Password). Outcome is stored on the booking (`notified_at`, `notify_error`);
the Bookings page can resend. Owners are managed on the admin's Notifications page. Gmail credentials only ever live in the admin app.

### Commands

```bash
npm run db:migrate                         # apply db/schema.sql + create buckets (idempotent)
npm run db:seed                            # one-time legacy import; needs the old client repo checked out at ../grinscreen-client
npm run dev                                # :3001
```
