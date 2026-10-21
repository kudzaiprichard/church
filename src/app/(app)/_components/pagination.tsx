import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Previous / next through a list, keeping every other filter in the URL.
 *
 * Links, not buttons: each page is a real address that survives a reload and
 * can be shared, which is the rule for every list in the portal (SCOPE §5.3).
 */
export function Pagination({
  page,
  pageCount,
  total,
  pathname,
  params,
}: {
  page: number;
  pageCount: number;
  total: number;
  pathname: string;
  /** The current filters, without `page`. */
  params: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;

  const href = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
    if (target > 1) query.set("page", String(target));
    const search = query.toString();
    return search ? `${pathname}?${search}` : pathname;
  };

  const step = cn(
    "border-border text-foreground/80 hover:bg-muted inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium transition-colors",
    "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
  );
  const disabled = "pointer-events-none opacity-45";

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 px-5 py-3">
      <p className="text-muted-foreground numeric text-xs">
        Page {page} of {pageCount} · {total} in all
      </p>
      <div className="flex gap-1.5">
        <Link
          href={href(page - 1)}
          aria-disabled={page <= 1}
          tabIndex={page <= 1 ? -1 : undefined}
          className={cn(step, page <= 1 && disabled)}
        >
          <ChevronLeftIcon className="size-3.5" aria-hidden />
          Previous
        </Link>
        <Link
          href={href(page + 1)}
          aria-disabled={page >= pageCount}
          tabIndex={page >= pageCount ? -1 : undefined}
          className={cn(step, page >= pageCount && disabled)}
        >
          Next
          <ChevronRightIcon className="size-3.5" aria-hidden />
        </Link>
      </div>
    </nav>
  );
}
