# clarence-cole-enlistment-record

Documentary site for Sgt Clarence J. Cole (36106875), Battery C, 153rd Field
Artillery Battalion, ETO 1944–45. Six static pages served by a Cloudflare Worker
— vanilla ES modules, no framework, no build step for the HTML. Not part of the
CMDIY ecosystem: no Supabase, no daisyUI, no Font Awesome, no Nuxt.

The site once made no external request at all. It now makes exactly one kind:
CARTO Voyager map tiles, fetched by Leaflet when a map comes into view. Leaflet
itself and both typefaces are vendored under `public/assets/`, so the tiles are
the whole of it. Do not add a second — no CDN, no analytics, no embedded font
service.

This repository is the merge of two independent efforts — the documentary frame
built from the family papers, and a full transcription of the morning-report
microfilm. Read `README.md` first; it documents the data contracts.

## Load-bearing invariants

**`transcriptions/pNNN.md` is the source of truth for everything read off the
film** — orders and morning-report cards alike, one file per frame, `kind` in the
front matter deciding which builder reads it. `public/data/timeline.json` holds
*both* hand-authored events and events generated from those pages. Generated events carry `"generated": true` and are
destroyed and rebuilt by `npm run build:timeline`. Editing one in `timeline.json`
loses the change on the next build. Edit the page file.

**The build must never touch hand-authored events.** `build-timeline.mjs` filters
on the `generated` flag alone. If you change that filter you can silently delete
the discharge, the citation and Special Orders 66 — the parts with no other copy.

**Enrich, don't duplicate.** Where a curated event and the film cover the same
date, the build fills the curated event's missing `verbatim` / `strength` /
frame number and suppresses the generated one. Curated title and summary win.
This is deliberate: the two efforts overlap on about a dozen dates and the point
of the merge was to reconcile them, not to print both.

**Gazetteer matching is whole-word, longest-match-first** (`placeFor()` in
`tools/build-timeline.mjs`). A naive `includes()` made `"Ger"` (Ger, Manche)
match every station string ending `(Germany)`, silently relocating three months
of the war to Normandy. If you add a short place name, check the map afterwards.

**Two early-Normandy dates carry no place name in the station field** — the clerk
wrote only "APO 230 France" and named the position in the record of events. These
resolve through `gazetteer.json` → `overrides`, keyed by date range, each with a
`why`.

**Serial numbers are probable, not authoritative.** Transcribed from microfilm;
several are corrected by the battery itself in later entries. `roster.json`
deliberately keys on serial, so a misread digit yields two records for one man.
That is a faithful artifact — do not merge by name similarity. The `batteryC`
cross-reference marks these `probable` and names both readings rather than
picking a winner.

**Historical accuracy outranks completeness or polish.** This site makes claims
about real people who died. Every dated claim carries its microfilm frame. If a
reading is uncertain it stays uncertain (`pending`, `approximate`, `uncertain`,
`status: "inferred"`). Never fill a gap from a secondary history — single-source
fidelity to the documents is the whole premise.

**Corrections are content.** The battery filed them constantly, sometimes
retracting an entry months later. Preserved verbatim, not silently applied.

## How the site is written

Museum-label English. Short declarative sentences, concrete facts, no figures of
speech. A visitor should be able to read any paragraph once and know what it
says.

Three habits to avoid, all of which had to be removed from the site after they
crept in:

- **Drama.** The cards were once "the spine of this site", the battalion was
  "taken apart and put back together", a town was "broken". Say what happened.
- **Hedging.** "Both may be in the frames still to be read" says less than "the
  frames covering that period have not been read." Marking a reading uncertain is
  not hedging — that is the premise of the site — but say it once, plainly, and
  do not argue for it.
- **Self-commentary.** Do not tell the reader that the work is careful, that a
  scan is credited, or that something is decoded "for the first time". The credit
  line and the citation are visible; a sentence about them adds nothing.

The same applies to code comments. Explain why a thing is done, not how
conscientious it was to do it.

## Six rooms, one stylesheet

`/` is the entrance; `/story/`, `/timeline/`, `/maps/`, `/battalion/` and
`/archive/` are the rooms. Each is a plain `index.html` carrying the nav and the
colophon inline, plus one module named for it — `assets/story.js` and so on.
There is no template step, so a change to the shared chrome is a change to seven
files including `404.html`. That is the price of having no build; do not
introduce one to avoid it.

`assets/style.css` is the whole design system and the only stylesheet. Three of
the modules — `graph.js`, `record.js`, `sheets.js` — emit their own markup and
are restyled entirely through the class names they already write. Do not edit
them to change how something looks.

On the two pages with maps, `leaflet.css` is linked **before** `style.css`. Our
rules for the tooltips, the zoom control and the tile grade are single-class
selectors that tie with Leaflet's own; ours have to come second to win. Swapping
the order silently restores white tooltip boxes and ungraded tiles.

Fonts are self-hosted variable woff2 in `assets/fonts`, latin and latin-ext, one
file per family and style. `font-weight: 300 700` in the `@font-face` is not a
mistake: 400 and 600 are the same file.

The palette is fixed and `color-scheme: light` is declared. This is a printed
page; there is no dark variant and adding one is a design decision, not a fix.

## Verify after data changes

```sh
npm run build:timeline && npm run build:roster && npm run check:data
```

