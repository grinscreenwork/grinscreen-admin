export type Reel = {
  id: string;
  title: string;
  description: string | null;
  client_name: string | null;
  aspect_ratio: string;
  video_path: string;
  video_url: string;
  poster_path: string | null;
  poster_url: string | null;
  featured: boolean;
  published: boolean;
  sort_order: number;
  created_at: string;
};

export type StoredImage = { path: string; url: string };

export type Poster = {
  id: string;
  title: string;
  description: string | null;
  images: StoredImage[];
  featured: boolean;
  published: boolean;
  sort_order: number;
  created_at: string;
};

export type Stat = { value: string; label: string; sub?: string };

export type Visual =
  | { kind: "image"; url: string; path: string; alt: string }
  // `reel_id` is set when the visual was picked from the reels library: the files are shared with that
  // reel, so they must never be deleted just because the case study changes.
  | { kind: "reel"; url: string; path: string; poster_url: string; poster_path: string; alt: string; reel_id?: string };

export type CaseStudy = {
  id: string;
  slug: string;
  brand: string;
  logo_path: string | null;
  logo_url: string | null;
  tagline: string;
  description: string;
  campaign: string | null;
  duration: string | null;
  problem: string | null;
  idea: string | null;
  pillars_title: string | null;
  pillars: string[];
  community: string | null;
  stats: Stat[];
  insight: string | null;
  visuals: Visual[];
  featured: boolean;
  published: boolean;
  sort_order: number;
  created_at: string;
};

export type Testimonial = {
  id: string;
  client_name: string;
  role: string | null;
  organization: string;
  quote: string;
  image_path: string | null;
  image_url: string | null;
  featured: boolean;
  published: boolean;
  sort_order: number;
  created_at: string;
};

export const BOOKING_STATUSES = ["new", "confirmed", "completed", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export type Booking = {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes: string | null;
  status: BookingStatus;
  admin_notes: string | null;
  notified_at: string | null;
  notify_error: string | null;
  created_at: string;
};

export type NotificationRecipient = {
  id: string;
  email: string;
  label: string | null;
  active: boolean;
  created_at: string;
};

export const WORK_MODES = ["onsite", "remote", "hybrid"] as const;
export type WorkMode = (typeof WORK_MODES)[number];
export const WORK_MODE_LABELS: Record<WorkMode, string> = { onsite: "On-site", remote: "Remote", hybrid: "Hybrid" };
export const JOB_TYPES = ["Full-time", "Part-time", "Internship", "Contract"] as const;

export type Job = {
  id: string;
  title: string;
  work_mode: WorkMode;
  job_type: string | null;
  location: string | null;
  apply_url: string;
  published: boolean;
  sort_order: number;
  created_at: string;
};

export const ASPECT_RATIOS = ["9:16", "4:5", "1:1", "16:9"] as const;
