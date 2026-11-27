// Re-encodes reels that are heavier than they need to be (older imports: 1080p, 4+ Mbps) to 720p H.264.
// For every reel it: downloads the original -> saves a copy in BACKUP_DIR -> re-encodes -> and ONLY if the
// result is at least 35% smaller, uploads it over the SAME storage path (so every URL, including the ones
// embedded in case studies, stays valid). Run with DRY=1 to just report sizes without uploading.
// Needs ffmpeg + ffprobe on PATH. Usage:  node --env-file=.env scripts/optimize-reels.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const DRY = process.env.DRY === "1";
const BACKUP_DIR = process.env.BACKUP_DIR || path.resolve("../_backup-reels-original");
const WORK_DIR = path.join(BACKUP_DIR, "_work");
const BUCKET = process.env.GRINSCREEN_REELS_BUCKET || "grinscreen-reels";
fs.mkdirSync(WORK_DIR, { recursive: true });

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const { data: reels, error } = await sb.from("gs_reels").select("id,title,video_path,video_url");
if (error) throw new Error(error.message);

const mb = (n) => (n / 1048576).toFixed(2) + " MB";
const seen = new Set();
let saved = 0;

for (const r of reels) {
  if (!r.video_path || seen.has(r.video_path)) continue;
  seen.add(r.video_path);
  const name = r.video_path.split("/").pop();
  const original = path.join(BACKUP_DIR, name);
  const out = path.join(WORK_DIR, `opt-${name}`);

  const res = await fetch(r.video_url);
  if (!res.ok) { console.log(`  ! ${r.title}: download failed (${res.status})`); continue; }
  const buf = Buffer.from(await res.arrayBuffer());
  if (!fs.existsSync(original)) fs.writeFileSync(original, buf); // never overwrite an existing backup

  execFileSync("ffmpeg", [
    "-v", "error", "-y", "-i", original,
    "-an", "-vf", "scale='min(720,iw)':-2,fps='min(30,source_fps)'",
    "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-maxrate", "1500k", "-bufsize", "3000k",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", out,
  ]);
  const after = fs.statSync(out).size;
  const ratio = after / buf.length;
  const verdict = ratio <= 0.65 ? (DRY ? "would replace" : "replaced") : "kept (not worth it)";
  console.log(`  ${r.title.padEnd(18)} ${mb(buf.length)} -> ${mb(after)}  (${Math.round((1 - ratio) * 100)}% smaller)  ${verdict}`);

  if (ratio <= 0.65 && !DRY) {
    const up = await sb.storage.from(BUCKET).upload(r.video_path, fs.readFileSync(out), {
      contentType: "video/mp4", cacheControl: "31536000", upsert: true,
    });
    if (up.error) { console.log(`  ! upload failed: ${up.error.message}`); continue; }
    saved += buf.length - after;
  }
}
console.log(DRY ? "\nDry run only, nothing uploaded." : `\nDone. Saved ${mb(saved)} in total. Originals are in ${BACKUP_DIR}`);
