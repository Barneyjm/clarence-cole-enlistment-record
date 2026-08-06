# Sergeant Clarence Cole — Battery C, 153rd Field Artillery Battalion

A museum-style site reconstructing the day-by-day war of Battery C, 153rd Field Artillery
Battalion, from the original US Army morning reports: 2 May 1944 (Fort Slocum, New York) to
12 July 1945 (Herzhausen, Hesse).

## What this is built from

One source, and only one: **284 microfilmed pages of War Department A.G.O. Form 1 morning
reports** for Battery C. No secondary history is used to fill gaps. Every quoted line on the
site is transcribed from an original card, and illegible passages are marked as such rather
than guessed.

**Current transcription: pages 1–218 → 397 daily reports.** Pages 219–284 (mid-July to
10 October 1945 — the occupation, the battery's dissolution, and the move to the Calas staging
area near Marseille for the voyage home) are not yet transcribed.

## What the data shows

| | |
|---|---|
| Daily reports | 397 |
| Positions and bivouacs | 43, across 4 countries |
| Road miles logged by the battery | 979 |
| Men named in the record | 193 |
| Killed or wounded (named) | 8 |

## A note on Sergeant Cole

Morning reports name a soldier only when his *status changes* — promotion, hospitalisation,
transfer, wound, death. A man who served steadily without a status change can pass through an
entire war without appearing once. Sergeant Cole does not appear in the 218 pages transcribed
so far, which is an ordinary result for this document type, not a contradiction.

The site therefore does not claim to narrate his days directly. It reconstructs the war his
battery fought, to the day, as the frame his service sits inside. See `/records` on the site
for the full discussion, including where a Bronze Star citation would actually be found
(unit General Orders and NPRC awards records — never morning reports).

## Stack

Nuxt 4 · Vue 3 `<script setup>` · Tailwind CSS 4 (via `@tailwindcss/vite`) · Bun · static
generated. No runtime dependencies, no external tiles or fonts — the route map is drawn as
inline SVG from the transcribed coordinates.

## Layout

```
data/
  morning-reports.jsonl   Primary transcription — one object per report card. Source of truth.
  gazetteer.json          Place-name to coordinate table, phase definitions, station overrides.
scripts/
  build-data.mjs          Derives days / stops / roster / strength / summary into app/data.
app/
  pages/                  index, route, timeline, roster, records
  components/RouteMap.vue Projected SVG route chart
  composables/useRecords.ts
```

`app/data/` is generated and git-ignored — run the pipeline before dev or build.

## Commands

```bash
bun install
```

```bash
bun run dev
```

```bash
bun run generate
```

`dev`, `build` and `generate` all run `scripts/build-data.mjs` first.

## Editing the transcription

`data/morning-reports.jsonl` is the only file to edit when correcting or extending the
transcription. One JSON object per line, with `date`, `station`, `events`, `personnel[]`,
`em_duty`, `em_total` and the source film `page`.

Duplicate scans and multi-page reports are merged by `date` at build time, so the same date
may legitimately appear on more than one line.

To add a newly identified place, add an entry to `gazetteer.json` under `places`. Matching is
on whole words, longest match first — which is why `"Ger"` (the Manche village) does not
swallow every station ending `(Germany)`.
