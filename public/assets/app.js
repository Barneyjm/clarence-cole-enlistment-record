import { drawMap } from "/assets/map.js";
import { renderRosterGraph, wireGraphSearch } from "/assets/graph.js";

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const formatDate = (iso) => DATE_FMT.format(new Date(`${iso}T00:00:00Z`));

async function main() {
  const res = await fetch("/data/timeline.json");
  if (!res.ok) throw new Error(`timeline.json: ${res.status}`);
  const data = await res.json();

  bindHeader(data);
  renderRecord(data);
  renderTimeline(data);
  renderCampaigns(data);
  renderAttachment(data);
  renderDecorations(data);
  renderGallery(data);
  renderSources(data);
  wireFilters();
  renderMaps(data);
  renderBattalionGraph(data);
}

/**
 * The roster network is a nice-to-have: if it fails, the rest of the page must
 * still stand, so it is fired separately and its errors stay local.
 */
async function renderBattalionGraph(data) {
  const host = document.getElementById("roster-graph");
  if (!host) return;
  try {
    const { svg, count, order } = await renderRosterGraph(host);
    wireGraphSearch(
      document.getElementById("graph-search"),
      svg,
      document.getElementById("graph-status"),
    );

    const note = document.getElementById("graph-note");
    if (note) {
      // Whether Cole is on the transfer list is the first thing to check, and
      // the answer is worth stating explicitly either way.
      const cole = data.subject.serial;
      const onList = svg.querySelector(`.net-man[data-asn="${cole}"]`);
      note.textContent = onList
        ? `Sergeant Cole, ${cole}, is on this list.`
        : `Sergeant Cole is not on this list. His ${cole} appears nowhere in the ` +
          `${count} names, though at 80 points he was within the range of men being sent ` +
          `home. He stayed with Battery C and sailed six weeks later. The order carries no ` +
          `battery column, so it cannot be said from this document alone which batteries ` +
          `these men came from.`;
    }
  } catch (err) {
    console.error(err);
    host.innerHTML = `<p class="map-empty">The roster network could not be loaded.</p>`;
  }
}

function bindHeader({ meta, unit, subject }) {
  set("subtitle", meta.subtitle);
  set("unit", `${unit.battery}, ${unit.designation}`);
  set("serial", subject.serial ?? "—");
  set("updated", meta.updated ? `Last updated ${formatDate(meta.updated)}.` : "");
  const note = document.querySelector('[data-bind="status-note"]');
  if (note && meta.note) note.textContent = meta.note;
}

function set(name, value) {
  const node = document.querySelector(`[data-bind="${name}"]`);
  if (node) node.textContent = value ?? "";
}

/** The discharge form, rendered as the definition list it basically is. */
function renderRecord({ subject }) {
  const host = document.getElementById("record");
  if (!host) return;

  const d = subject.description ?? {};
  const rows = [
    ["Name", subject.name],
    ["Serial number", subject.serial],
    ["Grade", `${subject.rank}, ${subject.branch}`],
    ["Organization", subject.unit],
    ["Military occupation", subject.mos],
    ["Born", `${formatDate(subject.born)}, ${subject.birthplace}`],
    ["Civilian occupation", subject.civilianOccupation],
    ["Home", subject.homeAddress],
    [
      "Entered active service",
      `${formatDate(subject.enteredActiveService.date)}, ${subject.enteredActiveService.place}`,
    ],
    ["Foreign service", subject.lengthOfService?.foreign],
    ["Continental service", subject.lengthOfService?.continental],
    ["Weapons qualification", subject.weaponsQualification],
    ["Wounds received in action", subject.woundsReceived],
    ["Separated", `${formatDate(subject.separated.date)}, ${subject.separated.place}`],
    ["Description", [d.height, d.weight, `${d.eyes} eyes`, `${d.hair} hair`].filter(Boolean).join(" · ")],
  ].filter(([, value]) => value);

  host.replaceChildren(
    ...rows.map(([label, value]) => {
      const wrap = document.createElement("div");
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      wrap.append(dt, dd);
      return wrap;
    }),
  );
}

/**
 * Campaign bars on a shared time axis, with the Bronze Star citation period
 * drawn behind them so the two can be read against each other.
 */
