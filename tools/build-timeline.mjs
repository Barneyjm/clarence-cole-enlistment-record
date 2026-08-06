/**
 * Folds the morning-report transcription into public/data/timeline.json.
 *
 *   npm run build:timeline
 *
 * Source of truth is transcriptions/pNNN.md — one file per film frame, the same
 * home the orders use. This tool never invents a fact; it maps, merges and counts.
 *
 * Two rules make it safe to re-run:
 *
 *   1. It only ever removes events carrying "generated": true. Hand-authored
 *      events — the discharge, the citation, Special Orders 66 — are untouched.
 *   2. Where a hand-authored event already covers a date, the transcription
 *      ENRICHES it (filling a missing verbatim, strength or frame number) rather
 *      than adding a second event for the same day. The curated title and summary
 *      always win.
 *
 * It also emits public/data/morning-reports.json: the complete day-by-day record,
 * including the routine days that are deliberately kept off the main timeline.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readPages, parseCards } from "./lib/pages.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(ROOT, "transcriptions");
const GAZ = resolve(ROOT, "data/gazetteer.json");
const TIMELINE = resolve(ROOT, "public/data/timeline.json");
const FULL = resolve(ROOT, "public/data/morning-reports.json");

// Every morning-report card on the film, flattened out of the page files.
const raw = readPages(SRC)
  .filter((p) => p.meta.kind === "morning-report")
  .flatMap((p) =>
    parseCards(p.body).map((card) => ({
      page: p.page,
      card: card.card,
      date: card.date,
      station: card.station,
      org: p.meta.unit ?? null,
      events: card.events ?? "",
      personnel: card.personnel,
      em_duty: card.strength?.presentForDuty ?? null,
      em_total: card.strength?.assigned ?? null,
    })),
  );
// Counted, never asserted — the number drifts every time a frame is added.
const FRAMES_TRANSCRIBED = new Set(
  readPages(SRC).map((p) => p.page),
).size;

const gaz = JSON.parse(readFileSync(GAZ, "utf8"));
const timeline = JSON.parse(readFileSync(TIMELINE, "utf8"));

/* ---------------------------------------------------------------- merge cards */
// The film carries duplicate scans and multi-page reports for a single date.
const byDate = new Map();
for (const r of raw) {
  const prev = byDate.get(r.date);
  if (!prev) {
    byDate.set(r.date, { ...r, personnel: [...(r.personnel ?? [])], pages: [r.page] });
    continue;
  }
  prev.pages.push(r.page);
  for (const p of r.personnel ?? []) {
    if (!prev.personnel.some((q) => q.name === p.name && q.action === p.action)) prev.personnel.push(p);
  }
  const merged = [prev.events, r.events].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
  prev.events = merged.join(" ");
  if (r.em_duty != null) prev.em_duty = r.em_duty;
  if (r.em_total != null) prev.em_total = r.em_total;
}
const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));

// One card, one day — unless a report genuinely spans frames, which happens with
// continuation sheets and the multi-page corrections. Those declare `covers` in
// their front matter. An undeclared collision means a misread day glyph, which
// also hides a day that then goes missing entirely. Review caught p30 and p36
// that way; the build catches the next one.
const continuations = new Set(
  readPages(SRC).filter((p) => p.meta.covers).map((p) => p.page),
);
const dupes = [...byDate.values()]
  .filter((d) => new Set(d.pages).size > 1)
  .filter((d) => ![...new Set(d.pages)].some((page) => continuations.has(page)))
  .map((d) => `${d.date} appears on frames ${[...new Set(d.pages)].sort((a, b) => a - b).join(", ")}`);
if (dupes.length) {
  for (const d of dupes) console.error(`error ${d}`);
  console.error(
    "Each date must come from one frame. Re-read the day glyph on the frames above.",
  );
  process.exit(1);
}


/* -------------------------------------------------------------------- places */
const slug = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Keys already used by the hand-authored events, so the two sets do not diverge.
const ALIAS = {
  "fort-slocum-new-york": "fort-slocum",
  "new-york-port-of-embarkation": "nype",
  "north-atlantic-crossing": "atlantic",
};
const placeKey = (name) => ALIAS[slug(name)] ?? slug(name);

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const matchers = [...gaz.places]
  .sort((a, b) => b.match.trim().length - a.match.trim().length)
  .map((p) => ({ ...p, re: new RegExp(`\\b${esc(p.match.trim())}\\b`, "i") }));

