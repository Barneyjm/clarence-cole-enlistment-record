/**
 * Validates public/data/timeline.json. Run before deploying, and after every
 * batch of newly transcribed morning reports:
 *
 *   npm run check:data
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = resolve(ROOT, "public/data/timeline.json");

const KINDS = new Set(["movement", "personnel", "combat", "admin", "award", "context"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const errors = [];
const warnings = [];

const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

const data = JSON.parse(readFileSync(DATA, "utf8"));
const placeKeys = new Set(Object.keys(data.places ?? {}));
const sourceIds = new Set((data.sources ?? []).map((s) => s.id));
const seenIds = new Set();

for (const [key, place] of Object.entries(data.places ?? {})) {
  if (typeof place.lat !== "number" || place.lat < -90 || place.lat > 90) {
    fail(`place "${key}": lat must be a number between -90 and 90`);
  }
  if (typeof place.lon !== "number" || place.lon < -180 || place.lon > 180) {
    fail(`place "${key}": lon must be a number between -180 and 180`);
  }
  if (!place.name) fail(`place "${key}": missing name`);
}

for (const event of data.events ?? []) {
  const at = `event "${event.id ?? "(no id)"}"`;

  if (!event.id) fail(`${at}: missing id`);
  else if (seenIds.has(event.id)) fail(`${at}: duplicate id`);
  else seenIds.add(event.id);

  if (!ISO_DATE.test(event.date ?? "")) fail(`${at}: date must be YYYY-MM-DD`);
  else if (Number.isNaN(Date.parse(`${event.date}T00:00:00Z`))) fail(`${at}: invalid date`);

  if (!KINDS.has(event.kind)) fail(`${at}: kind "${event.kind}" is not one of ${[...KINDS].join(", ")}`);
  if (!event.title) fail(`${at}: missing title`);

  if (event.place && !placeKeys.has(event.place)) {
    fail(`${at}: place "${event.place}" is not defined in places`);
  }

  if (event.source) {
    if (!sourceIds.has(event.source.id)) fail(`${at}: source "${event.source.id}" is not defined`);
    if (!Number.isInteger(event.source.page)) fail(`${at}: source.page must be an integer frame number`);
  } else if (!event.pending) {
    warn(`${at}: no source cited`);
  }

  if (event.strength) {
    const { presentForDuty, absent, assigned } = event.strength;
    if ([presentForDuty, absent, assigned].some((n) => !Number.isInteger(n))) {
      fail(`${at}: strength values must be integers`);
    } else if (presentForDuty + absent !== assigned) {
      warn(`${at}: strength does not balance (${presentForDuty} + ${absent} != ${assigned})`);
    }
  }
}

const dates = (data.events ?? []).map((e) => e.date);
if (dates.some((d, i) => i && d < dates[i - 1])) {
  warn("events are not stored in date order (the site sorts them, but keep the file tidy)");
}

for (const w of warnings) console.warn(`warn  ${w}`);
for (const e of errors) console.error(`error ${e}`);

const pending = (data.events ?? []).filter((e) => e.pending).length;
console.log(
  `${data.events?.length ?? 0} events (${pending} pending), ` +
    `${placeKeys.size} places, ${errors.length} errors, ${warnings.length} warnings`,
);

if (errors.length) process.exit(1);
