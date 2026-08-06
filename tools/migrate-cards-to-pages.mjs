/**
 * One-off: converts data/morning-reports.jsonl into transcriptions/pNNN.md,
 * so everything read off the film lives in one place in one format.
 *
 *   node tools/migrate-cards-to-pages.mjs
 *
 * SPENT. This has been run and data/morning-reports.jsonl is gone, so it cannot
 * run again. Kept because it is the only statement of how 403 JSON cards became
 * 210 page files; if a conversion bug ever surfaces, the rule that produced it is
 * here rather than only in a diff.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const JSONL = resolve(ROOT, "data/morning-reports.jsonl");
const OUT = resolve(ROOT, "transcriptions");

const cards = readFileSync(JSONL, "utf8")
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l));

// Group by film frame. A frame carries one or two cards, and they are
// different days, so they stay separate sections inside the page file.
const byPage = new Map();
for (const c of cards) {
  if (!byPage.has(c.page)) byPage.set(c.page, []);
  byPage.get(c.page).push(c);
}

const esc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ").trim();

let written = 0;
let skipped = 0;

for (const [page, group] of [...byPage.entries()].sort((a, b) => a[0] - b[0])) {
  const target = resolve(OUT, `p${page}.md`);
  if (existsSync(target)) {
    // Never overwrite an order page that already occupies this number.
    console.warn(`skip p${page}: file already exists`);
    skipped += 1;
    continue;
  }

  group.sort((a, b) => (a.card ?? "").localeCompare(b.card ?? "") || a.date.localeCompare(b.date));
  const dates = [...new Set(group.map((c) => c.date))].sort();

  const lines = [
    "---",
    `page: ${page}`,
    "kind: morning-report",
    "document: Btry C morning reports",
    `unit: ${group[0].org ?? "Btry C 153rd FA Bn"}`,
    `dates: ${dates.join(", ")}`,
    `cards: ${group.length}`,
    "verified: false",
    "---",
    "",
    "First pass, transcribed from the film. Not yet checked by a second reader.",
    "",
  ];

  for (const c of group) {
    lines.push(`## ${c.date}`, "");
    if (c.card) lines.push(`card: ${c.card}`);
    if (c.station) lines.push(`station: ${esc(c.station)}`);
    if (c.em_duty != null && c.em_total != null) {
      lines.push(
        `strength: ${c.em_duty} present for duty, ${c.em_total - c.em_duty} absent, ${c.em_total} assigned`,
      );
    }
    lines.push("");

    if (c.events) {
      lines.push(`> ${esc(c.events)}`, "");
    } else {
      lines.push("> No change.", "");
    }

    const people = (c.personnel ?? []).filter((p) => p.name);
    if (people.length) {
      lines.push(
        "| grade | name | asn | action | flags |",
        "| --- | --- | --- | --- | --- |",
      );
      for (const p of people) {
        lines.push(
          `| ${esc(p.grade)} | ${esc(p.name)} | ${esc(p.serial)} | ${esc(p.action)} | |`,
        );
      }
      lines.push("");
    }
  }

  writeFileSync(target, `${lines.join("\n").replace(/\n{3,}/g, "\n\n")}\n`, "utf8");
  written += 1;
}

console.log(
  `wrote ${written} page files from ${cards.length} cards ` +
    `(${byPage.size} frames, ${skipped} skipped as already present)`,
);
