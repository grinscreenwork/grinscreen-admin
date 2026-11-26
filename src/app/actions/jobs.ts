"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { revalidateClient } from "@/lib/revalidate";
import { applyOrder, topSortOrder } from "@/lib/reorder";
import { bool, dbError, fail, isUuid, req, str, type ActionResult } from "@/lib/action-utils";
import { WORK_MODES, type WorkMode } from "@/lib/types";

export type JobInput = {
  id?: string;
  title: string;
  work_mode: WorkMode;
  job_type: string;
  location: string;
  apply_url: string;
  published: boolean;
};

/** Accepts only a real https:// link, so the Apply button can never point at a javascript: or other odd URL. */
function cleanApplyUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t || t.length > 600) return null;
  try {
    const u = new URL(t);
    return u.protocol === "https:" && u.hostname.includes(".") ? u.toString() : null;
  } catch {
    return null;
  }
}

export async function saveJob(input: JobInput): Promise<ActionResult> {
  await requireAdmin();

  const title = req(input.title, 120);
  if (!title) return fail("Enter the job title.");
  if (!(WORK_MODES as readonly string[]).includes(input.work_mode)) return fail("Choose a work mode.");
  const apply_url = cleanApplyUrl(input.apply_url);
  if (!apply_url) return fail("Enter the application link, starting with https:// (for example your Google Form link).");

  const row = {
    title,
    work_mode: input.work_mode,
    job_type: str(input.job_type, 40),
    location: str(input.location, 80),
    apply_url,
    published: bool(input.published, true),
  };

  const sb = db();
  if (input.id) {
    if (!isUuid(input.id)) return fail("Invalid job.");
    const { error } = await sb.from("gs_jobs").update(row).eq("id", input.id);
    if (error) return fail(dbError(error.message));
  } else {
    const { error } = await sb.from("gs_jobs").insert({ ...row, sort_order: await topSortOrder("gs_jobs") });
    if (error) return fail(dbError(error.message));
  }
  await revalidateClient();
  return { ok: true };
}

export async function setJobPublished(id: string, value: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(id)) return fail("Invalid job.");
  const { error } = await db().from("gs_jobs").update({ published: !!value }).eq("id", id);
  if (error) return fail(dbError(error.message));
  await revalidateClient();
  return { ok: true };
}

export async function deleteJob(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(id)) return fail("Invalid job.");
  const { error } = await db().from("gs_jobs").delete().eq("id", id);
  if (error) return fail(dbError(error.message));
  await revalidateClient();
  return { ok: true };
}

/** Drag-and-drop order from the Careers page: first in the list = first on the website. */
export async function reorderJobs(ids: string[]): Promise<ActionResult> {
  await requireAdmin();
  const problem = await applyOrder("gs_jobs", ids);
  if (problem) return fail(problem);
  await revalidateClient();
  return { ok: true };
}
