/**
 * Modelled weather, shared by the timeline and the daily record.
 *
 * The numbers are ERA5 reanalysis, not observation, and no morning-report card
 * records the weather — the word appears nowhere in 284 frames. So every line
 * this module builds is marked as modelled, and every caller is expected to
 * keep that mark. Reading a temperature here as something the battery wrote
 * down would be reading the site wrong.
 *
 * Published in SI; converted here. Imperial leads because the men and the
 * family are American, with Celsius alongside for temperature.
 *
 * The load is optional. A room that cannot fetch the file renders without it.
 */

const PATH = "/data/weather.json";

let pending = null;

/** Loads once per page. Resolves to null if the file is unavailable. */
export function loadWeather() {
  if (!pending) {
    pending = fetch(PATH)
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
  }
  return pending;
}

// A true minus, not a hyphen. Half the winter readings are negative and a
// hyphen sets far too short against the figures beside it.
const signed = (n) => (n == null ? null : String(n).replace("-", "−"));

const f = (c) => (c == null ? null : signed(Math.round((c * 9) / 5 + 32)));
const mph = (kmh) => (kmh == null ? null : Math.round(kmh / 1.609344));
const inches = (mm) => (mm == null ? null : mm / 25.4);
const c = (v) => (v == null ? null : signed(Math.round(v)));

/** 0.05 -> "0.05", 0.5 -> "0.5", 1.25 -> "1.3". Small amounts still read as rain. */
const depth = (inch) => {
  if (inch == null) return null;
  if (inch >= 1) return inch.toFixed(1);
  if (inch >= 0.1) return inch.toFixed(1);
  return inch.toFixed(2);
};

const hoursMinutes = (min) => {
  if (min == null) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
};

/**
 * Looks up a day, and refuses the lookup when the place does not match.
 *
 * A timeline event can sit at a different place from the battery on the same
 * date. Weather is stored for exactly one place per date, so a mismatch has to
 * return nothing rather than the wrong sky.
 */
export function weatherFor(weather, date, { placeKey, placeName } = {}) {
  const day = weather?.days?.[date];
  if (!day) return null;
  if (placeKey && placeKey !== day.place) return null;
  if (placeName && weather.cells?.[day.place]?.name !== placeName) return null;
  return day;
}

/**
 * The day as a list of phrases, most telling first. Callers join what they want:
 * the timeline shows all of it, the daily record shows the first few.
 */
export function describe(day) {
  const parts = [];
  if (!day) return parts;

  if (day.condition) parts.push(day.condition);

  if (day.tempMin != null && day.tempMax != null) {
    parts.push(`${f(day.tempMin)} to ${f(day.tempMax)} °F (${c(day.tempMin)} to ${c(day.tempMax)} °C)`);
  }

  // Wind chill, and only when the wind is actually taking something off the
  // reading. Three degrees is the point at which it stops being rounding.
  if (day.feelsMin != null && day.tempMin != null && day.tempMin - day.feelsMin >= 3) {
    parts.push(`felt as low as ${f(day.feelsMin)} °F`);
  }

  const snow = depth(inches((day.snow ?? 0) * 10));
  if (day.snow > 0 && snow) {
    parts.push(`${snow} in of snow`);
  }

  const rain = depth(inches(day.rain ?? 0));
  if (day.rain > 0 && rain) {
    parts.push(
      day.precipHours
        ? `${rain} in of rain over ${day.precipHours} ${day.precipHours === 1 ? "hour" : "hours"}`
        : `${rain} in of rain`,
    );
  }

  // Only when it would have been felt. Below this the wind is not part of the day.
  if (day.windMax != null && (day.windMax >= 24 || (day.gust ?? 0) >= 40)) {
    const gust = day.gust != null && day.gust - day.windMax >= 8 ? `, gusting ${mph(day.gust)}` : "";
    parts.push(`wind ${day.windFrom ?? ""} ${mph(day.windMax)} mph${gust}`.replace("  ", " "));
  }

  const daylight = hoursMinutes(day.daylightMin);
  if (daylight) parts.push(`${daylight} of daylight`);

  return parts;
}

/** The short form: condition and temperature only. */
export function describeBrief(day) {
  return describe(day).slice(0, 2);
}

/** The sentence explaining what these numbers are, used as hover text. */
export const CAVEAT =
  "ERA5 reanalysis, not an observation. A modern weather model rerun over the " +
  "sparse surviving records of the 1940s, for a grid cell roughly 25 km across. " +
  "The morning reports never record the weather.";

/**
 * Builds the weather line, tag included.
 *
 * The tag is not decoration. It is the only thing on the line telling a reader
 * that this one fact did not come off the film, so it is not optional and it is
 * not separable from the numbers.
 */
export function weatherNode(day, { brief = false, className = "weather" } = {}) {
  const parts = brief ? describeBrief(day) : describe(day);
  if (!parts.length) return null;

  const p = document.createElement("p");
  p.className = className;

  const tag = document.createElement("span");
  tag.className = "tag weather__tag";
  tag.textContent = "modelled";
  tag.title = CAVEAT;
  p.append(tag);

  const text = document.createElement("span");
  text.className = "weather__text";
  // Sentence case, since the condition leads and the parts read as a list.
  text.textContent = parts.join(" · ").replace(/^./, (ch) => ch.toUpperCase());
  p.append(text);

  return p;
}
