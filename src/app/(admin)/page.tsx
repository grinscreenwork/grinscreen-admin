import Link from "next/link";
import { db } from "@/lib/supabase";
import { Badge, Card, LinkButton, PageHeader } from "@/components/ui";
import type { Booking } from "@/lib/types";

export const metadata = { title: "Dashboard" };

async function count(table: string, filter?: [string, string | boolean]) {
  let q = db().from(table).select("id", { count: "exact", head: true });
  if (filter) q = q.eq(filter[0], filter[1]);
  const { count } = await q;
  return count ?? 0;
}

export default async function DashboardPage() {
  const [reels, posters, studies, testimonials, newBookings, recent] = await Promise.all([
    count("gs_reels"),
    count("gs_posters"),
    count("gs_case_studies"),
    count("gs_testimonials"),
    count("gs_bookings", ["status", "new"]),
    db().from("gs_bookings").select("*").order("created_at", { ascending: false }).limit(5),
  ]);

  const cards = [
    { label: "Reels", value: reels, href: "/reels" },
    { label: "Posters", value: posters, href: "/posters" },
    { label: "Case studies", value: studies, href: "/case-studies" },
    { label: "Testimonials", value: testimonials, href: "/testimonials" },
  ];
  const bookings = (recent.data ?? []) as Booking[];

  return (
    <>
      <PageHeader title="Dashboard" description="What's on the GrinScreen website right now." />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="group rounded-xl border border-border bg-surface p-5 transition-colors hover:border-brand-bright/50">
            <p className="font-display text-3xl font-bold text-fg">{c.value}</p>
            <p className="mt-1 text-sm text-fg-muted group-hover:text-brand-bright">{c.label}</p>
          </Link>
        ))}
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold">Recent booking requests</h2>
            {newBookings > 0 && <Badge tone="green">{newBookings} new</Badge>}
          </div>
          <LinkButton href="/bookings" size="sm">
            View all
          </LinkButton>
        </div>
        {bookings.length === 0 ? (
          <p className="py-8 text-center text-sm text-fg-muted">No booking requests yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {bookings.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{b.name}</p>
                  <p className="truncate text-xs text-fg-muted">
                    {b.email} · {b.phone}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={b.status === "new" ? "green" : b.status === "cancelled" ? "danger" : "muted"}>{b.status}</Badge>
                  <time className="font-mono text-xs text-fg-muted" dateTime={b.created_at}>
                    {new Date(b.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