const placeFor = (station, date) => {
  const ov = gaz.overrides.find((o) => date >= o.from && date <= o.to);
  if (ov) return gaz.places.find((p) => p.match === ov.place) ?? null;
  if (!station) return null;
  return matchers.find((p) => p.re.test(station)) ?? null;
};

/* --------------------------------------------------------------- classifying */
const CASUALTY = /killed|wounded|\bLIA\b|injured in action/i;
const RX = {
  combat: /enemy artillery|enemy air|land mine|killed|wounded|\bLIA\b|injured in action/i,
  movement: /\bmoved\b|left .*arrived|arrived at|debark|boarded|march ordered|distance trave?l+ed/i,
  personnel: /promoted|appointed|aptd|reduced|assigned|transferred|trfd|joined|hosp|furlough|leave/i,
};

const kindFor = (day) => {
  const text = `${day.events} ${day.personnel.map((p) => p.action).join(" ")}`;
  if (RX.combat.test(text)) return "combat";
  if (RX.movement.test(day.events)) return "movement";
  if (day.personnel.length && RX.personnel.test(text)) return "personnel";
  return "admin";
};

// Only days that carry something beyond routine occupation reach the main timeline.
const isNotable = (day) => {
  const text = `${day.events} ${day.personnel.map((p) => p.action).join(" ")}`;
  return (
    RX.combat.test(text) ||
    RX.movement.test(day.events) ||
    /adjusted service rating|german .*guns|shipped german|gun tubes|alerted/i.test(day.events) ||
    day.personnel.some((p) => CASUALTY.test(p.action ?? ""))
  );
};

const titleFor = (day, kind, place) => {
  const e = day.events ?? "";
  if (CASUALTY.test(day.personnel.map((p) => p.action).join(" "))) {
    const hit = day.personnel.find((p) => CASUALTY.test(p.action ?? ""));
    if (/killed/i.test(hit.action)) return `${hit.name} killed`;
    return `${hit.name} wounded`;
  }
  if (/enemy artillery/i.test(e)) return "Enemy artillery on the position";
  if (/enemy air/i.test(e)) return "Enemy air action over the position";
  if (/arrived at omaha beach/i.test(e)) return "Lands over Omaha Beach";
  if (/shipped german guns/i.test(e)) return "Hands the German guns to the 269th";
  if (/german .*guns/i.test(e)) return "Training on captured German guns";
  if (/adjusted service rating/i.test(e)) return "Adjusted Service Rating cards issued";
  if (/gun tubes/i.test(e)) return "Changing gun tubes";
  if (/alerted for departure/i.test(e)) return "Alerted for departure";
  if (/march ordered/i.test(e)) return "March ordered";
  if (kind === "movement" && place) return `Moves to ${place.name.split(",")[0]}`;
  if (kind === "movement") return "Displaces to a new position";
  if (day.personnel.length === 1) return `${day.personnel[0].name} — status change`;
  if (day.personnel.length > 1) return `${day.personnel.length} personnel actions`;
  return "Record of events";
};

const summaryFor = (day, kind) => {
  const miles = day.events?.match(/distance trave?l+ed\s+(\d+)\s*mi/i)?.[1];
  if (kind === "movement" && miles) return `The battery moved ${miles} miles to a new position.`;
  if (kind === "combat") return "Recorded under fire, or a man hit, in the day's report.";
  if (day.personnel.length) {
    const n = day.personnel.length;
    return `${n} personnel ${n === 1 ? "action" : "actions"} recorded on the card.`;
  }
  return null;
};

/* --------------------------------------------------------------- build events */
const usedPlaces = new Map();
const generated = [];
const enrichable = new Map();

for (const day of days) {
  const gp = placeFor(day.station, day.date);
  let key = null;
  if (gp) {
    key = placeKey(gp.name);
    if (!usedPlaces.has(key)) {
      usedPlaces.set(key, {
        name: gp.name,
        lat: gp.lat,
        lon: gp.lon,
        ...(gp.country ? { country: gp.country } : {}),
        approximate: true,
        note: "Coordinate is the village named in the station entry; the battery position was within a mile or two of it, as the reports themselves state.",
      });
    }
  }

  const strength =
    day.em_duty != null && day.em_total != null
      ? { presentForDuty: day.em_duty, absent: day.em_total - day.em_duty, assigned: day.em_total }
      : undefined;

  const payload = {
    verbatim: day.events || undefined,
    strength,
    place: key ?? undefined,
    source: { id: "morning-reports", page: day.pages.sort((a, b) => a - b)[0] },
    personnel: day.personnel.length
      ? day.personnel.map((p) => ({
          name: p.name,
          ...(p.grade ? { grade: p.grade } : {}),
          ...(p.serial ? { serial: p.serial } : {}),
          action: p.action,
        }))
      : undefined,
  };

  enrichable.set(day.date, payload);

  if (!isNotable(day)) continue;
  const kind = kindFor(day);
  generated.push({
    id: `${day.date}-mr`,
    date: day.date,
    kind,
    title: titleFor(day, kind, gp),
    ...(key ? { place: key } : {}),
    ...(summaryFor(day, kind) ? { summary: summaryFor(day, kind) } : {}),
    ...payload,
    generated: true,
  });
}

