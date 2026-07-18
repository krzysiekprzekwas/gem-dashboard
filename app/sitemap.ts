import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { routing } from '@/i18n/routing';

// URL for a locale under localePrefix: 'as-needed' (default locale has no prefix).
const localeUrl = (locale: string) =>
  locale === routing.defaultLocale ? SITE_URL : `${SITE_URL}/${locale}`;

// Reciprocal hreflang set shared by every entry (each URL lists all variants + itself).
const languages: Record<string, string> = {
  ...Object.fromEntries(routing.locales.map((l) => [l, localeUrl(l)])),
  'x-default': SITE_URL,
};

// One <loc> per locale, each carrying the full alternate set — the pattern Google
// recommends for hreflang. Single-page dashboard, so one path across locales.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routing.locales.map((locale) => ({
    url: localeUrl(locale),
    lastModified,
    changeFrequency: 'daily',
    priority: 1,
    alternates: { languages },
  }));
}
