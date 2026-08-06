/**
 * The map sheets the battery worked from, and the positions it gave on them.
 *
 * Every morning report closes its record of events by naming the sheet in use,
 * and opens its station line with a grid reference on that sheet. Both are
 * transcribed; /data/map-sheets.json is the two of them joined, with the grid
 * references decoded to latitude and longitude by tools/lib/grids.mjs.
 *
 * Loaded on demand, like the roster network and the daily record, so a failure
 * here leaves the rest of the page standing.
 */

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const formatDate = (iso) => DATE_FMT.format(new Date(`${iso}T00:00:00Z`));

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

const coord = (p) =>
  `${Math.abs(p.lat).toFixed(4)}° ${p.lat < 0 ? "S" : "N"}, ` +
  `${Math.abs(p.lon).toFixed(4)}° ${p.lon < 0 ? "W" : "E"}`;

/** Who made these maps, and where a copy of each sheet can be seen. */
function renderCredits(hostEl, { series, repositories, meta }) {
  if (!hostEl) return;
  const frag = document.createDocumentFragment();

  frag.append(el("h3", null, "The map series"));
  const seriesList = el("ul", "credits__list");
  for (const s of series) {
    const li = document.createElement("li");
    const a = el("a", null, `${s.id} — ${s.title}`);
    a.href = s.index;
    a.rel = "noopener";
    li.append(a);
    li.append(el("span", "credits__by", s.producer));
    if (s.note) li.append(el("span", "credits__note", s.note));
    seriesList.append(li);
  }
  frag.append(seriesList);

  if (repositories?.length) {
    frag.append(el("h3", null, "Where the sheets can be seen"));
    const repoList = el("ul", "credits__list");
    for (const r of repositories) {
      const li = document.createElement("li");
      const a = el("a", null, r.name);
      a.href = r.url;
      a.rel = "noopener";
      li.append(a);
      li.append(el("span", "credits__by", r.terms === "free" ? "free to view" : r.terms));
      li.append(el("span", "credits__note", r.holdings));
      // Saying what did not answer is as useful as saying what did.
      if (r.status && r.status !== "reachable") {
        li.append(el("span", "credits__status", r.status));
      }
      repoList.append(li);
    }
    frag.append(repoList);
  }

  if (meta?.rights) {
    frag.append(el("h3", null, "Rights"));
    frag.append(el("p", "credits__rights", meta.rights));
  }

  hostEl.replaceChildren(frag);
}

export async function renderMapSheets(host, { note, credits } = {}) {
  const res = await fetch("/data/map-sheets.json");
  if (!res.ok) throw new Error(`map-sheets.json: ${res.status}`);
  const data = await res.json();
  const { meta, sheets } = data;

  for (const sheet of sheets) host.append(sheetNode(sheet));

  if (note) {
    const positions = sheets.flatMap((s) => s.positions);
    const drawn = positions.filter((p) => p.lat != null && !p.disputed);
    const disputed = positions.filter((p) => p.disputed);
    const located = sheets.filter((s) => s.sources.length);

    note.append(el("h3", null, "What is here, and what is not"));
    note.append(
      el(
        "p",
        null,
        `${meta.sheets} sheets are named across ${meta.citations} cards, and ` +
          `${positions.length} distinct grid references are given on them. ` +
          `${drawn.length} decode to a position that matches the village written beside ` +
          `them. ${disputed.length} do not. Those are listed but not plotted: either the ` +
          "grid letters or the place name is wrong, and the film has not been read again " +
          "to determine which.",
      ),
    );
    note.append(
      el(
        "p",
        null,
        `A copy of ${located.length} of the ${meta.sheets} sheets has been traced so far. ` +
          "The rest link to their series index, which is where to start looking.",
      ),
    );
  }

  renderCredits(credits, data);

  return { meta, sheets };
}