/* --------------------------------------------------------------------- merge */
const handAuthored = (timeline.events ?? []).filter((e) => !e.generated);
const handDates = new Set(handAuthored.map((e) => e.date));

// Enrich the curated events with what the film adds, without overwriting curation.
let enriched = 0;
for (const e of handAuthored) {
  const add = enrichable.get(e.date);
  if (!add) continue;
  let touched = false;
  if (!e.verbatim && add.verbatim) { e.verbatim = add.verbatim; touched = true; }
  if (!e.strength && add.strength) { e.strength = add.strength; touched = true; }
  if (!e.place && add.place) { e.place = add.place; touched = true; }
  if (add.source?.page != null && (!e.source || e.source.id === "morning-reports") && e.source?.page == null) {
    e.source = { id: "morning-reports", page: add.source.page };
    touched = true;
  }
  if (touched) enriched += 1;
}

const kept = generated.filter((e) => !handDates.has(e.date));
const events = [...handAuthored, ...kept].sort(
  // A total order, and it has to be: `a.generated ? 1 : -1` answered -1 in both
  // directions for two hand-authored events sharing a date, which is not a valid
  // comparator. V8 then sorted the same input differently between runs and the
  // committed timeline.json drifted against its own sources.
  (a, b) =>
    a.date.localeCompare(b.date) ||
    Number(Boolean(a.generated)) - Number(Boolean(b.generated)) ||
    String(a.id).localeCompare(String(b.id)),
);

// Only add place keys the merged events actually reference, and never clobber a
// hand-authored place definition.
const places = { ...(timeline.places ?? {}) };
const referenced = new Set(events.map((e) => e.place).filter(Boolean));
for (const [key, value] of usedPlaces) {
  if (!referenced.has(key)) continue;
  if (!places[key]) places[key] = value;
}

timeline.events = events;
timeline.places = places;
timeline.meta = {
  ...timeline.meta,
  transcription: {
    framesTranscribed: FRAMES_TRANSCRIBED,
    framesTotal: 284,
    dailyReports: days.length,
    firstDate: days[0].date,
    lastDate: days[days.length - 1].date,
    note: `${284 - FRAMES_TRANSCRIBED} frames are not yet transcribed, including the occupation from mid-July 1945, the dissolution of the battery, and the sailing home.`,
  },
};

writeFileSync(TIMELINE, `${JSON.stringify(timeline, null, 2)}\n`, "utf8");

/* ------------------------------------------------- the complete daily record */
mkdirSync(dirname(FULL), { recursive: true });
writeFileSync(
  FULL,
  `${JSON.stringify(
    {
      meta: {
        title: "Battery C, 153rd Field Artillery Battalion — daily morning reports",
        note: "Every transcribed card, including the routine days kept off the main timeline. Source of truth is transcriptions/pNNN.md.",
        framesTranscribed: FRAMES_TRANSCRIBED,
        framesTotal: 284,
        count: days.length,
      },
      days: days.map((d) => ({
        date: d.date,
        station: d.station,
        place: placeFor(d.station, d.date)?.name ?? null,
        events: d.events || null,
        personnel: d.personnel,
        strength:
          d.em_duty != null && d.em_total != null
            ? { presentForDuty: d.em_duty, absent: d.em_total - d.em_duty, assigned: d.em_total }
            : null,
        frames: [...new Set(d.pages)].sort((a, b) => a - b),
        notable: isNotable(d),
      })),
    },
    null,
    0,
  )}\n`,
  "utf8",
);

const miles = days.reduce((sum, d) => {
  const m = [...(d.events ?? "").matchAll(/distance trave?l+ed\s+(\d+)\s*mi/gi)];
  return sum + m.reduce((s, x) => s + Number(x[1]), 0);
}, 0);

console.log(
  `daily reports ${days.length} · timeline events ${events.length} ` +
    `(${handAuthored.length} hand-authored, ${kept.length} from the film, ${enriched} enriched) · ` +
    `places ${Object.keys(places).length} · road miles ${miles}`,
);
