import "server-only";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

export const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

/** Trim a string; empty/non-string becomes null. */
export function str(v: unknown, max = 5000): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t.length ? t : null;
}

export function req(v: unknown, max = 500): string | null {
  return str(v, max);
}

export function int(v: unknown, fallback = 0): number {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? Math.max(-100000, Math.min(100000, n)) : fallback;
}

export function bool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function dbError(message: string): string {
  if (/duplicate key/i.test(message)) return "That value is already in use. Pick a different one.";
  return "Something went wrong saving to the database. Please try again.";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** Only accept URLs that point at our own Supabase project's public storage. */
export function isOwnStorageUrl(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const base = process.env.SUPABASE_URL;
  return !!base && v.startsWith(`${base}/storage/v1/object/public/`);
}
