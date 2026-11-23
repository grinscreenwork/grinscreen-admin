"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

type Result = { ok: true } | { ok: false; error: string };

export function FlagToggle({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: (next: boolean) => Promise<Result>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState(checked);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      title={label}
      disabled={pending}
      onClick={() => {
        const next = !value;
        setValue(next);
        start(async () => {
          const res = await onToggle(next);
          if (!res.ok) setValue(!next);
          router.refresh();
        });
      }}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full border transition-colors disabled:opacity-60 before:absolute before:-inset-x-2 before:-inset-y-3 before:content-['']",
        value ? "border-brand-bright/60 bg-brand" : "border-border bg-surface-2",
      )}
    >
      <span className={cn("absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-all", value ? "left-[18px]" : "left-0.5")} />
    </button>
  );
}

export function DeleteButton({
  what,
  onDelete,
  redirectTo,
}: {
  what: string;
  onDelete: () => Promise<Result>;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Delete ${what}? This can't be undone.`)) return;
          setError(null);
          start(async () => {
            const res = await onDelete();
            if (!res.ok) setError(res.error);
            else if (redirectTo) router.push(redirectTo);
            else router.refresh();
          });
        }}
        className="rounded-lg border border-danger/40 px-3 py-2 text-xs text-danger sm:py-1.5 transition-colors hover:bg-danger/10 disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