function renderCampaigns({ campaigns, events }) {
  const host = document.getElementById("campaigns-chart");
  if (!host || !campaigns?.length) return;

  const toTime = (iso) => Date.parse(`${iso}T00:00:00Z`);
  const starts = campaigns.map((c) => toTime(c.start));
  const ends = campaigns.map((c) => toTime(c.end));
  const min = Math.min(...starts);
  const max = Math.max(...ends);
  const span = max - min;
  const pct = (t) => ((t - min) / span) * 100;

  // The cited period comes from the citation event pair in the timeline.
  const cited = events.find((e) => e.id === "1944-06-30-combat");
  const citedEnd = events.find((e) => e.id === "1945-03-15-cited-end");

  const frag = document.createDocumentFragment();

  if (cited && citedEnd) {
    const band = document.createElement("div");
    band.className = "campaigns__band";
    band.style.left = `${pct(toTime(cited.date))}%`;
    band.style.width = `${pct(toTime(citedEnd.date)) - pct(toTime(cited.date))}%`;
    band.title = "Period named in the Bronze Star citation";
    frag.append(band);
  }

  for (const campaign of campaigns) {
    const row = document.createElement("div");
    row.className = "campaign";

    const name = document.createElement("span");
    name.className = "campaign__name";
    name.textContent = campaign.name;

    const track = document.createElement("span");
    track.className = "campaign__track";
    const bar = document.createElement("span");
    bar.className = "campaign__bar";
    bar.style.left = `${pct(toTime(campaign.start))}%`;
    bar.style.width = `${Math.max(1.2, pct(toTime(campaign.end)) - pct(toTime(campaign.start)))}%`;
    track.append(bar);

    const dates = document.createElement("span");
    dates.className = "campaign__dates";
    dates.textContent = `${formatDate(campaign.start)} – ${formatDate(campaign.end)}`;

    row.append(name, track, dates);
    frag.append(row);
  }

  host.replaceChildren(frag);
}

/** Chain of command on each date we can source one for. */
function renderAttachment({ unit }) {
  const host = document.getElementById("attachment");
  if (!host || !unit.attachments?.length) return;

  const frag = document.createDocumentFragment();
  for (const a of unit.attachments) {
    const head = document.createElement("p");
    head.className = "chain__head";
    head.textContent = `${a.label} — ${formatDate(a.asOf)}`;

    const list = document.createElement("ol");
    list.className = "chain__list";
    for (const step of [...a.chain, `${unit.battery}, ${unit.designation}`]) {
      const li = document.createElement("li");
      li.textContent = step;
      list.append(li);
    }

    const note = document.createElement("p");
    note.className = "chain__note";
    note.textContent = a.note;

    frag.append(head, list, note);
  }
  host.replaceChildren(frag);
}

function renderDecorations({ decorations }) {
  const host = document.getElementById("decorations");
  if (!host || !decorations?.length) return;
  host.replaceChildren(
    ...decorations.map((dec) => {
      const li = document.createElement("li");
      const name = document.createElement("strong");
      name.textContent = dec.name;
      li.append(name);
      if (dec.note) {
        const note = document.createElement("span");
        note.textContent = dec.note;
        li.append(note);
      }
      return li;
    }),
  );
}

function renderGallery({ documents }) {
  const host = document.getElementById("gallery");
  if (!host || !documents?.length) return;
  host.replaceChildren(
    ...documents.map((doc) => {
      const fig = document.createElement("figure");
      fig.className = "plate";

      const link = document.createElement("a");
      link.href = doc.image;
      link.className = "plate__link";

      const img = document.createElement("img");
      img.src = doc.thumb ?? doc.image;
      img.alt = doc.alt ?? doc.title;
      img.loading = "lazy";
      if (doc.width && doc.height) {
        img.width = doc.width;
        img.height = doc.height;
      }
      link.append(img);

      const cap = document.createElement("figcaption");
      const title = document.createElement("strong");
      title.textContent = doc.title;
      cap.append(title);
      if (doc.caption) {
        const p = document.createElement("span");
        p.textContent = doc.caption;
        cap.append(p);
      }

      fig.append(link, cap);
      return fig;
    }),
  );
}

/** Merge unit events and wider-war context into one date-sorted list. */
function mergedEntries({ events, context, places, sources }) {
  const titleOf = (id) => sources.find((s) => s.id === id)?.title ?? null;
  const unitEntries = events.map((e) => ({
    ...e,
    place: e.place ? places[e.place] : null,
    sourceTitle: e.source ? titleOf(e.source.id) : null,
    corroborationTitle: e.corroboration ? titleOf(e.corroboration.id) : null,
  }));
  const contextEntries = context.map((c) => ({ ...c, kind: "context" }));
  return [...unitEntries, ...contextEntries].sort((a, b) => a.date.localeCompare(b.date));
}

function renderTimeline(data) {
  const list = document.getElementById("timeline-list");
  list.replaceChildren(...mergedEntries(data).map(entryNode));
}

