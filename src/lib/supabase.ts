import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/** Server-only Supabase client using the secret key. Never import from a client component. */
export function db(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
  cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}

export const REELS_BUCKET = process.env.GRINSCREEN_REELS_BUCKET || "grinscreen-reels";
export const IMAGES_BUCKET = process.env.GRINSCREEN_IMAGES_BUCKET || "grinscreen-images";

export type BucketKind = "reels" | "images";
export const bucketFor = (kind: BucketKind) => (kind === "reels" ? REELS_BUCKET : IMAGES_BUCKET);
