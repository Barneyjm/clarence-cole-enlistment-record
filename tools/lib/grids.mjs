/**
 * The two grids the battery reported its position on.
 *
 * Every station line from Normandy onward ends by naming one of them:
 *
 *   St Clair 2 Mi E T5670 Lambert Zone I
 *   Schmidthof 1 Mi N wF8935 Nord de Guerre Zone (Germany)
 *
 * Both are Lambert conformal conics on nineteenth-century French ellipsoids, and
 * converting a reference off either one costs three steps. All three matter:
 *
 *   1. Inverse Lambert, to metres east and north of the grid origin.
 *   2. Geodetic coordinates on the old ellipsoid, whose centre is nowhere near
 *      the centre of the earth as WGS 84 reckons it.
 *   3. A geocentric translation onto WGS 84. Skipping it puts a Nord de Guerre
 *      position about a kilometre and a half from where the report says it was —
 *      small enough to look right on a map of Europe, wrong enough to matter on
 *      a map of a village.
 *
 * The projection parameters are the published definitions of the two zones. The
 * lettering is not: it is recovered from the reports themselves, and how that
 * works is set out under the lettering below.
 */

const WGS84_A = 6378137;
const WGS84_F = 1 / 298.257223563;
const WGS84_E2 = 2 * WGS84_F - WGS84_F * WGS84_F;

const dms = (d, m, s) => d + m / 60 + s / 3600;
const rad = (deg) => (deg * Math.PI) / 180;

/**
 * A zone is its projection, its datum shift, and the anchoring of its letters.
 *
 * `outer` and `inner` give the south-west corner, in grid metres, of the block
 * of twenty-five lettered squares. Nord de Guerre letters in two levels — a
 * lower-case letter for a 500 km square, an upper-case one for a 100 km square
 * inside it — so each lower-case letter anchors its own block. Lambert Zone I,
 * as these reports use it, letters in one level: a single letter for a 100 km
 * square, and one block covers the lot.
 */
const ZONES = {
  "nord-de-guerre": {
    label: "Nord de Guerre",
    // French Army truncated cubic conic on the Plessis Reconstituted ellipsoid,
    // origin 49° 30′ N, 7° 44′ 13.95″ E.
    a: 6376523,
    rf: 308.64,
    lat0: rad(49.5),
    lon0: rad(dms(7, 44, 13.95)),
    k0: 0.999509082,
    falseEasting: 500000,
    falseNorthing: 300000,
    toWgs84: [1383.8, 38.7, 392],
    outer: { v: [-100000, 100000], w: [400000, 100000] },
  },
  "lambert-1": {
    label: "Lambert Zone I",
    // Clarke 1880 IGN, origin 49° 30′ N on the Paris meridian.
    a: 6378249.2,
    rf: 1 / (1 - 6356515 / 6378249.2),
    lat0: rad(49.5),
    lon0: rad(dms(2, 20, 14.025)),
    k0: 0.99987734,
    falseEasting: 600000,
    falseNorthing: 200000,
    toWgs84: [-168, -60, 320],
    inner: [0, 0],
  },
};

/* -------------------------------------------------------------- projections */
const prepared = new Map();

function zone(name) {
  if (prepared.has(name)) return prepared.get(name);
  const z = ZONES[name];
  if (!z) throw new Error(`unknown grid zone: ${name}`);

  const f = 1 / z.rf;
  const e2 = 2 * f - f * f;
  const ecc = Math.sqrt(e2);
  const t = (lat) =>
    Math.tan(Math.PI / 4 - lat / 2) /
    ((1 - ecc * Math.sin(lat)) / (1 + ecc * Math.sin(lat))) ** (ecc / 2);

  const n = Math.sin(z.lat0);
  const m0 = Math.cos(z.lat0) / Math.sqrt(1 - e2 * Math.sin(z.lat0) ** 2);
  const t0 = t(z.lat0);
  const cone = m0 / (n * t0 ** n);
  const r0 = z.a * z.k0 * cone * t0 ** n;

  const ready = { ...z, e2, ecc, t, n, cone, r0 };
  prepared.set(name, ready);
  return ready;
}

/** Grid easting/northing in metres -> latitude/longitude on WGS 84. */
export function gridToWgs84(name, easting, northing) {
  const z = zone(name);
  const x = easting - z.falseEasting;
  const y = z.r0 - (northing - z.falseNorthing);
  const r = Math.sign(z.n) * Math.hypot(x, y);
  const theta = Math.atan2(x, y);

  const tt = (r / (z.a * z.k0 * z.cone)) ** (1 / z.n);
  let lat = Math.PI / 2 - 2 * Math.atan(tt);
  for (let i = 0; i < 12; i += 1) {
    const s = Math.sin(lat);
    lat = Math.PI / 2 - 2 * Math.atan(tt * ((1 - z.ecc * s) / (1 + z.ecc * s)) ** (z.ecc / 2));
  }

  const [ex, ey, ez] = toEcef(lat, theta / z.n + z.lon0, z.a, z.e2);
  const [la, lo] = fromEcef(
    ex + z.toWgs84[0],
    ey + z.toWgs84[1],
    ez + z.toWgs84[2],
    WGS84_A,
    WGS84_E2,
  );
  return { lat: (la * 180) / Math.PI, lon: (lo * 180) / Math.PI };
}

