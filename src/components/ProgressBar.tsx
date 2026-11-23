import type { CompressProgress } from "@/lib/compress";

/** Turns compressor/upload events into a label and an optional 0-1 value (undefined = unknown, show a sweeping bar). */
export function describeProgress(p: CompressProgress | null, isVideo: boolean): { label: string; value?: number } | null {
  if (!p) return null;
  if (p.stage === "uploading") return { label: "Uploading to the website…", value: undefined };
  const base = p.note ?? (isVideo ? "Converting video" : "Optimising image");
  return typeof p.progress === "number"
    ? { label: `${base} · ${Math.round(p.progress * 100)}%`, value: p.progress }
    : { label: `${base}…`, value: undefined };
}

export function ProgressBar({ label, value }: { label: string; value?: number }) {
  const determinate = typeof value === "number";
  return (
    <div className="w-full max-w-xs" aria-live="polite">
      <p className="mb-1.5 text-xs text-fg">{label}</p>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={determinate ? Math.round(value * 100) : undefined}
        className="relative h-1.5 overflow-hidden rounded-full bg-surface-2"
      >
        {determinate ? (
          <div className="h-full rounded-full bg-brand-bright transition-[width] duration-200" style={{ width: `${Math.max(2, Math.round(value * 100))}%` }} />
        ) : (
          <div className="absolute inset-y-0 w-1/3 animate-[sweep_1.2s_ease-in-out_infinite] rounded-full bg-brand-bright" />
        )}
      </div>
    </div>
  );
}
