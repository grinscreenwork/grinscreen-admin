"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { dbError, fail, isUuid, str, type ActionResult } from "@/lib/action-utils";
import { BOOKING_STATUSES, type BookingStatus } from "@/lib/types";

export async function updateBooking(id: string, status: BookingStatus, admin_notes: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(id)) return fail("Invalid booking.");
  if (!(BOOKING_STATUSES as readonly string[]).includes(status)) return fail("Invalid status.");
  const { error } = await db()
    .from("gs_bookings")
    .update({ status, admin_notes: str(admin_notes, 2000) })
    .eq("id", id);
  if (error) return fail(dbError(error.message));
  return { ok: true };
}

export async function deleteBooking(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(id)) return fail("Invalid booking.");
  const { error } = await db().from("gs_bookings").delete().eq("id", id);
  if (error) return fail(dbError(error.message));
  return { ok: true };
}
