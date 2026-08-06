# Sergeant Clarence Cole — a documentary record

A timeline of Sergeant Clarence Cole, Battery C, 153rd Field Artillery Battalion,
in the European Theater of Operations, built from his discharge papers, his
Bronze Star citation, and the battalion's morning reports.

Deployed as a Cloudflare Worker serving static assets:
**https://clarence-cole-enlistment-record.james-e09.workers.dev**

## Status

The frame of the service is complete and sourced end to end: induction, sailing,
arrival in England, the Bronze Star citation period, the five campaign credits,
the return, and the discharge.

The day-by-day transcription of the morning reports covers **frames 1–218 of 284
— 397 daily reports, 2 May 1944 to 12 July 1945**. Frames 219–284 (mid-July to
10 October 1945: the occupation, the dissolution of the battery, and the Calas
staging area near Marseille) are still to do.

Four primary sources, all agreeing where they overlap:

| Source | What it gives |
| --- | --- |
| Enlisted Record and Report of Separation (WD AGO 53-55) | Serial number, dates, campaigns, decorations, service abroad |
| Bronze Star citation | The cited period, the countries, and what he actually did |
| Battalion morning reports (284 frames) | Day-by-day movement, positions, and personnel actions |
| Special Orders 66 (frames 248–252) | 142 officers and men transferred to the 70th Infantry Division |

Where they meet, they agree. The agreements are recorded as data in
`timeline.json` → `crossReferences`, not just asserted in prose:

- The discharge and the morning report of 3 May 1944 give the same sailing date,
  eighteen months and two clerks apart.
- The Bronze Star cited period, 30 June 1944 – 15 March 1945, opens on the day
  the battery landed over Omaha Beach (frame 17) and closes on the day it moved
  into the Remagen bridgehead across the Rhine (frame 151). The citation brackets
  the battery's combat record exactly.
- The Ardennes order of battle puts the battalion under XVIII Airborne Corps on
  1 January 1945; the morning report for that day puts Battery C at Werbomont, on
  the northern shoulder of the Bulge.
- Special Orders 66 has no battery column, so it cannot place a man in Battery C
  on its own. Cross-matching its serial numbers against the Battery C morning
  reports resolves 19 of the 142 — 13 on an exact match, 6 where the two
  transcriptions differ by a digit or two.

## Running it

```sh
npm install
npm run dev      # local server at http://localhost:8787
npm run deploy   # publish to Cloudflare
```

`npm run deploy` needs a Cloudflare account — either `wrangler login`, or a
`CLOUDFLARE_API_TOKEN` with the *Edit Cloudflare Workers* permission plus
`CLOUDFLARE_ACCOUNT_ID` in the environment.

## Layout

```
wrangler.jsonc            assets-only Worker config
data/                     the transcription — sources, not served
  morning-reports.jsonl   every transcribed card. THE source of truth.
  gazetteer.json          place name to coordinate, phase bands, station overrides
public/                   everything served
  index.html
  404.html
  assets/style.css
  assets/app.js           renders the timeline from JSON
  assets/map.js           SVG maps, no tiles and no external libraries
  assets/graph.js         the roster network: force layout, no libraries
  assets/record.js        the full day-by-day record, loaded on demand
  data/timeline.json      curated events + events built from the film
  data/morning-reports.json  generated — the complete daily record
  data/roster.json        generated from tools/build-roster.mjs — do not edit
  data/geo/theater.json   generated coastline, committed
  images/                 scanned documents, web-sized plus thumbnails
tools/build-geo.mjs       rebuilds theater.json from Natural Earth data (CDN, cached)
tools/build-roster.mjs    Special Orders 66, and the Battery C cross-reference
tools/build-timeline.mjs  folds morning-reports.jsonl into timeline.json
tools/check-data.mjs      validates timeline.json
```

## The two kinds of event, and which file to edit

`timeline.json` holds both, and the distinction matters:

- **Hand-authored events** — the birth, the induction, the citation, Special
  Orders 66, the discharge. Edit these directly in `public/data/timeline.json`.
  They have no `generated` flag and the build never touches them.
- **Generated events** — everything read off the microfilm. These carry
  `"generated": true`. **Do not edit them in `timeline.json`; they are rebuilt
  and your change will be lost.** Edit `data/morning-reports.jsonl` instead and
  rerun the build.

```sh
npm run build:timeline
npm run check:data
```

