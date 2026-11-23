"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { removeFiles } from "@/lib/storage";
import { revalidateClient } from "@/lib/revalidate";
import { syncReelInCaseStudies } from "@/lib/reel-links";
import { bool, dbError, fail, int, isOwnStorageUrl, isUuid, req, str, type ActionResult } from "@/lib/action-utils";
import { ASPECT_RATIOS } from "@/lib/types";

export type ReelInput = {
  id?: string;
  title: string;
  description: string;
  client_name: string;
  aspect_ratio: string;
  video_path: string;
  video_url: string;
  poster_path: string;
  poster_url: string;
  featured: boolean;
  published: boolean;
  sort_order: number;
};

export async function saveReel(input: ReelInput): Promise<ActionResult> {
  await requireAdmin();

  const title = req(input.title, 150);
  if (!title) return fail("Give the reel a title.");
  if (!input.video_path || !isOwnStorageUrl(input.video_url)) return fail("Upload a video first.");
  if (input.poster_url && !isOwnStorageUrl(input.poster_url)) return fail("Invalid cover image.");

  const aspect = (ASPECT_RATIOS as readonly string[]).includes(input.aspect_ratio) ? input.aspect_ratio : "9:16";
  const row = {
    title,
    description: str(input.description, 600),
    client_name: str(input.client_name, 120),
    aspect_ratio: aspect,
    video_path: input.video_path,
    video_url: input.video_url,
    poster_path: str(input.poster_path, 500),
    poster_url: str(input.poster_url, 1000),
    featured: bool(input.featured),
    published: bool(input.published, true),
    sort_order: int(input.sort_order),
  };

  const sb = db();
  if (input.id) {
    if (!isUuid(input.id)) return fail("Invalid reel.");
    const { data: old } = await sb.from("gs_reels").select("video_path, poster_path").eq("id", input.id).maybeSingle();
    const { error } = await sb.from("gs_reels").update(row).eq("id", input.id);
    if (error) return fail(dbError(error.message));
    // Case studies that reuse this reel follow its new files.
    await syncReelInCaseStudies(input.id, { video_path: row.video_path, video_url: row.video_url, poster_path: row.poster_path, poster_url: row.poster_url });
    // Replaced files are no longer referenced; clean them up.
    const stale = [];
    if (old?.video_path && old.video_path !== row.video_path) stale.push({ bucket: "reels" as const, path: old.video_path });
    if (old?.poster_path && old.poster_path !== row.poster_path) stale.push({ bucket: "images" as const, path: old.poster_path });
    await removeFiles(stale);
  } else {
    const { error } = await sb.from("gs_reels").insert(row);
    if (error) return fail(dbError(error.message));
  }
  await revalidateClient();
  return { ok: true };
}

export async function setReelFlag(id: string, field: "featured" | "published", value: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(id) || (field !== "featured" && field !== "published")) return fail("Invalid request.");
  const { error } = await db().from("gs_reels").update({ [field]: !!value }).eq("id", id);
  if (error) return fail(dbError(error.message));
  await revalidateClient();
  return { ok: true };
}

export async function deleteReel(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(id)) return fail("Invalid reel.");
  const sb = db();
  const { data: old } = await sb.from("gs_reels").select("video_path, poster_path").eq("id", id).maybeSingle();
  const { error } = await sb.from("gs_reels").delete().eq("id", id);
  if (error) return fail(dbError(error.message));
  // Remove it from any case study that was reusing it (its files are about to be deleted).
  await syncReelInCaseStudies(id, null);
  await removeFiles([
    { bucket: "reels", path: old?.video_path },
    { bucket: "images", path: old?.poster_path },
  ]);
  await revalidateClient();
  return { ok: true };
}
