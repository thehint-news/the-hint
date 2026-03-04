/**
 * Next.js Global Proxy for Domain Handling, Permissions, and Redirects
 * 
 * As of Next.js 16, this replaces the older 'middleware' convention.
 * 
 * Handles:
 * - Domain redirects (thehintnews.in -> www.thehintnews.in)
 * - Language detection from cookie
 * - Route exclusions for /publish, /newsroom, /api, /admin
 * - Old slug redirects (long slugs -> new 5-word slugs)
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

// Type for redirect mapping
interface RedirectMapping {
  /** Old long slug pattern to match */
  from: string;
  /** New short slug to redirect to */
  to: string;
  /** Section for the redirect */
  section: string;
  /** Whether this is a permanent (301) or temporary (302) redirect */
  permanent: boolean;
}

// In-memory cache for redirects (loaded from file or database)
let redirectCache: Map<string, RedirectMapping> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a slug looks like an old long slug (more than 6 word segments)
 * This is a heuristic to detect URLs that might need redirecting
 */
function isOldLongSlug(slug: string): boolean {
  const wordCount = slug.split('-').length;
  return wordCount > 6;
}

/**
 * Load redirect mappings from storage
 * In production, this would load from a database or JSON file
 */
async function loadRedirectMappings(): Promise<Map<string, RedirectMapping>> {
  const now = Date.now();

  // Return cached mappings if still valid
  if (redirectCache && (now - cacheTimestamp) < CACHE_TTL) {
    return redirectCache;
  }

  // Initialize new cache
  const mappings = new Map<string, RedirectMapping>();

  // TODO: Load from database or JSON file
  // For now, this is empty - redirects should be added via admin interface
  // or by manually updating the redirects.json file

  try {
    // Try to load from file (in production)
    // const redirects = await import('@/data/redirects.json');
    // for (const mapping of redirects.default) {
    //     const key = `${mapping.section}/${mapping.from}`;
    //     mappings.set(key, mapping);
    // }
  } catch {
    // File doesn't exist yet, that's okay
  }

  redirectCache = mappings;
  cacheTimestamp = now;

  return mappings;
}

/**
 * Handle old slug redirects (301 redirects from long slugs to new 5-word slugs)
 */
async function handleSlugRedirect(request: NextRequest): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname;

  // Parse path: /[section]/[slug] or /en/[section]/[slug]
  const parts = pathname.split('/').filter(Boolean);

  let section: string;
  let slug: string;
  let isEnglish = false;

  if (parts[0] === 'en') {
    // English route: /en/[section]/[slug]
    if (parts.length !== 3) return null;
    isEnglish = true;
    section = parts[1];
    slug = parts[2];
  } else {
    // Kannada route: /[section]/[slug]
    if (parts.length !== 2) return null;
    section = parts[0];
    slug = parts[1];
  }

  // Check if this looks like an old long slug
  if (!isOldLongSlug(slug)) {
    return null;
  }

  // Load redirect mappings
  const mappings = await loadRedirectMappings();
  const key = `${section}/${slug}`;
  const mapping = mappings.get(key);

  if (mapping) {
    // Build redirect URL
    const url = request.nextUrl.clone();
    const newPath = isEnglish
      ? `/en/${mapping.section}/${mapping.to}`
      : `/${mapping.section}/${mapping.to}`;

    url.pathname = newPath;

    return NextResponse.redirect(url, mapping.permanent ? 301 : 302);
  }

  // No mapping found - let the request proceed
  // The article page will return 404 if slug doesn't exist
  return null;
}

/**
 * Handle domain redirects (www redirect and Vercel preview domains)
 */
function handleDomainRedirect(request: NextRequest): NextResponse | null {
  const url = request.nextUrl.clone();
  const host = request.headers.get('host') || '';

  const isVercelDomain = host.endsWith('.vercel.app');
  const isBareDomain = host === 'thehintnews.in';

  // Force redirect ALL Vercel domains and bare domains to the main production URL
  if (isBareDomain || isVercelDomain) {
    url.hostname = 'www.thehintnews.in';
    // Clear port in case it was set
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
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Authentication check for publish routes
  if (pathname.startsWith('/publish') || pathname.startsWith('/api/publish')) {
    const sessionToken = request.cookies.get('the_hint_session')?.value;
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/newsroom', request.url));
    }
    try {
      const { jwtVerify } = await import('jose');
      const SECRET = new TextEncoder().encode(process.env.MAGIC_LINK_SECRET || 'default_secret_CHANGE_ME');
      const { payload } = await jwtVerify(sessionToken, SECRET);
      if (!payload.email) {
        return NextResponse.redirect(new URL('/newsroom', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/newsroom', request.url));
    }
  }

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

  // 2. Handle old slug redirects (long slugs -> new 5-word slugs)
  const slugRedirect = await handleSlugRedirect(request);
  if (slugRedirect) {
    return slugRedirect;
  }

  // If this is an API route (e.g. /api/publish passed through matcher), and passed auth, let it go
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // 3. Handle language detection
  const langResponse = handleLanguage(request);

  // 4. Add no-index to preview deployments and non-production vercel domains defensively
  const host = request.headers.get('host') || '';
  const isVercelDomain = host.endsWith('.vercel.app');

  if (isVercelDomain) {
    langResponse.headers.set('x-robots-tag', 'noindex, nofollow');
  }

  return langResponse;
}

export const config = {
  matcher: [
    '/((?!api/admin|api/subscribe|api/search|api/auth|api/internal|api/media|api/unsubscribe|api/oembed|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|robots.txt|sitemap.xml).*)',
  ],
};
