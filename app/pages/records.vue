<script setup lang="ts">
useHead({ title: 'The Records — provenance and how to read them' });

const { summary } = useRecords();

const glossary = [
  ['Fr dy to', 'From duty to — the man leaves the battery\'s duty strength'],
  ['LD', 'Line of duty — the injury or illness was not the man\'s own fault, which governs pay and benefits'],
  ['LIA / SWA', 'Lightly injured in action / slightly wounded in action'],
  ['EM', 'Enlisted men, as distinct from officers'],
  ['Tec 4 / Tec 5', 'Technician grades, paid as sergeant and corporal but without command authority'],
  ['MOS / SSN', 'Military occupational specialty — 531 is basic gunner, 244 tractor driver, 060 cook'],
  ['SO / BO / VOCO', 'Special Order, Battery Order, Verbal Order of the Commanding Officer'],
  ['EDCMR', 'Effective date of change of morning report — when a transfer legally takes effect'],
  ['ASR', 'Adjusted Service Rating — the points score that decided who went home first'],
  ['Nord de Guerre', 'The Allied military grid system used across north-west Europe'],
  ['DS / TD', 'Detached service / temporary duty'],
  ['Repl Depot', 'Replacement depot — where casualties were replaced and returning men were re-assigned'],
];

const openQuestions = [
  'Pages 219–284 of the film (mid-July to 10 October 1945) are not yet transcribed. They cover the occupation, the battery\'s dissolution, and the move to the Calas staging area near Marseille for the voyage home.',
  'Sergeant Cole\'s serial number and battery are not established from this film. Confirming them would let the record be filtered to the days he was actually present.',
  'The Bronze Star citation is not in these documents and would not be — awards appear in unit General Orders, not morning reports.',
];
</script>

