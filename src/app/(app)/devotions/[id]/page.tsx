import { ArrowLeftIcon, ArrowRightIcon, PencilIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { getDevotion } from "@/lib/data/devotions";
import { formatDateOnly } from "@/lib/dates";

export const metadata: Metadata = { title: "Devotion" };

/**
 * One devotion (docs/SCOPE.md §9.14). For a reader, `getDevotion` returns
 * `null` for a draft or one scheduled for a later Harare day — so a link to
 * tomorrow's devotion is a 404 today.
 */
export default async function DevotionPage(props: PageProps<"/devotions/[id]">) {
  const user = await requireSession();
  const { id } = await props.params;

  const devotion = await getDevotion(user, id);
  if (!devotion) notFound();

  return (
    <article className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href="/devotions"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 rounded-sm text-sm focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
        >
          <ArrowLeftIcon className="size-3.5" aria-hidden />
          Devotions
        </Link>
        {can(user, "devotions.manage") && (
          <Link
            href={`/devotions/${devotion.id}/edit`}
            className="border-border bg-card hover:bg-muted inline-flex h-9 items-center gap-2 rounded-md border px-3.5 text-sm font-semibold transition-colors"
          >
            <PencilIcon className="size-3.5" aria-hidden />
            Edit
          </Link>
        )}
      </div>

      <p className="text-accent-foreground inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] uppercase">
        <span aria-hidden className="bg-brass size-1.5 rounded-full" />
        {devotion.publishOn ? formatDateOnly(devotion.publishOn) : "Draft"}
        {devotion.status === "SCHEDULED" && " · scheduled"}
      </p>
      <h1 className="text-navy mt-3 font-serif text-3xl leading-tight font-bold text-balance sm:text-4xl">
        {devotion.title}
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">{devotion.author}</p>

      <blockquote className="border-brass bg-card mt-6 rounded-r-xl border-l-4 px-5 py-4">
        <p className="text-foreground font-serif text-lg leading-snug italic">
          &ldquo;{devotion.scriptureQuote}&rdquo;
        </p>
        <footer className="text-accent-foreground mt-2 text-xs font-semibold tracking-[0.14em] uppercase">
          {devotion.scriptureRef}
        </footer>
      </blockquote>

      <div className="text-foreground mt-6 grid gap-4 text-base leading-relaxed">
        {devotion.paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 40)}>{paragraph}</p>
        ))}
      </div>

      {(devotion.previous || devotion.next) && (
        <nav
          aria-label="More devotions"
          className="border-border mt-10 flex justify-between gap-4 border-t pt-4 text-sm"
        >
          {devotion.previous ? (
            <Link
              href={`/devotions/${devotion.previous.id}`}
              className="text-primary inline-flex items-center gap-1.5 hover:underline"
            >
              <ArrowLeftIcon className="size-3.5" aria-hidden />
              {devotion.previous.title}
            </Link>
          ) : (
            <span />
          )}
          {devotion.next && (
            <Link
              href={`/devotions/${devotion.next.id}`}
              className="text-primary inline-flex items-center gap-1.5 text-right hover:underline"
            >
              {devotion.next.title}
              <ArrowRightIcon className="size-3.5" aria-hidden />
            </Link>
          )}
        </nav>
      )}
    </article>
  );
}