`build:timeline` removes every event flagged `generated`, rebuilds them from the
JSONL, and leaves hand-authored events alone. Where a hand-authored event already
covers a date, the transcription *enriches* it — filling in a missing `verbatim`,
`strength` or frame number — rather than adding a second event for the same day.
The curated title and summary always win.

Only the days that changed something reach the main timeline. The rest are still
transcribed and still shipped, in `public/data/morning-reports.json`, and render
in the *daily record* section.

### The transcription format

One JSON object per line in `data/morning-reports.jsonl`:

```jsonc
{
  "page": 104,                    // microfilm frame
  "card": "R",                    // L or R — two cards per frame
  "date": "1944-12-16",
  "station": "Hurtgen 1/2 Mi W wF0335 Nord de Guerre Zone (Germany)",
  "org": "Btry C 153rd FA Bn",
  "personnel": [{ "serial": "31611323", "name": "Thompson, John A.", "grade": "Pvt", "action": "Assigned & joined fr Hq 3d Replacement Depot…" }],
  "events": "In position firing. (Map Lendersdorf 1:25,000 Sheet 5204.)",
  "em_duty": 96,
  "em_total": 107
}
```

Duplicate scans and multi-page reports are merged by `date` at build time, so the
same date may legitimately appear on more than one line.

New places go in `data/gazetteer.json` under `places`. Matching is on whole words,
longest match first — which is why `"Ger"` (the Manche village) does not swallow
every station string ending `(Germany)`. That bug relocated three months of the
war to Normandy before it was caught; the ordering is load-bearing.

## The roster network

`public/data/roster.json` is generated — edit the transcription inside
`tools/build-roster.mjs` and rerun `npm run build:roster`. The build refuses to
emit if two men share a serial number.

It holds Special Orders 66 (Hq 153rd FA Bn, 24 August 1945): 142 officers and men
transferred to the 70th Infantry Division, with grade, name, serial number, MOS,
ASR points, and physical profile. Serial numbers are the identity key.

The network joins each man to a hub for his MOS, because a shared specialty is the
*only* relationship between two men the document actually records. Anything
stronger — who served in which section, who crewed which gun — is not in this
source and should not be inferred from it.

The order has no battery column and cannot place a man in Battery C. The build
therefore cross-references it against the morning reports and writes a `batteryC`
field: `confirmed` on an exact serial match, `probable` where the surname matches
and the serials differ by one or two digits (naming both readings, since which one
misreads a digit is not established).

## Conventions

- **Cite everything.** Every dated claim carries the microfilm frame it came from.
- **Mark uncertainty.** Doubtful readings stay doubtful; `pending: true`,
  `approximate: true`, `uncertain: [...]` and `status: "inferred"` exist so the
  site can show gaps honestly.
- **`verbatim` is transcription, `summary` is editorial.** Keep the original
  wording, abbreviations and all, in `verbatim`.
- **Corrections are content.** The battery filed them constantly, sometimes
  retracting an entry months later. They are preserved as written rather than
  silently applied, because they show the conditions the record was kept under.

## Maps

`theater.json` is derived from Natural Earth 1:50m country boundaries (public
domain) via `world-atlas`, clipped to the North Atlantic and Western Europe,
simplified, and committed so the site has no runtime dependencies — no tiles, no
map library, no external requests.

Rebuild only when changing the map window or the simplification tolerance:

```sh
npm run build:geo
```

The first run downloads the source from the jsDelivr CDN and caches it in
`tools/.cache/` (gitignored); later runs are offline and deterministic.

## Still to do

- Transcribe frames 219–284
- The Bronze Star general orders number and award date. **Confirmed absent from
  frames 1–218** — no award of any kind is recorded there — which narrows the
  search to 219–284, or to the battalion's general orders at NARA
- The battalion's calibre, stated rather than inferred. `unit.weapon` currently
  reads the evidence (tracked prime movers, a standing Tractor Driver MOS, gun
  tubes changed after ~780 rounds) as tractor-drawn medium or heavy artillery,
  and says plainly that this is an inference
- Attachments on dates other than 1 January and 20 August 1945

## History

Two independent efforts merged into this repository: the documentary frame built
from the family papers, and a full transcription of the morning-report microfilm.
The pre-merge Nuxt implementation of the transcription side is preserved on the
`nuxt-transcription` branch for reference; it is not deployed.
