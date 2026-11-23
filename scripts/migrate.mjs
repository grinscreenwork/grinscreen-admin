// Applies db/schema.sql and creates the storage buckets. Safe to re-run.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const dir = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.join(dir, "../db/schema.sql"), "utf8");

const client = new pg.Client({ connectionString: process.env.SESSION_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query(sql);
await client.end();
console.log("✓ schema applied");

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

// The admin compresses every upload in the browser before it gets here; the
// buckets enforce the same limits so nothing oversized can slip through.
const MB = 1024 * 1024;
const buckets = [
  { name: process.env.GRINSCREEN_REELS_BUCKET || "grinscreen-reels", fileSizeLimit: 5 * MB, allowedMimeTypes: ["video/mp4"] },
  { name: process.env.GRINSCREEN_IMAGES_BUCKET || "grinscreen-images", fileSizeLimit: 1 * MB, allowedMimeTypes: ["image/webp", "image/jpeg", "image/png"] },
];
for (const { name, ...opts } of buckets) {
  const { error } = await sb.storage.createBucket(name, { public: true, ...opts });
  if (error && !/already exists/i.test(error.message)) {
    console.error(`✗ bucket ${name}: ${error.message}`);
    process.exitCode = 1;
    continue;
  }
  const upd = await sb.storage.updateBucket(name, { public: true, ...opts });
  if (upd.error) { console.error(`✗ bucket ${name}: ${upd.error.message}`); process.exitCode = 1; continue; }
  console.log(`✓ bucket ${name}: max ${opts.fileSizeLimit / MB} MB, ${opts.allowedMimeTypes.join(", ")}`);
}
