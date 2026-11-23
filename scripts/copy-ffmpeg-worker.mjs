// Copies ffmpeg.wasm's tiny worker files into /public so the browser can load them
// as a same-origin module worker (bundlers can't resolve the worker reliably).
// Runs automatically after `npm install`.
import fs from "node:fs";
import path from "node:path";

const from = path.resolve("node_modules/@ffmpeg/ffmpeg/dist/esm");
const to = path.resolve("public/ffmpeg");
if (!fs.existsSync(from)) process.exit(0); // dependency not installed (e.g. partial install)
fs.mkdirSync(to, { recursive: true });
for (const f of ["worker.js", "const.js", "errors.js"]) fs.copyFileSync(path.join(from, f), path.join(to, f));
console.log("✓ ffmpeg worker copied to public/ffmpeg");
