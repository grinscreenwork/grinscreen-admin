import "server-only";
import { db } from "./supabase";
import { isUuid } from "./action-utils";

type OrderedTable = "gs_reels" | "gs_posters" | "gs_case_studies" | "gs_testimonials" | "gs_jobs";

/**
 * Save a drag-and-drop order: the first id gets 0, the next 1, and so on. The public site
 * sorts by `sort_order` ascending, so whatever is first here shows first there.
 */
export async function applyOrder(table: OrderedTable, ids: unknown): Promise<string | null> {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 500) return "Invalid order.";
  if (!ids.every(isUuid) || new Set(ids).size !== ids.length) return "Invalid order.";

  const sb = db();
  const results = await Promise.all(ids.map((id, index) => sb.from(table).update({ sort_order: index }).eq("id", id)));
  return results.find((r) => r.error) ? "Couldn't save the new order. Please try again." : null;
}

/** A sort_order that places a brand-new item before everything else (newest first, until you drag it elsewhere). */
export async function topSortOrder(table: OrderedTable): Promise<number> {
  const { data } = await db().from(table).select("sort_order").order("sort_order", { ascending: true }).limit(1);
  const min = data?.[0]?.sort_order;
  return typeof min === "number" ? min - 1 : 0;
}
