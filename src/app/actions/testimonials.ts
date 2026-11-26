"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { removeFiles } from "@/lib/storage";
import { revalidateClient } from "@/lib/revalidate";
import { applyOrder, topSortOrder } from "@/lib/reorder";
import { bool, dbError, fail, isOwnStorageUrl, isUuid, req, str, type ActionResult } from "@/lib/action-utils";

export type TestimonialInput = {
  id?: string;
  client_name: string;
  role: string;
  organization: string;
  quote: string;
  image_path: string;
  image_url: string;
  featured: boolean;
  published: boolean;
};

export async function saveTestimonial(input: TestimonialInput): Promise<ActionResult> {
  await requireAdmin();

  const client_name = req(input.client_name, 120);
  const organization = req(input.organization, 150);
  const quote = req(input.quote, 1500);
  if (!client_name) return fail("Enter the client's name.");
  if (!organization) return fail("Enter the organization.");
  if (!quote) return fail("Enter the testimonial text.");
  if (input.image_url && !isOwnStorageUrl(input.image_url)) return fail("Invalid image.");

  const row = {
    client_name,
    organization,
    quote,
    role: str(input.role, 120),
    image_path: str(input.image_path, 500),
    image_url: str(input.image_url, 1000),
    featured: bool(input.featured),
    published: bool(input.published, true),
  };

  const sb = db();
  if (input.id) {
    if (!isUuid(input.id)) return fail("Invalid testimonial.");
    const { data: old } = await sb.from("gs_testimonials").select("image_path").eq("id", input.id).maybeSingle();
    const { error } = await sb.from("gs_testimonials").update(row).eq("id", input.id);
    if (error) return fail(dbError(error.message));
    if (old?.image_path && old.image_path !== row.image_path) await removeFiles([{ bucket: "images", path: old.image_path }]);
  } else {
    const { error } = await sb.from("gs_testimonials").insert({ ...row, sort_order: await topSortOrder("gs_testimonials") });
    if (error) return fail(dbError(error.message));
  }
  await revalidateClient();
  return { ok: true };
}

export async function setTestimonialFlag(id: string, field: "featured" | "published", value: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(id) || (field !== "featured" && field !== "published")) return fail("Invalid request.");
  const { error } = await db().from("gs_testimonials").update({ [field]: !!value }).eq("id", id);
  if (error) return fail(dbError(error.message));
  await revalidateClient();
  return { ok: true };
}

export async function deleteTestimonial(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(id)) return fail("Invalid testimonial.");
  const sb = db();
  const { data: old } = await sb.from("gs_testimonials").select("image_path").eq("id", id).maybeSingle();
  const { error } = await sb.from("gs_testimonials").delete().eq("id", id);
  if (error) return fail(dbError(error.message));
  await removeFiles([{ bucket: "images", path: old?.image_path }]);
  await revalidateClient();
  return { ok: true };
}

/** Drag-and-drop order from the Testimonials page: first in the list = first on the website. */
export async function reorderTestimonials(ids: string[]): Promise<ActionResult> {
  await requireAdmin();
  const problem = await applyOrder("gs_testimonials", ids);
  if (problem) return fail(problem);
  await revalidateClient();
  return { ok: true };
}
