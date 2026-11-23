"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, EmptyState, Field, Input } from "@/components/ui";
import { DeleteButton, FlagToggle } from "@/components/RowActions";
import { addRecipient, deleteRecipient, sendTestEmail, setRecipientActive } from "@/app/actions/notifications";
import type { NotificationRecipient } from "@/lib/types";

function TestButton({ id, disabled }: { id: string; disabled: boolean }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        size="sm"
        disabled={pending || disabled}
        onClick={() =>
          start(async () => {
            setResult(null);
            const res = await sendTestEmail(id);
            setResult(res.ok ? { ok: true, text: "Test sent" } : { ok: false, text: res.error });
          })
        }
      >
        {pending ? "Sending…" : "Send test"}
      </Button>
      {result && <span className={`max-w-[16rem] text-xs ${result.ok ? "text-brand-bright" : "text-danger"}`}>{result.text}</span>}
    </span>
  );
}

export function Recipients({ recipients, configured }: { recipients: NotificationRecipient[]; configured: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await addRecipient(email, label);
      if (!res.ok) return setError(res.error);
      setEmail("");
      setLabel("");
      router.refresh();
    });
  }

  return (
    <>
      <Card className="mb-6">
        <h2 className="mb-1 text-sm font-semibold">Add an owner</h2>
        <p className="mb-4 text-xs text-fg-muted">They&apos;ll be emailed every time someone books a call. Their reply goes straight to the person who booked.</p>
        <form onSubmit={add} className="grid gap-4 sm:grid-cols-[1.4fr_1fr_auto] sm:items-end">
          <Field label="Email" required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@example.com" required maxLength={200} />
          </Field>
          <Field label="Name" hint="Optional.">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Founder" maxLength={80} />
          </Field>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Adding…" : "Add"}
          </Button>
        </form>
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
      </Card>

      {recipients.length === 0 ? (
        <EmptyState title="No owners added yet. Until you add one, nobody but the customer gets an email." />
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {recipients.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-all font-medium">{r.email}</p>
                  <p className="truncate text-xs text-fg-muted">{r.label || "No name"}</p>
                </div>
                {!r.active && <Badge tone="warn">paused</Badge>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-border pt-3">
                <label className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-fg-muted">
                  Notify
                  <FlagToggle label={`Send alerts to ${r.email}`} checked={r.active} onToggle={setRecipientActive.bind(null, r.id)} />
                </label>
                <div className="ml-auto flex flex-wrap items-start gap-2">
                  <TestButton id={r.id} disabled={!configured} />
                  <DeleteButton what={r.email} onDelete={deleteRecipient.bind(null, r.id)} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
