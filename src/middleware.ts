import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.[0-9a-z]+$).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Clerk auto-proxy path (proxy matcher)
    '/__clerk/(.*)',
  ],
};
