import type { Metadata } from "next";

import { requirePermission } from "@/lib/auth/dal";
import { groupOptions } from "@/lib/data/members";

import { PageHeader, Panel } from "../../_components/page-parts";
import { EventForm } from "../event-form";

export const metadata: Metadata = { title: "New event" };

/** Apostles only (SCOPE §11 Q9); `createEvent` checks again. */
export default async function NewEventPage() {
  await requirePermission("events.manage");
  const groups = await groupOptions();

  return (
    <>
      <PageHeader
        eyebrow="Events"
        title="New event"
        description="For the whole church or one group. Everyone it is for is notified."
      />
      <Panel className="max-w-3xl">
        <EventForm groups={groups} />
      </Panel>
    </>
  );
}