function sheetNode(sheet) {
  const li = el("li", "sheet");

  const head = el("p", "sheet__name");
  head.append(el("strong", null, sheet.name));
  head.append(" ", el("span", "sheet__number", sheet.sheet));
  li.append(head);

  const series = el("p", "sheet__series");
  series.append(document.createTextNode(`${sheet.series} · ${sheet.scale}`));
  if (sheet.basis !== "named on the card") {
    series.append(
      " ",
      el(
        "span",
        "tag tag--pending",
        sheet.basis === "uncertain" ? "series uncertain" : "series inferred",
      ),
    );
  }
  li.append(series);

  li.append(
    el(
      "p",
      "sheet__when",
      `${formatDate(sheet.first)} – ${formatDate(sheet.last)} · ` +
        `${sheet.days} card${sheet.days === 1 ? "" : "s"}`,
    ),
  );

  if (sheet.note) li.append(el("p", "sheet__note", sheet.note));
  if (sheet.scaleNote) li.append(el("p", "sheet__note", sheet.scaleNote));
  // A designation that the published sheet index contradicts. Worth seeing on
  // the sheet itself, not buried in a data file.
  if (sheet.designationNote) {
    li.append(el("p", "sheet__flag", sheet.designationNote));
  }

  if (sheet.image) {
    const fig = el("figure", "sheet__figure");
    const img = document.createElement("img");
    img.src = sheet.image.file;
    img.alt = `${sheet.series} sheet ${sheet.sheet}, ${sheet.name}, at ${sheet.scale}.`;
    img.loading = "lazy";
    img.decoding = "async";

    // Inline at preview size so six sheets do not cost twenty megabytes; the
    // full plate is one click away for anyone who wants to read the contours.
    if (sheet.image.full) {
      const zoom = document.createElement("a");
      zoom.href = sheet.image.full;
      zoom.className = "sheet__zoom";
      zoom.append(img);
      fig.append(zoom);
    } else {
      fig.append(img);
    }

    const cap = el("figcaption");
    if (sheet.image.full) {
      const full = el("a", "sheet__full", `View full size, ${sheet.image.fullSize}`);
      full.href = sheet.image.full;
      cap.append(full, document.createTextNode(" · "));
    }
    cap.append(document.createTextNode(`${sheet.image.note} `));
    const a = el("a", null, sheet.image.credit);
    a.href = sheet.image.creditUrl;
    a.rel = "noopener";
    cap.append(a);
    cap.append(document.createTextNode("."));
    fig.append(cap);
    li.append(fig);
  }

  if (sheet.positions.length) {
    const list = el("ul", "sheet__positions");
    for (const p of sheet.positions) {
      const item = el("li", p.disputed ? "position position--disputed" : "position");
      item.append(el("code", null, p.ref));
      if (p.lat != null) item.append(" ", el("span", "position__coord", coord(p)));
      if (p.squareInferred) {
        item.append(" ", el("span", "position__gloss", `read as ${p.square}`));
      }
      if (p.disputed) item.append(el("p", "position__why", p.disputed));
      else if (p.check) {
        item.append(
          " ",
          el("span", "position__gloss", `${p.check.km} km from ${p.check.place}`),
        );
      }
      list.append(item);
    }
    li.append(list);
  }

  const links = el("p", "sheet__links");
  sheet.sources.forEach((source, i) => {
    if (i) links.append(document.createTextNode(" · "));
    const a = el("a", "sheet__source", source.label);
    a.href = source.url;
    a.rel = "noopener";
    links.append(a);
  });
  if (!sheet.sources.length) {
    const a = el("a", "sheet__source sheet__source--index", "series index");
    a.href = sheet.seriesIndex;
    a.rel = "noopener";
    links.append(el("span", "sheet__missing", "no copy traced —"), " ", a);
  }
  li.append(links);

  return li;
}

/** The decoded positions, in date order, for plotting. */
export function trackFrom(sheets) {
  const points = sheets
    .flatMap((s) => s.positions)
    .filter((p) => p.lat != null && !p.disputed)
    .sort((a, b) => a.first.localeCompare(b.first));

  // One pin per position. The battery held most of them for days or weeks, and
  // the station line repeats unchanged the whole time.
  const seen = new Set();
  return points.filter((p) => {
    const key = `${p.lat.toFixed(3)},${p.lon.toFixed(3)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
