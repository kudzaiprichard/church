/**
 * The member area's URL prefixes, in one place.
 *
 * Two files need this list and must never disagree about it: `src/proxy.ts`,
 * which sends somebody with no session cookie to the sign-in page, and
 * `next.config.ts`, which marks the same segments `private, no-store` so a
 * shared cache never keeps one member's records for the next person. They used
 * to hold a copy each, which is exactly how a new module ends up protected in
 * one and cached in the other.
 *
 * Named as a list of what is *protected* rather than what is public: an
 * allowlist of public paths made every mistyped public URL redirect to sign-in
 * instead of showing a 404. Neither consumer is the security boundary — the
 * Data Access Layer is — so a prefix missing here costs a courtesy redirect,
 * never access.
 *
 * Add a module's prefix in the same change that adds the module.
 *
 * Plain data with no imports, because `next.config.ts` loads it outside the
 * app's module graph.
 */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/members",
  "/groups",
  "/messages",
  "/notifications",
  "/events",
  "/attendance",
  "/prayer",
  "/finance",
  "/partnerships",
  "/sermons",
  "/notes",
  "/devotions",
  "/birthdays",
  "/baptism",
  "/profile",
  "/settings",
  "/account",
  "/audit",
  "/change-password",
] as const;

/** True for a path inside the member area, including the prefix itself. */
export function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * The prefixes as a `headers()` source pattern: `/(dashboard|members|…)`.
 *
 * Next's path matcher takes a regex group in a segment, which is what lets one
 * rule cover every prefix instead of one rule per module.
 */
export function protectedSegmentPattern() {
  return `/(${PROTECTED_PREFIXES.map((prefix) => prefix.slice(1)).join("|")})`;
}
