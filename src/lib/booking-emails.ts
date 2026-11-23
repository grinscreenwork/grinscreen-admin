import "server-only";
import { db } from "./supabase";
import { friendlyMailError, mailConfigured, sendMail, type Mail } from "./mail";
import type { Booking } from "./types";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const oneLine = (s: string) => s.replace(/[\r\n\t]+/g, " ").trim();
const GREEN = "#0E8616";

function shell(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#f3f5f3;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#1b241d">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e1e7e1">
      <tr><td style="background:#0A0B0A;padding:20px 28px"><span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:.2px">Grin<span style="color:#16C138">Screen</span></span></td></tr>
      <tr><td style="padding:28px">
        <h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;color:#0A0B0A">${esc(title)}</h1>
        ${bodyHtml}
      </td></tr>
    </table>
    <p style="max-width:560px;font-size:12px;color:#7a877d;margin:16px 0 0">GrinScreen · Digital marketing agency, Bangladesh</p>
  </td></tr></table></body></html>`;
}

function detailsTable(b: Pick<Booking, "name" | "email" | "phone" | "notes">) {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:8px 0;width:96px;color:#6b786e;font-size:13px;vertical-align:top">${k}</td><td style="padding:8px 0;font-size:15px;color:#1b241d;white-space:pre-wrap">${v}</td></tr>`;
  return `<table role="presentation" width="100%" style="border-top:1px solid #e1e7e1;border-bottom:1px solid #e1e7e1;margin:18px 0">
    ${row("Name", esc(b.name))}
    ${row("Email", `<a href="mailto:${esc(b.email)}" style="color:${GREEN}">${esc(b.email)}</a>`)}
    ${row("Phone", esc(b.phone))}
    ${row("Notes", b.notes ? esc(b.notes) : '<span style="color:#9aa69c">None provided</span>')}
  </table>`;
}

/** Email to the person who booked. */
export function confirmationEmail(b: Booking): Mail {
  const first = oneLine(b.name).split(" ")[0] || "there";
  return {
    to: b.email,
    subject: "We got your call request | GrinScreen",
    html: shell(
      `Thanks, ${first}. We got your request.`,
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">Your request for a call with GrinScreen is confirmed on our side. Someone from the team will reach out shortly on the phone number or email below to agree a time that suits you.</p>
       ${detailsTable(b)}
       <p style="margin:0 0 6px;font-size:15px;line-height:1.6">Need to add something, or can't make it? Just reply to this email.</p>
       <p style="margin:18px 0 0;font-size:15px">Talk soon,<br><strong>The GrinScreen team</strong></p>`,
    ),
    text: `Thanks, ${first}. We got your request.\n\nYour request for a call with GrinScreen is confirmed on our side. Someone from the team will reach out shortly on the phone number or email below to agree a time that suits you.\n\nName: ${b.name}\nEmail: ${b.email}\nPhone: ${b.phone}\nNotes: ${b.notes || "None provided"}\n\nNeed to add something, or can't make it? Just reply to this email.\n\nTalk soon,\nThe GrinScreen team`,
  };
}

/** Email to the agency owners. */
export function ownerEmail(b: Booking, to: string[]): Mail {
  const adminUrl = process.env.ADMIN_URL ? `${process.env.ADMIN_URL.replace(/\/$/, "")}/bookings` : null;
  return {
    to,
    replyTo: b.email,
    subject: `New call request: ${oneLine(b.name).slice(0, 60)}`,
    html: shell(
      "New call request",
      `<p style="margin:0 0 4px;font-size:15px;line-height:1.6"><strong>${esc(b.name)}</strong> just asked for a call through the website. They've been sent a confirmation. Replying to this email goes straight to them.</p>
       ${detailsTable(b)}
       ${adminUrl ? `<p style="margin:0"><a href="${esc(adminUrl)}" style="display:inline-block;background:${GREEN};color:#ffffff;text-decoration:none;font-weight:700;padding:11px 20px;border-radius:999px;font-size:14px">Open in admin</a></p>` : ""}`,
    ),
    text: `${b.name} just asked for a call through the website. They've been sent a confirmation. Replying to this email goes straight to them.\n\nName: ${b.name}\nEmail: ${b.email}\nPhone: ${b.phone}\nNotes: ${b.notes || "None provided"}\n${adminUrl ? `\nOpen in admin: ${adminUrl}\n` : ""}`,
  };
}

export type NotifyResult = { ok: boolean; sent: { customer: boolean; owners: number }; error?: string };

/**
 * Send the customer confirmation + owner alerts for a booking, and record the outcome on the row.
 * Safe to call again (the admin's "Resend" button does).
 */
export async function notifyBooking(booking: Booking): Promise<NotifyResult> {
  const sb = db();
  const sent = { customer: false, owners: 0 };
  const problems: string[] = [];

  if (!mailConfigured()) {
    const error = "Email isn't configured yet (GMAIL_USER / GMAIL_APP_PASSWORD).";
    await sb.from("gs_bookings").update({ notify_error: error }).eq("id", booking.id);
    return { ok: false, sent, error };
  }

  const { data: recipients } = await sb.from("gs_notification_recipients").select("email").eq("active", true);
  const owners = (recipients ?? []).map((r) => r.email as string);

  try {
    await sendMail(confirmationEmail(booking));
    sent.customer = true;
  } catch (e) {
    console.error("[notify] customer email failed:", e instanceof Error ? e.message : e);
    problems.push(`Confirmation to the customer failed: ${friendlyMailError(e)}`);
  }

  if (owners.length) {
    try {
      await sendMail(ownerEmail(booking, owners));
      sent.owners = owners.length;
    } catch (e) {
      console.error("[notify] owner email failed:", e instanceof Error ? e.message : e);
      problems.push(`Alert to the owners failed: ${friendlyMailError(e)}`);
    }
  } else {
    problems.push("No active notification recipients are set up, so no owner was told. Add them on the Notifications page.");
  }

  const error = problems.length ? problems.join(" ") : null;
  await sb
    .from("gs_bookings")
    .update({ notified_at: sent.customer || sent.owners ? new Date().toISOString() : null, notify_error: error })
    .eq("id", booking.id);

  return { ok: problems.length === 0, sent, error: error ?? undefined };
}
