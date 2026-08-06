/**
 * Reading transcriptions/ — the one home for everything read off the film.
 *
 * One file per PDF page, named for the page. Every file opens with a front-matter
 * block; what follows depends on `kind`:
 *
 *   kind: order           a pipe table of men, one row each. Wide tabular
 *                         documents like Special Orders 66 and 226.
 *   kind: morning-report  one `## <date>` section per report card on the page,
 *                         each with a station, a record of events, a strength
 *                         line, and an optional table of personnel actions.
 *
 * Both builders parse through here so the format has exactly one definition.
 */

import { readFileSync, readdirSync } from "node:fs";
import { resolve, basename } from "node:path";

export function parseFrontMatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return [{}, text];
  const meta = {};
  for (const line of match[1].split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (value === "true") value = true;
    else if (value === "false") value = false;
    else if (/^\d+$/.test(value)) value = Number(value);
    meta[key] = value;
  }
  return [meta, text.slice(match[0].length)];
}

export function parseTable(body) {
  const lines = body.split("\n").map((l) => l.trim());
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
    header.forEach((key, idx) => {
      row[key] = values[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

/** Every page file, in page order, with front matter split from body. */
export function readPages(dir) {
  return readdirSync(dir)
    .filter((f) => /^p\d+\.md$/.test(f))
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
    .map((file) => {
      const [meta, body] = parseFrontMatter(readFileSync(resolve(dir, file), "utf8"));
      return { file, page: Number(basename(file, ".md").slice(1)), meta, body };
    });
}

/**
 * The cards on one morning-report page. A frame usually carries two, and they
 * are different days, so each gets its own section rather than being merged.
 */
export function parseCards(body) {
  const sections = body.split(/^## /m).slice(1);
  return sections.map((section) => {
    const [heading, ...rest] = section.split("\n");
    const text = rest.join("\n");

    const field = (name) => {
      const m = text.match(new RegExp(`^${name}:\\s*(.+)$`, "im"));
      return m ? m[1].trim() : null;
    };

    // The record of events, quoted verbatim as the clerk wrote it.
    const quoted = [...text.matchAll(/^>\s?(.*)$/gm)].map((m) => m[1].trim());
    const events = quoted.join(" ").trim();

    const strengthLine = field("strength");
    const num = (label) => {
      const m = strengthLine?.match(new RegExp(`(\\d+)\\s+${label}`, "i"));
      return m ? Number(m[1]) : null;
    };

    const rows = parseTable(text);

    return {
      date: heading.trim(),
      station: field("station"),
      card: field("card"),
      events: events || null,
      strength: strengthLine
        ? { presentForDuty: num("present"), absent: num("absent"), assigned: num("assigned") }
        : null,
      personnel: rows.map((r) => ({
        name: r.name,
        grade: r.grade || null,
        serial: r.asn || null,
        action: r.action || "",
        uncertain: r.flags ? r.flags.split(",").map((s) => s.trim()).filter(Boolean) : [],
      })),
    };
  });
}
