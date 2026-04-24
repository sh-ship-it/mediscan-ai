import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Paths that don't require authentication
const publicPaths = ['/auth', '/api/public'];

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // 1. Allow public paths and static assets
  if (
    publicPaths.some(path => pathname.startsWith(path)) ||
    pathname.includes('.') || // Static files
    pathname.startsWith('/_next')
  ) {
    return NextResponse.next();
  }

  // 2. Check for supabase session cookie
  const cookies = request.cookies.getAll();
  const authCookie = cookies.find(c => c.name.includes('auth-token'));

  console.log(`[Proxy] Path: ${pathname}, Cookies found: ${cookies.length}, Auth cookie: ${!!authCookie}`);

  /* 
  if (!authCookie && pathname !== '/auth') {
    console.log(`[Proxy] Redirecting to /auth from ${pathname}`);
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    return NextResponse.redirect(url);
  }
  */

  return NextResponse.next();
}

// See Next.js docs for matcher syntax
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
