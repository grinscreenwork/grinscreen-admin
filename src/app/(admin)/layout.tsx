import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { Sidebar } from "@/components/Sidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const { count } = await db().from("gs_bookings").select("id", { count: "exact", head: true }).eq("status", "new");

  return (
    <div className="min-h-dvh">
      <Sidebar username={session.username} newBookings={count ?? 0} />
      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-8 lg:ml-64 lg:px-10 lg:py-10">
        <div className="mx-auto min-w-0 max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
