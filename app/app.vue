<script setup lang="ts">
const nav = [
  { to: '/', label: 'The Battery' },
  { to: '/route', label: 'Route' },
  { to: '/timeline', label: 'Timeline' },
  { to: '/roster', label: 'Roster' },
  { to: '/records', label: 'The Records' },
];
const open = ref(false);
const route = useRoute();
watch(() => route.path, () => (open.value = false));
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:px-3 focus:py-2 focus:bg-[var(--bg-2)] focus:border focus:border-[var(--rule)]">
      Skip to content
    </a>

    <header class="sticky top-0 z-40 backdrop-blur-sm border-b" style="border-color: var(--rule); background: color-mix(in oklab, var(--bg) 88%, transparent)">
      <div class="wrap flex items-center justify-between gap-4 h-16">
        <NuxtLink to="/" class="focusable flex items-baseline gap-2.5 min-w-0">
          <span class="mono text-[0.7rem] tracking-[0.2em] uppercase shrink-0" style="color: var(--accent)">153d FA Bn</span>
          <span class="hidden sm:inline text-sm truncate" style="color: var(--fg-3)">Battery C</span>
        </NuxtLink>

        <nav class="hidden md:flex items-center gap-1" aria-label="Primary">
          <NuxtLink
            v-for="n in nav" :key="n.to" :to="n.to"
            class="focusable px-3 py-1.5 text-sm transition-colors"
            :style="route.path === n.to ? 'color: var(--fg); box-shadow: inset 0 -2px 0 var(--accent)' : 'color: var(--fg-3)'"
          >{{ n.label }}</NuxtLink>
        </nav>

        <button
          class="md:hidden focusable px-3 py-2 text-sm border" style="border-color: var(--rule)"
          :aria-expanded="open" aria-controls="mobile-nav" @click="open = !open"
        >{{ open ? 'Close' : 'Menu' }}</button>
      </div>

      <nav v-if="open" id="mobile-nav" class="md:hidden border-t" style="border-color: var(--rule)" aria-label="Primary mobile">
        <div class="wrap py-2 flex flex-col">
          <NuxtLink v-for="n in nav" :key="n.to" :to="n.to" class="focusable py-2.5 text-sm border-b last:border-0" style="border-color: var(--rule)">
            {{ n.label }}
          </NuxtLink>
        </div>
      </nav>
    </header>

    <main id="main" class="flex-1">
      <NuxtPage />
    </main>

    <footer class="mt-24 border-t py-10" style="border-color: var(--rule)">
      <div class="wrap grid gap-6 sm:grid-cols-[1fr_auto] items-start">
        <div class="max-w-xl">
          <p class="stamp mb-2">Provenance</p>
          <p class="text-sm" style="color: var(--fg-3)">
            Built from 284 microfilmed pages of War Department A.G.O. Form 1 morning reports for
            Battery C, 153rd Field Artillery Battalion. Every quoted line is transcribed from the
            original cards. See <NuxtLink to="/records" class="link">The Records</NuxtLink> for what
            these documents can and cannot tell us.
          </p>
        </div>
        <p class="stamp whitespace-nowrap">Restricted &mdash; declassified</p>
      </div>
    </footer>
  </div>
</template>
