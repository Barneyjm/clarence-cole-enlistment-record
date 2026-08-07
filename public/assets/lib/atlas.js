/**
 * The maps.
 *
 * Leaflet is vendored under /assets/vendor and loaded as a deferred classic
 * script before the page module, so `window.L` is there by the time any of this
 * runs. The basemap is CARTO Voyager, split into a labels layer and a no-labels
 * layer so the type can be held back under the battery's own labels, and graded
 * warm in CSS (`.leaflet-tile`) to sit inside the page.
 *
 * Wheel zoom is off deliberately: these maps sit inside long reading columns and
 * a wheel that captures the page is worse than a map that needs its buttons.
 */

export const TERRACOTTA = "#c67139";
export const CREAM = "#f5ead8";

const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png";
const LABEL_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
  'contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

/**
 * A themed map in `container`. `labels: false` drops the place-name layer, which
 * is right for the Atlantic crossing — there is nothing to name out there.
 */
export function createMap(container, { labels = true } = {}) {
  const L = window.L;
  if (!L) throw new Error("Leaflet did not load");

  const map = L.map(container, {
    scrollWheelZoom: false,
    worldCopyJump: true,
  });

  L.tileLayer(TILE_URL, {
    attribution: ATTRIBUTION,
    subdomains: "abcd",
    maxZoom: 12,
  }).addTo(map);

  if (labels) {
    L.tileLayer(LABEL_URL, { subdomains: "abcd", maxZoom: 12, opacity: 0.75 }).addTo(map);
  }

  return map;
}

/**
 * One position, with its name on hover. Permanent labels are added afterwards by
 * pinLabels, which needs the markers on the map before it can tell which names
 * will fit.
 */
export function plot(map, { lat, lon }, { title, radius = 4 } = {}) {
  const L = window.L;
  const marker = L.circleMarker([lat, lon], {
    radius,
    color: CREAM,
    weight: 1.2,
    fillColor: TERRACOTTA,
    fillOpacity: 1,
  }).addTo(map);

  if (title) marker.bindTooltip(title, { className: "pin-label" });
  return marker;
}

const HOVER = { className: "pin-label" };
const PINNED = {
  permanent: true,
  direction: "right",
  className: "pin-label",
  offset: [7, 0],
};

const overlaps = (a, b, pad) =>
  a.left - pad < b.right && b.left - pad < a.right &&
  a.top - pad < b.bottom && b.top - pad < a.bottom;

/**
 * Pin as many names as will fit.
 *
 * A battery moved a few miles at a time, so the positions that earn a label come
 * in clusters — four of the eight longest-held sit inside thirty miles of
 * Aachen. Separation in kilometres is the wrong test, because a label runs
 * sideways from its pin and its width is measured in pixels, not ground.
 * So each candidate is pinned, measured where it actually landed, and dropped
 * back to a hover label if it lies over one already placed.
 *
 * `candidates` are [marker, text] pairs, most deserving first. Call after the
 * map has been framed — this reads laid-out geometry.
 */
export function pinLabels(candidates, { max = Infinity, pad = 3 } = {}) {
  const placed = [];
  for (const [marker, text] of candidates) {
    if (placed.length >= max) break;

    marker.unbindTooltip().bindTooltip(text, PINNED);
    const box = marker.getTooltip()?.getElement()?.getBoundingClientRect();

    if (box && placed.some((b) => overlaps(b, box, pad))) {
      marker.unbindTooltip().bindTooltip(text, HOVER);
    } else if (box) {
      placed.push(box);
    }
  }
  return placed.length;
}

/** The joining line between positions, in the order they were reached. */
export function route(map, latlngs) {
  const L = window.L;
  if (latlngs.length < 2) return null;
  return L.polyline(latlngs, {
    color: TERRACOTTA,
    weight: 2,
    dashArray: "6 5",
  }).addTo(map);
}

/** Frame the map on the points given, or on a fallback box if there are none. */
export function frame(map, latlngs, fallback) {
  const L = window.L;
  if (latlngs.length) map.fitBounds(L.latLngBounds(latlngs).pad(0.15));
  else map.fitBounds(fallback);
}

/** Say so in the frame rather than leaving an empty grey box. */
export function mapFailed(container, message) {
  container.replaceChildren();
  container.append(Object.assign(document.createElement("p"), {
    className: "map-empty",
    textContent: message,
  }));
}
