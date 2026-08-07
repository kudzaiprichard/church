"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LABELS } from "./nav";

/**
 * Where you are, derived from the URL.
 *
 * Labels come from the navigation config so a page cannot be called one thing
 * in the sidebar and another here. Anything without an entry falls back to its
 * URL segment in title case, which keeps the trail honest for routes added
 * later that have not been registered yet.
 *
 * The last crumb is the current page, so it is plain text with `aria-current`
 * rather than a link to where you already are.
 */
export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    return {
      href,
      label: LABELS[href] ?? titleCase(segment),
      last: index === segments.length - 1,
    };
  });

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb) => (
          <li key={crumb.href} className="flex min-w-0 items-center gap-1.5">
            {crumb.last ? (
              <span aria-current="page" className="truncate font-medium">
                {crumb.label}
              </span>
            ) : (
              <>
                <Link
                  href={crumb.href}
                  className="focus-visible:ring-ring text-muted-foreground hover:text-foreground truncate rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  {crumb.label}
                </Link>
                <span aria-hidden className="text-muted-foreground/40">
                  /
                </span>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** "change-password" → "Change password". */
function titleCase(segment: string) {
  const words = segment.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
