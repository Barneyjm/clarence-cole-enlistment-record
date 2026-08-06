/**
 * Builds public/data/map-sheets.json — every map sheet the battery reported
 * working from, and every grid reference it gave while on that sheet.
 *
 *   npm run build:maps
 *
 * The record of events almost always closes with the sheet in use:
 *
 *   In position firing. (Map Bonn 1:100,000 Sheet S-1.)
 *
 * and the station line above it gives the position on that sheet:
 *
 *   Schmidthof 1 Mi N wF8935 Nord de Guerre Zone (Germany)
 *
 * Together those are a complete artillery position: a sheet, a grid, and a date.
 * This tool collects them, decodes the grids through tools/lib/grids.mjs, and joins
 * the sheets to data/map-series.json, which says which GSGS series each belongs
 * to and where a copy can be found today.
 *
 * It fails on a sheet the film names that the catalogue does not list, so the
 * catalogue cannot fall behind as more frames are read.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readPages, parseCards } from "./lib/pages.mjs";
import { parseGridRef, wgs84ToGrid, zoneOf, ZONES } from "./lib/grids.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "public/data/map-sheets.json");

const catalogue = JSON.parse(
  readFileSync(resolve(ROOT, "data/map-series.json"), "utf8"),
);
const gazetteer = JSON.parse(
  readFileSync(resolve(ROOT, "data/gazetteer.json"), "utf8"),
);

// A decoded reference is checked against the village written beside it on the
// same line. Landing within this distance means the reference and the village
// agree; landing further out means one of them is wrong, and the site must not
// draw the battery there as though it knew. Nothing observed falls between 10
// and 20 km, so the gap is real and this is where to cut it.
const AGREEMENT = 10000;

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const villages = [...gazetteer.places]
  .sort((a, b) => b.match.trim().length - a.match.trim().length)
  .map((p) => ({ ...p, re: new RegExp(`\\b${esc(p.match.trim())}\\b`, "i") }));

/* --------------------------------------------------------------- the parsing */
// The citation is a sentence with pieces missing. All of these occur:
//
//   (Map Bonn 1:100,000 Sheet S-1.)
//   (Map Aywaille Sheet 80 SE.)
//   (Map Belgium GSGS 4040 1:50,000 Sheet Vielsalm 93.)
//   (Map Paris (West) Sheet 10F/5.)
//   (Map sheet 34/16 N.E. France 1:25,000.)
//
// One regex that swallows all of them gets the name and the designation the
// wrong way round on at least one, quietly, so the pieces are taken off one at a
// time instead.
//
// The citation runs to the closing ".)", which lets the place name keep its own
// brackets — "Paris (West)" is a sheet name, not the end of the citation.
const CITATION = /\(Map\s+(.*?)\.\)/gi;
const COUNTRY = /\b(N\.?\s?E\.?\s+)?(Belgium|Germany|France|Holland|Luxembourg)\b/i;

// Three sheet numberings appear on the film, and they have to be told apart:
// "10F/5" and "6E/2" (France 1:50,000), "S-1" and "R-3" (Germany 1:100,000),
// "5204" and "93" (German and Belgian sheet lines), the last two optionally with
// a quadrant — "80 SW" is the south-west quarter of Belgian sheet 80.
//
// Case matters. Matched case-insensitively, "Vielsalm 93" reads as sheet "M 93"
// of a map called "Vielsal", and the film has enough real oddities without
// inventing more.
const DESIGNATION =
  /(?:^|\s)(\d{1,3}[A-Z]?\/\d{1,2}|[A-Z]\s?-?\s?\d{1,2}|\d{1,4})(?:\s+([NSEW]{1,2})|\s*([NSEW]\.[NSEW]\.?))?\s*$/;

/** Pull "Bonn" and "S1" out of the inside of a map citation. */
function parseCitation(body) {
  let rest = body.trim();

  const series = rest.match(/GSGS\s*(\d{4})/i)?.[1] ?? null;
  rest = rest.replace(/GSGS\s*\d{4}/i, " ");

  const scale = rest.match(/1\s*[:/]\s*([\d,]+)/)?.[1] ?? null;
  rest = rest.replace(/1\s*[:/]\s*[\d,]+/, " ");

  const country = rest.match(COUNTRY)?.[0] ?? null;
  rest = rest.replace(COUNTRY, " ").replace(/\s+/g, " ").trim();

  // "Sheet" splits the name from the designation — except where the clerk put
  // the name after it, as in "Sheet Vielsalm 93".
  const [before, after] = rest.split(/\bsheet\b/i).map((s) => (s ?? "").trim());
  const tail = after || before;
  const m = tail.match(DESIGNATION);
  if (!m) return null;

  const quadrant = (m[2] ?? m[3] ?? "").replace(/\./g, "");
  let name = (after ? tail.slice(0, m.index).trim() || before : before).trim();

  // "Aywaille S.W. Sheet 80" and "Aywaille Sheet 80 SW" are the same sheet, and
  // the clerk wrote it both ways in the same week.
  const trailing = name.match(/\s([NSEW]\.[NSEW]\.?|[NSEW]{2})$/);
  const suffix = quadrant || (trailing ? trailing[1].replace(/\./g, "") : "");
  if (trailing) name = name.slice(0, trailing.index).trim();

  const designation = (m[1].replace(/\s+/g, "") + suffix).toUpperCase();
  name = name.replace(/[,.]+$/, "").trim();

  return { name: name || country?.trim() || null, designation, scale, series };
}

