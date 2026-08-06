/**
 * Recovers the lettered squares of both grids from the reports themselves, and
 * checks every reference on the film against the village written beside it.
 *
 *   node tools/derive-grid-squares.mjs
 *
 * Most station lines name a village *and* give a grid reference. The village
 * fixes a point on the ground; the reference gives that point's position inside
 * a lettered square whose corner we do not know. Subtract one from the other and
 * what is left is the corner — which has to land on a 100 km multiple, and has
 * to come out the same for every village the film puts in the same square.
 *
 * That is a strong check. Villages a hundred kilometres apart agreeing on a
 * corner to within a kilometre is not a coincidence, and a letter the clerk
 * mistyped shows up at once as a corner nobody else shares.
 *
 * The battalion ran the same check by hand. On 20 January 1945 it corrected a
 * position it had been reporting for four days — vK6597 to vP6597 — and that
 * correction is one of the disagreements this script finds on its own.
 *
 * It asserts nothing about which reading is right. It shows the disagreement and
 * leaves it visible.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readPages, parseCards } from "./lib/pages.mjs";
import { wgs84ToGrid, squareCorner, zoneOf, ZONES } from "./lib/grids.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const gaz = JSON.parse(readFileSync(resolve(ROOT, "data/gazetteer.json"), "utf8"));

const LETTERS = "ABCDEFGHJKLMNOPQRSTUVWXYZ";
const REF_IN_STATION = /\b([a-z]?)\s?([A-Z])\s?(\d{4})\b/;

// Metres. Not a precision claim — a discrimination threshold. A reference in the
// right square lands within a few kilometres of the village, because the station
// line says so itself ("2 Mi E", "1/2 Mi NW") and the gazetteer coordinate is
// the village centre. A reference in the wrong square lands a hundred kilometres
// out or more. Nothing observed falls between 10 and 20 km, so the gap is real
// and this is where to cut it.
const TOLERANCE = 10000;

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const matchers = [...gaz.places]
  .sort((a, b) => b.match.trim().length - a.match.trim().length)
  .map((p) => ({ ...p, re: new RegExp(`\\b${esc(p.match.trim())}\\b`, "i") }));

const km = (v) => (v / 1000).toFixed(1);
const round100 = (v) => Math.round(v / 100000) * 100000;

/* --------------------------------------------------------- the observations */
const seen = new Set();
const observations = [];

