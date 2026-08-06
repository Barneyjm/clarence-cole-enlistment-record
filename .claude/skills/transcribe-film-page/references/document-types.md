# What is on a page of this film

Two kinds of document dominate `cole.pdf`, and they want different things from
you. Work out which one you are looking at before transcribing.

## Morning report cards

WD AGO Form No. 1. One card per day per battery. A frame usually holds **two
cards side by side** — two consecutive days, or a card and its continuation
sheet.

Anatomy, top to bottom:

| Region | What it holds | Worth transcribing |
| --- | --- | --- |
| Header | `ENDING 2400`, day, month, year | Always — this dates everything |
| Station or location | Place name, often with a map grid reference | Always |
| Organization | `Btry C`, `153rd FA Bn`, arm of service | Confirms the unit |
| Change table | Serial, name, grade, MOS, code, then a free-text action | Always — this is where individual men appear |
| Record of Events | Four or five handwritten lines | Always — the only free prose on the form |
| Strength block | Officers and enlisted, present / absent / assigned | Useful; the numbers track the unit's decline |
| Rations, signature | Boilerplate, plus the commander's name | The signature only, when it changes |

The change table is the payload. Typical entries read like telegraph:
`Fr dy to TD Treebek, Holland`, `Fr dy to hosp LD ship hosp`, `Fr TD to dy`,
`ASR changed fr 95 to 100`. Transcribe them as written into `verbatim` on the
timeline event; expansion belongs in the editorial `summary`.

Cards do not go into `transcriptions/pNNN.md` as roster rows — they feed
`public/data/timeline.json` as events. Use a page file for a card only when it
carries a list of men worth holding as rows.

**Watch the station line.** Occupation-period cards name the map sheet the
battery was working from (`Map: Marburg 1/100,000 Sheet R-3`) alongside a Nord
de Guerre grid reference (`wG8188`). Together those can fix a position that the
place name alone cannot, since German place names repeat.

## Orders

Special Orders filed with the reports, usually because they moved men in or out.
These are typed on plain paper, often classified `RESTRICTED`, and run several
pages.

Anatomy:

- **Header block** — issuing headquarters, APO, date, order number. Read it
  carefully; the issuing HQ is often a formation you did not know the battalion
  was under, and that is a real finding.
- **Paragraph 1** — the actual instruction, naming the receiving unit, the
  effective date (`EDCMR`), and the authority. Transcribe verbatim into the page
  file; it is usually the most historically informative sentence on the page.
- **Column headers** — `GRADE NAME ASN MOS MCO ASR PHY CL` or similar. Note the
  exact columns; they vary between orders.
- **Unit sub-headings** — men grouped under their source unit
  (`111th FA Bn`, `Hq Btry 29th Div Arty`). Record it as `unit` in front matter,
  and split the page file if a page spans two units.
- **Continuation headers** — later pages repeat `(SO #66, Hq 153 FA, 24 Aug 45
  CONTD)`. Useful for confirming you have the pages in the right order.
- **Closing** — `By order of...` with the adjutant's name, or `BY COMMAND OF
  MAJOR GENERAL ...`. Marks the last page.

### Columns you will meet

- **ASN** — Army serial number. The identity key. Eight digits for most wartime
  enlistees, seven for earlier Regular Army, `O`-prefixed for officers.
- **MOS** — military occupational specialty, three digits. Do not invent titles
  for these; the numeric code is the record and the decoding is a separate
  research job.
- **MCO** — a second code printed on some orders. Its meaning has not been
  established in this project. Record it, do not interpret it.
- **ASR** — Adjusted Service Rating, the points score that decided who went home
  first. Enlisted men get a plain number. Officers use a different scale and a
  compound format like `106NO43.5` — keep that verbatim.
- **PHY CL / PROFILE** — physical profile, usually `Q`, sometimes `D`.

ASR is the most narratively loaded column on these pages. A roster where
everyone scores 78 and up is men going home; one where everyone scores in the
60s is men who had to stay. Two such orders three weeks apart is a unit being
turned inside out.

## Telling a duplicate from a new page

The film sometimes photographs a page twice, and consecutive frames can look
alike at a glance. Check the first and last rows against the page you did
before. If they match, it is a duplicate: give it a file with `duplicate_of`
set, note what is on each sheet, and record no rows.

Duplicates are not waste. The build compares any man appearing on two pages and
fails if the rows disagree, so a duplicated page is a free second reading —
particularly valuable when one copy is square on the film and the other is not.