// The second alternative catches references the film gives with two capitals,
// such as "ZR0622". Those do not parse, and are meant not to: they are recorded
// without a position and reported, because a reference dropped on the floor here
// is a reference nobody ever looks at again.
const GRID_IN_STATION = /\b([a-z]?\s?[A-Z]|[A-Z]{2})\s?(\d{4}|\d{6})\b/;

const slug = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "");

/** "S-1" and "S 1" and "s1" are one sheet; "80 SE" and "80SE" are one sheet. */
const sheetKey = (name, designation) => `${slug(name)}-${slug(designation)}`;

const cards = [];
for (const page of readPages(resolve(ROOT, "transcriptions"))) {
  if (page.meta.kind !== "morning-report") continue;
  for (const card of parseCards(page.body)) {
    cards.push({ ...card, page: page.page });
  }
}
cards.sort((a, b) => a.date.localeCompare(b.date));

/* ---------------------------------------------------------------- the sheets */
const sheets = new Map();
const unknown = new Set();
let citations = 0;

// The sheet stays in force until the next card names a different one, so a card
// that omits the citation still belongs to a sheet, and the day's grid reference
// belongs to that sheet.
let current = null;

// The last position that decoded, which is how the abbreviated references get
// read. See decode().
let previous = null;

const round6 = (v) => Number(v.toFixed(6));

/** Metres between a decoded reference and a gazetteer village. */
function distanceOnGround(point, village) {
  const grid = wgs84ToGrid(point.zone, village.lat, village.lon);
  return Math.hypot(point.easting - grid.easting, point.northing - grid.northing);
}

/**
 * Decode a reference as written, filling in the 500 km letter when the clerk
 * left it off — "Roddenau G7172" rather than "wG7172".
 *
 * The missing letter is chosen by continuity: of the candidate squares, take the
 * one that puts the battery nearest to where it was the day before. A field
 * artillery battalion moves tens of kilometres in a day and the candidates are
 * 500 km apart, so the choice is never close. Where there is no previous
 * position to go on, the reference is left undecoded rather than guessed.
 */
function decode(written, zone) {
  const direct = parseGridRef(written, { zone });
  if (direct && !direct.squareInferred) return direct;

  const outers = Object.keys(ZONES[zone].outer ?? {});
  if (!outers.length || !previous) return direct;

  let best = null;
  for (const outer of outers) {
    const point = parseGridRef(written, { zone, outer });
    if (!point) continue;
    const away = Math.hypot(
      point.easting - previous.easting,
      point.northing - previous.northing,
    );
    if (!best || away < best.away) best = { point, away };
  }
  return best?.point ?? direct;
}

for (const card of cards) {
  for (const m of (card.events ?? "").matchAll(CITATION)) {
    const parsed = parseCitation(m[1]);
    if (!parsed || !parsed.name) continue;
    citations += 1;
    const { name, designation: number, scale: rawScale, series } = parsed;

    const key = sheetKey(name, number);
    if (!sheets.has(key)) {
      sheets.set(key, {
        key,
        name,
        sheet: number,
        scales: new Set(),
        seriesOnCard: new Set(),
        dates: [],
        frames: new Set(),
        refs: new Map(),
      });
    }
    const sheet = sheets.get(key);
    if (rawScale) sheet.scales.add(`1:${rawScale}`);
    if (series) sheet.seriesOnCard.add(`GSGS ${series}`);
    sheet.dates.push(card.date);
    sheet.frames.add(card.page);
    current = sheet;

    if (!catalogue.sheets[key]) unknown.add(`${key}  (${name} ${number})`);
  }

  // Whichever sheet is in force, the day's grid reference belongs to it.
  const station = card.station ?? "";
  const zone = zoneOf(station);
  const g = station.match(GRID_IN_STATION);
  if (!zone || !g || !current) continue;

  const written = g[1].replace(/\s/g, "") + g[2];
  const point = decode(written, zone);
  if (point) previous = point;

  if (!current.refs.has(written)) {
    // Cross-check against the village on the same line. This is what keeps a
    // mistyped square letter off the map: wK8935 decodes perfectly well, to a
    // point in Saxony, four hundred kilometres from the Schmidthof it is
    // written beside.
    const village = point && villages.find((p) => p.re.test(station));
    const apart = village && distanceOnGround(point, village);

    current.refs.set(written, {
      ref: written,
      zone,
      square: point?.square ?? null,
      squareInferred: point?.squareInferred ?? false,
      first: card.date,
      last: card.date,
      days: 0,
      station,
      ...(point
        ? { lat: round6(point.lat), lon: round6(point.lon), precision: point.precision }
        : {}),
      ...(village
        ? {
            check: {
              place: village.name,
              km: Number((apart / 1000).toFixed(1)),
              agrees: apart <= AGREEMENT,
            },
          }
        : {}),
      ...(village && apart > AGREEMENT
        ? {
            disputed:
              `Decodes to a point ${Math.round(apart / 1000)} km from ${village.name}, ` +
              "which the same line names. One of the two readings is wrong and the " +
              "film has not been re-read; the position is recorded but not drawn.",
          }
        : {}),
    });
  }
  const entry = current.refs.get(written);
  entry.last = card.date;
  entry.days += 1;
}

