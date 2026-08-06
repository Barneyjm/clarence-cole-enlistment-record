# Sergeant Clarence Cole — a documentary record

A timeline of Sergeant Clarence Cole, Battery C, 153rd Field Artillery Battalion,
in the European Theater of Operations, built from the battalion's morning reports.

Deployed as a Cloudflare Worker serving static assets:
**https://clarence-cole-enlistment-record.james-e09.workers.dev**

## Status

The frame of the service is complete and sourced end to end: induction,
sailing, arrival in England, the Bronze Star citation period, the five campaign
credits, the return, and the discharge. The day-by-day transcription of the
morning reports is still in progress and is loaded into
`public/data/timeline.json` as it lands.

Three primary sources, all agreeing where they overlap:

| Source | What it gives |
| --- | --- |
| Enlisted Record and Report of Separation (WD AGO 53-55) | Serial number, dates, campaigns, decorations, service abroad |
| Bronze Star citation | The cited period, the countries, and what he actually did |
| Battalion morning reports (284 frames) | Day-by-day movement and personnel actions |

The discharge and the morning reports were produced eighteen months apart by
different clerks and give the same sailing date, 3 May 1944.

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
public/                   everything served
  index.html
  404.html
  assets/style.css
  assets/app.js           renders the timeline from JSON
  assets/map.js           SVG maps, no tiles and no external libraries
  data/timeline.json      the record — the only file that needs editing
  data/roster.json        generated from tools/build-roster.mjs — do not edit
  data/geo/theater.json   generated coastline, committed
  assets/graph.js         the roster network: force layout, no libraries
  images/                 scanned documents, web-sized plus thumbnails
tools/build-geo.mjs       rebuilds theater.json from Natural Earth data (CDN, cached)
tools/build-roster.mjs    the Special Orders 66 transcription, and its build
tools/check-data.mjs      validates timeline.json
```

## Adding transcribed events

Everything the site shows comes from `public/data/timeline.json`. Add an entry
to `events`:

```jsonc
{
  "id": "1944-07-14-position",          // unique; date-slug convention
  "date": "1944-07-14",                 // YYYY-MM-DD
  "kind": "movement",                   // movement | personnel | combat | admin | award
  "title": "Displaces to a new firing position",
  "place": "saint-lo",                  // key into "places"
  "summary": "One sentence in plain prose.",
  "verbatim": "Text as written in the Record of Events block.",
  "strength": { "presentForDuty": 115, "absent": 3, "assigned": 118 },
  "source": { "id": "morning-reports", "page": 47 }   // microfilm frame number
}
```

New locations go in `places` with `lat`/`lon` in decimal degrees; add
`"approximate": true` when the coordinate is inferred rather than named. Any
event carrying `"pending": true` renders as an unverified placeholder and is
exempt from the source requirement.

Then:

```sh
npm run check:data
```

It fails on structural errors (bad dates, unknown place keys, duplicate ids,
uncited events) and warns on things worth a second look, such as strength
figures that do not balance.

## The roster network

`public/data/roster.json` is generated — edit the transcription inside
`tools/build-roster.mjs` and rerun `npm run build:roster`. The build refuses to
emit if two men share a serial number.

It holds Special Orders 66 (Hq 153rd FA Bn, 24 August 1945): 142 officers and
men transferred to the 70th Infantry Division, with grade, name, serial number,
MOS, ASR points, and physical profile. Serial numbers are the identity key.

The network on the site joins each man to a hub for his MOS, because a shared
specialty is the *only* relationship between two men the document actually
records. Anything stronger — who served in which section, who crewed which gun —
is not in this source and should not be inferred from it. Fields whose reading
is uncertain carry an `uncertain` array naming them.

A caveat that matters: the order has no battery column, so it cannot place any
of these men in Battery C.

## Conventions

- **Cite everything.** Every dated claim carries the microfilm frame it came from.
- **Mark uncertainty.** Doubtful readings stay doubtful; `pending: true` and
  `approximate: true` exist so the site can show gaps honestly.
- **`verbatim` is transcription, `summary` is editorial.** Keep the original
  wording, abbreviations and all, in `verbatim`.

## Maps

`theater.json` is derived from Natural Earth 1:50m country boundaries (public
domain) via `world-atlas`, clipped to the North Atlantic and Western Europe,
simplified, and committed so the site has no runtime dependencies — no tiles,
no map library, no external requests.

You only need to rebuild it when changing the map window or the simplification
tolerance:

```sh
npm run build:geo
```

The first run downloads the source from the jsDelivr CDN and caches it in
`tools/.cache/` (gitignored); later runs are offline. The build is
deterministic — the same source and settings reproduce the committed file
byte for byte.

## Still to do

- Transcribe the remaining morning-report frames
- The Bronze Star general orders number and award date — on neither the
  citation nor the discharge, so most likely announced in the morning reports
- The battalion's parent group or corps artillery assignment, and its weapon
- Continental positions for the theater map, which currently plots England only
- The date and place of the award ceremony photograph
