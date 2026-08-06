/**
 * Rebuilds the map sheet images in public/images/maps/ from the archive scans.
 *
 *   npm run maps:fetch              # only what is missing
 *   npm run maps:fetch -- --force   # re-derive everything
 *
 * The derived files are not treated as source. Each sheet in data/map-series.json
 * that has an image records `sourceFile`, the URL of the full scan it came from,
 * and this script downloads that, derives a 3000 px plate and a 1400 px preview
 * as WebP, and deletes the original. The originals are 100 MB and upward, so they
 * are fetched one at a time and never kept.
 *
 * Needs Python 3 with Pillow, the same as tools/deskew-page.mjs:
 *   pip install pillow
 */
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOGUE = resolve(ROOT, "data/map-series.json");
const OUT = resolve(ROOT, "public/images/maps");

// 3000 px keeps every village name and spot height legible on a 1:100,000 sheet
// — checked against the 600 dpi original — at roughly half the bytes of 4000 px.
const PLATE = 3000;
const PREVIEW = 1400;
const QUALITY = 78;

const force = process.argv.includes("--force");

function havePillow() {
  const r = spawnSync("python3", ["-c", "import PIL"], { stdio: "ignore" });
  return r.status === 0;
}

function derive(sourceUrl, key) {
  const script = `
import io, os, sys, urllib.request
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

url, out, key = sys.argv[1], sys.argv[2], sys.argv[3]
tmp = os.path.join(out, key + '.download')
urllib.request.urlretrieve(url, tmp)
try:
    im = Image.open(tmp)
    native = im.size
    im = im.convert('RGB')
    for width, suffix in ((${PLATE}, ''), (${PREVIEW}, '-preview')):
        w = min(width, im.width)
        o = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        path = os.path.join(out, f'{key}{suffix}.webp')
        o.save(path, 'WEBP', quality=${QUALITY}, method=6)
        print(f'{o.size[0]}x{o.size[1]} {os.path.getsize(path)}', flush=True)
    print(f'native {native[0]}x{native[1]}', flush=True)
finally:
    if os.path.exists(tmp):
        os.remove(tmp)
`;
  return spawnSync("python3", ["-c", script, sourceUrl, OUT, key], { encoding: "utf8" });
}

function main() {
  if (!havePillow()) {
    console.error(
      "python3 with Pillow is required (pip install pillow). Same requirement as " +
        "tools/deskew-page.mjs.",
    );
    process.exit(1);
  }

  const catalogue = JSON.parse(readFileSync(CATALOGUE, "utf8"));
  mkdirSync(OUT, { recursive: true });

  const jobs = Object.entries(catalogue.sheets)
    .filter(([, sheet]) => sheet.image?.sourceFile)
    .map(([key, sheet]) => ({ key, url: sheet.image.sourceFile }));

  if (!jobs.length) {
    console.log("No sheets in data/map-series.json carry an image.sourceFile.");
    return;
  }

  let built = 0;
  let skipped = 0;
  for (const { key, url } of jobs) {
    const plate = resolve(OUT, `${key}.webp`);
    if (!force && existsSync(plate)) {
      skipped++;
      continue;
    }
    process.stdout.write(`  ${key} … `);
    const r = derive(url, key);
    if (r.status !== 0) {
      console.log("failed");
      console.error(r.stderr?.trim() || "(no stderr)");
      process.exitCode = 1;
      continue;
    }
    const lines = r.stdout.trim().split("\n");
    console.log(lines.join("  ·  "));
    built++;
  }

  console.log(
    `\n${built} derived, ${skipped} already present` +
      (skipped && !force ? " (use --force to rebuild those)" : ""),
  );
}

main();
