/**
 * Minimal SVG map. No tiles, no external library — the coastline ships with the
 * site as public/data/geo/theater.json (built by tools/build-geo.mjs).
 *
 * Projection is equirectangular with longitudes squeezed by cos(mid-latitude),
 * which keeps Western Europe close to true shape over the small spans used here.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

let geoPromise = null;

function loadGeo() {
  geoPromise ??= fetch("/data/geo/theater.json").then((r) => {
    if (!r.ok) throw new Error(`theater.json: ${r.status}`);
    return r.json();
  });
  return geoPromise;
}

function el(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

/** Build a lon/lat -> viewBox projector for the given window. */
function projector({ west, east, south, north }) {
  const midLat = ((south + north) / 2) * (Math.PI / 180);
  const squeeze = Math.cos(midLat);
  const width = (east - west) * squeeze;
  const height = north - south;
  return {
    width,
    height,
    project: (lon, lat) => [(lon - west) * squeeze, north - lat],
  };
}

/**
 * Draw a map into `container`.
 *
 * @param {HTMLElement} container element carrying data-west/east/south/north
 * @param {object} opts
 * @param {Array<{lon:number, lat:number, label?:string}>} [opts.points]
 * @param {Array<Array<[number, number]>>} [opts.routes] lon/lat polylines
 * @param {string} [opts.emptyMessage] shown when there is nothing to plot
 */
export async function drawMap(container, { points = [], routes = [], emptyMessage } = {}) {
  const window_ = {
    west: Number(container.dataset.west),
    east: Number(container.dataset.east),
    south: Number(container.dataset.south),
    north: Number(container.dataset.north),
  };

  let geo;
  try {
    geo = await loadGeo();
  } catch (err) {
    container.innerHTML = `<div class="map-empty">The basemap could not be loaded.</div>`;
    console.error(err);
    return;
  }

  const { width, height, project } = projector(window_);
  const svg = el("svg", {
    viewBox: `0 0 ${width.toFixed(2)} ${height.toFixed(2)}`,
    preserveAspectRatio: "xMidYMid meet",
  });

  const land = el("g", { class: "land-group" });
  for (const feature of geo.features) {
    for (const ring of feature.rings) {
      const d = ringPath(ring, project, window_);
      if (d) land.appendChild(el("path", { class: "land", d }));
    }
  }
  svg.appendChild(land);

  for (const route of routes) {
    const d = route
      .map(([lon, lat], i) => `${i ? "L" : "M"}${project(lon, lat).map(fmt).join(" ")}`)
      .join(" ");
    svg.appendChild(el("path", { class: "route", d }));
  }

  // The viewBox is measured in degrees, so anything sized in CSS pixels would be
  // wildly out of scale. Sizes below are all derived from the viewBox instead.
  const radius = Math.max(width, height) / 130;
  const labelSize = Math.max(width, height) / 42;

  for (const point of points) {
    const [x, y] = project(point.lon, point.lat);
    svg.appendChild(el("circle", { class: "pin", cx: fmt(x), cy: fmt(y), r: fmt(radius) }));
    if (point.label) {
      // Flip labels inward near the right edge so they stay on the sheet.
      const flip = x > width * 0.62;
      const text = el("text", {
        class: "pin-label",
        x: fmt(x + (flip ? -radius * 1.8 : radius * 1.8)),
        y: fmt(y + labelSize * 0.35),
        "font-size": fmt(labelSize),
        "stroke-width": fmt(labelSize * 0.3),
        "text-anchor": flip ? "end" : "start",
      });
      text.textContent = point.label;
      svg.appendChild(text);
    }
  }

  // Match the frame to the projected window so the map is not letterboxed.
  container.style.aspectRatio = `${width.toFixed(2)} / ${height.toFixed(2)}`;
  container.replaceChildren(svg);

  if (!points.length && !routes.length && emptyMessage) {
    const note = document.createElement("div");
    note.className = "map-empty";
    note.textContent = emptyMessage;
    container.appendChild(note);
  }
}

const fmt = (n) => Number(n).toFixed(2);

/** Skip rings entirely outside the window; otherwise emit a closed path. */
function ringPath(ring, project, { west, east, south, north }) {
  let visible = false;
  for (const [lon, lat] of ring) {
    if (lon >= west && lon <= east && lat >= south && lat <= north) {
      visible = true;
      break;
    }
  }
  if (!visible) return null;
  return (
    ring
      .map(([lon, lat], i) => `${i ? "L" : "M"}${project(lon, lat).map(fmt).join(" ")}`)
      .join(" ") + "Z"
  );
}
