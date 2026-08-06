import { drawMap } from "/assets/map.js";

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
  renderTimeline(data);
  renderSources(data);
  wireFilters();
  renderMaps(data);
}

function bindHeader({ meta, unit }) {
  set("subtitle", meta.subtitle);
  set("unit", `${unit.battery}, ${unit.designation}`);
  set("updated", meta.updated ? `Last updated ${formatDate(meta.updated)}.` : "");
  const note = document.querySelector('[data-bind="status-note"]');
  if (note && meta.note) note.textContent = meta.note;
}

function set(name, value) {
  const node = document.querySelector(`[data-bind="${name}"]`);
  if (node) node.textContent = value ?? "";
}

/** Merge unit events and wider-war context into one date-sorted list. */
function mergedEntries({ events, context, places, sources }) {
  const unitEntries = events.map((e) => ({
    ...e,
    place: e.place ? places[e.place] : null,
    sourceTitle: e.source ? sources.find((s) => s.id === e.source.id)?.title : null,
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
  date.textContent = formatDate(entry.date);
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
  if (entry.place) bits.push(text(entry.place.name));
  if (entry.strength) {
    bits.push(
      text(
        `${entry.strength.presentForDuty} present for duty of ${entry.strength.assigned} assigned`,
      ),
    );
  }
  if (entry.source) bits.push(text(`${entry.sourceTitle ?? "Source"}, frame ${entry.source.page}`));
  if (!bits.length) return null;

  const wrap = document.createElement("p");
  wrap.className = "entry__meta";
  wrap.append(...bits);
  return wrap;
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
    const plotted = data.events
      .filter((e) => e.place && places[e.place] && !e.pending)
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
