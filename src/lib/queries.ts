import "server-only";
import { notFound } from "next/navigation";
import { db } from "./supabase";
import { isUuid } from "./action-utils";
import type { Booking, CaseStudy, Job, NotificationRecipient, Poster, Reel, Testimonial } from "./types";

const order = { ascending: true } as const;

export async function listReels() {
  const { data, error } = await db().from("gs_reels").select("*").order("sort_order", order).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Reel[];
}
export async function listPosters() {
  const { data, error } = await db().from("gs_posters").select("*").order("sort_order", order).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Poster[];
}
export async function listCaseStudies() {
  const { data, error } = await db().from("gs_case_studies").select("*").order("sort_order", order).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as CaseStudy[];
}
export async function listTestimonials() {
  const { data, error } = await db().from("gs_testimonials").select("*").order("sort_order", order).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Testimonial[];
}
export async function listBookings() {
  const { data, error } = await db().from("gs_bookings").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Booking[];
}

export async function listJobs() {
  const { data, error } = await db().from("gs_jobs").select("*").order("sort_order", order).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Job[];
}

export async function listRecipients() {
  const { data, error } = await db().from("gs_notification_recipients").select("*").order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data as NotificationRecipient[];
}

async function one<T>(table: string, id: string): Promise<T> {
  if (!isUuid(id)) notFound();
  const { data } = await db().from(table).select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return data as T;
}
export const getJob = (id: string) => one<Job>("gs_jobs", id);
export const getReel = (id: string) => one<Reel>("gs_reels", id);
export const getPoster = (id: string) => one<Poster>("gs_posters", id);
export const getCaseStudy = (id: string) => one<CaseStudy>("gs_case_studies", id);
export const getTestimonial = (id: string) => one<Testimonial>("gs_testimonials", id);
