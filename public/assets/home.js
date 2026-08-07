/**
 * The entrance hall.
 *
 * The hero facts and the status note come from timeline.json. The counts on the
 * room cards are read from the file each room is built from rather than written
 * into the markup — a number typed into HTML goes stale the next time a frame is
 * transcribed. Each card ships with a wording that is true without a count, so a
 * file that fails to load leaves the card correct rather than blank.
 */

import { bind, formatDate, loadJSON } from "/assets/lib/format.js";

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Small counts read as words in a fact line; larger ones stay as figures. */
const WORDS = ["none", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const spell = (n) => WORDS[n] ?? String(n);

async function main() {
  const data = await loadJSON("/data/timeline.json");

  bind("subtitle", data.meta.subtitle);
  bind("unit", `${data.unit.battery}, ${data.unit.designation}`);
  bind("serial", data.subject.serial ?? "—");
  bind("campaigns", spell(data.campaigns.length));
  bind("updated", data.meta.updated ? `Last updated ${formatDate(data.meta.updated)}.` : "");
  if (data.meta.note) bind("status-note", data.meta.note);

  const entries = data.events.length + data.context.length;
  bind("count-timeline", `${plural(entries, "entry", "entries")} · sourced to the frame`);

  const reports = data.meta.transcription?.dailyReports;
  bind(
    "count-archive",
    [
      reports ? plural(reports, "daily report", "daily reports") : null,
      plural(data.documents.length, "document", "documents"),
    ]
      .filter(Boolean)
      .join(" · "),
  );
}

/**
 * The two counts that live in files this page does not otherwise need. Fetched
 * separately so a failure leaves the card wording alone, and so the room the
 * visitor is about to open is already in the browser cache.
 */
async function roomCounts() {
  const [maps, roster] = await Promise.allSettled([
    loadJSON("/data/map-sheets.json"),
    loadJSON("/data/roster.json"),
  ]);

  if (maps.status === "fulfilled") {
    const { sheets, positions } = maps.value.meta;
    bind("count-maps", `${plural(sheets, "sheet", "sheets")} · ${plural(positions, "position", "positions")}`);
  }
  if (roster.status === "fulfilled") {
    const { people, documents } = roster.value;
    const orders = Object.keys(documents).length;
    bind(
      "count-battalion",
      `${plural(people.length, "name", "names")} · ` +
        `${spell(orders).toLowerCase()} ${orders === 1 ? "order" : "orders"}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  bind("status-note", "The record could not be loaded.");
});

roomCounts().catch((err) => console.error(err));
