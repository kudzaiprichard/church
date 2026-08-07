import Link from "next/link";

import { church } from "@/lib/church";

import { Closing } from "./closing";

/**
 * The shell both legal pages sit in. Same ink rule, same type, no nav — these
 * are read once and left, so the page's job is to be quiet and legible rather
 * than to keep offering the visitor somewhere else to go.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="mx-auto w-full max-w-2xl px-6 py-16 sm:px-8 lg:py-24">
        <Link
          href="/"
          className="focus-visible:ring-ring text-muted-foreground hover:text-foreground inline-flex items-center gap-2 rounded-sm font-mono text-[0.7rem] tracking-[0.2em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <svg viewBox="0 0 16 16" aria-hidden focusable="false" className="size-3">
            <path
              d="M14 8H3M7 4L3 8l4 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {church.shortName}
        </Link>

        <h1 className="mt-10 text-4xl leading-tight text-balance sm:text-5xl">{title}</h1>
        <p className="text-muted-foreground mt-4 font-mono text-[0.65rem] tracking-[0.2em] uppercase">
          Last updated {updated}
        </p>

        <div
          role="note"
          className="border-foreground/15 bg-accent/40 mt-10 rounded-lg border p-5 text-sm leading-relaxed text-pretty"
        >
          <strong className="font-heading">Placeholder.</strong> This text describes what the site
          actually does, but it has not been through a lawyer. Have it reviewed against Zimbabwean
          data protection law before the site goes live.
        </div>

        <div className="mt-12 space-y-10 text-pretty [&_a]:underline [&_a]:decoration-[var(--brass)] [&_a]:underline-offset-4 [&_h2]:font-heading [&_h2]:mb-3 [&_h2]:text-xl [&_li]:leading-relaxed [&_p]:leading-relaxed [&_p+p]:mt-4 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          {children}
        </div>
      </main>

      <Closing />
    </>
  );
}
