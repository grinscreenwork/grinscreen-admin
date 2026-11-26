"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Field, Input, Select } from "@/components/ui";
import { FormFooter, Switch } from "./shared";
import { saveJob } from "@/app/actions/jobs";
import { JOB_TYPES, WORK_MODES, WORK_MODE_LABELS, type Job, type WorkMode } from "@/lib/types";

export function JobForm({ job }: { job?: Job }) {
  const router = useRouter();
  const [saving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(job?.title ?? "");
  const [mode, setMode] = useState<WorkMode>(job?.work_mode ?? "onsite");
  const [type, setType] = useState(job?.job_type ?? "");
  const [location, setLocation] = useState(job?.location ?? "");
  const [url, setUrl] = useState(job?.apply_url ?? "");
  const [published, setPublished] = useState(job?.published ?? true);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveJob({ id: job?.id, title, work_mode: mode, job_type: type, location, apply_url: url, published });
      if (!res.ok) return setError(res.error);
      router.push("/jobs");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="space-y-5">
          <Field label="Job title" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required placeholder="e.g. Video Editor" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Work mode" required>
              <Select value={mode} onChange={(e) => setMode(e.target.value as WorkMode)}>
                {WORK_MODES.map((m) => (
                  <option key={m} value={m}>
                    {WORK_MODE_LABELS[m]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Type" hint="Optional.">
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Not specified</option>
                {JOB_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Location" hint="Optional, e.g. Dhaka.">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} />
          </Field>
          <Field label="Application link" required hint="The Apply button sends people here. Paste your Google Form link (it must start with https://).">
            <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={600} required placeholder="https://forms.gle/..." />
          </Field>
        </Card>

        <Card className="h-fit space-y-5">
          <Switch label="Published" hint="Visible on the Careers page. Turn off to hide the role without deleting it." checked={published} onChange={setPublished} />
        </Card>
      </div>
      <FormFooter saving={saving} error={error} cancelHref="/jobs" saveLabel={job ? "Save changes" : "Add job"} />
    </form>
  );
}
