import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match everything except /api (backend proxy), Next.js internals, and files
  // with a dot (favicon.ico, og.png, …). Keeping /api out preserves the Vercel
  // rewrite to the FastAPI function.
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
