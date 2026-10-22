import { BookOpenIcon, PlusIcon, SearchIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { requireSession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { listSermons, sermonFacets } from "@/lib/data/sermons";
import { parsePaging } from "@/lib/paging";

import { EmptyState, PageHeader } from "../_components/page-parts";
import { Pagination } from "../_components/pagination";

import { SermonCard } from "./sermon-card";

export const metadata: Metadata = { title: "Sermons" };

/**
 * The sermon archive (docs/SCOPE.md §9.11): search title, preacher and
 * scripture with `?q=`; filter by `?series=`, `?preacher=` and `?tag=`. All in
 * the URL so a search can be shared. Drafts appear only for the Apostles.
 */
export default async function SermonsPage(props: PageProps<"/sermons">) {
  const user = await requireSession();
  const params = await props.searchParams;
  const one = (key: string) => {
    const value = params[key];
    return typeof value === "string" && value.length > 0 ? value.slice(0, 100) : undefined;
  };
  const filters = {
    q: one("q"),
    series: one("series"),
    preacher: one("preacher"),
    tag: one("tag"),
    ...parsePaging(params, 30),
  };

  const [result, facets] = await Promise.all([listSermons(user, filters), sermonFacets(user)]);
  const filtered = Boolean(filters.q || filters.series || filters.preacher || filters.tag);
  const control =
    "border-input bg-background mt-1.5 h-10 w-full rounded-lg border px-3 text-sm outline-none focus:border-[var(--ring)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--ring)_18%,transparent)]";

  return (
    <>
      <PageHeader
        eyebrow="Church life"
        title="Sermons"
        description="Every message preached, with audio, video and handouts where there are any."
        actions={
          can(user, "sermons.manage") && (
            <Link
              href="/sermons/new"
              className="action-solid inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <PlusIcon className="size-4" aria-hidden />
              Add sermon
            </Link>
          )
        }
      />

      <form
        method="get"
        role="search"
        aria-label="Search sermons"
        className="bg-card border-border mb-4 grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto] lg:items-end"
      >
        <label className="text-xs font-semibold">
          Search
          <span className="relative block">
            <SearchIcon
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 mt-0.5 size-4 -translate-y-1/2"
              aria-hidden
            />
            <input
              type="search"
              name="q"
              defaultValue={filters.q}
              placeholder="Title, preacher or scripture"
              className={`${control} pl-9`}
            />
          </span>
        </label>
        <label className="text-xs font-semibold">
          Series
          <select name="series" defaultValue={filters.series ?? ""} className={control}>
            <option value="">Any series</option>
            {facets.series.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          Preacher
          <select name="preacher" defaultValue={filters.preacher ?? ""} className={control}>
            <option value="">Anyone</option>
            {facets.preachers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          Tag
          <select name="tag" defaultValue={filters.tag ?? ""} className={control}>
            <option value="">Any tag</option>
            {facets.tags.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            className="action-solid h-10 flex-1 cursor-pointer rounded-lg px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
          >
            Search
          </button>
          {filtered && (
            <Link
              href="/sermons"
              className="border-border hover:bg-muted inline-flex h-10 items-center rounded-lg border px-3 text-sm font-medium"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      {result.rows.length === 0 ? (
        <div className="bg-card border-border rounded-lg border">
          <EmptyState
            icon={<BookOpenIcon className="size-5" aria-hidden />}
            title={filtered ? "No sermons match" : "No sermons yet"}
          >
            {filtered
              ? "Try another search or clear the filters."
              : "Sermons appear here once added."}
          </EmptyState>
        </div>
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.rows.map((sermon) => (
              <li key={sermon.id}>
                <SermonCard sermon={sermon} latest={sermon.id === result.latestId} />
              </li>
            ))}
          </ul>
          {result.total > 5 && (
          <div className="bg-card border-border mt-4 rounded-lg border">
            <Pagination
              page={result.page}
              pageCount={result.pageCount}
              size={result.size}
              total={result.total}
              pathname="/sermons"
              className="border-t-0"
              params={{
                q: filters.q,
                series: filters.series,
                preacher: filters.preacher,
                tag: filters.tag,
              }}
            />
          </div>
          )}
        </>
      )}
    </>
  );
}
