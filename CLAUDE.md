# clarence-cole-enlistment-record

Documentary site for Sgt Clarence J. Cole (36106875), Battery C, 153rd Field
Artillery Battalion, ETO 1944–45. Static assets served by a Cloudflare Worker —
vanilla ES modules, no framework, no runtime dependencies, no external requests.
Not part of the CMDIY ecosystem: no Supabase, no daisyUI, no Font Awesome, no Nuxt.

This repository is the merge of two independent efforts — the documentary frame
built from the family papers, and a full transcription of the morning-report
microfilm. Read `README.md` first; it documents the data contracts.

## Load-bearing invariants

**`data/morning-reports.jsonl` is the source of truth for the morning-report
cards; `transcriptions/*.md` is the source of truth for the orders.** Neither is
the source of truth for everything — see "Two transcription homes" below.
`public/data/timeline.json` holds *both* hand-authored events and events
generated from the JSONL. Generated events carry `"generated": true` and are
destroyed and rebuilt by `npm run build:timeline`. Editing one in `timeline.json`
loses the change on the next build. Edit the JSONL.

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

## Verify after data changes

```sh
npm run build:timeline && npm run build:roster && npm run check:data
```

`check:data` fails on structural errors and warns on strength figures that do not
balance. It is the gate before `npm run deploy`.

## Transcription status

Frames 1–218 of 284 are transcribed: 397 daily reports, 2 May 1944 – 12 July 1945.
Frames 219–284 cover mid-July to 10 October 1945 — occupation, the battery's
dissolution into four other battalions, and the Calas staging area near Marseille.

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

## Two transcription homes (post-PR#2)

Orders live in `transcriptions/` as one markdown file per PDF page. Morning-report
cards live in `data/morning-reports.jsonl` as one object per card. They came from
two independent efforts and are **not** unified yet.

`build-roster.mjs` reads every `p<n>.md` and treats each table row as a person
requiring a serial. Dropping morning-report pages into `transcriptions/` without
first teaching it to skip `kind: morning-report` will break the roster build.
That patch, plus rewriting `build-timeline.mjs` to read markdown, is what
unification costs. Until then nothing goes in both homes.

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
