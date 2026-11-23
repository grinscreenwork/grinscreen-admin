"use client";

import { useEffect } from "react";
import type { Reel } from "@/lib/types";

/** Modal grid of the reels already in the library. Picking one reuses its files (nothing is re-uploaded). */
export function ReelPicker({
  reels,
  usedIds,
  onPick,
  onClose,
}: {
  reels: Reel[];
  usedIds: Set<string>;
  onPick: (reel: Reel) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pick a reel from the library"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-surface"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-base font-semibold">Pick from your reels</h2>
            <p className="mt-0.5 text-xs text-fg-muted">The reel&apos;s existing video is reused. Nothing is uploaded again.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg px-2.5 py-1.5 text-fg-muted hover:bg-surface-2 hover:text-fg">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {reels.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-fg-muted">
              There are no reels in the library yet. Add some on the Reels page, or upload one here.
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {reels.map((r) => {
                const used = usedIds.has(r.id);
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      disabled={used}
                      onClick={() => onPick(r)}
                      className="group relative block w-full overflow-hidden rounded-lg border border-border bg-bg text-left transition-colors enabled:hover:border-brand-bright/60 disabled:opacity-50"
                    >
                      <div className="relative aspect-[9/16] bg-bg">
                        {r.poster_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.poster_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <video src={r.video_url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                        )}
                        {used && (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/60 font-mono text-[10px] uppercase tracking-wider text-brand-bright">
                            Added
                          </span>
                        )}
                      </div>
                      <span className="block truncate px-2 py-1.5 text-xs text-fg">{r.title}</span>
                      {!r.published && <span className="block px-2 pb-1.5 font-mono text-[9px] uppercase text-warn">Hidden on site</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
