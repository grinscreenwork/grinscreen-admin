// One-time import of the content that used to be hard-coded in the client site
// (reels, statics, the two case studies) into Supabase. Skips any table that
// already has rows, so it is safe to re-run. Does NOT create testimonials.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(here, "../../grinscreen-client/public");
const reelsTs = path.resolve(here, "../../grinscreen-client/src/data/reels.ts");
const staticsTs = path.resolve(here, "../../grinscreen-client/src/data/statics.ts");

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const REELS_BUCKET = process.env.GRINSCREEN_REELS_BUCKET || "grinscreen-reels";
const IMAGES_BUCKET = process.env.GRINSCREEN_IMAGES_BUCKET || "grinscreen-images";

const TYPES = { ".mp4": "video/mp4", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

async function upload(bucket, storagePath, localRel) {
  const file = path.join(publicDir, localRel);
  if (!fs.existsSync(file)) return null;
  const body = fs.readFileSync(file);
  const { error } = await sb.storage.from(bucket).upload(storagePath, body, {
    contentType: TYPES[path.extname(file).toLowerCase()],
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw new Error(`${localRel}: ${error.message}`);
  const { data } = sb.storage.from(bucket).getPublicUrl(storagePath);
  return { path: storagePath, url: data.publicUrl };
}

const upImage = (folder, localRel) => upload(IMAGES_BUCKET, `grinscreen/${folder}/${path.basename(localRel)}`, localRel);
const upReel = (localRel) => upload(REELS_BUCKET, `grinscreen/reels/${path.basename(localRel)}`, localRel);

async function isEmpty(table) {
  const { count, error } = await sb.from(table).select("id", { count: "exact", head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  return count === 0;
}

// ── Reels ───────────────────────────────────────────────────────
if (await isEmpty("gs_reels")) {
  const src = fs.readFileSync(reelsTs, "utf8");
  const re = /\{\s*id:\s*"([^"]+)",\s*title:\s*"([^"]+)"(?:,\s*tagline:\s*"([^"]*)")?,\s*src:\s*"([^"]+)",\s*poster:\s*"([^"]+)"(?:,\s*client:\s*"([^"]*)")?/g;
  const found = [...src.matchAll(re)];
  let order = 0;
  for (const [, id, title, tagline, srcPath, posterPath, client] of found) {
    const video = await upReel(srcPath.replace(/^\//, ""));
    if (!video) { console.log(`  skip ${id}: file missing`); continue; }
    const poster = await upImage("covers", posterPath.replace(/^\//, ""));
    const { error } = await sb.from("gs_reels").insert({
      title,
      description: tagline ?? null,
      client_name: client ?? null,
      aspect_ratio: "9:16",
      video_path: video.path,
      video_url: video.url,
      poster_path: poster?.path ?? null,
      poster_url: poster?.url ?? null,
      featured: order < 6, // the home page used to show the first six
      published: true,
      sort_order: order++,
    });
    if (error) throw new Error(error.message);
    console.log(`✓ reel ${title}`);
  }
} else console.log("• gs_reels already has rows, skipped");

// ── Posters ─────────────────────────────────────────────────────
if (await isEmpty("gs_posters")) {
  const used = new Set([...fs.readFileSync(staticsTs, "utf8").matchAll(/"\/statics\/([^"]+)"/g)].map((m) => m[1]));
  const groups = [
    { title: "Wooking Street", files: ["wooking.webp", "wooking-3.webp", "wooking-4.webp"] },
    { title: "Static Designs", files: ["artboard-1v1.webp", "artboard-3v1.webp"] },
    { title: "CnB", files: ["cnb1.webp"] },
    { title: "The Bowl", files: ["the-bowl.webp"] },
  ];
  let order = 0;
  for (const g of groups) {
    const images = [];
    for (const f of g.files.filter((f) => used.has(f))) {
      const up = await upImage("posters", `statics/${f}`);
      if (up) images.push(up);
    }
    if (!images.length) continue;
    const { error } = await sb.from("gs_posters").insert({ title: g.title, images, featured: false, published: true, sort_order: order++ });
    if (error) throw new Error(error.message);
    console.log(`✓ poster ${g.title} (${images.length})`);
  }
} else console.log("• gs_posters already has rows, skipped");

// ── Case studies ────────────────────────────────────────────────
if (await isEmpty("gs_case_studies")) {
  const arabikaLogo = await upImage("logos", "clients/arabika-coffee.png");
  const wsLogo = await upImage("logos", "clients/ws.png");
  const ambience = await upReel("reels/ambience.mp4");
  const ambienceCover = await upImage("covers", "reels/posters/ambience.jpg");
  const w3 = await upImage("case-studies", "statics/wooking-3.webp");
  const w4 = await upImage("case-studies", "statics/wooking-4.webp");

  const rows = [
    {
      slug: "arabika",
      brand: "Arabika",
      logo_path: arabikaLogo?.path, logo_url: arabikaLogo?.url,
      tagline: "For the Campus,\nBy the Campus.",
      description: "Few students knew Arabika Campus existed. We gave it a face, a voice, and a student crowd. Now it's where everyone meets.",
      campaign: "Arabika Campus x GrinScreen",
      duration: "11 Months",
      problem: "Students didn't know Campus was there. And they thought Arabika was too expensive for them.",
      idea: "Students skip ads. They watch their friends.",
      pillars_title: "What We Did",
      pillars: ["Put real BRAC students on camera", "Used student jokes and student language", "Showed the low student prices clearly", "Posted every week, from day one"],
      community: "Customers became creators. Creators became regulars. Regulars brought their friends.",
      stats: [
        { value: "60M+", label: "Total Views", sub: "across Facebook & Instagram" },
        { value: "300K+", label: "Interactions", sub: "likes, comments & shares" },
        { value: "$0", label: "Ad Spend", sub: "100% organic" },
        { value: "11", label: "Months", sub: "of posting non-stop" },
      ],
      insight: "60M views. Zero ad spend. Friends beat ads.",
      visuals: ambience && ambienceCover ? [{ kind: "reel", url: ambience.url, path: ambience.path, poster_url: ambienceCover.url, poster_path: ambienceCover.path, alt: "Arabika ambience reel" }] : [],
      featured: true, published: true, sort_order: 0,
    },
    {
      slug: "wooking-street",
      brand: "Wooking Street",
      logo_path: wsLogo?.path, logo_url: wsLogo?.url,
      tagline: "Valentine's Day\nOutburst.",
      description: "With a warm, engaged audience already in place, we activated hard on Valentine's Day — turning months of relationship-building into a single high-conversion moment that nearly doubled the sales target.",
      campaign: "Valentine's Day Outburst",
      duration: "Seasonal Activation",
      pillars: [
        "Setting the Tone — priming the audience weeks before the date",
        "Memes & Reels for Engagement — viral-first content that spread organically",
        "Value Proposition to an Already-Engaged Audience — converting followers into buyers",
      ],
      stats: [
        { value: "123K", label: "Actual Sales", sub: "on Valentine's Day" },
        { value: "~2×", label: "Target Exceeded", sub: "nearly doubled expectations" },
        { value: "60–70K", label: "Original Target", sub: "set before launch" },
        { value: "75%+", label: "Over Upper Bound", sub: "above ceiling estimate" },
      ],
      insight: "Sales nearly doubled because the audience was already warm. The activation didn't need to create demand — it just needed to capture it.",
      visuals: [
        ...(w3 ? [{ kind: "image", ...w3, alt: "Wooking Street static: Woking Street chat" }] : []),
        ...(w4 ? [{ kind: "image", ...w4, alt: "Wooking Street static: appetizer platter" }] : []),
      ],
      featured: true, published: true, sort_order: 1,
    },
  ];
  for (const row of rows) {
    const { error } = await sb.from("gs_case_studies").insert(row);
    if (error) throw new Error(error.message);
    console.log(`✓ case study ${row.brand}`);
  }
} else console.log("• gs_case_studies already has rows, skipped");

console.log("Done.");
