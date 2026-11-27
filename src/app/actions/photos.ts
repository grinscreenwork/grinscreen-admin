"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { removeFiles } from "@/lib/storage";
import { revalidateClient } from "@/lib/revalidate";
import { applyOrder, topSortOrder } from "@/lib/reorder";
import { bool, dbError, fail, isOwnStorageUrl, isUuid, str, type ActionResult } from "@/lib/action-utils";

export type NewPhoto = { path: string; url: string; width: number; height: number };

/** Add one or many freshly uploaded photos. They start at the top, in the order they were picked. */
export async function createPhotos(photos: NewPhoto[]): Promise<ActionResult> {
  await requireAdmin();
  if (!Array.isArray(photos) || photos.length === 0 || photos.length > 40) return fail("Choose between 1 and 40 photos.");

  const clean = photos.filter((p) => p && typeof p.path === "string" && isOwnStorageUrl(p.url));
  if (clean.length === 0) return fail("Those photos didn't upload correctly. Please try again.");

  const top = await topSortOrder("gs_photos");
  const dim = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 && n < 20000 ? Math.round(n) : null);
  const rows = clean.map((p, i) => ({
    image_path: p.path,
    image_url: p.url,
    width: dim(p.width),
    height: dim(p.height),
    published: true,
    sort_order: top - (clean.length - 1 - i), // keeps the picked order, all above existing photos
  }));
  const { error } = await db().from("gs_photos").insert(rows);
  if (error) return fail(dbError(error.message));
  await revalidateClient();
  return { ok: true };
}

export async function savePhoto(input: { id: string; title: string; published: boolean }): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(input.id)) return fail("Invalid photo.");
  const { error } = await db()
    .from("gs_photos")
    .update({ title: str(input.title, 120), published: bool(input.published, true) })
    .eq("id", input.id);
  if (error) return fail(dbError(error.message));
  await revalidateClient();
  return { ok: true };
}

export async function setPhotoPublished(id: string, value: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(id)) return fail("Invalid photo.");
  const { error } = await db().from("gs_photos").update({ published: !!value }).eq("id", id);
  if (error) return fail(dbError(error.message));
  await revalidateClient();
  return { ok: true };
}

export async function deletePhoto(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(id)) return fail("Invalid photo.");
  const sb = db();
  const { data: old } = await sb.from("gs_photos").select("image_path").eq("id", id).maybeSingle();
  const { error } = await sb.from("gs_photos").delete().eq("id", id);
  if (error) return fail(dbError(error.message));
  await removeFiles([{ bucket: "images", path: old?.image_path }]);
  await revalidateClient();
  return { ok: true };
}

/** Drag-and-drop order from the Photography page: first in the list = first on the website. */
export async function reorderPhotos(ids: string[]): Promise<ActionResult> {
  await requireAdmin();
  const problem = await applyOrder("gs_photos", ids);
  if (problem) return fail(problem);
  await revalidateClient();
  return { ok: true };
}
