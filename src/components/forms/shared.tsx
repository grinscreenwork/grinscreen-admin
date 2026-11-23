"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { Button, buttonClass } from "@/components/ui";

export function Switch({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors before:absolute before:-inset-x-2 before:-inset-y-3 before:content-['']",
          checked ? "border-brand-bright/60 bg-brand" : "border-border bg-surface-2",
        )}
      >
        <span className={cn("absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </button>
      <div>
        <p className="text-sm text-fg">{label}</p>
        {hint && <p className="text-xs text-fg-muted">{hint}</p>}
      </div>
    </div>
  );
}

export function FormFooter({
  saving,
  error,
  cancelHref,
  saveLabel = "Save",
}: {
  saving: boolean;
  error: string | null;
  cancelHref: string;
  saveLabel?: string;
}) {
  return (
    <div className="sticky bottom-0 -mx-4 mt-8 flex flex-wrap items-center gap-3 border-t border-border bg-bg/90 px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
      <Button type="submit" variant="primary" disabled={saving}>
        {saving ? "Saving…" : saveLabel}
      </Button>
      <Link href={cancelHref} className={buttonClass("ghost")}>
        Cancel
      </Link>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
