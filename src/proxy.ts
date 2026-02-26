import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = request.headers.get('host') || '';

  const isVercelDomain = host.endsWith('.vercel.app');
  const isBareDomain = host === 'thehintnews.in';

  // Only force redirect vercel domains if we are in production
  // This preserves the ability to test PRs via preview URLs
  const isProduction = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';

  if (isBareDomain || (isVercelDomain && isProduction)) {
    url.hostname = 'www.thehintnews.in';
    url.port = '';
    url.protocol = 'https:';
    return NextResponse.redirect(url, 301);
  }

  const response = NextResponse.next();

  // Add no-index to preview deployments and non-production vercel domains defensively
  if (isVercelDomain) {
    response.headers.set('x-robots-tag', 'noindex, nofollow');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|robots.txt|sitemap.xml).*)',
  ],
};
