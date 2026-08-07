/**
 * The maps room: the firing positions, the sheets they were read off, and who
 * holds a copy of each sheet.
 *
 * The sheet cards, the "what is here and what is not" note and the credits are
 * all rendered by sheets.js, which is shared with nothing else but is the single
 * place that knows the shape of map-sheets.json. This module frames them and
 * plots the positions.
 */

import { renderMapSheets, trackFrom } from "/assets/sheets.js";
import { createMap, frame, mapFailed, pinLabels, plot, route } from "/assets/lib/atlas.js";

/** A position held a fortnight or more earns a permanent label. */
const LABEL_DAYS = 14;

async function main() {
  const host = document.getElementById("sheet-list");
  const { meta, sheets } = await renderMapSheets(host, {
    note: document.getElementById("sheet-note"),
    credits: document.getElementById("sheet-credits"),
  });

  const intro = document.getElementById("sheets-intro");
  if (intro) {
    intro.textContent =
      `${meta.sheets} sheets named across ${meta.citations} citations. ${meta.grid}`;
  }

  const caption = document.getElementById("positions-caption");
  if (caption) {
    caption.textContent =
      "Firing positions as the battery gave them, decoded from the grid. " +
      `Normandy to Hesse. ${meta.positions} positions from ${meta.citations} citations; ` +
      `${meta.located} located to the kilometre.`;
  }

  renderPositions(trackFrom(sheets));
}

function renderPositions(track) {
  const host = document.getElementById("map-positions");
  if (!host) return;

  if (!track.length) {
    mapFailed(host, "No grid references decoded yet.");
    return;
  }

  try {
    const map = createMap(host);
    const latlngs = track.map((p) => [p.lat, p.lon]);
    route(map, latlngs);

    const markers = new Map();
    for (const p of track) {
      markers.set(p, plot(map, p, { title: `${p.ref} — ${p.station}`, radius: 4.5 }));
    }
    frame(map, latlngs, [
      [47.5, -2],
      [52.5, 10],
    ]);

    // Longest held first, so where two positions are too close to label both,
    // the one the battery sat on longest keeps its name.
    const candidates = track
      .filter((p) => p.days >= LABEL_DAYS)
      .sort((a, b) => b.days - a.days)
      .map((p) => [markers.get(p), p.ref]);
    pinLabels(candidates);
  } catch (err) {
    console.error(err);
    mapFailed(host, "The positions map could not be loaded.");
  }
}

main().catch((err) => {
  console.error(err);
  const host = document.getElementById("sheet-list");
  if (host) host.innerHTML = `<li class="map-empty">The map sheets could not be loaded.</li>`;
});
