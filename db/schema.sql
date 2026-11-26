-- GrinScreen CMS schema. Tables are prefixed `gs_` so they can't collide with
-- anything else living in this Supabase project. Safe to re-run.

create extension if not exists pgcrypto;

create or replace function gs_set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ── Reels ─────────────────────────────────────────────────────────
create table if not exists gs_reels (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  client_name   text,
  aspect_ratio  text not null default '9:16',   -- preferred dimension, optional
  video_path    text not null,
  video_url     text not null,
  poster_path   text,
  poster_url    text,
  featured      boolean not null default false,  -- show on the home page
  published     boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Posters (static designs; one or more images per poster) ───────
create table if not exists gs_posters (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  images        jsonb not null default '[]'::jsonb,  -- [{ "path": "...", "url": "..." }]
  featured      boolean not null default false,
  published     boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Case studies ──────────────────────────────────────────────────
create table if not exists gs_case_studies (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  brand         text not null,
  logo_path     text,
  logo_url      text,
  tagline       text not null,
  description   text not null,
  campaign      text,
  duration      text,
  problem       text,
  idea          text,
  pillars_title text,
  pillars       jsonb not null default '[]'::jsonb,   -- ["...", "..."]
  community     text,
  stats         jsonb not null default '[]'::jsonb,   -- [{ value, label, sub }]
  insight       text,
  visuals       jsonb not null default '[]'::jsonb,   -- [{ kind: image|reel, url, path, poster_url, poster_path, alt }]
  featured      boolean not null default false,       -- show on the portfolio page
  published     boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Testimonials ──────────────────────────────────────────────────
create table if not exists gs_testimonials (
  id            uuid primary key default gen_random_uuid(),
  client_name   text not null,
  role          text,
  organization  text not null,
  quote         text not null,
  image_path    text,
  image_url     text,
  featured      boolean not null default false,       -- show on home + portfolio
  published     boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Meeting bookings (submitted from the public /book page) ───────
create table if not exists gs_bookings (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null,
  phone         text not null,
  notes         text,
  status        text not null default 'new'
                check (status in ('new', 'confirmed', 'completed', 'cancelled')),
  admin_notes   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['gs_reels','gs_posters','gs_case_studies','gs_testimonials','gs_bookings'] loop
    execute format('drop trigger if exists %I on %I', t || '_updated_at', t);
    execute format('create trigger %I before update on %I for each row execute function gs_set_updated_at()', t || '_updated_at', t);
  end loop;
end $$;

create index if not exists gs_reels_order on gs_reels (sort_order, created_at desc);
create index if not exists gs_posters_order on gs_posters (sort_order, created_at desc);
create index if not exists gs_case_studies_order on gs_case_studies (sort_order, created_at desc);
create index if not exists gs_testimonials_order on gs_testimonials (sort_order, created_at desc);
create index if not exists gs_bookings_created on gs_bookings (created_at desc);

-- ── Row level security ────────────────────────────────────────────
-- Public site (anon key) may only READ published content.
-- Admins and bookings have RLS on with no policies: only the server-side
-- secret key can touch them.
alter table gs_bookings      enable row level security;
alter table gs_reels         enable row level security;
alter table gs_posters       enable row level security;
alter table gs_case_studies  enable row level security;
alter table gs_testimonials  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['gs_reels','gs_posters','gs_case_studies','gs_testimonials'] loop
    execute format('drop policy if exists %I on %I', t || '_public_read', t);
    execute format('create policy %I on %I for select to anon, authenticated using (published = true)', t || '_public_read', t);
  end loop;
end $$;

-- ── Grants ────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated, service_role;
grant select on gs_reels, gs_posters, gs_case_studies, gs_testimonials to anon, authenticated;
grant all on gs_reels, gs_posters, gs_case_studies, gs_testimonials, gs_bookings to service_role;

-- The public /book form may INSERT a booking (and nothing else) using the
-- publishable key. It can never read, update or delete bookings.
grant insert on gs_bookings to anon;
drop policy if exists gs_bookings_public_insert on gs_bookings;
create policy gs_bookings_public_insert on gs_bookings
  for insert to anon
  with check (
    status = 'new'
    and admin_notes is null
    and char_length(name) between 1 and 120
    and char_length(email) between 3 and 200
    and char_length(phone) between 5 and 40
    and (notes is null or char_length(notes) <= 2000)
  );

-- ── Booking e-mail notifications ──────────────────────────────────
-- Who gets told when someone books a call. Managed in the admin (Notifications page).
create table if not exists gs_notification_recipients (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  label       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table gs_notification_recipients enable row level security; -- no policies: server-side secret key only
grant all on gs_notification_recipients to service_role;

alter table gs_bookings add column if not exists notified_at timestamptz;  -- set once the emails went out
alter table gs_bookings add column if not exists notify_error text;        -- last failure, if any

-- The public form may only create plain, un-notified bookings.
drop policy if exists gs_bookings_public_insert on gs_bookings;
create policy gs_bookings_public_insert on gs_bookings
  for insert to anon
  with check (
    status = 'new'
    and admin_notes is null
    and notified_at is null
    and notify_error is null
    and char_length(name) between 1 and 120
    and char_length(email) between 3 and 200
    and char_length(phone) between 5 and 40
    and (notes is null or char_length(notes) <= 2000)
  );

-- ── Careers / job listings ────────────────────────────────────────
-- Deliberately minimal: a title, a few basics and a link to the application form (e.g. Google Forms).
create table if not exists gs_jobs (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  work_mode   text not null default 'onsite' check (work_mode in ('onsite', 'remote', 'hybrid')),
  job_type    text,                       -- optional: Full-time, Part-time, Internship, Contract
  location    text,                       -- optional: e.g. Dhaka
  apply_url   text not null,              -- where the "Apply" button sends people
  published   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists gs_jobs_updated_at on gs_jobs;
create trigger gs_jobs_updated_at before update on gs_jobs for each row execute function gs_set_updated_at();
create index if not exists gs_jobs_order on gs_jobs (sort_order, created_at desc);

alter table gs_jobs enable row level security;
drop policy if exists gs_jobs_public_read on gs_jobs;
create policy gs_jobs_public_read on gs_jobs for select to anon, authenticated using (published = true);
grant select on gs_jobs to anon, authenticated;
grant all on gs_jobs to service_role;
