"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { dbError, fail, isUuid, str, type ActionResult } from "@/lib/action-utils";
import { friendlyMailError, mailConfigured, sendMail } from "@/lib/mail";
import { notifyBooking } from "@/lib/booking-emails";
import type { Booking } from "@/lib/types";

const EMAIL = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]{2,}$/;

export async function addRecipient(email: string, label: string): Promise<ActionResult> {
  await requireAdmin();
  const clean = (str(email, 200) ?? "").toLowerCase();
  if (!EMAIL.test(clean)) return fail("Enter a valid email address.");
  const { error } = await db().from("gs_notification_recipients").insert({ email: clean, label: str(label, 80) });
  if (error) return fail(/duplicate/i.test(error.message) ? "That email is already on the list." : dbError(error.message));
  return { ok: true };
}

export async function setRecipientActive(id: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(id)) return fail("Invalid recipient.");
  const { error } = await db().from("gs_notification_recipients").update({ active: !!active }).eq("id", id);
  if (error) return fail(dbError(error.message));
  return { ok: true };
}

export async function deleteRecipient(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(id)) return fail("Invalid recipient.");
  const { error } = await db().from("gs_notification_recipients").delete().eq("id", id);
  if (error) return fail(dbError(error.message));
  return { ok: true };
}

/** Sends a harmless test message to one saved recipient so the setup can be checked. */
export async function sendTestEmail(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(id)) return fail("Invalid recipient.");
  if (!mailConfigured()) return fail("Email isn't configured yet. Add GMAIL_USER and GMAIL_APP_PASSWORD to the admin's .env.");
  const { data } = await db().from("gs_notification_recipients").select("email").eq("id", id).maybeSingle();
  if (!data) return fail("Recipient not found.");
  try {
    await sendMail({
      to: data.email,
      subject: "GrinScreen test email",
      text: "This is a test from the GrinScreen admin. You'll get an email like this whenever someone books a call.",
      html: '<p style="font-family:Arial,sans-serif;font-size:15px">This is a test from the <strong>GrinScreen admin</strong>. You\'ll get an email like this whenever someone books a call.</p>',
    });
    return { ok: true };
  } catch (e) {
    return fail(friendlyMailError(e));
  }
}

/** Re-send the confirmation + owner emails for one booking (e.g. after fixing the Gmail setup). */
export async function resendBookingEmails(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!isUuid(id)) return fail("Invalid booking.");
  const { data } = await db().from("gs_bookings").select("*").eq("id", id).maybeSingle();
  if (!data) return fail("Booking not found.");
  const result = await notifyBooking(data as Booking);
  return result.ok ? { ok: true } : fail(result.error ?? "Couldn't send the emails.");
}
