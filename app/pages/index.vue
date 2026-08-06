<script setup lang="ts">
const { days, stops, summary, phases } = useRecords();

const figures = [
  { n: summary.reportCount.toLocaleString(), l: 'daily reports transcribed', s: `${summary.firstDate.slice(0, 4)}–${summary.lastDate.slice(0, 4)}` },
  { n: summary.stopCount, l: 'positions and bivouacs', s: 'Fort Slocum to Hesse' },
  { n: summary.recordedRoadMiles.toLocaleString(), l: 'road miles logged by the battery', s: 'as written in the reports' },
  { n: summary.namedMen, l: 'men named in the record', s: `${summary.casualties} killed or wounded` },
];

// The days that carry the story. Quotes are verbatim from the cards.
const moments = [
  { date: '1944-06-30', head: 'Omaha Beach', quote: 'Arrived at Omaha Beach 1230 hours. Debarked and moved to vehicle transit area North Section at 2230 hours.', note: 'Twenty-four days after D-Day, and eight weeks after leaving New York.' },
  { date: '1944-07-29', head: 'The first shells come back', quote: 'Slight enemy air action over position. No casualties.', note: 'At Saint-Clair-sur-l’Elle, in the fields south of the Saint-Lô road.' },
  { date: '1944-09-21', head: 'A mine at Henri-Chapelle', quote: 'Above EM LIA due to enemy land mine, all remained on duty.', note: 'Three men lightly wounded in action. All three stayed with the guns.' },
  { date: '1944-12-04', head: 'Captured guns', quote: 'Training with German artillery guns.', note: 'For three weeks the battery fired German pieces, handing them to the 269th FA Bn on 26 December.' },
  { date: '1944-12-27', head: 'Into the Bulge', quote: 'Unit moved from Schmidthof, Germany to Tohogne, Belgium, distance traveled 62 miles. Unit wrecked 2 prime movers on march; 3 men hospitalized.', note: 'A night march on iced roads to the northern shoulder of the Ardennes.' },
  { date: '1945-02-10', head: 'Pvt Stanley Bonczyk', quote: 'Killed in Germany. Accidental discharge from rifle which penetrated the heart. Line of duty. Non-battle casualty.', note: 'The battery’s first death, at Nothberg, west of Cologne.' },
  { date: '1945-02-16', head: '1st Lt Carl Berge', quote: 'Killed in action in Germany.', note: 'The same card records Tec 4 John Squires slightly wounded in the face, remaining on duty.' },
  { date: '1945-05-08', head: 'V-E Day', quote: 'Usual bivouac duties.', note: 'The surrender of Germany goes unmentioned. The clerk fills the card exactly as he did the day before.' },
];

