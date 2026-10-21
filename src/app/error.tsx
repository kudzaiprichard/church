"use client";

import Link from "next/link";
import { useEffect } from "react";

import { ActionButton } from "@/components/landing/action";
import { StatusPage } from "@/components/status/status-page";

/**
 * The public error boundary — anything that throws below the root layout.
 *
 * Error boundaries have to be Client Components, so this cannot read the
 * session or the database. That is a feature here: the most likely reason to
 * be looking at this page is that the database is exactly what went wrong.
 *
 * Note `retry` rather than `reset`. In this version of Next `retry()` re-fetches
 * and re-renders the boundary's children, where `reset()` only clears the error
 * state without re-fetching — which for a failed query would simply throw
 * again. `reset` still exists, but `retry` is what recovery actually needs.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Server-thrown errors reach the client stripped of their message, leaving
    // only `digest` — which is the value that matches the server log. Printing
    // it is what makes a user's screenshot traceable to a real stack trace.
    console.error("[error]", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="page-wash flex-1">
      <StatusPage
        tone="alarm"
        code="500"
        title="Something went wrong at our end"
        description={
          <>
            This is a fault here, not anything you did. Trying again often works — a good deal of
            what causes this is momentary.
            {error.digest && (
              <>
                {" "}
                If you need to report it, quote{" "}
                <span className="numeric text-foreground">{error.digest}</span>.
              </>
            )}
          </>
        }
      >
        <ActionButton type="button" onClick={() => retry()} className="px-5 py-2.5 text-[0.8rem]">
          Try again
        </ActionButton>

        <Link
          href="/"
          className="focus-visible:ring-ring text-muted-foreground hover:text-foreground rounded-sm px-2 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          Back to the site
        </Link>
      </StatusPage>
    </main>
  );
}
