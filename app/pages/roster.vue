<script setup lang="ts">
useHead({ title: 'Roster — the men the record names' });

const { roster, summary } = useRecords();
const query = ref('');
const open = ref<string | null>(null);

const casualties = computed(() => roster.filter((m) => m.fate));

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return roster;
  return roster.filter((m) =>
    m.name.toLowerCase().includes(q) ||
    (m.serial ?? '').includes(q) ||
    m.grades.some((g) => g.toLowerCase().includes(q)),
  );
});

const key = (m: { serial: string | null; name: string }) => m.serial ?? m.name;
</script>

<template>
  <div>
    <section class="border-b py-12 sm:py-16" style="border-color: var(--rule)">
      <div class="wrap">
        <p class="stamp mb-4">Named personnel</p>
        <h1 class="display text-[clamp(2.25rem,6vw,4rem)] mb-5">{{ summary.namedMen }} men</h1>
        <p class="max-w-2xl text-lg leading-relaxed" style="color: var(--fg-2)">
          These are the men whose status changed at least once: promoted, reduced, hospitalised,
          transferred, wounded, killed. A battery carried roughly {{ 110 }} enlisted men at any one
          time, so this list is not the battery &mdash; it is the subset the paperwork had reason to
          mention.
        </p>
      </div>
    </section>

    <!-- Casualties -->
    <section class="border-b py-12" style="border-color: var(--rule)">
      <div class="wrap">
        <h2 class="display text-2xl sm:text-3xl mb-2">Killed and wounded</h2>
        <p class="mb-8 text-sm max-w-xl" style="color: var(--fg-3)">
          Every entry in the transcribed pages recording a battle or non-battle casualty by name.
        </p>
        <ul class="grid sm:grid-cols-2 lg:grid-cols-4 gap-px" style="background: var(--rule)">
          <li v-for="m in casualties" :key="key(m)" class="p-5" style="background: var(--bg)">
            <p class="stamp mb-1" :style="m.fate === 'killed' ? 'color: var(--color-blood)' : 'color: var(--accent)'">
              {{ m.fate === 'killed' ? 'Killed' : 'Wounded' }}
            </p>
            <p class="display text-lg leading-tight">{{ m.name }}</p>
            <p class="mono text-xs mt-1" style="color: var(--fg-3)">{{ m.grades.join(' · ') }}</p>
            <p v-for="e in m.entries.filter((x) => /killed|wounded|LIA|injured in action/i.test(x.action))" :key="e.date"
              class="mt-2 text-xs leading-snug" style="color: var(--fg-2)">
              <span class="mono">{{ fmtShort(e.date) }}</span> — {{ e.action }}
            </p>
          </li>
        </ul>
      </div>
    </section>

    <!-- Full roster -->
    <section class="py-12">
      <div class="wrap">
        <div class="flex flex-wrap items-end justify-between gap-4 mb-6">
          <h2 class="display text-2xl sm:text-3xl">The full list</h2>
          <div class="flex items-center gap-3">
            <label class="sr-only" for="rq">Search the roster</label>
            <input id="rq" v-model="query" type="search" placeholder="Name, serial, grade…"
              class="focusable px-3 py-2 text-sm border bg-transparent" style="border-color: var(--rule)">
            <span class="mono text-xs" style="color: var(--fg-3)">{{ filtered.length }}</span>
          </div>
        </div>

        <ul class="space-y-px" style="background: var(--rule)">
          <li v-for="m in filtered" :key="key(m)" style="background: var(--bg)">
            <button
              class="focusable w-full text-left p-4 sm:px-5 grid grid-cols-[minmax(0,1fr)_auto] gap-4 items-center hover:opacity-80 transition-opacity"
              :aria-expanded="open === key(m)" @click="open = open === key(m) ? null : key(m)"
            >
              <span class="min-w-0">
                <span class="block truncate" :style="m.fate === 'killed' ? 'color: var(--color-blood)' : ''">{{ m.name }}</span>
                <span class="mono text-xs" style="color: var(--fg-3)">
                  {{ m.grades.join(' · ') || '—' }}<span v-if="m.serial"> &middot; {{ m.serial }}</span>
                </span>
              </span>
              <span class="stamp whitespace-nowrap">{{ m.count }} {{ m.count === 1 ? 'entry' : 'entries' }}</span>
            </button>

            <ol v-if="open === key(m)" class="px-4 sm:px-5 pb-5 space-y-2.5 border-t pt-4" style="border-color: var(--rule)">
              <li v-for="(e, i) in m.entries" :key="i" class="grid sm:grid-cols-[7rem_minmax(0,1fr)] gap-1 sm:gap-4 text-sm">
                <span class="mono text-xs pt-0.5" style="color: var(--accent)">{{ fmtShort(e.date) }}</span>
                <span>
                  <span v-if="e.grade" class="mono text-xs mr-2" style="color: var(--fg-3)">{{ e.grade }}</span>
                  <span style="color: var(--fg-2)">{{ e.action }}</span>
                </span>
              </li>
            </ol>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