function entryNode(entry) {
  const li = document.createElement("li");
  li.className = "entry";
  li.classList.add(`entry--${entry.kind}`);
  if (entry.pending) li.classList.add("entry--pending");
  li.dataset.kind = entry.kind;

  const date = document.createElement("p");
  date.className = "entry__date";
  date.textContent = entry.dateApproximate
    ? `about ${formatDate(entry.date)}`
    : formatDate(entry.date);
  li.append(date);

  const title = document.createElement("h3");
  title.className = "entry__title";
  title.textContent = entry.title;
  li.append(title);

  if (entry.summary) {
    const body = document.createElement("p");
    body.className = "entry__body";
    body.textContent = entry.summary;
    li.append(body);
  }

  if (entry.dateNote) {
    const note = document.createElement("p");
    note.className = "entry__note";
    note.textContent = entry.dateNote;
    li.append(note);
  }

  if (entry.verbatim) {
    const quote = document.createElement("blockquote");
    quote.className = "entry__verbatim";
    quote.textContent = entry.verbatim;
    li.append(quote);
  }

  const meta = metaNode(entry);
  if (meta) li.append(meta);
  return li;
}

function metaNode(entry) {
  const bits = [];
  if (entry.pending) bits.push(tag("not yet verified", "tag--pending"));
  if (entry.dateNote) bits.push(tag("date inferred", "tag--pending"));
  // Where the battery was, when that differs from where the event happened.
  if (entry.locationText) bits.push(text(entry.locationText));
  if (entry.place) bits.push(text(entry.place.name));
  if (entry.strength) {
    bits.push(
      text(
        `${entry.strength.presentForDuty} present for duty of ${entry.strength.assigned} assigned`,
      ),
    );
  }
  if (entry.source) bits.push(text(citeText(entry.sourceTitle, entry.source)));
  if (entry.corroboration) {
    bits.push(text(`Corroborated by the ${entry.corroborationTitle ?? "record"}`));
  }
  if (!bits.length) return null;

  const wrap = document.createElement("p");
  wrap.className = "entry__meta";
  wrap.append(...bits);
  return wrap;
}

/** Morning reports are cited by microfilm frame; everything else by title alone. */
function citeText(title, source) {
  const name = title ?? "Source";
  return source.page ? `${name}, frame ${source.page}` : name;
}

function tag(label, extra) {
  const span = document.createElement("span");
  span.className = extra ? `tag ${extra}` : "tag";
  span.textContent = label;
  return span;
}

function text(value) {
  const span = document.createElement("span");
  span.textContent = value;
  return span;
}

function renderSources({ sources }) {
  const host = document.getElementById("sources");
  host.replaceChildren(
    ...sources.map((source) => {
      const div = document.createElement("div");
      div.className = "source";
      const h = document.createElement("h4");
      h.textContent = source.title;
      const p = document.createElement("p");
      p.textContent = source.citation;
      div.append(h, p);
      if (source.note) {
        const note = document.createElement("p");
        note.textContent = source.note;
        div.append(note);
      }
      return div;
    }),
  );
}

function wireFilters() {
  const chips = document.querySelectorAll(".chip");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.toggle("is-on", c === chip));
      const want = chip.dataset.filter;
      document.querySelectorAll(".entry").forEach((entry) => {
        const show = want === "all" || entry.dataset.kind === want;
        entry.hidden = !show;
      });
    });
  });
}

function renderMaps(data) {
  const { places } = data;

  const crossing = document.getElementById("map-crossing");
  if (crossing) {
    drawMap(crossing, {
      points: [
        { ...places.nype, label: "New York" },
        { lat: 51.5, lon: -3.0, label: "United Kingdom" },
      ],
      // Indicative great-circle-ish track, not the convoy's actual route.
      routes: [
        [
          [places.nype.lon, places.nype.lat],
          [-60, 43.5],
          [-40, 47],
          [-20, 50],
          [-6, 51.4],
        ],
      ],
    });
  }

  const theater = document.getElementById("map-theater");
  if (theater) {
    // Only where the battery itself was. A man's leave destination is not a
    // unit position and would read as one on a map.
    const POSITION_KINDS = new Set(["movement", "combat"]);
    const plotted = data.events
      .filter((e) => POSITION_KINDS.has(e.kind) && e.place && places[e.place] && !e.pending)
      .map((e) => places[e.place])
      .filter((p) => p.lon > -6 && p.lon < 16 && p.lat > 43 && p.lat < 55);

    drawMap(theater, {
      points: plotted,
      emptyMessage: "No Continental positions transcribed yet.",
    });
  }
}

main().catch((err) => {
  console.error(err);
  const list = document.getElementById("timeline-list");
  if (list) list.textContent = "The timeline data could not be loaded.";
});
