import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Pass through all requests without modification
  // Locale handling is done via cookies in i18n/request.ts
  return NextResponse.next();
}

export const config = {
  // Only run on app routes, exclude API and static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
