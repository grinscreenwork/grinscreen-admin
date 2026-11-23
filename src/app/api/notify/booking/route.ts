import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/supabase";
import { isUuid } from "@/lib/action-utils";
import { notifyBooking } from "@/lib/booking-emails";
import type { Booking } from "@/lib/types";

// Called server-to-server by the public site right after it saves a booking.
// It carries no admin session, so it is authenticated with a shared secret instead
// (see the matching exemption in src/proxy.ts).

const FRESH_MS = 15 * 60 * 1000; // only bookings from the last 15 minutes can trigger emails this way

function secretOk(given: string): boolean {
  const expected = process.env.NOTIFY_SECRET ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return expected.length >= 16 && a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!secretOk(request.headers.get("x-notify-secret") ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { id?: unknown };
  if (!isUuid(body.id)) return NextResponse.json({ error: "Invalid booking id" }, { status: 400 });

  const { data } = await db().from("gs_bookings").select("*").eq("id", body.id).maybeSingle();
  const booking = data as (Booking & { notified_at: string | null }) | null;
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Replay / spam protection: one automatic send per booking, and only while it's fresh.
  if (booking.notified_at) return NextResponse.json({ ok: true, skipped: "already notified" });
  if (Date.now() - new Date(booking.created_at).getTime() > FRESH_MS) {
    return NextResponse.json({ ok: false, skipped: "too old" }, { status: 409 });
  }

  const result = await notifyBooking(booking);
  return NextResponse.json({ ok: result.ok, sent: result.sent }, { status: result.ok ? 200 : 502 });
}
