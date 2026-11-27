// One-time import of the client logos that used to be static files in the site's /public folder.
// Uses ONLY the transparent versions, converts them to small WebP (alpha kept), uploads them and
// creates the gs_clients rows. Skips entirely if gs_clients already has rows.
// Needs ffmpeg on PATH and the client repo checked out at ../grinscreen-client.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(here, "../../grinscreen-client/public");
const clientsTs = path.resolve(here, "../../grinscreen-client/src/data/clients.ts");

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const BUCKET = process.env.GRINSCREEN_IMAGES_BUCKET || "grinscreen-images";

const { count } = await sb.from("gs_clients").select("id", { count: "exact", head: true });
if (count > 0) {
  console.log("• gs_clients already has rows, skipped");
  process.exit(0);
}

// Three clients only had a white logo listed; a transparent version exists under another name.
const OVERRIDE = {
  "arabika-coffee": "arabika coffee_no_bg.png",
  "local-coffee": "local coffee_no_bg.png",
  pathao: "pathao_no_bg.png",
};
// Not transparent (a JPEG on white): saved but hidden until a transparent logo is uploaded in the admin.
const HIDDEN = new Set(["pcb"]);

const src = fs.readFileSync(clientsTs, "utf8");
const entries = [...src.matchAll(/id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*logo:\s*"[^"]+",(?:\s*logoColored:\s*"([^"]+)",)?/g)];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gs-logos-"));

let order = 0;
for (const [, id, name, colored] of entries) {
  const rel = OVERRIDE[id] ? `client-transparent/${OVERRIDE[id]}` : (colored ?? "").replace(/^\//, "");
  const file = path.join(publicDir, rel);
  if (!rel.startsWith("client-transparent/") || !fs.existsSync(file)) {
    console.log(`  skip ${name}: no transparent logo found`);
    continue;
  }
  const out = path.join(tmp, `${id}.webp`);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", file, "-vf", "scale='min(600,iw)':-2", "-c:v", "libwebp", "-quality", "88", "-compression_level", "6", out]);
  const body = fs.readFileSync(out);
  const storagePath = `grinscreen/logos/${id}.webp`;
  const up = await sb.storage.from(BUCKET).upload(storagePath, body, { contentType: "image/webp", cacheControl: "31536000", upsert: true });
  if (up.error) throw new Error(`${name}: ${up.error.message}`);
  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
  const { error } = await sb.from("gs_clients").insert({
    name,
    logo_path: storagePath,
    logo_url: pub.publicUrl,
    published: !HIDDEN.has(id),
    sort_order: order++,
  });
  if (error) throw new Error(`${name}: ${error.message}`);
  console.log(`✓ ${name}${HIDDEN.has(id) ? "  (hidden: not transparent)" : ""}  ${(body.length / 1024).toFixed(0)} KB`);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log("Done.");
