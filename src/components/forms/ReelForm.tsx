"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Field, Input, Select, Textarea } from "@/components/ui";
import { Uploader } from "@/components/Uploader";
import { FormFooter, Switch } from "./shared";
import { saveReel } from "@/app/actions/reels";
import { captureVideoFrame, uploadFile, type Uploaded } from "@/lib/supabase-browser";
import { ASPECT_RATIOS, type Reel } from "@/lib/types";

export function ReelForm({ reel }: { reel?: Reel }) {
  const router = useRouter();
  const [saving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [coverNote, setCoverNote] = useState<string | null>(null);

  const [title, setTitle] = useState(reel?.title ?? "");
  const [description, setDescription] = useState(reel?.description ?? "");
  const [client, setClient] = useState(reel?.client_name ?? "");
  const [aspect, setAspect] = useState(reel?.aspect_ratio ?? "9:16");
  const [video, setVideo] = useState<Uploaded | null>(reel ? { path: reel.video_path, url: reel.video_url } : null);
  const [cover, setCover] = useState<Uploaded | null>(reel?.poster_path && reel.poster_url ? { path: reel.poster_path, url: reel.poster_url } : null);
  const [featured, setFeatured] = useState(reel?.featured ?? false);
  const [published, setPublished] = useState(reel?.published ?? true);

  // When a video is picked and there is no cover yet, grab a frame so the
  // reel shows an image instantly and the video isn't downloaded until needed.
  async function autoCover(file: File) {
    if (cover) return;
    setCoverNote("Generating a cover image from the video…");
    try {
      const blob = await captureVideoFrame(file);
      if (!blob) throw new Error("no frame");
      const up = await uploadFile("images", "covers", Object.assign(blob, { name: "cover.jpg" }));
      setCover(up);
      setCoverNote("Cover image generated from the first frame. You can replace it.");
    } catch {
      setCoverNote("Couldn't generate a cover automatically. Please upload one.");
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!video) return setError("Upload a video first.");
    start(async () => {
      const res = await saveReel({
        id: reel?.id,
        title,
        description,
        client_name: client,
        aspect_ratio: aspect,
        video_path: video.path,
        video_url: video.url,
        poster_path: cover?.path ?? "",
        poster_url: cover?.url ?? "",
        featured,
        published,
      });
      if (!res.ok) return setError(res.error);
      router.push("/reels");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card className="space-y-5">
            <Field label="Title" required>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} required placeholder="e.g. Pathao" />
            </Field>
            <Field label="Description" hint="Shown as a one-line caption under the reel.">
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={600} placeholder="Your next favorite shop." />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Client / brand" hint="Optional.">
                <Input value={client} onChange={(e) => setClient(e.target.value)} maxLength={120} />
              </Field>
              <Field label="Preferred dimension" hint="Optional. 9:16 is the standard for reels.">
                <Select value={aspect} onChange={(e) => setAspect(e.target.value)}>
                  {ASPECT_RATIOS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                      {a === "9:16" ? " (recommended)" : ""}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>

          <Card className="space-y-6">
            <Uploader
              kind="reels"
              folder="reels"
              label="Video"
              required
              aspect="portrait"
              hint="Any MP4, WebM or MOV. It is compressed automatically to a small 720p MP4 under 5 MB (audio removed, since reels play muted)."
              value={video}
              onChange={setVideo}
              onPick={autoCover}
            />
            <div>
              <Uploader
                kind="images"
                folder="covers"
                label="Cover image"
                aspect="portrait"
                hint="Shown instantly before the video loads. Generated automatically from your video."
                value={cover}
                onChange={setCover}
              />
              {coverNote && <p className="mt-2 text-xs text-fg-muted">{coverNote}</p>}
            </div>
          </Card>
        </div>

        <Card className="h-fit space-y-5">
          <Switch label="Published" hint="Visible on the website." checked={published} onChange={setPublished} />
          <Switch label="Featured on home page" hint="Shown in the home page reel strip." checked={featured} onChange={setFeatured} />
        </Card>
      </div>
      <FormFooter saving={saving} error={error} cancelHref="/reels" saveLabel={reel ? "Save changes" : "Add reel"} />
    </form>
  );
}
