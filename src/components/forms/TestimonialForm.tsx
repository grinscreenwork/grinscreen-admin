"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Field, Input, Textarea } from "@/components/ui";
import { Uploader } from "@/components/Uploader";
import { FormFooter, Switch } from "./shared";
import { saveTestimonial } from "@/app/actions/testimonials";
import type { Uploaded } from "@/lib/supabase-browser";
import type { Testimonial } from "@/lib/types";

export function TestimonialForm({ testimonial: t }: { testimonial?: Testimonial }) {
  const router = useRouter();
  const [saving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(t?.client_name ?? "");
  const [role, setRole] = useState(t?.role ?? "");
  const [org, setOrg] = useState(t?.organization ?? "");
  const [quote, setQuote] = useState(t?.quote ?? "");
  const [image, setImage] = useState<Uploaded | null>(t?.image_path && t.image_url ? { path: t.image_path, url: t.image_url } : null);
  const [featured, setFeatured] = useState(t?.featured ?? false);
  const [published, setPublished] = useState(t?.published ?? true);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveTestimonial({
        id: t?.id,
        client_name: name,
        role,
        organization: org,
        quote,
        image_path: image?.path ?? "",
        image_url: image?.url ?? "",
        featured,
        published,
      });
      if (!res.ok) return setError(res.error);
      router.push("/testimonials");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card className="space-y-5">
            <Field label="Testimonial" required>
              <Textarea rows={5} value={quote} onChange={(e) => setQuote(e.target.value)} maxLength={1500} required placeholder="What the client said, in their words." />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Client name" required>
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
              </Field>
              <Field label="Role" hint="Optional, e.g. Marketing Manager.">
                <Input value={role} onChange={(e) => setRole(e.target.value)} maxLength={120} />
              </Field>
            </div>
            <Field label="Organization" required>
              <Input value={org} onChange={(e) => setOrg(e.target.value)} maxLength={150} required />
            </Field>
          </Card>
          <Card>
            <Uploader kind="images" folder="testimonials" label="Client photo" aspect="square" hint="Optional. A square headshot or logo works best." value={image} onChange={setImage} />
          </Card>
        </div>
        <Card className="h-fit space-y-5">
          <Switch label="Published" hint="Visible on the website." checked={published} onChange={setPublished} />
          <Switch label="Featured" hint="Shown on the home and portfolio pages." checked={featured} onChange={setFeatured} />
        </Card>
      </div>
      <FormFooter saving={saving} error={error} cancelHref="/testimonials" saveLabel={t ? "Save changes" : "Add testimonial"} />
    </form>
  );
}
