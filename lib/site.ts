// Canonical site origin, shared by metadata, sitemap, and robots so the fallback
// never drifts. Set NEXT_PUBLIC_SITE_URL on Vercel to the real prod domain.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gem-dashboard.vercel.app';
