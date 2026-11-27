"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { ProgressBar } from "@/components/ProgressBar";
import { createPhotos, type NewPhoto } from "@/app/actions/photos";
import { uploadFile } from "@/lib/supabase-browser";

/** Read a picture's real size from its uploaded URL, so the website can reserve the right space for it. */
function measure(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
}

export function BulkPhotoUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handle(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, 40);
    setBusy(true);
    setMessage(null);
    setProgress({ done: 0, total: list.length });

    const uploaded: NewPhoto[] = [];
    const failed: string[] = [];
    for (const file of list) {
      try {
        const up = await uploadFile("images", "photography", file);
        const dims = await measure(up.url);
        uploaded.push({ path: up.path, url: up.url, ...dims });
      } catch (e) {
        failed.push(`${file.name}: ${e instanceof Error ? e.message : "failed"}`);
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }

    if (uploaded.length) {
      const res = await createPhotos(uploaded);
      if (!res.ok) failed.push(res.error);
    }
    setBusy(false);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
    setMessage(
      failed.length
        ? { ok: false, text: `${uploaded.length} added. Problems: ${failed.join(" · ")}` }
        : { ok: true, text: `${uploaded.length} photo${uploaded.length === 1 ? "" : "s"} added at the top of the list.` },
    );
    router.refresh();
  }

  return (
    <div className="mb-6 rounded-xl border border-dashed border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">Add photos</p>
          <p className="text-xs text-fg-muted">Pick one or many (up to 40). Each is resized and compressed automatically.</p>
        </div>
        <Button variant="primary" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? "Uploading…" : "+ Choose photos"}
        </Button>
        <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(e) => handle(e.target.files)} />
      </div>
      {busy && progress && (
        <div className="mt-4">
          <ProgressBar label={`Uploading photo ${Math.min(progress.done + 1, progress.total)} of ${progress.total}`} value={progress.done / progress.total} />
        </div>
      )}
      {message && (
        <p role={message.ok ? "status" : "alert"} className={`mt-4 text-sm ${message.ok ? "text-brand-bright" : "text-danger"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
