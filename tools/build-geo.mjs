/**
 * Builds public/data/geo/theater.json — a compact GeoJSON-ish coastline/border
 * file clipped to the North Atlantic + Western Europe box the site maps use.
 *
 * Source: world-atlas countries-50m (Natural Earth, public domain), fetched
 * from the CDN on first run and cached under tools/.cache/ so repeat builds
 * stay offline. The generated theater.json is committed, so the site itself
 * never needs this script or the network.
 *
 *   node tools/build-geo.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
const CACHE = resolve(ROOT, "tools/.cache/countries-50m.json");
const OUT = resolve(ROOT, "public/data/geo/theater.json");

// Wide enough to hold the New York -> Britain crossing and the drive into
// Central Europe on the same sheet.
const BBOX = { west: -76, east: 26, south: 34, north: 62 };
// Coordinates are rounded to this many decimals (~1 km at these latitudes).
const PRECISION = 2;
// Douglas-Peucker tolerance in degrees. The maps render at most ~1200 px across
// ~100 degrees of longitude, so detail below this is invisible anyway.
const TOLERANCE = 0.035;

/** Delta-decode one TopoJSON arc into absolute [lon, lat] pairs. */
function decodeArc(arc, transform) {
  const [sx, sy] = transform.scale;
  const [tx, ty] = transform.translate;
  let x = 0;
  let y = 0;
  return arc.map(([dx, dy]) => {
    x += dx;
    y += dy;
    return [x * sx + tx, y * sy + ty];
  });
}

/** Resolve a TopoJSON arc index (negative means "walk this arc backwards"). */
function arcRing(indexes, arcs) {
  const ring = [];
  for (const idx of indexes) {
    const arc = idx < 0 ? arcs[~idx].slice().reverse() : arcs[idx];
    // Consecutive arcs share an endpoint; drop the duplicate.
    ring.push(...(ring.length ? arc.slice(1) : arc));
  }
  return ring;
}

function ringIntersectsBbox(ring) {
  for (const [lon, lat] of ring) {
    if (lon >= BBOX.west && lon <= BBOX.east && lat >= BBOX.south && lat <= BBOX.north) {
      return true;
    }
  }
  return false;
}

/**
 * Clamp a ring into the bbox rather than true polygon clipping. The map draws
 * filled land under a viewport that is itself the bbox, so edge vertices only
 * need to land on (not outside) the frame.
 */
function clampRing(ring) {
  const out = [];
  for (const [lon, lat] of ring) {
    const x = Math.min(BBOX.east, Math.max(BBOX.west, lon));
    const y = Math.min(BBOX.north, Math.max(BBOX.south, lat));
    const p = [round(x), round(y)];
    const prev = out[out.length - 1];
    if (!prev || prev[0] !== p[0] || prev[1] !== p[1]) out.push(p);
  }
  return out;
}

const round = (n) => Number(n.toFixed(PRECISION));

/** Perpendicular distance from p to the segment ab, in degrees. */
function segmentDistance(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  t = Math.min(1, Math.max(0, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Iterative Douglas-Peucker; recursion would blow the stack on long coastlines. */
function simplify(ring, tolerance) {
  if (ring.length < 4) return ring;
  const keep = new Uint8Array(ring.length);
  keep[0] = 1;
  keep[ring.length - 1] = 1;
  const stack = [[0, ring.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxDist = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = segmentDistance(ring[i], ring[first], ring[last]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (index !== -1 && maxDist > tolerance) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return ring.filter((_, i) => keep[i]);
}

/** Read the cached source, downloading it once if it is not there yet. */
async function loadSource() {
  if (existsSync(CACHE)) return JSON.parse(readFileSync(CACHE, "utf8"));

  console.log(`fetching ${SRC_URL}`);
  const res = await fetch(SRC_URL);
  if (!res.ok) {
    throw new Error(
      `could not fetch the basemap source (HTTP ${res.status}). ` +
        `This script needs network access on first run; theater.json is committed, ` +
        `so you only need it when changing the map window or tolerance.`,
    );
  }
  const text = await res.text();
  const topo = JSON.parse(text);
  mkdirSync(dirname(CACHE), { recursive: true });
  writeFileSync(CACHE, text);
  return topo;
}

async function main() {
  const topo = await loadSource();
  const { transform, arcs: rawArcs } = topo;
  const arcs = rawArcs.map((a) => decodeArc(a, transform));

  const features = [];
  for (const geom of topo.objects.countries.geometries) {
    const polygons =
      geom.type === "Polygon" ? [geom.arcs] : geom.type === "MultiPolygon" ? geom.arcs : [];

    const kept = [];
    for (const poly of polygons) {
      const rings = poly.map((r) => arcRing(r, arcs));
      if (!rings.some(ringIntersectsBbox)) continue;
      // Keep the outer ring only; holes are invisible at this scale.
      const clamped = simplify(clampRing(rings[0]), TOLERANCE);
      if (clamped.length > 3) kept.push(clamped);
    }
    if (kept.length) {
      features.push({ name: geom.properties?.name ?? "", rings: kept });
    }
  }

  const payload = { bbox: BBOX, precision: PRECISION, features };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload));

  const points = features.reduce(
    (n, f) => n + f.rings.reduce((m, r) => m + r.length, 0),
    0,
  );
  console.log(
    `theater.json: ${features.length} countries, ${points} points, ` +
      `${(JSON.stringify(payload).length / 1024).toFixed(1)} kB`,
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
