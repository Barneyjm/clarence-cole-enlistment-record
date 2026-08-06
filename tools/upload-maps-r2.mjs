/**
 * Uploads the derived map images to an R2 bucket, so they are served from object
 * storage instead of out of this repository.
 *
 *   npm run maps:upload -- --bucket cole-maps            # upload
 *   npm run maps:upload -- --bucket cole-maps --create   # create the bucket first
 *   npm run maps:upload -- --bucket cole-maps --dry-run  # show what would happen
 *
 * This is entirely optional. With no R2 bucket the site serves the images from
 * public/images/maps/ and works exactly as it does now — nothing breaks by not
 * running this.
 *
 * It runs against whichever Cloudflare account wrangler is authenticated to, so a
 * fork can point it at its own account: `npx wrangler login`, or set
 * CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in the environment. Nothing
 * about the account is baked into this repository.
 *
 * After uploading, enable public access on the bucket (Cloudflare dashboard →
 * R2 → the bucket → Settings → Public access, or attach a custom domain) and put
 * the resulting base URL into "imageBase" in data/map-series.json:
 *
 *   "imageBase": "https://pub-xxxxxxxx.r2.dev"
 *
 * Then `npm run build:maps` and the site will link there instead.
 */
import { readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = resolve(ROOT, "public/images/maps");
const PREFIX = "images/maps";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : (process.argv[i + 1] ?? true);
}

const bucket = arg("bucket") ?? process.env.R2_BUCKET;
const dryRun = process.argv.includes("--dry-run");
const create = process.argv.includes("--create");
// R2 uploads are remote by default; --local writes to the local simulator instead.
const remote = !process.argv.includes("--local");

if (!bucket || bucket === true) {
  console.error(
    "usage: npm run maps:upload -- --bucket <name> [--create] [--dry-run]\n" +
      "   or: R2_BUCKET=<name> npm run maps:upload\n\n" +
      "Uploads to whichever Cloudflare account wrangler is logged into.",
  );
  process.exit(2);
}

function wrangler(args, { capture = false } = {}) {
  return spawnSync("npx", ["wrangler", ...args], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
}

let files;
try {
  files = readdirSync(DIR)
    .filter((f) => /\.(webp|jpg|png)$/i.test(f))
    .sort();
} catch {
  console.error(`No images at ${DIR}. Run \`npm run maps:fetch\` first.`);
  process.exit(1);
}

if (!files.length) {
  console.error(`No images at ${DIR}. Run \`npm run maps:fetch\` first.`);
  process.exit(1);
}

const total = files.reduce((n, f) => n + statSync(join(DIR, f)).size, 0);
console.log(
  `${files.length} files, ${(total / 1048576).toFixed(1)} MB -> r2://${bucket}/${PREFIX}/`,
);

if (create && !dryRun) {
  console.log(`\nCreating bucket ${bucket} (harmless if it already exists)`);
  wrangler(["r2", "bucket", "create", bucket]);
}

let failed = 0;
for (const file of files) {
  const key = `${PREFIX}/${file}`;
  const local = join(DIR, file);
  const size = (statSync(local).size / 1048576).toFixed(2);

  if (dryRun) {
    console.log(`  would put ${key}  (${size} MB)`);
    continue;
  }

  process.stdout.write(`  ${key}  (${size} MB) `);
  const res = wrangler(
    [
      "r2",
      "object",
      "put",
      `${bucket}/${key}`,
      "--file",
      local,
      "--content-type",
      file.endsWith(".webp") ? "image/webp" : "image/jpeg",
      // A year: the filenames change when the images do.
      "--cache-control",
      "public, max-age=31536000, immutable",
      ...(remote ? ["--remote"] : []),
    ],
    { capture: true },
  );
  if (res.status === 0) {
    console.log("ok");
  } else {
    console.log("failed");
    console.error((res.stderr || res.stdout || "").trim().split("\n").slice(-4).join("\n"));
    failed++;
  }
}

if (dryRun) {
  console.log("\nDry run — nothing was uploaded.");
} else if (failed) {
  console.error(`\n${failed} of ${files.length} failed.`);
  process.exitCode = 1;
} else {
  console.log(
    `\nUploaded ${files.length} files.\n\n` +
      "Next: turn on public access for the bucket in the Cloudflare dashboard\n" +
      "(R2 → " +
      bucket +
      " → Settings → Public access), then set imageBase in\n" +
      'data/map-series.json to the bucket\'s public URL — e.g.\n' +
      '  "imageBase": "https://pub-xxxxxxxx.r2.dev"\n' +
      "and run `npm run build:maps`. Leave imageBase empty to keep serving the\n" +
      "copies in this repository.",
  );
}
