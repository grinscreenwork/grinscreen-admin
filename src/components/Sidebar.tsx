"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { logout } from "@/app/actions/auth";

const NAV = [
  { href: "/", label: "Dashboard", icon: "M3 12 12 3l9 9M5 10v10h5v-6h4v6h5V10" },
  { href: "/reels", label: "Reels", icon: "M4 5h16v14H4zM10 9l5 3-5 3z" },
  { href: "/posters", label: "Posters", icon: "M5 4h14v16H5zM5 15l4-4 4 4 3-3 3 3" },
  { href: "/case-studies", label: "Case Studies", icon: "M7 3h10l3 3v15H4V3zM8 11h8M8 15h8" },
  { href: "/clients", label: "Clients", icon: "M3 21V8l9-5 9 5v13M9 21v-6h6v6M3 21h18" },
  { href: "/photography", label: "Photography", icon: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" },
  { href: "/testimonials", label: "Testimonials", icon: "M4 5h16v11H9l-5 4zM8 9h8M8 12h5" },
  { href: "/jobs", label: "Careers", icon: "M3 8h18v12H3zM8 8V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3M3 13h18" },
  { href: "/bookings", label: "Bookings", icon: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" },
  { href: "/notifications", label: "Notifications", icon: "M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6zM10 19a2 2 0 0 0 4 0" },
];

export function Sidebar({ username, newBookings }: { username: string; newBookings: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav aria-label="Admin" className="flex flex-1 flex-col gap-1">
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              active ? "bg-brand/15 text-brand-bright" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={item.icon} />
            </svg>
            <span className="flex-1">{item.label}</span>
            {item.href === "/bookings" && newBookings > 0 && (
              <span className="rounded-full bg-brand-bright px-1.5 py-0.5 font-mono text-[10px] font-semibold text-black">{newBookings}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="" width={28} height={28} loading="lazy" decoding="async" />
          <span className="font-display text-sm font-bold">GrinScreen Admin</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Toggle menu"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d={open ? "M6 6l12 12M18 6 6 18" : "M4 7h16M4 12h16M4 17h16"} />
          </svg>
        </button>
      </div>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-20 flex w-64 flex-col gap-6 border-r border-border bg-surface px-4 py-6 transition-transform lg:translate-x-0",
          open ? "translate-x-0 pt-20" : "-translate-x-full",
        )}
      >
        <div className="hidden items-center gap-2.5 px-2 lg:flex">
          <img src="/logo.png" alt="" width={32} height={32} loading="lazy" decoding="async" />
          <div>
            <p className="font-display text-sm font-bold leading-tight">GrinScreen</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-brand-bright">Admin</p>
          </div>
        </div>
        {nav}
        <div className="border-t border-border pt-4">
          <p className="mb-2 truncate px-2 font-mono text-xs text-fg-muted">Signed in as {username}</p>
          <form action={logout}>
            <button type="submit" className="w-full rounded-lg px-3 py-2 text-left text-sm text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      {open && <button type="button" aria-label="Close menu" className="fixed inset-0 z-10 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}
    </>
  );
}
