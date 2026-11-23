"use client";

/**
 * Browser-side compression applied to EVERY upload, so the website always
 * serves the smallest files that still look great.
 *
 *  - Videos: re-encoded to H.264 MP4, capped at 720p / 30 fps, audio removed
 *    (reels always play muted), bitrate chosen so the file fits the bucket's
 *    5 MB limit. WebCodecs does the work (hardware accelerated, no big wasm).
 *  - Images: resized for how they are shown and re-encoded as WebP, stepping
 *    quality down until they fit the size target.
 */

import { formatBytes, type CompressResult } from "./compress-video";

export const IMAGE_LIMIT_BYTES = 1024 * 1024; // matches the images bucket limit

export { compressVideo, formatBytes, VIDEO_LIMIT_BYTES, type CompressProgress, type CompressResult } from "./compress-video";

/* ───────────────────────── Images ───────────────────────── */

type ImagePreset = { maxEdge: number; targetBytes: number; startQuality: number };

/** How each kind of image is displayed decides how big it needs to be. */
const IMAGE_PRESETS: Record<string, ImagePreset> = {
  posters: { maxEdge: 1600, targetBytes: 380 * 1024, startQuality: 0.84 },
  "case-studies": { maxEdge: 1200, targetBytes: 280 * 1024, startQuality: 0.82 },
  covers: { maxEdge: 720, targetBytes: 90 * 1024, startQuality: 0.8 },
  logos: { maxEdge: 600, targetBytes: 60 * 1024, startQuality: 0.88 },
  testimonials: { maxEdge: 480, targetBytes: 60 * 1024, startQuality: 0.82 },
};
const DEFAULT_IMAGE_PRESET: ImagePreset = { maxEdge: 1400, targetBytes: 300 * 1024, startQuality: 0.82 };

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function compressImage(file: Blob & { name?: string }, folder: string): Promise<CompressResult> {
  const preset = IMAGE_PRESETS[folder] ?? DEFAULT_IMAGE_PRESET;
  const originalBytes = file.size;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("That image couldn't be read. Try a JPG, PNG or WebP file.");

  const scale = Math.min(1, preset.maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser can't process images.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Prefer WebP (smallest). Some browsers silently fall back to PNG; then use JPEG.
  let type = "image/webp";
  let blob = await canvasToBlob(canvas, type, preset.startQuality);
  if (!blob || blob.type !== "image/webp") {
    type = "image/jpeg";
    // JPEG has no alpha: flatten transparent logos onto white.
    const flat = document.createElement("canvas");
    flat.width = width;
    flat.height = height;
    const fctx = flat.getContext("2d")!;
    fctx.fillStyle = "#fff";
    fctx.fillRect(0, 0, width, height);
    fctx.drawImage(canvas, 0, 0);
    canvas.width = 0;
    return finishJpeg(flat, preset, originalBytes, file.name);
  }

  let quality = preset.startQuality;
  while (blob && blob.size > preset.targetBytes && quality > 0.5) {
    quality = Math.round((quality - 0.06) * 100) / 100;
    blob = await canvasToBlob(canvas, type, quality);
  }
  // Still too big at q0.5: shrink dimensions a little and try again.
  let shrink = 1;
  while (blob && blob.size > preset.targetBytes && shrink > 0.5) {
    shrink -= 0.15;
    const c2 = document.createElement("canvas");
    c2.width = Math.round(width * shrink);
    c2.height = Math.round(height * shrink);
    c2.getContext("2d")!.drawImage(canvas, 0, 0, c2.width, c2.height);
    blob = await canvasToBlob(c2, type, 0.7);
  }
  if (!blob) throw new Error("Couldn't compress that image.");
  return image(blob, "webp", originalBytes, file.name);
}

async function finishJpeg(flat: HTMLCanvasElement, preset: ImagePreset, originalBytes: number, name?: string) {
  let quality = Math.min(0.86, preset.startQuality);
  let blob = await canvasToBlob(flat, "image/jpeg", quality);
  while (blob && blob.size > preset.targetBytes && quality > 0.5) {
    quality = Math.round((quality - 0.06) * 100) / 100;
    blob = await canvasToBlob(flat, "image/jpeg", quality);
  }
  if (!blob) throw new Error("Couldn't compress that image.");
  return image(blob, "jpg", originalBytes, name);
}

function image(blob: Blob, ext: string, originalBytes: number, name?: string): CompressResult {
  const base = (name ?? "image").replace(/\.[^.]+$/, "") || "image";
  const file = new File([blob], `${base}.${ext}`, { type: blob.type });
  return {
    file,
    originalBytes,
    outputBytes: file.size,
    note: `${formatBytes(originalBytes)} → ${formatBytes(file.size)}`,
  };
}
