import "server-only";
import { db } from "./supabase";
import type { Visual } from "./types";

type ReelFiles = { video_path: string; video_url: string; poster_path: string | null; poster_url: string | null };

/**
 * Case studies can reuse a reel from the library (the visual stores `reel_id` and shares the
 * reel's files). When that reel's files change, keep those visuals pointing at the new files;
 * when the reel is deleted (`next = null`), drop the visual so nothing links to a deleted file.
 */
export async function syncReelInCaseStudies(reelId: string, next: ReelFiles | null): Promise<void> {
  const sb = db();
  const { data } = await sb.from("gs_case_studies").select("id, visuals");
  for (const cs of data ?? []) {
    const visuals = (cs.visuals ?? []) as Visual[];
    if (!visuals.some((v) => v.kind === "reel" && v.reel_id === reelId)) continue;

    const updated = visuals.flatMap((v): Visual[] => {
      if (v.kind !== "reel" || v.reel_id !== reelId) return [v];
      if (!next) return [];
      return [{ ...v, url: next.video_url, path: next.video_path, poster_url: next.poster_url ?? "", poster_path: next.poster_path ?? "" }];
    });
    await sb.from("gs_case_studies").update({ visuals: updated }).eq("id", cs.id);
  }
}
