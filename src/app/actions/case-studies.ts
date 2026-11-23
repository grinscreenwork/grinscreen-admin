"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { removeFiles } from "@/lib/storage";
import { revalidateClient } from "@/lib/revalidate";
import { bool, dbError, fail, int, isOwnStorageUrl, isUuid, req, slugify, str, type ActionResult } from "@/lib/action-utils";
import type { Stat, Visual } from "@/lib/types";

export type CaseStudyInput = {
  id?: string;
  slug: string;
  brand: string;
  logo_path: string;
  logo_url: string;
  tagline: string;
  description: string;
  campaign: string;
  duration: string;
  problem: string;
  idea: string;
  pillars_title: string;
  pillars: string[];
  community: string;
  stats: Stat[];
  insight: string;
  visuals: Visual[];
  featured: boolean;
  published: boolean;
  sort_order: number;
};

function cleanVisuals(input: unknown): Visual[] {
  if (!Array.isArray(input)) return [];
  const out: Visual[] = [];
  for (const v of input.slice(0, 6)) {
    if (!v || typeof v !== "object") continue;
    const x = v as Record<string, unknown>;
    if (!isOwnStorageUrl(x.url) || typeof x.path !== "string") continue;
    const alt = str(x.alt, 200) ?? "";
    if (x.kind === "reel") {
      const fromLibrary = isUuid(x.reel_id);
      const hasPoster = isOwnStorageUrl(x.poster_url) && typeof x.poster_path === "string";
      if (!hasPoster && !fromLibrary) continue; // library reels may legitimately have no cover image
      const poster_url = hasPoster ? (x.poster_url as string) : "";
      const poster_path = hasPoster ? (x.poster_path as string) : "";
      out.push({
        kind: "reel",
        url: x.url,
        path: x.path,
        poster_url,
        poster_path,
        alt,
        ...(isUuid(x.reel_id) ? { reel_id: x.reel_id } : {}),
      });
    } else {
      out.push({ kind: "image", url: x.url, path: x.path, alt });
    }
  }
  return out;
}

function visualFiles(visuals: Visual[] | null | undefined) {
  const files: { bucket: "reels" | "images"; path: string }[] = [];
  for (const v of visuals ?? []) {
    if (v.kind === "reel" && v.reel_id) continue; // shared with a library reel: not ours to delete
    if (v.kind === "reel") {
      files.push({ bucket: "reels", path: v.path }, { bucket: "images", path: v.poster_path });
    } else files.push({ bucket: "images", path: v.path });
  }
  return files;
}

export async function saveCaseStudy(input: CaseStudyInput): Promise<ActionResult> {
  await requireAdmin();

  const brand = req(input.brand, 120);
  const tagline = req(input.tagline, 200);
  const description = req(input.description, 2000);
  if (!brand) return fail("Enter the brand name.");
  if (!tagline) return fail("Enter a tagline.");
  if (!description) return fail("Enter a description.");
  if (input.logo_url && !isOwnStorageUrl(input.logo_url)) return fail("Invalid logo.");

  const slug = slugify(str(input.slug, 80) ?? brand);
  if (!slug) return fail("Could not create a URL slug. Use letters or numbers.");

  const pillars = (Array.isArray(input.pillars) ? input.pillars : [])
    .map((p) => str(p, 300))
    .filter((p): p is string => !!p)
    .slice(0, 12);
  const stats = (Array.isArray(input.stats) ? input.stats : [])
    .map((s) => ({ value: str(s?.value, 30), label: str(s?.label, 60), sub: str(s?.sub, 100) }))
    .filter((s) => s.value && s.label)
    .map((s) => ({ value: s.value!, label: s.label!, ...(s.sub ? { sub: s.sub } : {}) }))
    .slice(0, 8);

  const row = {
    slug,
    brand,
    logo_path: str(input.logo_path, 500),
    logo_url: str(input.logo_url, 1000),
    tagline,
    description,
    campaign: str(input.campaign, 200),
    duration: str(input.duration, 100),
    problem: str(input.problem, 1000),
    idea: str(input.idea, 1000),
    pillars_title: str(input.pillars_title, 80),
    pillars,
    community: str(input.community, 1000),
    stats,
    insight: str(input.insight, 1000),
    visuals: cleanVisuals(input.visuals),
    featured: bool(input.featured),
    published: bool(input.published, true),
    sort_order: int(input.sort_order),
  };

  const sb = db();
  if (input.id) {
    if (!isUuid(input.id)) return fail("Invalid case study.");
    const { data: old } = await sb.from("gs_case_studies").select("logo_path, visuals").eq("id", input.id).maybeSingle();
    const { error } = await sb.from("gs_case_studies").update(row).eq("id", input.id);
    if (error) return fail(dbError(error.message));
    const keep = new Set([row.logo_path, ...visualFiles(row.visuals).map((f) => f.path)]);
    const stale = [
      ...(old?.logo_path ? [{ bucket: "images" as const, path: old.logo_path }] : []),
      ...visualFiles(old?.visuals as Visual[]),
    ].filter((f) => !keep.has(f.path));
    await removeFiles(stale);
  } else {
    const { error } = await sb.from("gs_case_studies").insert(row);
    if (error) return fail(dbError(error.message));
  }
  await revalidateClient();
  return { ok: true };
}

export async function setCaseStudyFlag(id: string, field: "featured" | "published", value: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(id) || (field !== "featured" && field !== "published")) return fail("Invalid request.");
  const { error } = await db().from("gs_case_studies").update({ [field]: !!value }).eq("id", id);
  if (error) return fail(dbError(error.message));
  await revalidateClient();
  return { ok: true };
}

export async function deleteCaseStudy(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(id)) return fail("Invalid case study.");
  const sb = db();
  const { data: old } = await sb.from("gs_case_studies").select("logo_path, visuals").eq("id", id).maybeSingle();
  const { error } = await sb.from("gs_case_studies").delete().eq("id", id);
  if (error) return fail(dbError(error.message));
  await removeFiles([
    ...(old?.logo_path ? [{ bucket: "images" as const, path: old.logo_path }] : []),
    ...visualFiles(old?.visuals as Visual[]),
  ]);
  await revalidateClient();
  return { ok: true };
}