`check:data` fails on structural errors and warns on strength figures that do not
balance. It is the gate before `npm run deploy`.

## Check the page, not just the build

A clean `check:data` says the data is well formed, not that the site renders. Run
it and look:

```sh
npm run dev
```

Then drive it with a browser. Three failures have reached the deployed site and
all three were invisible to the build: a `position: sticky` rule that was never
scoped to its breakpoint, so on a phone the text scrolled over the pinned image;
map labels sized in CSS pixels inside a viewBox measured in degrees, so a 9px
label rendered nine degrees wide; and two source links with no separator between
them. Check narrow widths, check dark mode, and scroll lazy-loaded images into
view before believing they loaded.

## Deploying, and checking it landed

`npm run deploy` publishes to Cloudflare Workers. The account comes from
`wrangler login` or from `CLOUDFLARE_API_TOKEN` plus `CLOUDFLARE_ACCOUNT_ID`.
Nothing about an account is committed, so each clone deploys to its own.

For about a minute after a deploy, assets return intermittent 404s and stale
copies while the edge fills. That is normal and it settles on its own. Do not
read an early 404 as a broken deploy, and do not redeploy to "fix" it.

Verify by checksum against the live URL rather than by eye, and check the whole
response — a checksum from one request and a `grep` from another can hit
different edge nodes and disagree. Retry a few times before believing a mismatch.

## Map images are derived, not source

`public/images/maps/` is generated. Each sheet in `data/map-series.json` that has
an image records `sourceFile`, the archive scan it came from, and
`npm run maps:fetch` rebuilds the plate and the preview from that. The derived
files are committed so a fresh clone serves the maps with nothing run.

`npm run maps:upload -- --bucket <name>` puts them in R2 for anyone who would
rather not serve them from the repository. It uses whichever account wrangler is
authenticated to. Switching the site over is one field, `imageBase`, which the
build prefixes onto every image URL. Empty means the repository copies, and that
is the default.

**Never publish a URL that has not been fetched.** Every link in
`map-series.json` was checked before it went in. Two answer 403 and 503 from some
networks, and carry a `status` field saying so, which the page prints — a live
lead that will not open from here is worth more than a silent omission. A
constructed URL that looks right is worth nothing.

## Transcription status

221 pages of 284: 210 morning-report pages (399 daily cards, 2 May 1944 –
12 July 1945), 10 order pages, and 1 page that duplicates another frame. Don't
quote a number from memory — run `npm run build:timeline` and
`npm run build:roster`, which count the files.

Two orders are transcribed: Special Orders 66 (frames 248–252, verified) and
Special Orders 226 (frames 265–270, first pass, 24 serials still incomplete).
`.claude/skills/` carries the procedure for both a first pass and the second
reading that clears `verified: false`.

Still to do: frames 12, 158, 207, 209, 211, 213, 215, 217 (missed inside the
morning-report range during a fast pass) and 219–247, 253–264, 271–284, covering
the occupation, the dissolution of the battery, and the sailing home.

Working from the source PDF: render with `pdftoppm -jpeg -r 220`, then crop
`1819x2210+0+200` per page to isolate the two cards. The film drifts horizontally,
so a full-width crop is required — a tighter one clips the left card.

## On Sergeant Cole

He is named in exactly two known cards, both from the occupation period and both
supplied as separate images rather than from the microfilm run: 20 August 1945
(five days' leave in Holland) and 25 August 1945 (returned). He appears nowhere in
frames 1–218.

That is expected, not a gap: morning reports name a soldier only on a *status
change*. Do not add speculative first-person narration, and do not imply the
day-by-day record documents his individual days. The framing — his battery's war,
to the day, as the frame his service sits inside — is deliberate.

He is also not on Special Orders 66, despite 80 points putting him in range of the
men being sent home. He stayed with Battery C and sailed six weeks later. The site
states this explicitly rather than leaving it as an absence.

## One format, one parser

`tools/lib/pages.mjs` defines the page format and both builders parse through it,
so orders and cards cannot drift apart. `build-roster.mjs` skips
`kind: morning-report` pages — a card is not a roster row — and
`build-timeline.mjs` reads only those. Adding a page of either kind needs no
build change.

Frame counts are computed from the files, never asserted in prose or constants.
An earlier hardcoded 218 was wrong by eight frames for weeks.

## The skew problem, and the morning reports

`transcriptions/README.md` warns that sheets sit up to ~1.6 degrees off square,
which over a wide order shifts the serial column by a full row and silently pairs
each man with his neighbour's serial. That warning is real and applies to orders.

For morning-report cards it was checked, not assumed: 370 of 403 cards carry two
or fewer serial-bearing rows and cannot exhibit the failure; 14 carry six or more.
Frame 113, the worst (twenty men promoted 1 January 1945), was re-read against the
image and every pairing is correct — the cards are typed on printed rules that
bound each row. Do not extend that finding into a claim that the cards are
verified. None has been through `verify-transcription`.

## Cross-reference is a bug-finder, not just a feature

Matching the orders against the morning reports on serial number has already
corrected `35013798` from *Kolosxi* to *McKoski* and caught the same man written
*Frehnheiser* and *Frohnheiser* on different cards. When the two sources disagree,
that is a finding to adjudicate against the film — not noise to smooth over.
