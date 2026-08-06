# Sergeant Clarence Cole — a documentary record

A timeline of Sergeant Clarence Cole, Battery C, 153rd Field Artillery Battalion,
in the European Theater of Operations, built from the battalion's morning reports.

Deployed as a Cloudflare Worker serving static assets:
**https://clarence-cole-enlistment-record.james-e09.workers.dev**

## Status

**Stub.** The site scaffold, data model, maps, and validation are in place. The
morning-report transcription is in progress and is being loaded into
`public/data/timeline.json` as it lands.

Seeded so far: the embarkation at New York (2–3 May 1944) and the first days of
the Atlantic crossing, read from frames 1–2 of the microfilm.

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
  data/geo/theater.json   generated coastline, committed
tools/build-geo.mjs       rebuilds theater.json from vendored Natural Earth data
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

## Conventions

- **Cite everything.** Every dated claim carries the microfilm frame it came from.
- **Mark uncertainty.** Doubtful readings stay doubtful; `pending: true` and
  `approximate: true` exist so the site can show gaps honestly.
- **`verbatim` is transcription, `summary` is editorial.** Keep the original
  wording, abbreviations and all, in `verbatim`.

## Maps

`theater.json` is derived from Natural Earth 1:50m country boundaries (public
domain) via `world-atlas`, clipped to the North Atlantic and Western Europe,
simplified, and committed so the site has no runtime dependencies. Rebuild with:

```sh
npm run build:geo
```

## Still to do

- Transcribe the remaining morning-report frames
- Cole's serial number, rank history, induction and separation dates
- The Bronze Star general orders number and citation text
- The battalion's parent formation and campaign credits
- Continental positions for the theater map
