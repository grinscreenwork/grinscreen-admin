"use client";

/**
 * Video compression for reels. Output is always: H.264 MP4, <=720p, 30 fps max,
 * no audio (reels play muted), bitrate chosen so the file fits the 5 MB bucket limit.
 *
 * Two paths:
 *  1. Fast  - WebCodecs via mediabunny (hardware accelerated). Handles most files.
 *  2. Slow  - ffmpeg compiled to WebAssembly. Used automatically when the browser
 *             can't decode the codec (iPhone .mov = HEVC/H.265, ProRes, AVI, MKV...).
 */

export const VIDEO_LIMIT_BYTES = 5 * 1024 * 1024; // matches the reels bucket limit
const VIDEO_TARGET_BYTES = Math.floor(VIDEO_LIMIT_BYTES * 0.92); // headroom for container overhead

export type CompressProgress = { stage: "compressing" | "uploading"; progress?: number; note?: string };
export type CompressResult = { file: File; originalBytes: number; outputBytes: number; note: string };

export const formatBytes = (n: number) =>
  n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

// Quality ladder: [width, ideal bitrate, minimum bitrate that still looks good at that width, max fps].
// Short reels get 720p; the longer the clip, the further down the ladder it goes so the WHOLE
// video always fits the 5 MB limit (nothing is ever trimmed). Lower rungs also cap the frame
// rate, which spends the few available bits on sharper frames instead of more of them.
const LADDER: [number, number, number, number][] = [
  [720, 2_600_000, 1_300_000, 30],
  [540, 1_700_000, 800_000, 30],
  [480, 1_200_000, 450_000, 30],
  [360, 800_000, 230_000, 24],
  [270, 500_000, 120_000, 24],
  [216, 300_000, 0, 20],
];
type Rung = (typeof LADDER)[number];
const MAX_ATTEMPTS = 7;

/** Frame-rate cap for this rung, or undefined when the source is already at/below it. */
function fpsCap(rung: Rung, sourceFps: number): number | undefined {
  return sourceFps > rung[3] + 1 ? rung[3] : undefined;
}

/** Best resolution + bitrate that fits the size budget for a clip of this length. */
function planVideo(duration: number): { rung: Rung; bitrate: number } {
  const budgetBps = (VIDEO_TARGET_BYTES * 8) / Math.max(duration, 0.5);
  const rung = LADDER.find(([, , min]) => budgetBps * 0.93 >= min) ?? LADDER[LADDER.length - 1];
  return { rung, bitrate: Math.min(rung[1], Math.floor(budgetBps * 0.93)) };
}

/** After a too-big attempt: lower the bitrate, and from the 2nd retry also drop a resolution. */
function tighten(rung: Rung, bitrate: number, attempt: number): { rung: Rung; bitrate: number } {
  const next = attempt >= 1 ? LADDER[Math.min(LADDER.length - 1, LADDER.indexOf(rung) + 1)] : rung;
  return { rung: next, bitrate: Math.min(next[1], Math.floor(bitrate * 0.8)) };
}

// Reached only for absurdly long videos (many minutes) that cannot fit 5 MB even at the lowest rung.
function tooBigError(size: number, duration: number) {
  return new Error(
    `This ${Math.round(duration / 60)}-minute video is still ${formatBytes(size)} at the lowest quality, which is over the ${formatBytes(VIDEO_LIMIT_BYTES)} limit. Videos up to roughly 10 minutes fit; this one is longer than that.`,
  );
}

/** Thrown when the fast pipeline can't handle this file. */
class NeedsFallback extends Error {}

function finish(file: File, best: Blob, originalBytes: number): CompressResult {
  // If the original is already an MP4 that's smaller than our encode, keep it.
  if (/mp4/i.test(file.type) && file.size <= best.size && file.size <= VIDEO_LIMIT_BYTES) {
    return { file, originalBytes, outputBytes: file.size, note: `${formatBytes(file.size)} (already small, kept as is)` };
  }
  const base = file.name.replace(/\.[^.]+$/, "") || "reel";
  const out = new File([best], `${base}.mp4`, { type: "video/mp4" });
  return { file: out, originalBytes, outputBytes: out.size, note: `${formatBytes(originalBytes)} → ${formatBytes(out.size)}` };
}

export async function compressVideo(file: File, onProgress?: (p: CompressProgress) => void): Promise<CompressResult> {
  const emit = throttle(onProgress);
  try {
    return await compressVideoNative(file, emit);
  } catch (e) {
    if (!(e instanceof NeedsFallback)) throw e;
    return compressVideoFfmpeg(file, emit);
  }
}

/** The encoders report progress per frame (thousands of times); let the UI hear ~8 updates a second. */
function throttle(cb?: (p: CompressProgress) => void): ((p: CompressProgress) => void) | undefined {
  if (!cb) return undefined;
  let lastT = 0;
  let lastNote: string | undefined;
  return (p) => {
    const now = performance.now();
    const edge = p.progress === undefined || p.progress <= 0 || p.progress >= 1 || p.note !== lastNote;
    if (edge || now - lastT >= 120) {
      lastT = now;
      lastNote = p.note;
      cb(p);
    }
  };
}

/* ───────────── Fast path: WebCodecs ───────────── */