const byDate = new Map(days.map((d) => [d.date, d]));
const phaseStops = (id: string) => stops.filter((s) => s.phase === id).length;
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="border-b" style="border-color: var(--rule)">
      <div class="wrap pt-16 pb-14 sm:pt-24 sm:pb-20">
        <p class="stamp mb-6">War Department A.G.O. Form 1 &middot; Morning Reports &middot; Declassified</p>

        <h1 class="display text-[clamp(2.5rem,8vw,5.5rem)] mb-6">
          Sergeant Clarence Cole
          <span class="block mt-2 text-[clamp(1.1rem,2.6vw,1.9rem)]" style="color: var(--fg-3)">
            Battery C, 153rd Field Artillery Battalion
          </span>
        </h1>

        <div class="max-w-2xl">
          <p class="text-lg sm:text-xl leading-relaxed" style="color: var(--fg-2)">
            On 2 May 1944 a hundred and eighteen men boarded a harbour boat at Fort Slocum, New York,
            and sailed for a destination they were not told. Fourteen months later the battery was
            being taken apart in a Hessian village, its men scattered across four other battalions.
            This is the record of everything in between &mdash; written down, one day at a time, by a
            clerk who never once used an adjective.
          </p>
        </div>

        <div class="mt-10 flex flex-wrap gap-3">
          <NuxtLink to="/route" class="focusable px-5 py-2.5 text-sm border transition-colors hover:opacity-80"
            style="border-color: var(--accent); color: var(--accent)">Follow the route</NuxtLink>
          <NuxtLink to="/timeline" class="focusable px-5 py-2.5 text-sm border transition-colors hover:opacity-80"
            style="border-color: var(--rule); color: var(--fg-2)">Read the daily record</NuxtLink>
        </div>
      </div>
    </section>

    <!-- Figures -->
    <section class="border-b" style="border-color: var(--rule)">
      <div class="wrap grid grid-cols-2 lg:grid-cols-4">
        <div v-for="(f, i) in figures" :key="f.l"
          class="py-8 sm:py-10 lg:px-6 lg:first:pl-0"
          :class="i % 2 === 1 ? 'pl-6 border-l' : 'pr-6'"
          :style="i % 2 === 1 || i > 0 ? 'border-color: var(--rule)' : ''"
          :data-b="i > 0 ? 'l' : ''">
          <p class="display text-4xl sm:text-5xl" style="color: var(--accent)">{{ f.n }}</p>
          <p class="mt-2 text-sm leading-snug" style="color: var(--fg-2)">{{ f.l }}</p>
          <p class="stamp mt-1">{{ f.s }}</p>
        </div>
      </div>
    </section>

    <!-- Narrative -->
    <section class="py-16 sm:py-24">
      <div class="wrap grid lg:grid-cols-[minmax(0,1fr)_22rem] gap-12 lg:gap-16 items-start">
        <div class="max-w-2xl">
          <h2 class="display text-3xl sm:text-4xl mb-6">A gun battery's war</h2>

          <div class="space-y-5 text-[1.0625rem] leading-relaxed" style="color: var(--fg-2)">
            <p>
              The 153rd was a non-divisional field artillery battalion &mdash; corps artillery, held at
              First Army level and lent to whichever division needed weight of shell. Batteries like
              C did not take ground. They moved into a field, dug in, and fired for days or weeks at
              targets they never saw, then hitched up and did it again somewhere else. The morning
              reports record this with a flatness that becomes, after four hundred days of it,
              its own kind of eloquence: <em>in position firing.</em>
            </p>
            <p>
              The battery crossed to England in May 1944, spent six weeks at Branksome outside
              Bournemouth, and landed over Omaha Beach on 30 June. July was spent in the Normandy
              hedgerows behind Carentan and Saint-Lô, firing from positions near Blosville, Méautis
              and Saint-Clair-sur-l'Elle. Then the front broke open. In August the battery covered
              ground at a pace no one had trained for &mdash; 96 miles in a single day on the 22nd,
              178 more on 18 September &mdash; through Domfront, Verneuil and Versailles, into
              Belgium, and across the German frontier.
            </p>
            <p>
              From 22 September the guns sat at Schmidthof, a village south of Aachen, for
              eighty-three days. This was the grinding autumn: enemy artillery falling on the
              position, men going to hospital with trench foot and worse, and in December the
              curious interlude in which the battery was issued captured German howitzers and
              trained on them. On 14 December it moved into the Hürtgen Forest. Two days later the
              Germans attacked in the Ardennes.
            </p>
            <p>
              The response is recorded in one line. On 27 December the battery drove 62 miles from
              Germany into Belgium, wrecking two prime movers and hospitalising three men on the
              way, and went into position at Tohogne on the northern shoulder of the Bulge. It
              stayed in the Ardennes through January, fired across the Roer in February, crossed the
              Rhine into the Remagen bridgehead in March, and worked through the Ruhr Pocket in
              April.
            </p>
            <p>
              On 8 May 1945 the clerk wrote <em>usual bivouac duties</em>. Then the arithmetic of
              going home began: Adjusted Service Rating cards on 28 April, high-point men leaving in
              June, and through July a steady dismantling as men were transferred to the 965th,
              691st, 692nd and 575th Field Artillery Battalions. Captain Robert B. Ford, who had
              signed nearly every card since New York, departed on 26 June.
            </p>
          </div>
        </div>

        <aside class="card p-6 lg:sticky lg:top-24">
          <p class="stamp mb-4">On Sergeant Cole</p>
          <div class="space-y-4 text-sm leading-relaxed" style="color: var(--fg-2)">
            <p>
              Morning reports name a soldier only when his <em>status changes</em> &mdash; a
              promotion, a hospital admission, a transfer, a wound, a death. A man who served
              steadily and was already a sergeant when the battery sailed can pass through the
              entire war without appearing once.
            </p>
            <p>
              Across the {{ summary.pagesTranscribed }} pages transcribed so far, {{ summary.namedMen }}
              individual men are named. Sergeant Cole is not among them. That is an ordinary result,
              not a contradiction: it is what the record looks like for a man whose status simply
              did not change.
            </p>
            <p>
              So this site does not claim to narrate his days directly. It reconstructs, to the day,
              the war that Battery C fought &mdash; the ground it held, the fire it took, the men it
              lost. That is the frame his service sits inside.
            </p>
          </div>
          <NuxtLink to="/records" class="link inline-block mt-5 text-sm">How to read these documents</NuxtLink>
        </aside>
      </div>
    </section>

    <!-- Phases -->
    <section class="border-t py-16 sm:py-20" style="border-color: var(--rule)">
      <div class="wrap">
        <h2 class="display text-3xl sm:text-4xl mb-2">Nine phases</h2>
        <p class="mb-10 max-w-xl" style="color: var(--fg-3)">
          Derived from the battery's own station entries, not from campaign-star boundaries.
        </p>

        <ol class="grid sm:grid-cols-2 lg:grid-cols-3 gap-px" style="background: var(--rule)">
          <li v-for="(p, i) in phases" :key="p.id" class="p-6" style="background: var(--bg)">
            <NuxtLink :to="`/timeline?phase=${p.id}`" class="focusable block group">
              <div class="flex items-baseline justify-between gap-3 mb-2">
                <span class="mono text-xs" style="color: var(--accent)">{{ String(i + 1).padStart(2, '0') }}</span>
                <span class="stamp">{{ phaseStops(p.id) }} {{ phaseStops(p.id) === 1 ? 'stop' : 'stops' }}</span>
              </div>
              <h3 class="display text-2xl mb-1 group-hover:underline underline-offset-4">{{ p.label }}</h3>
              <p class="stamp mb-3">{{ fmtShort(p.from) }} &mdash; {{ fmtShort(p.to) }}</p>
              <p class="text-sm leading-relaxed" style="color: var(--fg-2)">{{ p.blurb }}</p>
            </NuxtLink>
          </li>
        </ol>
      </div>
    </section>

    <!-- Moments -->
    <section class="border-t py-16 sm:py-20" style="border-color: var(--rule)">
      <div class="wrap">
        <h2 class="display text-3xl sm:text-4xl mb-2">Eight days</h2>
        <p class="mb-10 max-w-xl" style="color: var(--fg-3)">
          Quoted exactly as written. The battery clerk's punctuation and abbreviations are preserved
          elsewhere on the site; here they are lightly expanded for reading.
        </p>

        <ol class="space-y-px" style="background: var(--rule)">
          <li v-for="m in moments" :key="m.date" class="p-6 sm:p-8 grid md:grid-cols-[10rem_minmax(0,1fr)] gap-4 md:gap-8" style="background: var(--bg)">
            <div>
              <p class="mono text-sm" style="color: var(--accent)">{{ fmtShort(m.date) }}</p>
              <p v-if="byDate.get(m.date)?.place" class="stamp mt-1">{{ byDate.get(m.date)!.place!.country }}</p>
            </div>
            <div>
              <h3 class="display text-xl sm:text-2xl mb-3">{{ m.head }}</h3>
              <blockquote class="record border-l-2 pl-4 mb-3" style="border-color: var(--accent)">&ldquo;{{ m.quote }}&rdquo;</blockquote>
              <p class="text-sm" style="color: var(--fg-3)">{{ m.note }}</p>
            </div>
          </li>
        </ol>
      </div>
    </section>

    <!-- Close -->
    <section class="border-t py-16 sm:py-20" style="border-color: var(--rule)">
      <div class="wrap-narrow text-center">
        <p class="display text-2xl sm:text-3xl leading-snug mb-6">
          &ldquo;In position firing.&rdquo;
        </p>
        <p class="mb-8" style="color: var(--fg-3)">
          The single most common entry in the battery's record, written on more days than any other
          sentence. Behind it are the men who never appear by name.
        </p>
        <NuxtLink to="/roster" class="focusable inline-block px-5 py-2.5 text-sm border"
          style="border-color: var(--accent); color: var(--accent)">
          See the {{ summary.namedMen }} men the record names
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
[data-b='l'] { border-left: 1px solid var(--rule); }
@media (max-width: 1023px) { [data-b='l'] { border-left: 0; } }
</style>
