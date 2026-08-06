import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  compatibilityDate: '2026-08-01',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },
  nitro: { prerender: { crawlLinks: true, routes: ['/'] } },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Sergeant Clarence Cole — Battery C, 153rd Field Artillery Battalion',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'A day-by-day record of Battery C, 153rd Field Artillery Battalion in the European Theater, 1944-1945, reconstructed from 284 pages of original US Army morning reports.',
        },
      ],
    },
  },
});
