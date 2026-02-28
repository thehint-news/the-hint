/**
 * Next.js Middleware for Domain Proxy and Language Handling
 * 
 * Handles:
 * - Domain redirects (thehintnews.in -> www.thehintnews.in)
 * - Language detection from cookie
 * - Route exclusions for /publish, /newsroom, /api, /admin
 * - SEO header injection preparation
 * 
 * NO runtime translation happens here.
 * Language is only DETECTED and PASSED to the app.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  Language,
  LANGUAGE_COOKIE_NAME,
  validateLanguage,
  classifyRoute,
} from '@/lib/i18n/language';

/**
 * Handle domain redirects (www redirect and Vercel preview domains)
 */
function handleDomainRedirect(request: NextRequest): NextResponse | null {
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

  return null;
}

/**
 * Handle language detection and cookie management
 */
function handleLanguage(request: NextRequest): NextResponse {
  const { pathname, searchParams } = request.nextUrl;

  // Classify the route
  const routeType = classifyRoute(pathname);

  // Excluded routes: pass through without language processing
  if (routeType === 'excluded' || routeType === 'system') {
    return NextResponse.next();
  }

  // Determine language from cookie or default
  const cookieLang = request.cookies.get(LANGUAGE_COOKIE_NAME)?.value;
  const language: Language = validateLanguage(cookieLang);

  // Check if there's a language override in query params
  const queryLang = searchParams.get('lang');
  if (queryLang && (queryLang === 'kn' || queryLang === 'en')) {
    // Update cookie if query param differs
    const response = NextResponse.redirect(new URL(pathname, request.url));
    response.cookies.set(LANGUAGE_COOKIE_NAME, queryLang, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return response;
  }

  // Add language header for server components to read
  // This avoids cookie reading in every component
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-site-language', language);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return response;
}

/**
 * Main proxy handler
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip system routes immediately
  if (pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/static')) {
    return NextResponse.next();
  }

  // 1. Handle domain redirects first
  const domainRedirect = handleDomainRedirect(request);
  if (domainRedirect) {
    return domainRedirect;
  }

  // 2. Handle language detection
  const langResponse = handleLanguage(request);

  // 3. Add no-index to preview deployments and non-production vercel domains defensively
  const host = request.headers.get('host') || '';
  const isVercelDomain = host.endsWith('.vercel.app');

  if (isVercelDomain) {
    langResponse.headers.set('x-robots-tag', 'noindex, nofollow');
  }

  return langResponse;
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