<template>
  <div>
    <section class="border-b py-12 sm:py-16" style="border-color: var(--rule)">
      <div class="wrap">
        <p class="stamp mb-4">Sources, method and limits</p>
        <h1 class="display text-[clamp(2.25rem,6vw,4rem)] mb-5">The records</h1>
        <p class="max-w-2xl text-lg leading-relaxed" style="color: var(--fg-2)">
          Everything on this site comes from one source: {{ summary.pagesTotal }} microfilmed pages
          of morning reports for Battery C, 153rd Field Artillery Battalion. No secondary history has
          been used to fill gaps, and where the film is illegible the entry says so.
        </p>
      </div>
    </section>

    <section class="py-14">
      <div class="wrap grid lg:grid-cols-[minmax(0,1fr)_20rem] gap-12 lg:gap-16 items-start">
        <div class="max-w-2xl space-y-10">
          <div>
            <h2 class="display text-2xl sm:text-3xl mb-4">What a morning report is</h2>
            <div class="space-y-4 text-[1.0625rem] leading-relaxed" style="color: var(--fg-2)">
              <p>
                Every US Army company, battery and detachment filed one every single day of the war.
                A first sergeant or clerk recorded the unit's location, its strength broken down by
                grade, and any change in the status of an individual soldier. At the bottom he wrote
                a Record of Events &mdash; usually a single line &mdash; and the commanding officer
                signed it. Copies went up the chain to the War Department.
              </p>
              <p>
                They were administrative documents, not diaries. They exist so the Army could account
                for pay, rations and manpower. That is precisely what makes them trustworthy: nobody
                was writing for posterity, and nobody had a reason to embellish. When this battery's
                clerk wrote <span class="record">&ldquo;Enemy artillery fire in position from 1545 to
                1630 hrs. No casualties.&rdquo;</span> he was recording a fact, not telling a story.
              </p>
              <p>
                They are also, crucially, <em>self-correcting</em>. This battery filed corrections
                constantly &mdash; a wrong grid reference carried for two months, a whole detached-service
                entry retracted with the words <span class="record">&ldquo;is amended to read: no
                changes&rdquo;</span>. Those corrections are reproduced here rather than silently
                applied, because a record that argues with itself is telling you something about the
                conditions it was written in.
              </p>
            </div>
          </div>

          <div>
            <h2 class="display text-2xl sm:text-3xl mb-4">Method</h2>
            <div class="space-y-4 text-[1.0625rem] leading-relaxed" style="color: var(--fg-2)">
              <p>
                The PDF was rendered page by page at 220&nbsp;dpi and each card read directly. The
                film carries two cards per page for most of its length, switching to typed
                single-page and continuation sheets from January 1945. Duplicate scans and
                multi-page reports were merged by date.
              </p>
              <p>
                Place names are transcribed as the clerk wrote them, which is not always as the map
                spells them. Where a village could be identified with confidence &mdash; Méautis,
                Sourbrodt, Drolshagen &mdash; the modern name and coordinates are attached for the
                chart. Where it could not, the grid reference is carried instead and the position is
                described generically. Uncertain readings are never quietly upgraded to certainty.
              </p>
              <p>
                Serial numbers are transcribed as read from microfilm and should be treated as
                probable rather than authoritative; several are visibly corrected by the battery
                itself in later entries.
              </p>
            </div>
          </div>

          <div>
            <h2 class="display text-2xl sm:text-3xl mb-4">On the Bronze Star</h2>
            <div class="space-y-4 text-[1.0625rem] leading-relaxed" style="color: var(--fg-2)">
              <p>
                No award appears anywhere in these pages, and none would. Decorations were published
                in unit General Orders and recorded on a soldier's discharge document
                (WD AGO Form 53-55), not on morning reports. The absence here is a property of the
                document type, not evidence about the award.
              </p>
              <p>
                For a Bronze Star earned in this battalion, the papers to look for are the 153rd FA
                Battalion's General Orders and the awards cards held by the National Personnel
                Records Center in St. Louis, alongside the discharge papers themselves.
              </p>
            </div>
          </div>
        </div>

        <aside class="space-y-8 lg:sticky lg:top-24">
          <div class="card p-5">
            <p class="stamp mb-3">Transcription status</p>
            <div class="mb-3 h-2 w-full" style="background: var(--bg-3)">
              <div class="h-full" :style="`width: ${(summary.pagesTranscribed / summary.pagesTotal) * 100}%; background: var(--accent)`" />
            </div>
            <p class="text-sm" style="color: var(--fg-2)">
              {{ summary.pagesTranscribed }} of {{ summary.pagesTotal }} film pages
              &mdash; {{ summary.reportCount }} daily reports covering
              {{ fmtDate(summary.firstDate) }} to {{ fmtDate(summary.lastDate) }}.
            </p>
          </div>

          <div class="card p-5">
            <p class="stamp mb-3">Open questions</p>
            <ul class="space-y-3 text-sm leading-relaxed" style="color: var(--fg-2)">
              <li v-for="(q, i) in openQuestions" :key="i" class="pl-4 border-l" style="border-color: var(--rule)">{{ q }}</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>

    <section class="border-t py-14" style="border-color: var(--rule)">
      <div class="wrap">
        <h2 class="display text-2xl sm:text-3xl mb-2">Reading the abbreviations</h2>
        <p class="mb-8 max-w-xl text-sm" style="color: var(--fg-3)">
          Morning reports are written in a dense clerical shorthand. These are the forms that recur
          most often in this battery's cards.
        </p>
        <dl class="grid sm:grid-cols-2 lg:grid-cols-3 gap-px" style="background: var(--rule)">
          <div v-for="[term, def] in glossary" :key="term" class="p-5" style="background: var(--bg)">
            <dt class="mono text-sm mb-1" style="color: var(--accent)">{{ term }}</dt>
            <dd class="text-sm leading-snug" style="color: var(--fg-2)">{{ def }}</dd>
          </div>
        </dl>
      </div>
    </section>
  </div>
</template>
