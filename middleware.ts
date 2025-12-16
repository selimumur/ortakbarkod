import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/admin(.*)',
  '/siparisler(.*)',
  '/urunler(.*)',
  '/finans(.*)',
  '/ayarlar(.*)',
  '/kargo(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
  // 1. Rate Limiting for API Routes
  if (req.nextUrl.pathname.startsWith('/api')) {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const isAllowed = rateLimit(ip, 50, 60000); // 50 requests per minute

    if (!isAllowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-current-path', req.nextUrl.pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};