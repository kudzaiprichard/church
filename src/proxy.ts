import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/auth/session";

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
 */

/**
 * The member area. Everything else is public.
 *
 * Named as a list of what is *protected* rather than a list of what is public,
 * which is the opposite of how this started. An allowlist of public paths made
 * every unknown URL private by default, so a visitor who mistyped an address on
 * the public site was redirected to the sign-in page instead of being shown a
 * 404 — and each new public page silently became private until somebody
 * remembered to add it here.
 *
 * Inverting it costs nothing in safety, because this file was never the
 * boundary: a private route missing from this list simply renders and is then
 * refused by the Data Access Layer, exactly as a forged cookie already is. The
 * only thing lost is the courtesy redirect.
 *
 * Keep in step with the `Cache-Control: private, no-store` sources in
 * `next.config.ts`, which cover the same segments for the same reason.
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/members",
  "/account",
  "/audit",
  "/change-password",
];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token && isProtected(pathname)) {
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
