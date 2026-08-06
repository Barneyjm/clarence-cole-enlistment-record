<script setup lang="ts">
import type { Stop } from '~/composables/useRecords';

const props = defineProps<{ stops: Stop[]; active: string | null }>();
const emit = defineEmits<{ (e: 'select', name: string | null): void }>();

// Equirectangular projection with a cosine correction at the theatre's mean latitude.
// Accurate enough across 15 degrees of longitude to place villages honestly relative
// to one another, which is all this chart claims to do.
const LON_MIN = -3.4, LON_MAX = 9.8, LAT_MIN = 47.9, LAT_MAX = 52.4, K = Math.cos((50 * Math.PI) / 180), S = 100;
const W = (LON_MAX - LON_MIN) * K * S;
const H = (LAT_MAX - LAT_MIN) * S;
const px = (lon: number) => (lon - LON_MIN) * K * S;
const py = (lat: number) => (LAT_MAX - lat) * S;
const path = (pts: number[][]) => pts.map((p, i) => `${i ? 'L' : 'M'}${px(p[0]!).toFixed(1)},${py(p[1]!).toFixed(1)}`).join(' ');

// Simplified coastlines — enough to orient the eye, not a survey.
const coastContinent = [[-4.8,48.4],[-3.5,48.8],[-2.5,48.6],[-1.9,48.7],[-1.6,49.2],[-1.9,49.7],[-1.6,49.65],[-1.2,49.55],[-1.0,49.4],[-0.5,49.35],[0.1,49.45],[0.2,49.75],[0.7,49.9],[1.6,50.15],[1.6,50.9],[2.5,51.1],[3.2,51.35],[4.0,51.45],[4.5,51.8],[4.2,52.0],[4.6,52.5],[5.5,53.0],[6.5,53.4]];
const coastEngland = [[-5.7,50.1],[-4.2,50.35],[-3.5,50.6],[-2.9,50.7],[-2.0,50.6],[-1.4,50.78],[-0.8,50.8],[0.3,50.8],[1.0,51.0],[1.4,51.4],[0.7,51.5],[0.9,51.9],[1.7,52.5],[0.3,53.0],[-0.1,53.4]];
const rivers = [
  { n: 'Seine', p: [[0.15,49.45],[0.9,49.4],[1.5,49.2],[2.2,49.0],[2.4,48.92],[2.9,48.8],[3.3,48.4]] },
  { n: 'Rhine', p: [[8.3,50.0],[7.6,50.35],[7.1,50.6],[7.0,50.9],[6.95,50.94],[6.7,51.3],[6.6,51.7],[6.1,51.85],[5.0,51.85],[4.5,51.85]] },
  { n: 'Meuse', p: [[5.5,49.1],[5.4,49.5],[5.0,50.0],[5.5,50.5],[5.6,50.65],[5.8,51.1],[5.7,51.7],[5.0,51.85]] },
];
const cities = [
  { n: 'London', lon: -0.13, lat: 51.51 }, { n: 'Paris', lon: 2.35, lat: 48.86 },
  { n: 'Brussels', lon: 4.35, lat: 50.85 }, { n: 'Cologne', lon: 6.96, lat: 50.94 },
  { n: 'Frankfurt', lon: 8.68, lat: 50.11 }, { n: 'Cherbourg', lon: -1.62, lat: 49.64 },
];
const labels = [
  { n: 'ENGLAND', lon: -1.8, lat: 51.7 }, { n: 'FRANCE', lon: 1.9, lat: 48.3 },
  { n: 'BELGIUM', lon: 4.4, lat: 50.35 }, { n: 'GERMANY', lon: 8.6, lat: 51.5 },
  { n: 'ENGLISH CHANNEL', lon: -0.9, lat: 50.15 },
];

const land = computed(() => props.stops.filter((s) => s.country !== 'At sea'));
const routeLine = computed(() => path(land.value.map((s) => [s.lon, s.lat])));

const PHASE_HUE: Record<string, string> = {
  england: '#6b7f9e', normandy: '#7a8f4f', pursuit: '#b0873f',
  siegfried: '#9a6b3d', bulge: '#8f5a52', rhineland: '#6f7d5c',
  ruhr: '#8a7c46', occupation: '#7b7364', mobilization: '#7a8496',
};
const hue = (p: string) => PHASE_HUE[p] ?? '#8a6a34';

const PHASE_NAME: Record<string, string> = {
  mobilization: 'Crossing', england: 'England', normandy: 'Normandy', pursuit: 'Pursuit',
  siegfried: 'German border', bulge: 'Ardennes', rhineland: 'Rhineland', ruhr: 'Ruhr',
  occupation: 'Occupation',
};
const legend = computed(() => {
  const seen = new Set(land.value.map((s) => s.phase));
  return [...seen].map((id) => ({ id, name: PHASE_NAME[id] ?? id, hue: hue(id) }));
});

