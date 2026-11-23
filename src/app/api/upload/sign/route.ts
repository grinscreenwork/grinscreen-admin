import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { getSession } from "@/lib/auth";
import { bucketFor, db, type BucketKind } from "@/lib/supabase";

// The browser uploads straight to Supabase Storage with a one-time signed
// token, so large reels never pass through this server (serverless request
// bodies are capped at a few MB).

// The admin compresses everything in the browser first (see src/lib/compress.ts),
// so only the compressed formats are accepted here. Limits match the bucket limits.
const VIDEO_TYPES = new Set(["video/mp4"]);
const IMAGE_TYPES = new Set(["image/webp", "image/jpeg"]);
const MAX_VIDEO = 5 * 1024 * 1024;
const MAX_IMAGE = 1024 * 1024;

function safeName(name: string) {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) : "";
  return `${base || "file"}${ext ? "." + ext : ""}`;
}

export async function POST(request: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { kind?: string; folder?: string; filename?: string; contentType?: string; size?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const kind = body.kind === "reels" ? "reels" : body.kind === "images" ? "images" : null;
  const { filename, contentType } = body;
  const size = Number(body.size ?? 0);
  if (!kind || !filename || !contentType) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  if (kind === "reels") {
    if (!VIDEO_TYPES.has(contentType)) return NextResponse.json({ error: "Videos must be MP4 (the admin converts them automatically)." }, { status: 400 });
    if (size > MAX_VIDEO) return NextResponse.json({ error: "Video is over the 5 MB limit." }, { status: 400 });
  } else {
    if (!IMAGE_TYPES.has(contentType)) return NextResponse.json({ error: "Images must be WebP or JPEG (the admin converts them automatically)." }, { status: 400 });
    if (size > MAX_IMAGE) return NextResponse.json({ error: "Image is over the 1 MB limit." }, { status: 400 });
  }

  const folder = (body.folder ?? "misc").replace(/[^a-z0-9-]/gi, "").slice(0, 30) || "misc";
  const path = `grinscreen/${folder}/${randomUUID()}-${safeName(filename)}`;
  const bucket = bucketFor(kind as BucketKind);

  const { data, error } = await db().storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Could not start upload" }, { status: 500 });

  const { data: pub } = db().storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ bucket, path, token: data.token, publicUrl: pub.publicUrl });
}
