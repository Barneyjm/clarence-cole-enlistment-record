# Sergeant Clarence Cole — a documentary record

A timeline of Sergeant Clarence Cole, Battery C, 153rd Field Artillery Battalion,
in the European Theater of Operations, built from his discharge papers, his
Bronze Star citation, and the battalion's own paperwork.

Deployed as a Cloudflare Worker serving static assets:
**https://clarence-cole-enlistment-record.james-e09.workers.dev**

## Status

The frame of the service is complete and sourced end to end: induction, sailing,
arrival in England, the Bronze Star citation period, the five campaign credits,
the return, and the discharge.

Transcribed from the film so far:

| Frames | What | State |
| --- | --- | --- |
| 1–218 | Battery C morning reports — 397 daily cards, 2 May 1944 to 12 July 1945 | first pass, not second-read; 8 frames missed inside the range |
| 248–252 | Special Orders 66 — 142 men out, to the 70th Inf Div | verified |
| 265–270 | Special Orders 226 — 241 men in, from the 29th Inf Div | first pass |

74 frames are still to do: **12, 158, 207, 209, 211, 213, 215, 217** — missed
inside the morning-report range during a fast pass — and **219–247, 253–264,
271–284**, which cover the occupation from mid-July 1945, the dissolution of the
battery, and the sailing home.

Four primary sources, all agreeing where they overlap:

| Source | What it gives |
| --- | --- |
| Enlisted Record and Report of Separation (WD AGO 53-55) | Serial number, dates, campaigns, decorations, service abroad |
| Bronze Star citation | The cited period, the countries, and what he actually did |
| Battery C morning reports | Day-by-day movement, positions, strength, and personnel actions |
| Special Orders 66 and 226 | Who left the battalion in August, and who replaced them in September |

## Where the sources meet

Recorded as data in `timeline.json` → `crossReferences`, not just asserted here:

- The discharge and the morning report of 3 May 1944 give the same sailing date,
  eighteen months and two clerks apart.
- The Bronze Star cited period, 30 June 1944 – 15 March 1945, opens on the day
  the battery landed over Omaha Beach (frame 17) and closes on the day it moved
  into the Remagen bridgehead across the Rhine (frame 151). The citation brackets
  the battery's combat record exactly.
- The Ardennes order of battle puts the battalion under XVIII Airborne Corps on
  1 January 1945; the morning report for that day puts Battery C at Werbomont, on
  the northern shoulder of the Bulge.
- Neither special order carries a battery column, so neither can place a man in
  Battery C on its own. Cross-matching serials against the Battery C morning
  reports resolves **19 of the 383** — 13 confirmed on an exact match, 6 probable
  where the two readings differ by a digit or two. None of the 241 men on SO 226
  match, which is what you would expect: they arrived in September, after the
  transcribed cards end.

The cross-reference has also caught real errors in both directions. The
independent reading of SO 66 corrected `35013798` from *Kolosxi* to **McKoski**
in the morning-report transcription, and exposed an internal inconsistency where
the same man was written *Frehnheiser* on one card and *Frohnheiser* on another.

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
transcriptions/           orders read off the film, one file per PDF page
data/                     the morning-report transcription
  morning-reports.jsonl   397 daily cards, one JSON object per card
  gazetteer.json          place name to coordinate, phase bands, station overrides
public/                   everything served
  assets/app.js           renders the timeline from JSON
  assets/map.js           SVG maps, no tiles and no external libraries
  assets/graph.js         the roster network: force layout, no libraries
  assets/record.js        the full day-by-day record, loaded on demand
  data/timeline.json      curated events + events built from the film
  data/morning-reports.json  generated — the complete daily record
  data/roster.json        generated from transcriptions/ — do not edit
  data/geo/theater.json   generated coastline, committed
  images/                 scanned documents, web-sized plus thumbnails
