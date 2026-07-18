import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'pl'],
  defaultLocale: 'en',
  // English stays at `/`, Polish at `/pl`. `/en` redirects to `/`.
  localePrefix: 'as-needed',
});
