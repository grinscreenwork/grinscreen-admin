"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { Uploader } from "@/components/Uploader";
import { FormFooter, Switch } from "./shared";
import { saveCaseStudy } from "@/app/actions/case-studies";
import { captureVideoFrame, uploadFile, type Uploaded } from "@/lib/supabase-browser";
import type { CompressProgress } from "@/lib/compress";
import { ProgressBar, describeProgress } from "@/components/ProgressBar";
import { ReelPicker } from "./ReelPicker";
import type { CaseStudy, Reel, Stat, Visual } from "@/lib/types";

export function CaseStudyForm({ study: s, library = [] }: { study?: CaseStudy; library?: Reel[] }) {
  const router = useRouter();
  const [saving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [brand, setBrand] = useState(s?.brand ?? "");
  const [slug, setSlug] = useState(s?.slug ?? "");
  const [logo, setLogo] = useState<Uploaded | null>(s?.logo_path && s.logo_url ? { path: s.logo_path, url: s.logo_url } : null);
  const [tagline, setTagline] = useState(s?.tagline ?? "");
  const [description, setDescription] = useState(s?.description ?? "");
  const [campaign, setCampaign] = useState(s?.campaign ?? "");
  const [duration, setDuration] = useState(s?.duration ?? "");
  const [problem, setProblem] = useState(s?.problem ?? "");
  const [idea, setIdea] = useState(s?.idea ?? "");
  const [pillarsTitle, setPillarsTitle] = useState(s?.pillars_title ?? "");
  const [pillars, setPillars] = useState<string[]>(s?.pillars?.length ? s.pillars : [""]);
  const [community, setCommunity] = useState(s?.community ?? "");
  const [stats, setStats] = useState<Stat[]>(s?.stats?.length ? s.stats : [{ value: "", label: "", sub: "" }]);
  const [insight, setInsight] = useState(s?.insight ?? "");
  const [visuals, setVisuals] = useState<Visual[]>(s?.visuals ?? []);
  const [featured, setFeatured] = useState(s?.featured ?? false);
  const [published, setPublished] = useState(s?.published ?? true);
  const [order, setOrder] = useState(String(s?.sort_order ?? 0));
  const [addingVisual, setAddingVisual] = useState<null | "image" | "reel">(null);
  const [visualError, setVisualError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [visualProgress, setVisualProgress] = useState<CompressProgress | null>(null);
  const shownProgress = describeProgress(visualProgress, addingVisual === "reel");

  // Reels already used here (picked from the library), so the picker can mark them.
  const usedReelIds = new Set(visuals.flatMap((v) => (v.kind === "reel" && v.reel_id ? [v.reel_id] : [])));

  function pickFromLibrary(r: Reel) {
    if (visuals.length >= 6) return;
    setVisuals((v) => [
      ...v,
      {
        kind: "reel",
        url: r.video_url,
        path: r.video_path,
        poster_url: r.poster_url ?? "",
        poster_path: r.poster_path ?? "",
        alt: r.title,
        reel_id: r.id,
      },
    ]);
    setPickerOpen(false);
  }

  async function addVisual(kind: "image" | "reel", file: File | undefined) {
    if (!file) return;
    setVisualError(null);
    setAddingVisual(kind);
    try {
      if (kind === "image") {
        const up = await uploadFile("images", "case-studies", file, setVisualProgress);
        setVisuals((v) => [...v, { kind: "image", ...up, alt: "" }]);
      } else {
        const [vid, frame] = await Promise.all([uploadFile("reels", "case-studies", file, setVisualProgress), captureVideoFrame(file)]);
        if (!frame) throw new Error("Couldn't read the video to make a cover image.");
        const cover = await uploadFile("images", "covers", Object.assign(frame, { name: "cover.jpg" }));
        setVisuals((v) => [...v, { kind: "reel", url: vid.url, path: vid.path, poster_url: cover.url, poster_path: cover.path, alt: "" }]);
      }
    } catch (e) {
      setVisualError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setAddingVisual(null);
      setVisualProgress(null);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await saveCaseStudy({
        id: s?.id,
        slug,
        brand,
        logo_path: logo?.path ?? "",
        logo_url: logo?.url ?? "",
        tagline,
        description,
        campaign,
        duration,
        problem,
        idea,
        pillars_title: pillarsTitle,
        pillars,
        community,
        stats,
        insight,
        visuals,
        featured,
        published,
        sort_order: Number(order) || 0,
      });
      if (!res.ok) return setError(res.error);
      router.push("/case-studies");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card className="space-y-5">
            <h2 className="text-sm font-semibold">Headline</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Brand" required>
                <Input value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={120} required placeholder="Arabika" />
              </Field>
              <Field label="URL slug" hint="Optional. Generated from the brand if blank.">
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} maxLength={80} placeholder="arabika" />
              </Field>
            </div>
            <Field label="Tagline" required hint="Press Enter for a line break in the big headline.">
              <Textarea rows={2} value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={200} required placeholder={"For the Campus,\nBy the Campus."} />
            </Field>
            <Field label="Description" required>
              <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} required />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Campaign name">
                <Input value={campaign} onChange={(e) => setCampaign(e.target.value)} maxLength={200} />
              </Field>
              <Field label="Duration" hint="e.g. 11 Months">
                <Input value={duration} onChange={(e) => setDuration(e.target.value)} maxLength={100} />
              </Field>
            </div>
            <Uploader kind="images" folder="logos" label="Brand logo" aspect="wide" hint="Transparent PNG or a logo on white works best." value={logo} onChange={setLogo} />
          </Card>

          <Card className="space-y-5">
            <h2 className="text-sm font-semibold">Story</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="The problem" hint="Optional.">
                <Textarea value={problem} onChange={(e) => setProblem(e.target.value)} maxLength={1000} />
              </Field>
              <Field label="The idea" hint="Optional.">
                <Textarea value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={1000} />
              </Field>
            </div>
            <Field label="Steps heading" hint='Defaults to "The Strategy". e.g. "What We Did".'>
              <Input value={pillarsTitle} onChange={(e) => setPillarsTitle(e.target.value)} maxLength={80} />
            </Field>
            <div>
              <p className="mb-1.5 text-xs font-medium text-fg">Steps / strategy points</p>
              <div className="space-y-2">
                {pillars.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={p} onChange={(e) => setPillars((a) => a.map((x, k) => (k === i ? e.target.value : x)))} maxLength={300} placeholder={`Point ${i + 1}`} />
                    <Button variant="ghost" size="sm" aria-label="Remove point" onClick={() => setPillars((a) => a.filter((_, k) => k !== i))}>
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="secondary" size="sm" className="mt-2" onClick={() => setPillars((a) => [...a, ""])}>
                + Add point
              </Button>
            </div>
            <Field label="The community" hint="Optional closing line.">
              <Textarea rows={2} value={community} onChange={(e) => setCommunity(e.target.value)} maxLength={1000} />
            </Field>
          </Card>

          <Card className="space-y-5">
            <h2 className="text-sm font-semibold">Results</h2>
            <div className="space-y-3">
              {stats.map((st, i) => (
                <div key={i} className="grid grid-cols-[90px_1fr_auto] gap-2 sm:grid-cols-[110px_1fr_1.4fr_auto]">
                  <Input value={st.value} onChange={(e) => setStats((a) => a.map((x, k) => (k === i ? { ...x, value: e.target.value } : x)))} maxLength={30} placeholder="60M+" aria-label="Value" className="min-w-0" />
                  <Input value={st.label} onChange={(e) => setStats((a) => a.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} maxLength={60} placeholder="Total Views" aria-label="Label" className="min-w-0" />
                  <Input
                    className="col-span-2 min-w-0 sm:col-span-1"
                    value={st.sub ?? ""}
                    onChange={(e) => setStats((a) => a.map((x, k) => (k === i ? { ...x, sub: e.target.value } : x)))}
                    maxLength={100}
                    placeholder="across Facebook & Instagram"
                    aria-label="Sub-label"
                  />
                  <Button variant="ghost" size="sm" aria-label="Remove stat" className="row-start-1 col-start-3 sm:col-start-4" onClick={() => setStats((a) => a.filter((_, k) => k !== i))}>
                    ✕
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="secondary" size="sm" onClick={() => setStats((a) => [...a, { value: "", label: "", sub: "" }])} disabled={stats.length >= 8}>
              + Add stat
            </Button>
            <Field label="Key insight" hint="A one-line takeaway shown under the numbers.">
              <Textarea rows={2} value={insight} onChange={(e) => setInsight(e.target.value)} maxLength={1000} />
            </Field>
          </Card>

          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Visuals</h2>
                <p className="text-xs text-fg-muted">Up to 6 reels or images shown beside the numbers.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  disabled={!!addingVisual || visuals.length >= 6}
                  className="rounded-lg border border-brand-bright/40 bg-brand/10 px-3 py-2 text-xs sm:py-1.5 text-brand-bright transition-colors hover:bg-brand/20 disabled:opacity-50"
                >
                  + From reels library
                </button>
                <label className="cursor-pointer rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-fg sm:py-1.5 transition-colors hover:border-brand-bright/50">
                  {addingVisual === "image" ? "Uploading…" : "+ Upload image"}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" disabled={!!addingVisual || visuals.length >= 6} onChange={(e) => { addVisual("image", e.target.files?.[0]); e.target.value = ""; }} />
                </label>
                <label className="cursor-pointer rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-fg sm:py-1.5 transition-colors hover:border-brand-bright/50">
                  {addingVisual === "reel" ? "Uploading…" : "+ Upload reel"}
                  <input type="file" accept="video/mp4,video/webm,video/quicktime" className="sr-only" disabled={!!addingVisual || visuals.length >= 6} onChange={(e) => { addVisual("reel", e.target.files?.[0]); e.target.value = ""; }} />
                </label>
              </div>
            </div>
            {addingVisual && shownProgress && (
              <div className="mb-3">
                <ProgressBar label={shownProgress.label} value={shownProgress.value} />
              </div>
            )}
            {visualError && <p role="alert" className="mb-3 text-xs text-danger">{visualError}</p>}
            {visuals.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-fg-muted">No visuals yet.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {visuals.map((v, i) => (
                  <li key={v.path} className="overflow-hidden rounded-lg border border-border bg-bg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.kind === "reel" ? v.poster_url : v.url} alt="" className="aspect-[4/5] w-full object-cover" />
                    <div className="space-y-1.5 border-t border-border p-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase text-fg-muted">{v.kind === "reel" && v.reel_id ? "reel · library" : v.kind}</span>
                        <button type="button" aria-label="Remove visual" onClick={() => setVisuals((a) => a.filter((_, k) => k !== i))} className="-m-2 p-2 text-xs text-danger">
                          ✕
                        </button>
                      </div>
                      <Input value={v.alt} onChange={(e) => setVisuals((a) => a.map((x, k) => (k === i ? { ...x, alt: e.target.value } : x)))} maxLength={200} placeholder="Alt text" aria-label="Alt text" className="py-1.5 text-xs" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {pickerOpen && <ReelPicker reels={library} usedIds={usedReelIds} onPick={pickFromLibrary} onClose={() => setPickerOpen(false)} />}

        <Card className="h-fit space-y-5">
          <Switch label="Published" hint="Visible on the website." checked={published} onChange={setPublished} />
          <Switch label="Featured on portfolio" hint="Shown on the portfolio page (all case studies are on /case-studies)." checked={featured} onChange={setFeatured} />
          <Field label="Order" hint="Lower numbers appear first.">
            <Input type="number" value={order} onChange={(e) => setOrder(e.target.value)} />
          </Field>
        </Card>
      </div>
      <FormFooter saving={saving || !!addingVisual} error={error} cancelHref="/case-studies" saveLabel={s ? "Save changes" : "Add case study"} />
    </form>
  );
}