async function compressVideoNative(file: File, onProgress?: (p: CompressProgress) => void): Promise<CompressResult> {
  const originalBytes = file.size;
  const mb = await import("mediabunny");

  if (typeof VideoEncoder === "undefined" || !(await mb.canEncodeVideo("avc"))) throw new NeedsFallback();

  let duration: number;
  let srcW: number;
  let srcH: number;
  let fps: number;
  const probe = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  try {
    const track = await probe.getPrimaryVideoTrack();
    if (!track || !(await track.canDecode())) throw new NeedsFallback();
    duration = await probe.computeDuration();
    srcW = track.displayWidth;
    srcH = track.displayHeight;
    fps = (await track.computePacketStats(120)).averagePacketRate;
  } catch {
    throw new NeedsFallback();
  } finally {
    probe.dispose?.();
  }

  let { rung, bitrate } = planVideo(duration);
  let best: Blob | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const width = Math.min(rung[0], srcW) & ~1; // never upscale; H.264 needs even sizes
    const height = Math.round((width * srcH) / srcW / 2) * 2;

    onProgress?.({ stage: "compressing", progress: 0, note: attempt ? "Squeezing a bit more" : undefined });
    const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
    const target = new mb.BufferTarget();
    const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }), target });

    let out: Blob;
    try {
      const conversion = await mb.Conversion.init({
        input,
        output,
        video: {
          width,
          height,
          fit: "contain",
          codec: "avc",
          bitrate,
          ...(fpsCap(rung, fps) ? { frameRate: fpsCap(rung, fps) } : {}),
          keyFrameInterval: 2,
        },
        audio: { discard: true }, // reels are always muted
        tags: {}, // drop camera/location metadata
        showWarnings: false,
      });
      if (!conversion.isValid) throw new NeedsFallback();
      conversion.onProgress = (p) => onProgress?.({ stage: "compressing", progress: p });
      await conversion.execute();
      out = new Blob([target.buffer!], { type: "video/mp4" });
    } catch {
      // Unexpected decoder/encoder failure: let the universal converter try.
      throw new NeedsFallback();
    }

    best = out;
    if (out.size <= VIDEO_LIMIT_BYTES) break;
    ({ rung, bitrate } = tighten(rung, bitrate, attempt));
  }

  if (!best || best.size > VIDEO_LIMIT_BYTES) throw tooBigError(best?.size ?? originalBytes, duration);
  return finish(file, best, originalBytes);
}

/* ───────────── Universal path: ffmpeg.wasm ───────────── */

const FFMPEG_CORE = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.9/dist/esm";

async function compressVideoFfmpeg(file: File, onProgress?: (p: CompressProgress) => void): Promise<CompressResult> {
  const originalBytes = file.size;
  onProgress?.({ stage: "compressing", note: "Loading the converter for this format" });

  const [{ FFmpeg }, { toBlobURL, fetchFile }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
  const ff = new FFmpeg();
  let logs = "";
  let stepNote = "Converting this format";
  ff.on("log", ({ message }) => {
    logs += message + "\n";
  });
  ff.on("progress", ({ progress }) => {
    if (progress >= 0 && progress <= 1) onProgress?.({ stage: "compressing", progress, note: stepNote });
  });

  try {
    await ff.load({
      coreURL: await toBlobURL(`${FFMPEG_CORE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${FFMPEG_CORE}/ffmpeg-core.wasm`, "application/wasm"),
      classWorkerURL: `${location.origin}/ffmpeg/worker.js`,
    });
    await ff.writeFile("input", await fetchFile(file));

    // Read duration / size / fps from ffmpeg's own report on the input.
    await ff.exec(["-hide_banner", "-i", "input"]);
    const dur = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(logs);
    const vline = /Stream #\d+:\d+[^\n]*Video:[^\n]*/.exec(logs)?.[0] ?? "";
    if (!dur || !vline) throw new Error("That file doesn't look like a video we can read. Try exporting it as MP4 (H.264).");
    const duration = Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]);
    const dims = /(\d{2,5})x(\d{2,5})/.exec(vline.replace(/0x[0-9a-f]+/gi, ""));
    let srcW = dims ? Number(dims[1]) : 1080;
    const fps = Number(/([\d.]+) fps/.exec(vline)?.[1] ?? 30);
    const rot = Math.round(Math.abs(Number(/rotation of (-?[\d.]+) degrees/.exec(logs)?.[1] ?? 0)));
    if (dims && (rot === 90 || rot === 270)) srcW = Number(dims[2]); // shot sideways: ffmpeg auto-rotates

    let { rung, bitrate } = planVideo(duration);
    let best: Blob | null = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const width = Math.min(rung[0], srcW) & ~1;
      const vf = [`scale=${width}:-2:flags=lanczos`, ...(fpsCap(rung, fps) ? [`fps=${fpsCap(rung, fps)}`] : [])].join(",");
      stepNote = attempt ? "Squeezing a bit more" : "Converting this format";
      onProgress?.({ stage: "compressing", progress: 0, note: stepNote });

      const code = await ff.exec([
        "-i", "input",
        "-an", "-map_metadata", "-1",
        "-vf", vf,
        "-c:v", "libx264", "-preset", "veryfast", "-profile:v", "high", "-pix_fmt", "yuv420p",
        "-b:v", String(bitrate), "-maxrate", String(Math.floor(bitrate * 1.15)), "-bufsize", String(bitrate * 2),
        "-g", "60", "-movflags", "+faststart",
        "output.mp4",
      ]);
      if (code !== 0) throw new Error("Couldn't convert that video. Try exporting it as MP4 (H.264) and upload again.");

      const data = (await ff.readFile("output.mp4")) as Uint8Array;
      await ff.deleteFile("output.mp4");
      best = new Blob([data.slice().buffer], { type: "video/mp4" });
      if (best.size <= VIDEO_LIMIT_BYTES) break;
      ({ rung, bitrate } = tighten(rung, bitrate, attempt));
    }

    if (!best || best.size > VIDEO_LIMIT_BYTES) throw tooBigError(best?.size ?? originalBytes, duration);
    return finish(file, best, originalBytes);
  } finally {
    ff.terminate();
  }
}
