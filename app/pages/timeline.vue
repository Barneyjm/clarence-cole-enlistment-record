<script setup lang="ts">
useHead({ title: 'Daily record — Battery C, 153rd Field Artillery Battalion' });

const { days, phases, summary } = useRecords();
const route = useRoute();
const router = useRouter();

const phase = ref<string>((route.query.phase as string) || 'all');
const query = ref('');
const notableOnly = ref(false);
const limit = ref(60);

watch(phase, (v) => {
  router.replace({ query: v === 'all' ? {} : { phase: v } });
  limit.value = 60;
});
watch([query, notableOnly], () => (limit.value = 60));

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  return days.filter((d) => {
    if (phase.value !== 'all' && d.phase !== phase.value) return false;
    if (notableOnly.value && !d.notable) return false;
    if (!q) return true;
    return (
      d.events.toLowerCase().includes(q) ||
      d.station.toLowerCase().includes(q) ||
      d.date.includes(q) ||
      d.personnel.some((p) => `${p.name} ${p.action} ${p.serial}`.toLowerCase().includes(q))
    );
  });
});

const shown = computed(() => filtered.value.slice(0, limit.value));

const isCasualty = (action: string) => /killed|wounded|LIA|injured in action/i.test(action);
const phaseLabel = (id: string) => phases.find((p) => p.id === id)?.label ?? id;
</script>

<template>
  <div>
    <section class="border-b py-12 sm:py-16" style="border-color: var(--rule)">
      <div class="wrap">
        <p class="stamp mb-4">{{ summary.reportCount }} reports &middot; {{ fmtDate(summary.firstDate) }} &ndash; {{ fmtDate(summary.lastDate) }}</p>
        <h1 class="display text-[clamp(2.25rem,6vw,4rem)] mb-5">The daily record</h1>
        <p class="max-w-2xl text-lg leading-relaxed" style="color: var(--fg-2)">
          One card per day, transcribed from the microfilm. Where the battery filed a correction to
          an earlier report &mdash; and it did so often &mdash; the correction is preserved as
          written, because the corrections are part of the record.
        </p>
      </div>
    </section>

    <!-- Controls -->
    <section class="sticky top-16 z-30 border-b backdrop-blur-sm py-3"
      style="border-color: var(--rule); background: color-mix(in oklab, var(--bg) 92%, transparent)">
      <div class="wrap flex flex-wrap items-center gap-3">
        <label class="sr-only" for="q">Search the record</label>
        <input
          id="q" v-model="query" type="search" placeholder="Search names, places, events…"
          class="focusable flex-1 min-w-[12rem] px-3 py-2 text-sm border bg-transparent"
          style="border-color: var(--rule)"
        >
        <label class="sr-only" for="ph">Filter by phase</label>
        <select id="ph" v-model="phase" class="focusable px-3 py-2 text-sm border bg-transparent" style="border-color: var(--rule); color: var(--fg)">
          <option value="all">All phases</option>
          <option v-for="p in phases" :key="p.id" :value="p.id">{{ p.label }}</option>
        </select>
        <label class="flex items-center gap-2 text-sm cursor-pointer" style="color: var(--fg-2)">
          <input v-model="notableOnly" type="checkbox" class="focusable accent-[var(--accent)]">
          Notable days only
        </label>
        <span class="mono text-xs ml-auto" style="color: var(--fg-3)">{{ filtered.length }} shown</span>
      </div>
    </section>

    <!-- Records -->
    <section class="py-10">
      <div class="wrap">
        <p v-if="!filtered.length" class="py-16 text-center" style="color: var(--fg-3)">
          Nothing in the record matches that.
        </p>

        <ol class="space-y-px" style="background: var(--rule)">
          <li
            v-for="d in shown" :key="d.date"
            class="grid md:grid-cols-[11rem_minmax(0,1fr)] gap-3 md:gap-8 p-5 sm:p-6"
            style="background: var(--bg)"
          >
            <!-- date + place -->
            <div class="md:text-right">
              <p class="mono text-sm" :style="d.notable ? 'color: var(--accent)' : 'color: var(--fg-2)'">
                {{ fmtShort(d.date) }}
              </p>
              <p v-if="d.place" class="text-xs mt-0.5" style="color: var(--fg-3)">{{ d.place.name }}</p>
              <p class="stamp mt-1">{{ phaseLabel(d.phase) }}</p>
              <p v-if="d.emTotal" class="mono text-[0.68rem] mt-2" style="color: var(--fg-3)">
                {{ d.emDuty }}/{{ d.emTotal }} EM
              </p>
            </div>

            <!-- body -->
            <div class="min-w-0">
              <p v-if="d.events" class="record mb-3">{{ d.events }}</p>
              <p v-else class="record mb-3 italic" style="color: var(--fg-3)">No change.</p>

              <ul v-if="d.personnel.length" class="space-y-1.5 mt-3 pt-3 border-t" style="border-color: var(--rule)">
                <li v-for="(p, i) in d.personnel" :key="i" class="text-sm leading-snug">
                  <span class="font-medium" :style="isCasualty(p.action) ? 'color: var(--color-blood)' : ''">{{ p.name }}</span>
                  <span v-if="p.grade" class="mono text-xs ml-1.5" style="color: var(--fg-3)">{{ p.grade }}</span>
                  <span v-if="p.serial" class="mono text-xs ml-1.5" style="color: var(--fg-3)">{{ p.serial }}</span>
                  <span class="block" style="color: var(--fg-2)">{{ p.action }}</span>
                </li>
              </ul>

              <p class="stamp mt-3">
                Film page{{ d.pages.length > 1 ? 's' : '' }} {{ d.pages.join(', ') }}
                &middot; <span class="normal-case tracking-normal">{{ d.station }}</span>
              </p>
            </div>
          </li>
        </ol>

        <div v-if="shown.length < filtered.length" class="mt-8 text-center">
          <button class="focusable px-6 py-3 text-sm border transition-opacity hover:opacity-75"
            style="border-color: var(--accent); color: var(--accent)" @click="limit += 120">
            Show more &mdash; {{ filtered.length - shown.length }} remaining
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
