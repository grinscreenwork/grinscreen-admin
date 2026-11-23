"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { uploadFile, type Uploaded } from "@/lib/supabase-browser";
import type { CompressProgress } from "@/lib/compress";
import { ProgressBar, describeProgress } from "@/components/ProgressBar";

type Props = {
  kind: "reels" | "images";
  folder: string;
  label: string;
  hint?: string;
  value: Uploaded | null;
  onChange: (value: Uploaded | null) => void;
  /** Called with the picked file before upload (e.g. to generate a cover from a video). */
  onPick?: (file: File) => void;
  required?: boolean;
  /** Visual preview shape. */
  aspect?: "portrait" | "square" | "wide";
  className?: string;
};

const ACCEPT = {
  reels: "video/mp4,video/webm,video/quicktime",
  images: "image/jpeg,image/png,image/webp,image/avif",
};

export function Uploader({ kind, folder, label, hint, value, onChange, onPick, required, aspect = "portrait", className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<CompressProgress | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const shown = describeProgress(progress, kind === "reels");

  async function handle(file: File | undefined) {
    if (!file) return;
    setError(null);
    setSaved(null);
    setBusy(true);
    try {
      onPick?.(file);
      const { note, ...uploaded } = await uploadFile(kind, folder, file, setProgress);
      onChange(uploaded);
      setSaved(note);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const shape = aspect === "portrait" ? "aspect-[9/16] w-28" : aspect === "square" ? "aspect-square w-28" : "aspect-video w-44";

  return (
    <div className={className}>
      <p className="mb-1.5 text-xs font-medium text-fg">
        {label}
        {required && <span className="ml-0.5 text-brand-bright">*</span>}
      </p>
      <div className="flex items-start gap-4">
        <div className={cn("relative shrink-0 overflow-hidden rounded-lg border border-border bg-bg", shape)}>
          {value ? (
            kind === "reels" ? (
              <video src={value.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value.url} alt="" className="h-full w-full object-cover" />
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center text-fg-muted/50">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M12 16V4m0 0L8 8m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              {typeof shown?.value === "number" ? (
                <span className="font-mono text-sm font-semibold text-brand-bright">{Math.round(shown.value * 100)}%</span>
              ) : (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-brand-bright" />
              )}
            </div>
          )}
        </div>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-fg sm:py-1.5 transition-colors hover:border-brand-bright/50 disabled:opacity-50"
            >
              {busy ? "Working…" : value ? "Replace" : "Choose file"}
            </button>
            {value && !busy && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="rounded-lg px-3 py-2 text-xs text-fg-muted transition-colors hover:text-danger sm:py-1.5"
              >
                Remove
              </button>
            )}
          </div>
          {busy && shown && <ProgressBar label={shown.label} value={shown.value} />}
          {hint && <p className="text-xs text-fg-muted">{hint}</p>}
          {saved && !busy && <p className="text-xs text-brand-bright">Optimised: {saved}</p>}
          {error && (
            <p role="alert" className="text-xs text-danger">
              {error}
            </p>
          )}
        </div>
        <input ref={inputRef} type="file" accept={ACCEPT[kind]} className="sr-only" onChange={(e) => handle(e.target.files?.[0])} />
      </div>
    </div>
  );
}
