// Turns the raw morning-report transcription into the derived datasets the site renders.
// Source of truth is data/morning-reports.jsonl — one object per report card, as transcribed
// from the microfilm. Nothing here invents facts; it only sorts, joins and counts.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'app/data');
mkdirSync(out, { recursive: true });

const raw = readFileSync(resolve(root, 'data/morning-reports.jsonl'), 'utf8')
  .split('\n')
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l));

const gaz = JSON.parse(readFileSync(resolve(root, 'data/gazetteer.json'), 'utf8'));

// The film contains duplicate scans and multi-page reports for a single date.
// Keep the entry with the most substance; merge personnel lines from the rest.
const byDate = new Map();
for (const r of raw) {
  const prev = byDate.get(r.date);
  if (!prev) {
    byDate.set(r.date, { ...r, personnel: [...(r.personnel ?? [])], pages: [r.page] });
    continue;
  }
  prev.pages.push(r.page);
  for (const p of r.personnel ?? []) {
    const dup = prev.personnel.some((q) => q.name === p.name && q.action === p.action);
    if (!dup) prev.personnel.push(p);
  }
  const merged = [prev.events, r.events].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
  prev.events = merged.join(' ');
  if (r.em_duty != null) prev.em_duty = r.em_duty;
  if (r.em_total != null) prev.em_total = r.em_total;
}

const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));

const phaseFor = (date) => gaz.phases.find((p) => date >= p.from && date <= p.to)?.id ?? 'occupation';

// Match on whole words, most specific name first — otherwise "Ger" (the Manche village)
// swallows every station whose text ends "...(Germany)".
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const matchers = [...gaz.places]
  .sort((a, b) => b.match.trim().length - a.match.trim().length)
  .map((p) => ({ ...p, re: new RegExp(`\\b${esc(p.match.trim())}\\b`, 'i') }));

const asPlace = (p) => (p ? { name: p.name, country: p.country, lat: p.lat, lon: p.lon } : null);

const placeFor = (station, date) => {
  // Through the first fortnight ashore the station field reads only "APO 230 France";
  // the position is named in the record of events instead. The overrides carry it.
  const ov = gaz.overrides.find((o) => date >= o.from && date <= o.to);
  if (ov) return asPlace(gaz.places.find((p) => p.match === ov.place));
  if (!station) return null;
  return asPlace(matchers.find((p) => p.re.test(station)));
};

// A day is "notable" when something other than routine occupation of a position happened.
const NOTABLE = [
  /killed/i, /wounded/i, /LIA/i, /injured in action/i, /enemy artillery/i, /enemy air/i,
  /moved/i, /left .* arrived/i, /debark/i, /boarded/i, /alerted/i, /shipped german/i,
  /german .*guns/i, /adjusted service rating/i, /march ordered/i, /gun tubes/i, /wrecked/i,
];

const enriched = days.map((d) => {
  const place = placeFor(d.station, d.date);
  const events = d.events ?? '';
  return {
    date: d.date,
    station: d.station,
    place,
    events,
    personnel: d.personnel ?? [],
    emDuty: d.em_duty ?? null,
    emTotal: d.em_total ?? null,
    pages: [...new Set(d.pages)].sort((a, b) => a - b),
    phase: phaseFor(d.date),
    notable: NOTABLE.some((re) => re.test(events)) || (d.personnel ?? []).some((p) => /killed|wounded|LIA|injured in action/i.test(p.action ?? '')),
  };
});

// Ordered list of distinct stations — this is the route the battery actually travelled.
const stops = [];
for (const d of enriched) {
  if (!d.place) continue;
  const last = stops[stops.length - 1];
  if (last && last.name === d.place.name) {
    last.to = d.date;
    last.days += 1;
    continue;
  }
  stops.push({
    name: d.place.name,
    country: d.place.country,
    lat: d.place.lat,
    lon: d.place.lon,
    station: d.station,
    from: d.date,
    to: d.date,
    days: 1,
    phase: d.phase,
  });
}

// Every man named anywhere in the reports, with each entry that names him.
const roster = new Map();
for (const d of enriched) {
  for (const p of d.personnel) {
    if (!p.name || /^\d+ (EM|Officers)/i.test(p.name) || /^Above/i.test(p.name)) continue;
    const key = p.serial && p.serial.length > 3 ? p.serial : p.name;
    if (!roster.has(key)) roster.set(key, { name: p.name, serial: p.serial || null, grades: new Set(), entries: [] });
    const rec = roster.get(key);
    if (p.grade) rec.grades.add(p.grade);
    if (p.name.length > rec.name.length) rec.name = p.name;
    rec.entries.push({ date: d.date, grade: p.grade || null, action: p.action, station: d.station });
  }
}

const rosterList = [...roster.values()]
  .map((r) => ({
    name: r.name,
    serial: r.serial,
    grades: [...r.grades],
    entries: r.entries.sort((a, b) => a.date.localeCompare(b.date)),
    count: r.entries.length,
    fate: r.entries.some((e) => /killed/i.test(e.action))
      ? 'killed'
      : r.entries.some((e) => /wounded|LIA|injured in action/i.test(e.action))
        ? 'wounded'
        : null,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const casualties = rosterList.filter((r) => r.fate);

const strength = enriched
  .filter((d) => d.emTotal != null && d.emDuty != null)
  .map((d) => ({ date: d.date, duty: d.emDuty, total: d.emTotal, phase: d.phase }));

const totalMiles = enriched.reduce((sum, d) => {
  const m = [...(d.events ?? '').matchAll(/distance trave?l+ed\s+(\d+)\s*mi/gi)];
  return sum + m.reduce((s, x) => s + Number(x[1]), 0);
}, 0);

const summary = {
  reportCount: enriched.length,
  firstDate: enriched[0].date,
  lastDate: enriched[enriched.length - 1].date,
  stopCount: stops.length,
  countries: [...new Set(stops.map((s) => s.country))],
  landCountries: [...new Set(stops.map((s) => s.country))].filter((c) => c !== 'At sea'),
  namedMen: rosterList.length,
  casualties: casualties.length,
  recordedRoadMiles: totalMiles,
  pagesTranscribed: 218,
  pagesTotal: 284,
  daysInEurope: Math.round(
    (Date.parse(enriched[enriched.length - 1].date) - Date.parse('1944-06-30')) / 86400000,
  ),
};

const write = (file, value) => writeFileSync(resolve(out, file), JSON.stringify(value), 'utf8');

write('days.json', enriched);
write('stops.json', stops);
write('roster.json', rosterList);
write('strength.json', strength);
write('phases.json', gaz.phases);
write('summary.json', summary);

console.log(
  `days ${enriched.length} · stops ${stops.length} · roster ${rosterList.length} · casualties ${casualties.length} · road miles ${totalMiles}`,
);
