/**
 * The archive room: the photographed documents, the whole day-by-day record,
 * and the sources.
 *
 * The daily record is record.js, unchanged. It is fired separately from the rest
 * because it loads its own file: a failure there leaves the documents and the
 * sources standing.
 */

import { el, loadJSON } from "/assets/lib/format.js";
import { renderDailyRecord } from "/assets/record.js";

async function main() {
  const data = await loadJSON("/data/timeline.json");
  renderGallery(data);
  renderSources(data);
}

function renderGallery({ documents }) {
  const host = document.getElementById("gallery");
  if (!host || !documents?.length) return;

  host.replaceChildren(
    ...documents.map((doc) => {
      const fig = document.createElement("figure");

      const link = el("a", "plate-link");
      link.href = doc.image;

      const img = document.createElement("img");
      img.className = "plate";
      img.src = doc.thumb ?? doc.image;
      img.alt = doc.alt ?? doc.title;
      img.loading = "lazy";
      img.decoding = "async";
      if (doc.width && doc.height) {
        img.width = doc.width;
        img.height = doc.height;
      }
      link.append(img);

      const cap = document.createElement("figcaption");
      cap.append(el("strong", null, doc.title));
      if (doc.caption) cap.append(el("span", null, doc.caption));

      fig.append(link, cap);
      return fig;
    }),
  );
}

function renderSources({ sources }) {
  const host = document.getElementById("sources");
  if (!host) return;

  host.replaceChildren(
    ...sources.map((source) => {
      const div = el("div", "sources__item");
      div.append(el("h4", null, source.title));
      div.append(el("p", null, source.citation));
      if (source.note) div.append(el("p", null, source.note));
      return div;
    }),
  );
}

async function renderFullRecord() {
  const host = document.getElementById("record-list");
  if (!host) return;
  try {
    await renderDailyRecord(host, {
      search: document.getElementById("record-search"),
      status: document.getElementById("record-status"),
      more: document.getElementById("record-more"),
    });
  } catch (err) {
    console.error(err);
    host.innerHTML = `<li class="map-empty">The daily record could not be loaded.</li>`;
  }
}

main().catch((err) => {
  console.error(err);
  const host = document.getElementById("gallery");
  if (host) host.textContent = "The documents could not be loaded.";
});

renderFullRecord();
