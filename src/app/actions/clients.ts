"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { removeFiles } from "@/lib/storage";
import { revalidateClient } from "@/lib/revalidate";
import { applyOrder, topSortOrder } from "@/lib/reorder";
import { bool, dbError, fail, isOwnStorageUrl, isUuid, req, type ActionResult } from "@/lib/action-utils";

export type ClientInput = {
  id?: string;
  name: string;
  logo_path: string;
  logo_url: string;
  published: boolean;
};

export async function saveClient(input: ClientInput): Promise<ActionResult> {
  await requireAdmin();

  const name = req(input.name, 100);
  if (!name) return fail("Enter the client's name.");
  if (!input.logo_path || !isOwnStorageUrl(input.logo_url)) return fail("Upload the client's logo.");

  const row = { name, logo_path: input.logo_path, logo_url: input.logo_url, published: bool(input.published, true) };

  const sb = db();
  if (input.id) {
    if (!isUuid(input.id)) return fail("Invalid client.");
    const { data: old } = await sb.from("gs_clients").select("logo_path").eq("id", input.id).maybeSingle();
    const { error } = await sb.from("gs_clients").update(row).eq("id", input.id);
    if (error) return fail(dbError(error.message));
    if (old?.logo_path && old.logo_path !== row.logo_path) await removeFiles([{ bucket: "images", path: old.logo_path }]);
  } else {
    const { error } = await sb.from("gs_clients").insert({ ...row, sort_order: await topSortOrder("gs_clients") });
    if (error) return fail(dbError(error.message));
  }
  await revalidateClient();
  return { ok: true };
}

export async function setClientPublished(id: string, value: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(id)) return fail("Invalid client.");
  const { error } = await db().from("gs_clients").update({ published: !!value }).eq("id", id);
  if (error) return fail(dbError(error.message));
  await revalidateClient();
  return { ok: true };
}

export async function deleteClient(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(id)) return fail("Invalid client.");
  const sb = db();
  const { data: old } = await sb.from("gs_clients").select("logo_path").eq("id", id).maybeSingle();
  const { error } = await sb.from("gs_clients").delete().eq("id", id);
  if (error) return fail(dbError(error.message));
  await removeFiles([{ bucket: "images", path: old?.logo_path }]);
  await revalidateClient();
  return { ok: true };
}

/** Drag-and-drop order from the Clients page: first in the list = first on the website. */
export async function reorderClients(ids: string[]): Promise<ActionResult> {
  await requireAdmin();
  const problem = await applyOrder("gs_clients", ids);
  if (problem) return fail(problem);
  await revalidateClient();
  return { ok: true };
}
