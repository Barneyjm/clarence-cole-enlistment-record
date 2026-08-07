/** Date and node helpers shared by the six rooms. */

const LONG = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const SHORT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export const formatDate = (iso) => LONG.format(new Date(`${iso}T00:00:00Z`));
export const formatShortDate = (iso) => SHORT.format(new Date(`${iso}T00:00:00Z`));

/** Milliseconds for an ISO date, read as UTC so no timezone shifts a card. */
export const toTime = (iso) => Date.parse(`${iso}T00:00:00Z`);

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/** Fill a [data-bind] slot, if the current page has one. */
export function bind(name, value) {
  const node = document.querySelector(`[data-bind="${name}"]`);
  if (node) node.textContent = value ?? "";
}

export async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}
