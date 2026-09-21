import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher(['/login(.*)']);

const isRootOrLogin = createRouteMatcher(['/', '/login(.*)']);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // Redirect signed-in users away from the root and login pages immediately,
  // so they never rely on the two-hop redirect through app/page.tsx.
  if (userId && isRootOrLogin(req)) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

// api/health and api/cron are excluded here (not just from isPublicRoute)
// because clerkMiddleware resolves auth state for any matched request before
// the callback runs, which triggers Clerk's dev-instance handshake redirect
// for cookie-less requests with a browser-like Accept header — that loops
// forever for clients (like health checks) that never carry cookies across
// the handshake hop.
export const config = {
  matcher: [
    '/((?!_next|api/health|api/cron|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
