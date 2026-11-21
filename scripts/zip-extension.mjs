// Packs ./extension into public/jobpilot-extension.zip so the app can offer it for download.
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

const root = "extension";
const zip = new JSZip();
const folder = zip.folder("jobpilot-extension");
async function add(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await add(p);
    else folder.file(path.relative(root, p).split(path.sep).join("/"), await readFile(p));
  }
}
await add(root);
await mkdir("public", { recursive: true });
await writeFile("public/jobpilot-extension.zip", await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
console.log("[extension] public/jobpilot-extension.zip written");
