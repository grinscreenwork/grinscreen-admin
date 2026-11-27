"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Field, Input } from "@/components/ui";
import { Uploader } from "@/components/Uploader";
import { FormFooter, Switch } from "./shared";
import { saveClient } from "@/app/actions/clients";
import type { Uploaded } from "@/lib/supabase-browser";
import type { Client } from "@/lib/types";

export function ClientForm({ client }: { client?: Client }) {
  const router = useRouter();
  const [saving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(client?.name ?? "");
  const [logo, setLogo] = useState<Uploaded | null>(client ? { path: client.logo_path, url: client.logo_url } : null);
  const [published, setPublished] = useState(client?.published ?? true);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!logo) return setError("Upload the client's logo.");
    start(async () => {
      const res = await saveClient({ id: client?.id, name, logo_path: logo.path, logo_url: logo.url, published });
      if (!res.ok) return setError(res.error);
      router.push("/clients");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card className="space-y-5">
            <Field label="Client name" required hint="Shown in a small popup when someone hovers over the logo on the website.">
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required placeholder="e.g. Pathao" />
            </Field>
          </Card>
          <Card>
            <Uploader
              kind="images"
              folder="logos"
              label="Logo"
              required
              aspect="wide"
              hint="Use the transparent version of the logo (PNG or WebP with no background). It's shown on the site's dark background, so a logo with light or colored lettering works best."
              value={logo}
              onChange={setLogo}
            />
          </Card>
        </div>
        <Card className="h-fit space-y-5">
          <Switch label="Published" hint="Visible on the website. Turn off to hide the logo without deleting it." checked={published} onChange={setPublished} />
        </Card>
      </div>
      <FormFooter saving={saving} error={error} cancelHref="/clients" saveLabel={client ? "Save changes" : "Add client"} />
    </form>
  );
}
