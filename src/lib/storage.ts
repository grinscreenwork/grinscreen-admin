import "server-only";
import { db, REELS_BUCKET, IMAGES_BUCKET } from "./supabase";

/**
 * Best-effort removal of uploaded files. A leftover file is harmless, so this
 * never throws: failing to clean up must not block a DB change.
 */
export async function removeFiles(files: { bucket: "reels" | "images"; path: string | null | undefined }[]) {
  const byBucket: Record<string, string[]> = {};
  for (const f of files) {
    if (!f.path) continue;
    const bucket = f.bucket === "reels" ? REELS_BUCKET : IMAGES_BUCKET;
    (byBucket[bucket] ??= []).push(f.path);
  }
  await Promise.all(
    Object.entries(byBucket).map(async ([bucket, paths]) => {
      try {
        await db().storage.from(bucket).remove(paths);
      } catch {
        /* ignore */
      }
    }),
  );
}
