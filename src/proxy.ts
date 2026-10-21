import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/auth/session";
import { isProtectedPath } from "@/lib/routes";

/**
 * Optimistic routing only. This is not the security boundary.
 *
 * Next's own guidance is explicit that Proxy — Middleware's name since 16 —
 * should not be a session or authorization solution: it runs on prefetches, it
 * sees only what the cookie claims, and the class of bypass behind
 * CVE-2025-29927 was possible precisely because people trusted it. Every real
 * decision in this app is made in `lib/auth/dal`, next to the data.
 *
 * So all this does is two cheap things that need no database:
 *
 *   send someone with no session cookie at all away from the member area
 *   before a page is rendered for them, which is a nicer experience than a
 *   flash of layout followed by a redirect;
 *
 *   re-issue the session cookie with a fresh expiry so "stay signed in" is
 *   genuinely rolling in the browser as well as in the database.
 *
 * A forged or stale cookie sails straight through here and is rejected by the
 * Data Access Layer a moment later, which is the intended division of labour.
 *
 * Which paths count as the member area is decided in `src/lib/routes.ts`,
 * shared with the no-store headers in `next.config.ts`.
 */

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token && isProtectedPath(pathname)) {
    const signIn = new URL("/login", request.url);
    // Come back here once they are through the door.
    if (pathname !== "/") signIn.searchParams.set("next", pathname);
    return NextResponse.redirect(signIn);
  }

  const response = NextResponse.next();

  if (token) {
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(Date.now() + SESSION_TTL_MS),
    });
  }

  return response;
}

export const config = {
  // Everything except Next's own assets and the favicon. Auth wants to run
  // broadly; the cost here is a cookie read, so breadth is affordable.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};
