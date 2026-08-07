import Link from "next/link";

import { StatusPage } from "@/components/status/status-page";
import { Button } from "@/components/ui/button";

/**
 * A 404 inside the member area.
 *
 * Separate from the public one so the rail, top bar and breadcrumb stay put —
 * somebody who mistyped a URL while signed in has not left the application,
 * and should not be shown a page that looks like they have.
 *
 * This is also what `notFound()` renders when a record is missing *or* when it
 * belongs to somebody else. Answering both cases identically is deliberate: a
 * 403 would confirm that the record exists, which is exactly the fact a member
 * probing another member's id is trying to establish.
 */
export default function AppNotFound() {
  return (
    <StatusPage
      code="404"
      title="We could not find that"
      description="The page or record you asked for either does not exist or is not yours to see."
    >
      <Button asChild size="sm">
        <Link href="/dashboard">Back to the dashboard</Link>
      </Button>
    </StatusPage>
  );
}
