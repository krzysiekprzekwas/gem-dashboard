import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Single-page dashboard: one entry, both locales declared as hreflang alternates.
// English lives at `/` (localePrefix: 'as-needed'), Polish at `/pl`.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
      alternates: {
        languages: {
          en: SITE_URL,
          pl: `${SITE_URL}/pl`,
          'x-default': SITE_URL,
        },
      },
    },
  ];
}
