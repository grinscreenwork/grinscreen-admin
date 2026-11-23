"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { compressImage, compressVideo, type CompressProgress } from "./compress";

let cached: SupabaseClient | null = null;

/** Browser client with the publishable key. It can only upload using a server-issued signed token. */
export function browserClient(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return cached;
}

export type Uploaded = { path: string; url: string };
export type UploadedWithNote = Uploaded & { note: string };

/**
 * Compress, then upload. Every file goes through here, so nothing reaches the
 * website un-optimised: videos become small H.264 MP4s (no audio), images
 * become resized WebP.
 */
export async function uploadFile(
  kind: "reels" | "images",
  folder: string,
  original: Blob & { name?: string },
  onProgress?: (p: CompressProgress) => void,
): Promise<UploadedWithNote> {
  onProgress?.({ stage: "compressing", progress: 0 });
  const compressed =
    kind === "reels"
      ? await compressVideo(original as File, onProgress)
      : await compressImage(original, folder);
  const file = compressed.file;
  onProgress?.({ stage: "uploading" });

  const filename = file.name || "file";
  const res = await fetch("/api/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, folder, filename, contentType: file.type, size: file.size }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Could not start the upload.");

  const { error } = await browserClient()
    .storage.from(json.bucket)
    .uploadToSignedUrl(json.path, json.token, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) throw new Error(error.message);
  return { path: json.path, url: json.publicUrl, note: compressed.note };
}

/** Grab a frame from a video file as a JPEG (used for automatic cover images). */
export function captureVideoFrame(file: File, width = 540): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    const done = (blob: Blob | null) => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    const timer = setTimeout(() => done(null), 15000);
    video.onerror = () => {
      clearTimeout(timer);
      done(null);
    };
    video.onloadeddata = () => {
      video.currentTime = Math.min(0.2, (video.duration || 1) / 2);
    };
    video.onseeked = () => {
      clearTimeout(timer);
      const ratio = video.videoHeight / video.videoWidth || 16 / 9;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = Math.round(width * ratio);
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => done(b), "image/jpeg", 0.8);
    };
    video.src = url;
  });
}
