/**
 * The battalion as a network.
 *
 * Nodes are men, keyed by Army serial number. The only relationship the source
 * document actually records between two men is that they held the same military
 * occupational specialty — they did the same job — so that is what the edges
 * mean. Each man is joined to a hub for his MOS; men who shared a job end up
 * clustered together.
 *
 * Layout is a small deterministic force simulation run once at load. No
 * external libraries, and a fixed seed so the picture is the same every visit.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

/** Mulberry32 — small seeded PRNG, so the layout never shuffles between loads. */
function rng(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildGraph(people) {
  const byMos = new Map();
  for (const p of people) {
    if (!p.mos) continue;
    if (!byMos.has(p.mos)) byMos.set(p.mos, []);
    byMos.get(p.mos).push(p);
  }

  const nodes = [];
  const links = [];
  const random = rng(153);

  // Hubs first, spread around a circle, largest specialities furthest out so
  // the big clusters have room.
  const mosList = [...byMos.entries()].sort((a, b) => b[1].length - a[1].length);
  mosList.forEach(([mos, members], i) => {
    const angle = (i / mosList.length) * Math.PI * 2;
    const radius = 120 + Math.min(members.length, 12) * 14;
    nodes.push({
      id: `mos:${mos}`,
      kind: "mos",
      label: mos,
      count: members.length,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  });

  const hubIndex = new Map(nodes.map((n, i) => [n.id, i]));

  for (const p of people) {
    if (!p.mos) continue;
    const hub = nodes[hubIndex.get(`mos:${p.mos}`)];
    nodes.push({
      id: p.asn,
      kind: "man",
      person: p,
      x: hub.x + (random() - 0.5) * 60,
      y: hub.y + (random() - 0.5) * 60,
    });
    links.push({ source: nodes.length - 1, target: hubIndex.get(`mos:${p.mos}`) });
  }

  return { nodes, links };
}

/** Plain O(n²) force layout. 180-odd nodes, so this is cheap enough to just run. */
function layout({ nodes, links }, iterations = 420) {
  const n = nodes.length;
  for (const node of nodes) {
    node.vx = 0;
    node.vy = 0;
  }

  for (let step = 0; step < iterations; step++) {
    const alpha = 1 - step / iterations;

    // Repulsion between every pair.
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 0.01) {
          dx = 0.1;
          dy = 0.1;
          d2 = 0.02;
        }
        const strength = (a.kind === "mos" || b.kind === "mos" ? 900 : 260) / d2;
        const d = Math.sqrt(d2);
        const fx = (dx / d) * strength;
        const fy = (dy / d) * strength;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }

    // Springs along links.
    for (const link of links) {
      const a = nodes[link.source];
      const b = nodes[link.target];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 0.01;
      const f = (d - 34) * 0.09;
      const fx = (dx / d) * f;
      const fy = (dy / d) * f;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // Weak pull to the centre keeps the whole thing on one sheet.
    for (const node of nodes) {
      node.vx -= node.x * 0.006;
      node.vy -= node.y * 0.006;
      node.x += node.vx * alpha * 0.55;
      node.y += node.vy * alpha * 0.55;
      node.vx *= 0.82;
      node.vy *= 0.82;
    }
  }
  return nodes;
}

/** Five ASR bands, lightest to darkest. Points decided who went home first. */
function asrBand(asr) {
  if (asr == null || Number.isNaN(asr)) return 0;
  if (asr < 80) return 1;
  if (asr < 90) return 2;
  if (asr < 100) return 3;
  return 4;
}

function el(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

export async function renderRosterGraph(container) {
  const res = await fetch("/data/roster.json");
  if (!res.ok) throw new Error(`roster.json: ${res.status}`);
  const data = await res.json();

  const graph = buildGraph(data.people);
  layout(graph);

  const xs = graph.nodes.map((d) => d.x);
  const ys = graph.nodes.map((d) => d.y);
  const pad = 40;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const width = Math.max(...xs) - minX + pad;
  const height = Math.max(...ys) - minY + pad;

  const svg = el("svg", {
    viewBox: `${minX.toFixed(1)} ${minY.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)}`,
    class: "netgraph",
    role: "img",
    "aria-label": `Network of ${data.people.length} men of the 153rd Field Artillery Battalion, grouped by military occupational specialty.`,
  });

  const linkLayer = el("g", { class: "net-links" });
  for (const link of graph.links) {
    const a = graph.nodes[link.source];
    const b = graph.nodes[link.target];
    linkLayer.appendChild(
      el("line", { x1: a.x.toFixed(1), y1: a.y.toFixed(1), x2: b.x.toFixed(1), y2: b.y.toFixed(1) }),
    );
  }
  svg.appendChild(linkLayer);

  const nodeLayer = el("g", { class: "net-nodes" });
  for (const node of graph.nodes) {
    if (node.kind === "mos") {
      const g = el("g", { class: "net-hub" });
      g.appendChild(el("circle", { cx: node.x.toFixed(1), cy: node.y.toFixed(1), r: 9 }));
      const label = el("text", { x: node.x.toFixed(1), y: (node.y + 3.2).toFixed(1) });
      label.textContent = node.label;
      g.appendChild(label);
      const title = el("title");
      title.textContent = `MOS ${node.label} — ${node.count} ${node.count === 1 ? "man" : "men"}`;
      g.appendChild(title);
      nodeLayer.appendChild(g);
    } else {
      const p = node.person;
      const c = el("circle", {
        class:
          `net-man band-${asrBand(p.asr)}` +
          (p.officer ? " is-officer" : "") +
          (p.unverified ? " is-unverified" : ""),
        cx: node.x.toFixed(1),
        cy: node.y.toFixed(1),
        r: p.officer ? 6 : 4.6,
        tabindex: "0",
        "data-asn": p.asn,
        "data-name": p.name,
        "data-doc": p.document ?? "",
      });
      const title = el("title");
      const points = p.asr != null ? `${p.asr} points` : (p.asrRaw ?? "no rating");
      const doc = p.document ? ` — ${p.document}` : "";
      title.textContent = `${p.grade} ${p.name} — ${p.asn} — MOS ${p.mos} — ${points}${doc}`;
      c.appendChild(title);
      nodeLayer.appendChild(c);
    }
  }
  svg.appendChild(nodeLayer);

  container.replaceChildren(svg);
  return { svg, count: data.people.length, documents: data.documents, pages: data.pages };
}

/** Show only one of the two orders, or both. */
export function wireGraphDocFilter(chips, svg) {
  if (!chips.length || !svg) return;
  const men = [...svg.querySelectorAll(".net-man")];
  for (const chip of chips) {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.toggle("is-on", c === chip));
      const want = chip.dataset.doc;
      for (const m of men) {
        m.classList.toggle("is-out", want !== "all" && m.dataset.doc !== want);
      }
    });
  }
}

/** Filter the plotted men by a serial-number or name fragment. */
export function wireGraphSearch(input, svg, status) {
  if (!input || !svg) return;
  const men = [...svg.querySelectorAll(".net-man")];
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      men.forEach((m) => m.classList.remove("is-dim", "is-hit"));
      status.textContent = "";
      return;
    }
    let hits = 0;
    for (const m of men) {
      const match =
        m.dataset.asn.toLowerCase().includes(q) || m.dataset.name.toLowerCase().includes(q);
      m.classList.toggle("is-hit", match);
      m.classList.toggle("is-dim", !match);
      if (match) hits++;
    }
    status.textContent = `${hits} of ${men.length} match`;
  });
}