for (const page of readPages(resolve(ROOT, "transcriptions"))) {
  if (page.meta.kind !== "morning-report") continue;
  for (const card of parseCards(page.body)) {
    const station = card.station ?? "";
    const zone = zoneOf(station);
    const m = station.match(REF_IN_STATION);
    if (!zone || !m) continue;
    const place = matchers.find((p) => p.re.test(station));
    if (!place) continue;

    // The same position repeated for forty days is one measurement, not forty.
    const key = `${zone}|${m[1]}${m[2]}${m[3]}|${place.match}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const grid = wgs84ToGrid(zone, place.lat, place.lon);
    const index = LETTERS.indexOf(m[2]);
    observations.push({
      date: card.date,
      station,
      zone,
      outer: m[1] || null,
      inner: m[2],
      digits: m[3],
      place,
      grid,
      // Where the block of twenty-five would have to start for this village to
      // sit where this reference says it does.
      block: [
        grid.easting - (Number(m[3].slice(0, 2)) * 1000 + 500) - (index % 5) * 100000,
        grid.northing -
          (Number(m[3].slice(2)) * 1000 + 500) -
          (4 - Math.floor(index / 5)) * 100000,
      ],
    });
  }
}

/* ------------------------------------------------------------ the consensus */
// Each village votes for a block origin. The right one is the corner most of
// them land on; the outliers are the mistyped letters.
const votes = new Map();
for (const o of observations) {
  // A reference written without its 500 km letter cannot anchor anything: the
  // block it belongs to is precisely what it leaves out. Those are resolved
  // further down, against the blocks the full references fix.
  if (!o.outer && ZONES[o.zone].outer) continue;

  const key = `${o.zone}|${o.outer ?? "-"}|${round100(o.block[0])}|${round100(o.block[1])}`;
  if (!votes.has(key)) votes.set(key, []);
  votes.get(key).push(o);
}

const derived = new Map();
for (const [key, rows] of votes) {
  const [zone, outer, e, n] = key.split("|");
  const id = `${zone}|${outer}`;
  const best = derived.get(id);
  if (!best || rows.length > best.rows.length) {
    derived.set(id, { zone, outer, origin: [Number(e), Number(n)], rows });
  }
}

console.log("lettered blocks, as the reports fix them\n");
for (const [, d] of [...derived].sort()) {
  const committed = d.outer === "-"
    ? ZONES[d.zone].inner
    : ZONES[d.zone].outer?.[d.outer];
  const villages = new Set(d.rows.map((r) => r.place.name));
  console.log(
    `  ${ZONES[d.zone].label.padEnd(15)} ${d.outer === "-" ? "  " : d.outer + " "}` +
      ` south-west corner  E ${km(d.origin[0]).padStart(7)}  N ${km(d.origin[1]).padStart(7)} km` +
      `   from ${villages.size} village${villages.size === 1 ? "" : "s"}`,
  );
  if (!committed || committed[0] !== d.origin[0] || committed[1] !== d.origin[1]) {
    console.log(
      `${" ".repeat(20)}differs from tools/lib/grids.mjs, which has ` +
        `${committed ? `E ${km(committed[0])} N ${km(committed[1])}` : "no entry"}`,
    );
  }
}

/* -------------------------------------------------------------- the fitting */
console.log("\nevery station that gives both a village and a reference\n");

/** How far this reference's digits land from the village, in a given square. */
const distance = (o, square) => {
  const c = squareCorner(o.zone, square);
  if (!c) return Infinity;
  return Math.hypot(
    c[0] + Number(o.digits.slice(0, 2)) * 1000 + 500 - o.grid.easting,
    c[1] + Number(o.digits.slice(2)) * 1000 + 500 - o.grid.northing,
  );
};

const misfits = [];
const abbreviated = [];

for (const o of observations.sort((a, b) => a.date.localeCompare(b.date))) {
  const written = (o.outer ?? "") + o.inner;
  const off = distance(o, written);

  // Which square do the digits actually fit? Somewhere between "the one written"
  // (fine), "another one" (a mistyped letter) and "none" (something else again).
  const outers = ZONES[o.zone].outer ? Object.keys(ZONES[o.zone].outer) : [""];
  let best = null;
  for (const outer of outers) {
    for (const inner of LETTERS) {
      const d = distance(o, outer + inner);
      if (d < (best?.off ?? Infinity)) best = { square: outer + inner, off: d };
    }
  }

  // A reference written with no 500 km letter is not an error; the clerk dropped
  // it once the battery had been on the same sheet for a while.
  const shorthand = !o.outer && ZONES[o.zone].outer;
  const resolved = shorthand && best && best.off <= TOLERANCE;
  if (resolved) abbreviated.push({ ...o, written, best });
  else if (off > TOLERANCE) misfits.push({ ...o, written, off, best });

  const verdict = resolved
    ? `   ·  reads as ${best.square}${o.digits}, ${km(best.off)} km`
    : off <= TOLERANCE
      ? ""
      : best && best.off <= TOLERANCE
        ? `   <-- fits ${best.square}${o.digits} to ${km(best.off)} km`
        : "   <-- fits no square";

  console.log(
    `  ${o.date}  ${(written + o.digits).padEnd(8)} ${o.place.name.padEnd(36)} ` +
      `${(off === Infinity ? "—" : km(off)).padStart(7)} km${verdict}`,
  );
}

if (abbreviated.length) {
  console.log(
    `\n${abbreviated.length} references drop the 500 km letter and are read from ` +
      `the square in force:\n`,
  );
  for (const a of abbreviated) {
    console.log(`  ${a.date}  ${a.written}${a.digits} -> ${a.best.square}${a.digits}  ${a.place.name}`);
  }
}

if (misfits.length) {
  console.log(`\n${misfits.length} references do not fit the square they are written in\n`);
  for (const m of misfits) {
    console.log(`  ${m.date}  ${m.station}`);
    console.log(
      `      ${m.written}${m.digits} lands ${m.off === Infinity ? "nowhere" : `${km(m.off)} km`} ` +
        `from ${m.place.name}` +
        (m.best && m.best.off <= TOLERANCE
          ? `; the digits fit ${m.best.square} to ${km(m.best.off)} km`
          : `; the nearest square the digits fit is ${m.best.square} at ${km(m.best.off)} km, which is no fit at all`),
    );
  }
  console.log(
    "\nThese are readings to check on the film, not corrections to make in the data.",
  );
}