// Radius scales with time spent, so the long static months read as heavier marks.
const r = (d: number) => Math.max(3.4, Math.min(11, 3 + Math.sqrt(d) * 0.95));
</script>

<template>
  <figure class="m-0">
    <div class="scroll-x card" style="background: color-mix(in oklab, var(--bg-2) 60%, transparent)">
      <svg
        :viewBox="`0 0 ${W} ${H}`" role="img" class="block w-full min-w-[44rem] h-auto max-h-[68vh]"
        aria-label="Map of north-west Europe showing the 43 positions occupied by Battery C between May 1944 and July 1945, from Omaha Beach through Normandy, Paris, Belgium and into Germany."
      >
        <defs>
          <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.055" />
            <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.015" />
          </linearGradient>
        </defs>

        <rect :width="W" :height="H" fill="url(#sea)" />

        <!-- graticule -->
        <g stroke="var(--rule)" stroke-width="0.5" opacity="0.5">
          <line v-for="lon in [-4,-2,0,2,4,6,8]" :key="'x'+lon" :x1="px(lon)" y1="0" :x2="px(lon)" :y2="H" stroke-dasharray="2 5" />
          <line v-for="lat in [48,49,50,51,52,53]" :key="'y'+lat" x1="0" :y1="py(lat)" :x2="W" :y2="py(lat)" stroke-dasharray="2 5" />
        </g>

        <!-- coast + rivers -->
        <g fill="none" stroke="var(--fg-3)" stroke-width="1.6" opacity="0.55" stroke-linejoin="round" stroke-linecap="round">
          <path :d="path(coastContinent)" />
          <path :d="path(coastEngland)" />
        </g>
        <g fill="none" stroke="var(--accent)" stroke-width="1.1" opacity="0.4" stroke-linejoin="round">
          <path v-for="rv in rivers" :key="rv.n" :d="path(rv.p)" />
        </g>

        <!-- country + sea labels -->
        <g fill="var(--fg-3)" font-size="13" letter-spacing="3" opacity="0.5" font-family="var(--font-mono)">
          <text v-for="l in labels" :key="l.n" :x="px(l.lon)" :y="py(l.lat)" text-anchor="middle">{{ l.n }}</text>
        </g>

        <!-- reference cities -->
        <g>
          <g v-for="c in cities" :key="c.n">
            <circle :cx="px(c.lon)" :cy="py(c.lat)" r="2.2" fill="var(--fg-3)" opacity="0.65" />
            <text :x="px(c.lon) + 6" :y="py(c.lat) + 3.5" font-size="11" fill="var(--fg-3)" opacity="0.8" font-family="var(--font-sans)">{{ c.n }}</text>
          </g>
        </g>

        <!-- the route -->
        <path :d="routeLine" fill="none" stroke="var(--fg)" stroke-width="1.7" opacity="0.32" stroke-linejoin="round" stroke-linecap="round" />

        <!-- stops -->
        <g>
          <g
            v-for="s in land" :key="s.name + s.from"
            class="cursor-pointer focusable" tabindex="0" role="button"
            :aria-label="`${s.name}, ${s.days} days from ${fmtDate(s.from)}`"
            @mouseenter="emit('select', s.name)" @mouseleave="emit('select', null)"
            @focus="emit('select', s.name)" @blur="emit('select', null)"
          >
            <circle
              :cx="px(s.lon)" :cy="py(s.lat)" :r="r(s.days) + (active === s.name ? 5 : 0)"
              :fill="hue(s.phase)" :fill-opacity="active === s.name ? 0.95 : 0.72"
              stroke="var(--bg)" stroke-width="1.4"
              style="transition: r 140ms ease, fill-opacity 140ms ease"
            />
            <text
              v-if="active === s.name" :x="px(s.lon)" :y="py(s.lat) - r(s.days) - 10"
              text-anchor="middle" font-size="12.5" font-family="var(--font-mono)" fill="var(--fg)"
              stroke="var(--bg)" stroke-width="3.5" paint-order="stroke"
            >{{ s.name }}</text>
          </g>
        </g>
      </svg>
    </div>

    <ul class="mt-4 flex flex-wrap gap-x-5 gap-y-2">
      <li v-for="l in legend" :key="l.id" class="flex items-center gap-2">
        <span class="inline-block w-2.5 h-2.5 rounded-full shrink-0" :style="`background:${l.hue}`" />
        <span class="stamp">{{ l.name }}</span>
      </li>
    </ul>

    <figcaption class="mt-3 text-xs" style="color: var(--fg-3)">
      Every position named in the battery's station entries, projected from the village each report
      records. Circle area is proportional to days spent. The Atlantic crossing (2&ndash;15 May 1944)
      lies off this chart to the west.
    </figcaption>
  </figure>
</template>