/** Latitude/longitude on WGS 84 -> grid easting/northing in metres. */
export function wgs84ToGrid(name, latDeg, lonDeg) {
  const z = zone(name);
  const [ex, ey, ez] = toEcef(rad(latDeg), rad(lonDeg), WGS84_A, WGS84_E2);
  const [lat, lon] = fromEcef(
    ex - z.toWgs84[0],
    ey - z.toWgs84[1],
    ez - z.toWgs84[2],
    z.a,
    z.e2,
  );
  const r = z.a * z.k0 * z.cone * z.t(lat) ** z.n;
  const theta = z.n * (lon - z.lon0);
  return {
    easting: z.falseEasting + r * Math.sin(theta),
    northing: z.falseNorthing + z.r0 - r * Math.cos(theta),
  };
}

/* ------------------------------------------------------------------- datum */
// Three-parameter geocentric translation, both directions. The ellipsoid change
// is the whole point: these datums and WGS 84 disagree by well over a kilometre.

function toEcef(lat, lon, a, e2) {
  const s = Math.sin(lat);
  const n = a / Math.sqrt(1 - e2 * s * s);
  return [
    n * Math.cos(lat) * Math.cos(lon),
    n * Math.cos(lat) * Math.sin(lon),
    n * (1 - e2) * s,
  ];
}

function fromEcef(x, y, z, a, e2) {
  const lon = Math.atan2(y, x);
  const p = Math.hypot(x, y);
  let lat = Math.atan2(z, p * (1 - e2));
  for (let i = 0; i < 12; i += 1) {
    const s = Math.sin(lat);
    const n = a / Math.sqrt(1 - e2 * s * s);
    lat = Math.atan2(z + e2 * n * s, p);
  }
  return [lat, lon];
}

/* ------------------------------------------------------------ the lettering */
/**
 * Both grids letter their squares A–Z with I omitted — a typed I and the digit 1
 * are the same mark on a morning report — five to a row, running west to east
 * and starting at the north-west corner of the block.
 *
 * Where each block of twenty-five sits is not read off a diagram in a manual.
 * tools/derive-grid-squares.mjs recovers it from the reports, because a station
 * line that names both a village and a grid square fixes that square's corner,
 * and every village the film puts in one square has to agree with the rest.
 * Villages between Tohogne and Aachen anchor the Nord de Guerre squares, and
 * villages between Saint-Clair-sur-l'Elle and Domfront anchor Lambert Zone I.
 *
 * The corners come out on exact 100 km multiples, which is the check. Nothing
 * in the arithmetic forced them to.
 */
const LETTERS = "ABCDEFGHJKLMNOPQRSTUVWXYZ";

/** South-west corner of a lettered square, in grid metres, or null. */
export function squareCorner(name, letters) {
  const z = ZONES[name];
  if (!z || !letters) return null;
  const inner = LETTERS.indexOf(letters[letters.length - 1]);
  if (inner < 0) return null;

  const base = z.outer ? z.outer[letters[0]] : z.inner;
  if (!base || Boolean(z.outer) !== (letters.length === 2)) return null;

  return [
    base[0] + (inner % 5) * 100000,
    base[1] + (4 - Math.floor(inner / 5)) * 100000, // rows count southward
  ];
}

const REF = /^([a-z]?)\s?([A-Z])\s?(\d{4}|\d{6}|\d{8})$/;

/** Which zone a station line says it is on, or null if it does not say. */
export function zoneOf(station) {
  if (/lambert\s*zone\s*(i|1)\b/i.test(station ?? "")) return "lambert-1";
  if (/nord\s*de\s*guerre/i.test(station ?? "")) return "nord-de-guerre";
  return null;
}

/**
 * Parse a reference as written on a card — "wF8935", "T5670", "vK 9846" — and
 * return the ground it names, or null if it cannot be read.
 *
 * A reference carries no more precision than its digit count: four digits name a
 * one-kilometre square, six a hundred-metre one. The point returned is the
 * centre of that square and `precision` is its side, so nothing downstream can
 * mistake a kilometre square for a surveyed point.
 *
 * `outer` supplies the 500 km square for a Nord de Guerre reference written with
 * only one letter, which is how the clerk wrote them once the battery had been
 * on the same sheet for a while.
 */
export function parseGridRef(text, { zone: name = "nord-de-guerre", outer } = {}) {
  const m = String(text ?? "").trim().match(REF);
  if (!m) return null;

  const twoLevel = Boolean(ZONES[name]?.outer);
  const letters = twoLevel ? (m[1] || outer || "") + m[2] : m[2];
  const corner = squareCorner(name, letters);
  if (!corner) return null;

  const digits = m[3];
  const half = digits.length / 2;
  const step = 10 ** (5 - half); // 4 digits -> 1000 m, 6 -> 100 m
  const easting = corner[0] + Number(digits.slice(0, half)) * step + step / 2;
  const northing = corner[1] + Number(digits.slice(half)) * step + step / 2;

  return {
    zone: name,
    square: letters,
    squareInferred: twoLevel && !m[1],
    digits,
    easting,
    northing,
    precision: step,
    ...gridToWgs84(name, easting, northing),
  };
}

export { ZONES };
