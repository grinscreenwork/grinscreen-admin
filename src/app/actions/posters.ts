"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { removeFiles } from "@/lib/storage";
import { revalidateClient } from "@/lib/revalidate";
import { bool, dbError, fail, int, isOwnStorageUrl, isUuid, req, str, type ActionResult } from "@/lib/action-utils";
import type { StoredImage } from "@/lib/types";

export type PosterInput = {
  id?: string;
  title: string;
  description: string;
  images: StoredImage[];
  featured: boolean;
  published: boolean;
  sort_order: number;
};

export async function savePoster(input: PosterInput): Promise<ActionResult> {
  await requireAdmin();

  const title = req(input.title, 150);
  if (!title) return fail("Give the poster a title.");
  const images = (Array.isArray(input.images) ? input.images : [])
    .filter((i) => i && typeof i.path === "string" && isOwnStorageUrl(i.url))
    .map((i) => ({ path: i.path, url: i.url }))
    .slice(0, 20);
  if (images.length === 0) return fail("Upload at least one image.");

  const row = {
    title,
    description: str(input.description, 600),
    images,
    featured: bool(input.featured),
    published: bool(input.published, true),
    sort_order: int(input.sort_order),
  };

  const sb = db();
  if (input.id) {
    if (!isUuid(input.id)) return fail("Invalid poster.");
    const { data: old } = await sb.from("gs_posters").select("images").eq("id", input.id).maybeSingle();
    const { error } = await sb.from("gs_posters").update(row).eq("id", input.id);
    if (error) return fail(dbError(error.message));
    const keep = new Set(images.map((i) => i.path));
    await removeFiles(((old?.images ?? []) as StoredImage[]).filter((i) => !keep.has(i.path)).map((i) => ({ bucket: "images" as const, path: i.path })));
  } else {
    const { error } = await sb.from("gs_posters").insert(row);
    if (error) return fail(dbError(error.message));
  }
  await revalidateClient();
  return { ok: true };
}

export async function setPosterFlag(id: string, field: "featured" | "published", value: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(id) || (field !== "featured" && field !== "published")) return fail("Invalid request.");
  const { error } = await db().from("gs_posters").update({ [field]: !!value }).eq("id", id);
  if (error) return fail(dbError(error.message));
  await revalidateClient();
  return { ok: true };
}

export async function deletePoster(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(id)) return fail("Invalid poster.");
  const sb = db();
  const { data: old } = await sb.from("gs_posters").select("images").eq("id", id).maybeSingle();
  const { error } = await sb.from("gs_posters").delete().eq("id", id);
  if (error) return fail(dbError(error.message));
  await removeFiles(((old?.images ?? []) as StoredImage[]).map((i) => ({ bucket: "images" as const, path: i.path })));
  await revalidateClient();
  return { ok: true };
}
