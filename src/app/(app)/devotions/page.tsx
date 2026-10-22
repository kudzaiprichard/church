import { PlusIcon, SearchIcon, SunriseIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { requireSession } from "@/lib/auth/dal";
import { listDevotions, type DevotionTab } from "@/lib/data/devotions";
import { formatDateOnly } from "@/lib/dates";
import { cn } from "@/lib/utils";

import { EmptyState, PageHeader } from "../_components/page-parts";

export const metadata: Metadata = { title: "Devotions" };

const TABS: { id: DevotionTab; label: string }[] = [
  { id: "published", label: "Published" },
  { id: "scheduled", label: "Scheduled" },
  { id: "drafts", label: "Drafts" },
];

/**
 * The devotions feed (docs/SCOPE.md §9.14): published ones, newest first, with
 * a Latest badge on today's. Apostles also get Scheduled and Drafts tabs.
 * "Published" means on or before Harare's today, decided in the query.
 */
export default async function DevotionsPage(props: PageProps<"/devotions">) {
  const user = await requireSession();
  const params = await props.searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 100) : undefined;
  const tabParam = TABS.find((tab) => tab.id === params.tab)?.id;

  const feed = await listDevotions(user, { q, tab: tabParam });
  const latestId = feed.tab === "published" ? feed.rows[0]?.id : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Church life"
        title="Devotions"
        description="A word for each day from the Apostles."
        actions={
          feed.manages && (
            <Link
              href="/devotions/new"
              className="action-solid inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <PlusIcon className="size-4" aria-hidden />
              New devotion
            </Link>
          )
        }
      />

      {feed.manages && (
        <nav aria-label="Devotions" className="border-border mb-4 flex gap-1 border-b">
          {TABS.map((tab) => (
            <Link
              key={tab.id}
              href={tab.id === "published" ? "/devotions" : `/devotions?tab=${tab.id}`}
              aria-current={feed.tab === tab.id ? "page" : undefined}
              className={cn(
                "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
                feed.tab === tab.id
                  ? "border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      )}

      <form method="get" role="search" className="mb-4 max-w-md">
        {feed.tab !== "published" && <input type="hidden" name="tab" value={feed.tab} />}
        <label className="relative block">
          <span className="sr-only">Search devotions</span>
          <SearchIcon
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by title or scripture"
            className="border-input bg-background h-10 w-full rounded-lg border pr-3 pl-9 text-sm outline-none focus:border-[var(--ring)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--ring)_18%,transparent)]"
          />
        </label>
      </form>

      {feed.rows.length === 0 ? (
        <div className="bg-card border-border rounded-lg border">
          <EmptyState icon={<SunriseIcon className="size-5" aria-hidden />} title="Nothing here yet">
            {q
              ? "No devotion matches that search."
              : "Devotions appear here on the day they are published."}
          </EmptyState>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {feed.rows.map((devotion) => (
            <li key={devotion.id}>
              <Link
                href={`/devotions/${devotion.id}`}
                className="bg-card border-border hover:border-primary/40 flex h-full flex-col rounded-lg border p-5 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
              >
                <p className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted-foreground">
                    {devotion.publishOn ? formatDateOnly(devotion.publishOn) : "No date"}
                  </span>
                  {devotion.id === latestId && (
                    <span className="bg-brass/25 text-accent-foreground rounded-md px-1.5 py-0.5 font-semibold">
                      Latest
                    </span>
                  )}
                  {devotion.status !== "PUBLISHED" && (
                    <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 font-semibold">
                      {devotion.status === "DRAFT" ? "Draft" : "Scheduled"}
                    </span>
                  )}
                </p>
                <h2 className="text-foreground mt-2 text-base font-bold">{devotion.title}</h2>
                <p className="text-accent-foreground mt-1 text-xs font-semibold tracking-wide uppercase">
                  {devotion.scriptureRef}
                </p>
                <p className="text-muted-foreground mt-3 line-clamp-3 text-sm leading-relaxed">
                  {devotion.firstParagraph}
                </p>
                <p className="text-muted-foreground mt-auto pt-3 text-xs">{devotion.author}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
