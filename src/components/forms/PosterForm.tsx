"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { FormFooter, Switch } from "./shared";
import { savePoster } from "@/app/actions/posters";
import { uploadFile } from "@/lib/supabase-browser";
import type { Poster, StoredImage } from "@/lib/types";

export function PosterForm({ poster }: { poster?: Poster }) {
  const router = useRouter();
  const [saving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(poster?.title ?? "");
  const [description, setDescription] = useState(poster?.description ?? "");
  const [images, setImages] = useState<StoredImage[]>(poster?.images ?? []);
  const [featured, setFeatured] = useState(poster?.featured ?? false);
  const [published, setPublished] = useState(poster?.published ?? true);
  const [order, setOrder] = useState(String(poster?.sort_order ?? 0));

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setUploading(files.length);
    for (const file of Array.from(files)) {
      try {
        const up = await uploadFile("images", "posters", file);
        setImages((prev) => [...prev, up]);
      } catch (e) {
        setError(`${file.name}: ${e instanceof Error ? e.message : "upload failed"}`);
      }
      setUploading((n) => n - 1);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  const move = (i: number, dir: -1 | 1) =>
    setImages((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await savePoster({ id: poster?.id, title, description, images, featured, published, sort_order: Number(order) || 0 });
      if (!res.ok) return setError(res.error);
      router.push("/posters");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card className="space-y-5">
            <Field label="Title" required>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} required placeholder="e.g. Wooking Street Valentine's" />
            </Field>
            <Field label="Description" hint="Optional. Used as the image description.">
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={600} />
            </Field>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-fg">Images</p>
                <p className="text-xs text-fg-muted">JPG, PNG, WebP or AVIF. Each image is resized and compressed to WebP automatically. Add several to make a swipeable set.</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading > 0}>
                {uploading > 0 ? `Uploading ${uploading}…` : "Add images"}
              </Button>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
                className="sr-only"
                onChange={(e) => addFiles(e.target.files)}
              />
            </div>
            {images.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-fg-muted">No images yet.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((img, i) => (
                  <li key={img.path} className="overflow-hidden rounded-lg border border-border bg-bg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="aspect-[4/5] w-full object-cover" />
                    <div className="flex items-center justify-between gap-1 border-t border-border p-1.5">
                      <span className="pl-1 font-mono text-[10px] text-fg-muted">{i + 1}</span>
                      <div className="flex gap-1">
                        <button type="button" aria-label="Move earlier" disabled={i === 0} onClick={() => move(i, -1)} className="rounded px-2.5 py-2 text-xs text-fg-muted hover:bg-surface-2 disabled:opacity-30 sm:px-1.5 sm:py-1">
                          ←
                        </button>
                        <button type="button" aria-label="Move later" disabled={i === images.length - 1} onClick={() => move(i, 1)} className="rounded px-2.5 py-2 text-xs text-fg-muted hover:bg-surface-2 disabled:opacity-30 sm:px-1.5 sm:py-1">
                          →
                        </button>
                        <button type="button" aria-label="Remove image" onClick={() => setImages((p) => p.filter((_, k) => k !== i))} className="rounded px-2.5 py-2 text-xs text-danger hover:bg-danger/10 sm:px-1.5 sm:py-1">
                          ✕
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="h-fit space-y-5">
          <Switch label="Published" hint="Visible on the website." checked={published} onChange={setPublished} />
          <Switch label="Featured" hint="Highlighted on the site." checked={featured} onChange={setFeatured} />
          <Field label="Order" hint="Lower numbers appear first.">
            <Input type="number" value={order} onChange={(e) => setOrder(e.target.value)} />
          </Field>
        </Card>
      </div>
      <FormFooter saving={saving || uploading > 0} error={error} cancelHref="/posters" saveLabel={poster ? "Save changes" : "Add poster"} />
    </form>
  );
}
