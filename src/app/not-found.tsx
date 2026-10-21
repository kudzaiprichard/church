import type { Metadata } from "next";
import Link from "next/link";

import { ActionLink } from "@/components/landing/action";
import { StatusPage } from "@/components/status/status-page";
import { church } from "@/lib/church";

export const metadata: Metadata = {
  title: "Page not found",
};

/**
 * The public 404.
 *
 * Reached by a mistyped address or a link that has moved, so the tone is
 * apologetic rather than alarmed and the way out is the thing a visitor most
 * likely wanted anyway — service times, or a way to speak to somebody.
 *
 * Next renders this inside the root layout, which is why there is no nav here:
 * adding one would mean reading the session, and a 404 should not need a
 * database to render.
 */
export default function NotFound() {
  return (
    <main className="page-wash flex-1">
      <StatusPage
        code="404"
        title="We could not find that page"
        description={
          <>
            The address may have changed, or it may never have existed. Nothing is broken — you have
            simply arrived somewhere we have not built.
          </>
        }
      >
        <ActionLink href="/" className="px-5 py-2.5 text-[0.8rem]">
          Back to the site
        </ActionLink>

        <Link
          href={`mailto:${church.email}`}
          className="focus-visible:ring-ring text-muted-foreground hover:text-foreground rounded-sm px-2 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          Tell the office
        </Link>
      </StatusPage>
    </main>
  );
}
