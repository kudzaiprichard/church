/**
 * Paging for every list in the portal: which page, and how many rows a page
 * holds. Both live in the URL (`?page=2&size=10`), so a list's place survives
 * a reload and can be shared, like its filters (SCOPE §5.3).
 *
 * Pure, so a database query and a list already in memory page the same way:
 * a query takes `skip`/`take` from `paging`, an array goes through `paginate`.
 */

/** The page sizes a person can choose. */
export const PAGE_SIZES = [5, 10, 20, 25, 30, 50] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export type Paging = { page: number; size: PageSize };

type Params = Record<string, string | string[] | undefined>;

/** The URL keys a list pages with: `page`/`size`, or its own pair when a page has two lists. */
export type PagingKeys = { page: string; size: string };
export const DEFAULT_KEYS: PagingKeys = { page: "page", size: "size" };

/** Read the page and size from search params, ignoring anything that is not one of the choices. */
export function parsePaging(
  params: Params,
  defaultSize: PageSize = 20,
  keys: PagingKeys = DEFAULT_KEYS,
): Paging {
  const one = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : undefined;
  };
  const size = Number(one(keys.size));
  const page = Math.floor(Number(one(keys.page)));
  return {
    page: Number.isFinite(page) && page >= 1 ? page : 1,
    size: (PAGE_SIZES as readonly number[]).includes(size) ? (size as PageSize) : defaultSize,
  };
}

/** `skip` and `take` for a query. */
export function pageWindow({ page, size }: Paging) {
  return { skip: (page - 1) * size, take: size };
}

export function pageCount(total: number, size: number) {
  return Math.max(1, Math.ceil(total / size));
}

export type Paged<T> = {
  rows: T[];
  page: number;
  size: PageSize;
  pageCount: number;
  total: number;
};

/**
 * One page of a list already in memory. A page past the end shows the last
 * page rather than nothing — a filter that shrank the list should not leave
 * the person on an empty page.
 */
export function paginate<T>(rows: readonly T[], paging: Paging): Paged<T> {
  const count = pageCount(rows.length, paging.size);
  const page = Math.min(paging.page, count);
  const start = (page - 1) * paging.size;
  return {
    rows: rows.slice(start, start + paging.size),
    page,
    size: paging.size,
    pageCount: count,
    total: rows.length,
  };
}

/**
 * The page numbers to show: always the first, the last, and two either side
 * of the current one, with `null` where a run of pages is left out.
 */
export function pageNumbers(page: number, count: number): (number | null)[] {
  const wanted = new Set([1, count, page - 2, page - 1, page, page + 1, page + 2]);
  const shown = [...wanted].filter((n) => n >= 1 && n <= count).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  for (const n of shown) {
    const last = out[out.length - 1];
    if (typeof last === "number" && n - last > 1) out.push(null);
    out.push(n);
  }
  return out;
}
