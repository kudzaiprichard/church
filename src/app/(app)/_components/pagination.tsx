import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { DEFAULT_KEYS, PAGE_SIZES, pageNumbers, type PagingKeys } from "@/lib/paging";
import { cn } from "@/lib/utils";

import { PageSizeSelect } from "./page-size-select";

/**
 * The foot of a list: which rows are showing, the page numbers with previous
 * and next, and how many rows a page holds — every other filter kept in the
 * URL.
 *
 * Links, not buttons: each page is a real address that survives a reload and
 * can be shared, which is the rule for every list in the portal (SCOPE §5.3).
 * Hidden when the list would fit on the smallest page anyway; it draws its
 * own top border, so a hidden bar leaves no stray line at the foot of a list.
 */
export function Pagination({
  page,
  pageCount,
  total,
  size,
  pathname,
  params,
  keys = DEFAULT_KEYS,
  className,
}: {
  page: number;
  pageCount: number;
  total: number;
  /** Rows per page. */
  size: number;
  pathname: string;
  /** The current filters, without `page` and `size`. */
  params: Record<string, string | undefined>;
  /** Its own URL keys, when the page has a second paged list. */
  keys?: PagingKeys;
  className?: string;
}) {
  if (total <= PAGE_SIZES[0]) return null;

  const href = (target: number, targetSize = size) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
    if (target > 1) query.set(keys.page, String(target));
    query.set(keys.size, String(targetSize));
    return `${pathname}?${query.toString()}`;
  };

  const from = (page - 1) * size + 1;
  const to = Math.min(page * size, total);

  const step = cn(
    "border-border text-foreground/80 hover:bg-muted inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium transition-colors",
    "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
  );
  const disabled = "pointer-events-none opacity-45";

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "border-border flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t px-4 py-2.5",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-muted-foreground numeric text-xs">
          {from}–{to} of {total}
        </p>
        <PageSizeSelect
          size={size}
          hrefFor={Object.fromEntries(PAGE_SIZES.map((option) => [option, href(1, option)]))}
        />
      </div>

      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <Link
            href={href(page - 1)}
            aria-disabled={page <= 1}
            tabIndex={page <= 1 ? -1 : undefined}
            aria-label="Previous page"
            className={cn(step, page <= 1 && disabled)}
          >
            <ChevronLeftIcon className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Previous</span>
          </Link>
          {pageNumbers(page, pageCount).map((number, index) =>
            number === null ? (
              <span key={`gap-${index}`} aria-hidden className="text-muted-foreground px-1 text-xs">
                …
              </span>
            ) : (
              <Link
                key={number}
                href={href(number)}
                aria-label={`Page ${number}`}
                aria-current={number === page ? "page" : undefined}
                className={cn(
                  "numeric inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
                  number === page
                    ? "bg-secondary text-secondary-foreground font-semibold"
                    : "text-foreground/80 hover:bg-muted",
                )}
              >
                {number}
              </Link>
            ),
          )}
          <Link
            href={href(page + 1)}
            aria-disabled={page >= pageCount}
            tabIndex={page >= pageCount ? -1 : undefined}
            aria-label="Next page"
            className={cn(step, page >= pageCount && disabled)}
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRightIcon className="size-3.5" aria-hidden />
          </Link>
        </div>
      )}
    </nav>
  );
}
