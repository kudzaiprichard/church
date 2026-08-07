"use client";

import Link from "next/link";
import { useEffect } from "react";

import { StatusPage } from "@/components/status/status-page";
import { Button } from "@/components/ui/button";

/**
 * An error inside the member area.
 *
 * Scoped here rather than left to the root boundary so the failure is confined
 * to the panel: the rail and the top bar survive, and somebody whose giving
 * page threw can still navigate away instead of being dropped onto a bare
 * screen with a link home.
 */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error.digest ?? error.message);
  }, [error]);

  return (
    <StatusPage
      tone="alarm"
      code="500"
      title="This page could not be loaded"
      description={
        <>
          Something failed while fetching what this page needs. Your data is unaffected.
          {error.digest && (
            <>
              {" "}
              Quote <span className="numeric text-foreground">{error.digest}</span> if you report it.
            </>
          )}
        </>
      }
    >
      <Button size="sm" onClick={() => retry()}>
        Try again
      </Button>

      <Button asChild size="sm" variant="ghost">
        <Link href="/dashboard">Back to the dashboard</Link>
      </Button>
    </StatusPage>
  );
}
