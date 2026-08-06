# Transcriptions

One file per PDF page of the morning-report film, named for that page:
`p248.md` is page 248. Everything transcribed from the film lives here, and
nothing else does — `public/data/roster.json` is generated from these files and
must never be edited by hand.

```sh
npm run build:roster     # transcriptions/*.md  ->  public/data/roster.json
```

## File format

A front-matter block between `---` lines, then optional prose, then a pipe
table of rows. Both parts are optional; a page with nothing on it worth
recording can be just front matter.

```markdown
---
page: 248
document: SO 66
kind: order
date: 1945-08-24
covers: order page 1 of 3
verified: true
---

Any notes about this page in prose. The verbatim header text of the document
goes here, if the page carries one.

| grade | name | asn | mos | mco | asr | profile | flags |
| --- | --- | --- | --- | --- | --- | --- | --- |
| M Sgt | Blissitte, Urshel A | 6266854 | 502 | 245 | 93 | Q | |
```

### Front-matter keys

| key | meaning |
| --- | --- |
| `page` | PDF page number. Must match the filename. |
| `document` | Short id of the document this page belongs to, e.g. `SO 66`. |
| `kind` | `order`, `morning-report`, or `other`. |
| `date` | Date of the document, `YYYY-MM-DD`. |
| `covers` | Which part of the document is on this page. |
| `verified` | `true` once a human has checked the rows against the image. |
| `duplicate_of` | Set when this page repeats another page. Rows are not repeated. |
| `unit` | Source unit, where the document groups men under unit headings. |
| `complete` | `false` if the page is only partly transcribed. |

### Row conventions

- **`asn` is the identity key.** Two men may share a name; nobody shares a serial.
- Use `?` for a character that cannot be read: `330?????`. Do not guess.
- Put the field name in `flags` when a reading is uncertain — `asn`, `name`,
  `mos`, `asr`. Comma-separate several.
- Leave a cell empty when the column is blank on the page.
- Keep the spelling as typed, including obvious misspellings. The film is the
  record; corrections belong in a note, not in the row.

## Why pages, and why duplicates matter

The film photographs some pages twice. Those frames get their own file with
`duplicate_of` set, so the page numbering stays honest and you can always find
the file for a page you are looking at.

Where two pages *do* both carry the same man, the build compares them and fails
on any disagreement. That cross-check is the main reason to transcribe by page
rather than merging as you go.

## Deskew before you read

The sheets sit up to about 1.6 degrees off square on the film. Over the width
of a page that shifts the serial-number column by a full row against the names,
which silently pairs each man with his neighbour's serial. It looks completely
plausible and it is completely wrong.

`tools/deskew-page.mjs` writes straightened, banded images for a page:

```sh
node tools/deskew-page.mjs 248
```