if (unknown.size) {
  console.error("Sheets named on the film that data/map-series.json does not list:\n");
  for (const u of [...unknown].sort()) console.error(`  ${u}`);
  console.error("\nAdd them there, with the series and the basis for it, and re-run.");
  process.exit(1);
}

/* ----------------------------------------------------------------- the output */
const seriesById = new Map(catalogue.series.map((s) => [s.id, s]));

const out = [...sheets.values()]
  .map((s) => {
    const known = catalogue.sheets[s.key];
    const dates = [...s.dates].sort();
    const scales = [...s.scales];
    const onCard = [...s.seriesOnCard];
    const series = onCard[0] ?? known.series;
    const meta = seriesById.get(series);
    if (!meta) {
      console.error(`data/map-series.json has no series ${series} for sheet ${s.key}`);
      process.exit(1);
    }
    return {
      key: s.key,
      name: s.name,
      sheet: s.sheet,
      scale: scales[0] ?? meta.scale,
      ...(scales.length > 1
        ? {
            scaleConflict: scales,
            scaleNote:
              "Cards give this sheet at more than one scale. Both readings are kept; neither is corrected.",
          }
        : {}),
      series,
      seriesTitle: meta.title,
      seriesIndex: meta.index,
      basis: onCard.length ? "named on the card" : known.basis,
      ...(known.note ? { note: known.note } : {}),
      ...(known.designationNote ? { designationNote: known.designationNote } : {}),
      ...(known.image
        ? {
            image: {
              ...known.image,
              // imageBase lets a fork serve these from R2 or any other origin
              // without touching anything else. Empty means "out of this repo".
              file: `${catalogue.imageBase ?? ""}${known.image.file}`,
              ...(known.image.full
                ? { full: `${catalogue.imageBase ?? ""}${known.image.full}` }
                : {}),
            },
          }
        : {}),
      days: s.dates.length,
      first: dates[0],
      last: dates[dates.length - 1],
      frames: [...s.frames].sort((a, b) => a - b),
      sources: known.sources ?? [],
      positions: [...s.refs.values()].sort((a, b) => a.first.localeCompare(b.first)),
    };
  })
  .sort((a, b) => a.first.localeCompare(b.first));

const located = out.filter((s) => s.sources.length).length;
const positions = out.flatMap((s) => s.positions);
const decoded = positions.filter((p) => p.lat != null);

writeFileSync(
  OUT,
  `${JSON.stringify(
    {
      meta: {
        title: "The map sheets Battery C worked from",
        note:
          "Built from the record of events on each morning report, which names the sheet in use, " +
          "and from the station line, which gives the position on it. Series identifications come " +
          "from data/map-series.json and are marked as inferred unless the card names the series.",
        grid:
          "Positions are Nord de Guerre grid references decoded to WGS 84. A four-figure reference " +
          "names a one-kilometre square; the point given is its centre.",
        sheets: out.length,
        citations,
        positions: positions.length,
        located,
        rights: catalogue._rights,
      },
      series: catalogue.series,
      repositories: catalogue.repositories ?? [],
      sheets: out,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

const disputed = positions.filter((p) => p.disputed);

console.log(
  `map sheets ${out.length} · citations ${citations} · ` +
    `grid references ${positions.length} (${decoded.length} decoded, ${disputed.length} disputed) · ` +
    `${located} sheet${located === 1 ? "" : "s"} with a source to hand`,
);

for (const s of out) {
  const square = s.positions.find((p) => p.square)?.square;
  console.log(
    `  ${s.first}  ${`${s.name} ${s.sheet}`.padEnd(22)} ${s.scale.padEnd(9)} ` +
      `${s.series}${s.basis === "named on the card" ? " " : "?"}  ${String(s.days).padStart(3)} days  ` +
      `${s.positions.length} position${s.positions.length === 1 ? "" : "s"}` +
      (square ? `  ${square}` : ""),
  );
}

const undecodable = positions.filter((p) => p.lat == null);
if (undecodable.length) {
  console.log(`\n${undecodable.length} reference${undecodable.length === 1 ? "" : "s"} could not be placed:`);
  for (const p of undecodable) console.log(`  ${p.first}  ${p.ref}  ${p.station}`);
}

if (disputed.length) {
  console.log(`\n${disputed.length} decode to a place the same line contradicts:`);
  for (const p of disputed) {
    console.log(`  ${p.first}  ${p.ref.padEnd(7)} ${p.check.km} km from ${p.check.place}`);
  }
  console.log("  Listed on the site, not plotted. Re-read these frames to settle them.");
}
