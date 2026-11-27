"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Field, Input } from "@/components/ui";
import { FormFooter, Switch } from "./shared";
import { savePhoto } from "@/app/actions/photos";
import type { Photo } from "@/lib/types";

export function PhotoForm({ photo }: { photo: Photo }) {
  const router = useRouter();
  const [saving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(photo.title ?? "");
  const [published, setPublished] = useState(photo.published);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await savePhoto({ id: photo.id, title, published });
      if (!res.ok) return setError(res.error);
      router.push("/photography");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <img src={photo.image_url} alt={photo.title ?? "Photo"} className="mx-auto max-h-[420px] w-auto max-w-full rounded-lg" decoding="async" />
          </Card>
          <Card className="space-y-5">
            <Field label="Caption" hint="Optional. Shown when someone opens the photo on the website.">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Signature burger shoot, Dhaka" />
            </Field>
          </Card>
        </div>
        <Card className="h-fit space-y-5">
          <Switch label="Published" hint="Visible on the website." checked={published} onChange={setPublished} />
        </Card>
      </div>
      <FormFooter saving={saving} error={error} cancelHref="/photography" saveLabel="Save changes" />
    </form>
  );
}
