import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
]);

// DEV ONLY: set DISABLE_AUTH=1 in .env.local to bypass auth for local
// testing (e.g. Playwright smoke). Never set this in preview or production.
const AUTH_DISABLED = process.env.DISABLE_AUTH === "1";

export default clerkMiddleware(async (auth, req) => {
  if (AUTH_DISABLED) return;
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
