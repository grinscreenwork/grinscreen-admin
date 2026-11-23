"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, EmptyState, Select, Textarea } from "@/components/ui";
import { DeleteButton } from "@/components/RowActions";
import { cn } from "@/lib/cn";
import { deleteBooking, updateBooking } from "@/app/actions/bookings";
import { resendBookingEmails } from "@/app/actions/notifications";
import { BOOKING_STATUSES, type Booking, type BookingStatus } from "@/lib/types";

const tone = (s: BookingStatus) => (s === "new" ? "green" : s === "confirmed" ? "warn" : s === "cancelled" ? "danger" : "muted");

function BookingCard({ booking }: { booking: Booking }) {
  const router = useRouter();
  const [open, setOpen] = useState(booking.status === "new");
  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [notes, setNotes] = useState(booking.admin_notes ?? "");
  const [pending, start] = useTransition();
  const [resending, startResend] = useTransition();
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = status !== booking.status || notes !== (booking.admin_notes ?? "");

  const when = new Date(booking.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <li className="rounded-xl border border-border bg-surface">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left">
        <div className="min-w-0">
          <p className="truncate font-medium">{booking.name}</p>
          <p className="truncate text-xs text-fg-muted">
            {booking.email} · {booking.phone}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Badge tone={tone(booking.status)}>{booking.status}</Badge>
          <time className="font-mono text-xs text-fg-muted" dateTime={booking.created_at}>
            {when}
          </time>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("text-fg-muted transition-transform", open && "rotate-180")} aria-hidden="true">
            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="space-y-5 border-t border-border p-4">
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="mb-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">Email</dt>
              <dd>
                <a href={`mailto:${booking.email}`} className="inline-block break-all py-1.5 text-brand-bright hover:underline">
                  {booking.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="mb-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">Phone</dt>
              <dd>
                <a href={`tel:${booking.phone}`} className="inline-block py-1.5 text-brand-bright hover:underline">
                  {booking.phone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="mb-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted">Received</dt>
              <dd>{when}</dd>
            </div>
          </dl>

          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-fg-muted">Their notes</p>
            <p className="whitespace-pre-wrap rounded-lg bg-bg p-3 text-sm text-fg">{booking.notes || <span className="text-fg-muted">No notes provided.</span>}</p>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg bg-bg p-3 text-xs">
            <div className="min-w-0">
              {booking.notified_at ? (
                <p className="text-brand-bright">
                  ✓ Confirmation + owner alerts sent {new Date(booking.notified_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              ) : (
                <p className="text-fg-muted">Emails haven&apos;t been sent for this request.</p>
              )}
              {booking.notify_error && <p className="mt-1 text-warn">{booking.notify_error}</p>}
              {resendMsg && <p className="mt-1 text-fg-muted">{resendMsg}</p>}
            </div>
            <Button
              size="sm"
              disabled={resending}
              onClick={() =>
                startResend(async () => {
                  setResendMsg(null);
                  const res = await resendBookingEmails(booking.id);
                  setResendMsg(res.ok ? "Emails sent." : res.error);
                  router.refresh();
                })
              }
            >
              {resending ? "Sending…" : booking.notified_at ? "Resend emails" : "Send emails"}
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium">Status</span>
              <Select value={status} onChange={(e) => { setStatus(e.target.value as BookingStatus); setSaved(false); }}>
                {BOOKING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium">Internal notes</span>
              <Textarea rows={2} value={notes} onChange={(e) => { setNotes(e.target.value); setSaved(false); }} maxLength={2000} placeholder="Only visible here, e.g. call scheduled for Tue 4pm." />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              disabled={pending || !dirty}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const res = await updateBooking(booking.id, status, notes);
                  if (!res.ok) return setError(res.error);
                  setSaved(true);
                  router.refresh();
                })
              }
            >
              {pending ? "Saving…" : "Save"}
            </Button>
            <DeleteButton what={`the request from ${booking.name}`} onDelete={deleteBooking.bind(null, booking.id)} />
            {saved && <span className="text-xs text-brand-bright">Saved</span>}
            {error && <span className="text-xs text-danger">{error}</span>}
          </div>
        </div>
      )}
    </li>
  );
}

export function BookingsList({ bookings }: { bookings: Booking[] }) {
  const [filter, setFilter] = useState<"all" | BookingStatus>("all");
  const shown = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <>
      <div role="tablist" aria-label="Filter bookings" className="mb-5 flex flex-wrap gap-2">
        {(["all", ...BOOKING_STATUSES] as const).map((f) => {
          const n = f === "all" ? bookings.length : bookings.filter((b) => b.status === f).length;
          return (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs capitalize transition-colors",
                filter === f ? "border-brand-bright/60 bg-brand/15 text-brand-bright" : "border-border text-fg-muted hover:text-fg",
              )}
            >
              {f} <span className="ml-1 font-mono opacity-70">{n}</span>
            </button>
          );
        })}
      </div>
      {shown.length === 0 ? (
        <EmptyState title={filter === "all" ? "No booking requests yet. They'll appear here as soon as someone submits the form." : `No ${filter} requests.`} />
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {shown.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </ul>
      )}
    </>
  );
}
