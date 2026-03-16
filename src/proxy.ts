/**
 * Next.js Global Proxy for Domain Handling, Permissions, and Redirects
 * 
 * Handles:
 * - Domain redirects (thehintnews.in -> www.thehintnews.in)
 * - Old slug redirects (long slugs -> new 5-word slugs)
 * - Authentication check for /publish and /api/publish routes
 * - No-op language header (Kannada only)
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Type for redirect mapping
interface RedirectMapping {
  from: string;
  to: string;
  section: string;
  permanent: boolean;
}

// In-memory cache for redirects
let redirectCache: Map<string, RedirectMapping> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a slug looks like an old long slug (more than 6 word segments)
 */
function isOldLongSlug(slug: string): boolean {
  const wordCount = slug.split('-').length;
  return wordCount > 6;
}

/**
 * Load redirect mappings from storage
 */
async function loadRedirectMappings(): Promise<Map<string, RedirectMapping>> {
  const now = Date.now();
  if (redirectCache && (now - cacheTimestamp) < CACHE_TTL) {
    return redirectCache;
  }
  const mappings = new Map<string, RedirectMapping>();
  // TODO: Load from redirects.json if needed
  redirectCache = mappings;
  cacheTimestamp = now;
  return mappings;
}

/**
 * Handle old slug redirects
 */
async function handleSlugRedirect(request: NextRequest): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname;
  const parts = pathname.split('/').filter(Boolean);

  // Parse path: /[section]/[slug]
  if (parts.length !== 2) return null;
  const [section, slug] = parts;

  // Check if this looks like an old long slug
  if (!isOldLongSlug(slug)) {
    return null;
  }

  // Load redirect mappings
  const mappings = await loadRedirectMappings();
  const key = `${section}/${slug}`;
  const mapping = mappings.get(key);

  if (mapping) {
    const url = request.nextUrl.clone();
    url.pathname = `/${mapping.section}/${mapping.to}`;
    return NextResponse.redirect(url, mapping.permanent ? 301 : 302);
  }

  return null;
}

/**
 * Handle domain redirects
 */
function handleDomainRedirect(request: NextRequest): NextResponse | null {
  const url = request.nextUrl.clone();
  const host = request.headers.get('host') || '';

  const isBareDomain = host === 'thehintnews.in';

  if (isBareDomain) {
    url.hostname = 'www.thehintnews.in';
    url.port = '';
    url.protocol = 'https:';
    return NextResponse.redirect(url, 301);
  }

  return null;
}

/**
 * Main proxy handler
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Skip system routes immediately
  if (pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/static')) {
    return NextResponse.next();
  }

  // Authentication check for publish routes
  if (pathname.startsWith('/publish') || pathname.startsWith('/api/publish')) {
    const sessionToken = request.cookies.get('the_hint_session')?.value;
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/newsroom', request.url));
    }
    try {
      const { jwtVerify } = await import('jose');
      const SECRET = new TextEncoder().encode(process.env.MAGIC_LINK_SECRET || 'default_secret_CHANGE_ME');
      await jwtVerify(sessionToken, SECRET);
    } catch {
      return NextResponse.redirect(new URL('/newsroom', request.url));
    }
  }

  // 1. Handle domain redirects
  const domainRedirect = handleDomainRedirect(request);
  if (domainRedirect) return domainRedirect;

  // 2. Handle old slug redirects
  const slugRedirect = await handleSlugRedirect(request);
  if (slugRedirect) return slugRedirect;

  // 3. Simple response with Kannada language header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-site-language', 'kn');

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Only add no-index to internal deployments if HOST header is present and redirected.
  // The robots.ts handles the main global crawl permissions.
  return response;
}

export const config = {
  matcher: [
    '/((?!api/admin|api/search|api/auth|api/internal|api/media|api/oembed|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|robots.txt|sitemap.xml).*)',
  ],
};