tools/build-geo.mjs       rebuilds theater.json from Natural Earth data
tools/build-roster.mjs    transcriptions/*.md -> roster.json, + Battery C match
tools/build-timeline.mjs  morning-reports.jsonl -> timeline.json
tools/compare-transcription.mjs  second-reader diff for a page
tools/deskew-page.mjs     straightened, banded images for a page
tools/check-data.mjs      validates timeline.json
```

### Two transcription homes, and why

Orders are wide tabular documents and live in `transcriptions/`, one file per
page. Morning-report cards are a different shape — a record-of-events paragraph,
a strength block, and a handful of personnel lines — and live in
`data/morning-reports.jsonl`, one object per card.

They arrived from two independent efforts and have not been unified. Folding the
morning reports into `transcriptions/` is the right end state and is on the list
below; it needs `build-roster.mjs` to skip pages whose `kind` is not `order`, and
`build-timeline.mjs` to read markdown instead of JSONL. Until then: **orders go
in `transcriptions/`, cards go in the JSONL, and nothing goes in both.**

## Transcriptions

Everything read off the film for the orders lives in `transcriptions/`, **one
file per PDF page**, named for the page. See
[`transcriptions/README.md`](transcriptions/README.md) for the file format and
the row conventions.

```sh
node tools/deskew-page.mjs 248   # straightened, banded images to read from
npm run build:roster             # transcriptions/*.md -> public/data/roster.json

# second-reader pass, to move a page from verified:false to true
node tools/compare-transcription.mjs 266 .work/p266-second-read.md
```

Two skills in `.claude/skills/` carry the procedure, including the reasons behind
the parts that look fussy: **transcribe-film-page** for a first pass and
**verify-transcription** for the second reading.

The build fails on a filename that disagrees with its `page`, a row with no
serial number, or two pages recording the same serial differently — that last one
is the point of splitting by page.

### Does the skew problem affect the morning reports?

Less than it affects the orders, and it has been checked rather than assumed.
The failure mode needs many adjacent rows for a shifted column to pair each man
with his neighbour's serial. Of the 403 transcribed cards, **370 carry two or
fewer serial-bearing rows** and are structurally immune; 14 carry six or more.
The worst of them, frame 113 — twenty men promoted on 1 January 1945 — was
re-read against the image and every name-to-serial pairing is correct. The cards
are typed on printed rules that bound each row, which is what saves them.

That is not a clean bill of health. No morning-report card has been second-read
by the `verify-transcription` procedure, and they should not be treated as
verified until they have been.

## The timeline, and which file to edit

`timeline.json` holds two kinds of event, and the distinction matters:

- **Hand-authored events** — the birth, the induction, the citation, the special
  orders, the discharge. Edit these directly in `public/data/timeline.json`. They
  carry no `generated` flag and the build never touches them.
- **Generated events** — everything read off the morning reports. These carry
  `"generated": true`. **Do not edit them in `timeline.json`; they are rebuilt and
  your change will be lost.** Edit `data/morning-reports.jsonl` and rerun:

```sh
npm run build:timeline
npm run check:data
```

`build:timeline` removes every event flagged `generated`, rebuilds them from the
JSONL, and leaves hand-authored events alone. Where a hand-authored event already
covers a date, the transcription *enriches* it — filling a missing `verbatim`,
`strength` or frame number — rather than adding a second event for the same day.
The curated title and summary always win.

Only days that changed something reach the main timeline. The rest are still
transcribed and still shipped, in `public/data/morning-reports.json`, and render
in the *daily record* section.

### The morning-report format

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

## Conventions

- **Cite everything.** Every dated claim carries the microfilm frame it came from.
- **Mark uncertainty.** `pending: true`, `approximate: true`, `uncertain: [...]`,
  `verified: false` and `status: "inferred"` exist so the site can show gaps
  honestly. Use `?` for a character that cannot be read. Do not guess.
- **`verbatim` is transcription, `summary` is editorial.** Keep the original
  wording and abbreviations in `verbatim`.
- **Corrections are content.** The battery filed them constantly, sometimes
  retracting an entry months later. Preserved as written, not silently applied.
- **`asn` is the identity key.** Two men may share a name; nobody shares a serial.

## Maps

`theater.json` is derived from Natural Earth 1:50m country boundaries (public
domain), clipped, simplified, and committed so the site has no runtime
dependencies — no tiles, no map library, no external requests. Rebuild only when
changing the map window or the simplification tolerance: `npm run build:geo`.

## Still to do

- Transcribe frames 219–247, 253–264 and 271–284
- Second-read the morning-report cards; none has been through
  `verify-transcription` yet
- Fold the morning reports into `transcriptions/` so there is one home for
  everything read off the film
- Adjudicate the six `probable` Battery C matches, where the two readings of a
  serial differ by a digit or two: Andrews, Adams, Tierce, Lee, Lyman, Holland
- The Bronze Star general orders number and award date. **Confirmed absent from
  frames 1–218**, which narrows the search to the untranscribed frames or to the
  battalion's general orders at NARA
- The battalion's calibre, stated rather than inferred. `unit.weapon` reads the
  evidence as tractor-drawn medium or heavy artillery and says plainly that this
  is an inference

## History

Two independent efforts merged into this repository: the documentary frame built
from the family papers, and a full transcription of the morning-report microfilm.
The pre-merge Nuxt implementation of the transcription side is preserved on the
`nuxt-transcription` branch; it is not deployed.
