/**
 * Compares a second reading of a page against the committed transcription.
 *
 *   node tools/compare-transcription.mjs 266 .work/p266-second-read.md
 *
 * Prints every difference and exits non-zero if there are any. Rows are matched
 * on serial number where possible, and on position for rows whose serial is
 * partial — a partial serial cannot identify anyone, so it cannot be a key.
 *
 * The point is to make a genuine second read cheap to act on: read the page
 * again without looking at the existing file, save it, and let this tell you
 * where the two readings disagree.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const page = Number(process.argv[2]);
const candidatePath = process.argv[3];
if (!Number.isInteger(page) || !candidatePath) {
  console.error("usage: node tools/compare-transcription.mjs <page> <second-read.md>");
  process.exit(2);
}

const committedPath = resolve(ROOT, `transcriptions/p${page}.md`);
for (const p of [committedPath, resolve(ROOT, candidatePath)]) {
  if (!existsSync(p)) {
    console.error(`not found: ${p}`);
    process.exit(2);
  }
}

/** Same table parser the build uses, kept deliberately simple. */
function parseRows(text) {
  const lines = text.split("\n").map((l) => l.trim());
  const start = lines.findIndex((l) => l.startsWith("|") && /\bname\b/i.test(l));
  if (start === -1) return [];
  const cells = (line) =>
    line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  const header = cells(lines[start]);
  const rows = [];
  for (let i = start + 2; i < lines.length; i++) {
    if (!lines[i].startsWith("|")) break;
    const values = cells(lines[i]);
    const row = {};
    header.forEach((k, idx) => (row[k] = values[idx] ?? ""));
    row._index = rows.length;
    rows.push(row);
  }
  return rows;
}

const committed = parseRows(readFileSync(committedPath, "utf8"));
const candidate = parseRows(readFileSync(resolve(ROOT, candidatePath), "utf8"));

const FIELDS = ["grade", "name", "asn", "mos", "mco", "asr", "profile"];
const keyed = (rows) => {
  const map = new Map();
  for (const r of rows) {
    if (r.asn && !r.asn.includes("?")) map.set(r.asn, r);
  }
  return map;
};

const a = keyed(committed);
const b = keyed(candidate);
const diffs = [];

for (const [asn, left] of a) {
  const right = b.get(asn);
  if (!right) {
    diffs.push(`only in committed: ${asn} ${left.name}`);
    continue;
  }
  for (const f of FIELDS) {
    if ((left[f] ?? "") !== (right[f] ?? "")) {
      diffs.push(`${asn} ${left.name}: ${f} committed="${left[f]}" second="${right[f]}"`);
    }
  }
}
for (const [asn, right] of b) {
  if (!a.has(asn)) diffs.push(`only in second read: ${asn} ${right.name}`);
}

// Rows with partial serials are compared by position, which is the best that
// can be done — but flag when even the count disagrees.
const partial = (rows) => rows.filter((r) => !r.asn || r.asn.includes("?"));
const pa = partial(committed);
const pb = partial(candidate);
if (pa.length !== pb.length) {
  diffs.push(`partial-serial rows: committed has ${pa.length}, second read has ${pb.length}`);
} else {
  pa.forEach((left, i) => {
    const right = pb[i];
    for (const f of FIELDS) {
      if ((left[f] ?? "") !== (right[f] ?? "")) {
        diffs.push(
          `partial row ${i + 1} (${left.name}): ${f} committed="${left[f]}" second="${right[f]}"`,
        );
      }
    }
  });
}

if (committed.length !== candidate.length) {
  diffs.unshift(`row count: committed ${committed.length}, second read ${candidate.length}`);
}

if (!diffs.length) {
  console.log(
    `p${page}: two independent readings agree on all ${committed.length} rows. ` +
      `Safe to set verified: true.`,
  );
  process.exit(0);
}

console.log(`p${page}: ${diffs.length} difference${diffs.length === 1 ? "" : "s"}\n`);
for (const d of diffs) console.log(`  ${d}`);
console.log(
  `\nResolve each against the image before setting verified: true. ` +
    `A disagreement means at least one reading is wrong — do not just pick one.`,
);
process.exit(1);
