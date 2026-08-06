<script setup lang="ts">
useHead({ title: 'Route — Battery C, 153rd Field Artillery Battalion' });

const { stops, phases, summary } = useRecords();
const active = ref<string | null>(null);

const phaseLabel = (id: string) => phases.find((p) => p.id === id)?.label ?? id;

// Marches the battery itself logged a distance for.
const longMarches = [
  { date: '1944-08-22', miles: 96, text: 'La Pallu to Verneuil-sur-Avre — the pursuit at full stride.' },
  { date: '1944-09-18', miles: 178, text: 'Versailles into Belgium, the longest single move of the war.' },
  { date: '1944-09-20', miles: 120, text: 'Chimay to Henri-Chapelle, closing on the German frontier.' },
  { date: '1944-12-27', miles: 62, text: 'Schmidthof to Tohogne — the night march into the Bulge.' },
];
</script>

<template>
  <div>
    <section class="border-b py-12 sm:py-16" style="border-color: var(--rule)">
      <div class="wrap">
        <p class="stamp mb-4">Station entries, 2 May 1944 &ndash; 12 July 1945</p>
        <h1 class="display text-[clamp(2.25rem,6vw,4rem)] mb-5">The route</h1>
        <p class="max-w-2xl text-lg leading-relaxed" style="color: var(--fg-2)">
          {{ summary.stopCount }} positions across {{ summary.landCountries.length }} countries, and
          {{ summary.recordedRoadMiles.toLocaleString() }} road miles the battery counted for itself.
          Field artillery is measured in the distance between fields.
        </p>
      </div>
    </section>

    <section class="py-10 sm:py-14">
      <div class="wrap">
        <RouteMap :stops="stops" :active="active" @select="active = $event" />
      </div>
    </section>

    <section class="py-8">
      <div class="wrap">
        <h2 class="display text-2xl sm:text-3xl mb-6">Four long marches</h2>
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-px" style="background: var(--rule)">
          <div v-for="m in longMarches" :key="m.date" class="p-5" style="background: var(--bg)">
            <p class="display text-3xl" style="color: var(--accent)">{{ m.miles }}<span class="text-base"> mi</span></p>
            <p class="stamp mt-1 mb-2">{{ fmtShort(m.date) }}</p>
            <p class="text-sm leading-snug" style="color: var(--fg-2)">{{ m.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="py-14">
      <div class="wrap">
        <h2 class="display text-2xl sm:text-3xl mb-2">Every stop, in order</h2>
        <p class="mb-8 text-sm" style="color: var(--fg-3)">
          Hover a row to highlight it on the chart above.
        </p>

        <div class="scroll-x">
          <table class="w-full min-w-[42rem] border-collapse text-sm">
            <thead>
              <tr class="text-left" style="border-bottom: 1px solid var(--rule)">
                <th class="stamp py-2 pr-4 font-normal">#</th>
                <th class="stamp py-2 pr-4 font-normal">Position</th>
                <th class="stamp py-2 pr-4 font-normal">Country</th>
                <th class="stamp py-2 pr-4 font-normal">From</th>
                <th class="stamp py-2 pr-4 font-normal text-right">Days</th>
                <th class="stamp py-2 font-normal">Phase</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(s, i) in stops" :key="s.name + s.from"
                class="align-top transition-colors"
                :style="active === s.name ? 'background: color-mix(in oklab, var(--accent) 10%, transparent)' : ''"
                style="border-bottom: 1px solid var(--rule)"
                @mouseenter="active = s.name" @mouseleave="active = null"
              >
                <td class="mono py-3 pr-4" style="color: var(--fg-3)">{{ String(i + 1).padStart(2, '0') }}</td>
                <td class="py-3 pr-4">
                  <span class="block">{{ s.name }}</span>
                  <span class="mono text-xs" style="color: var(--fg-3)">{{ s.station }}</span>
                </td>
                <td class="py-3 pr-4" style="color: var(--fg-2)">{{ s.country }}</td>
                <td class="mono py-3 pr-4 whitespace-nowrap" style="color: var(--fg-2)">{{ fmtShort(s.from) }}</td>
                <td class="mono py-3 pr-4 text-right" style="color: var(--fg-2)">{{ s.days }}</td>
                <td class="py-3">
                  <NuxtLink :to="`/timeline?phase=${s.phase}`" class="link text-xs">{{ phaseLabel(s.phase) }}</NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
</template>
