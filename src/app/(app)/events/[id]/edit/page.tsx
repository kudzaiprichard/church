import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requirePermission } from "@/lib/auth/dal";
import { getEventForEdit } from "@/lib/data/events";
import { groupOptions } from "@/lib/data/members";

import { PageHeader, Panel } from "../../../_components/page-parts";
import { DeleteEventForm, DuplicateEventForm, EventForm } from "../../event-form";

export const metadata: Metadata = { title: "Edit event" };

/** Apostles only; each action checks again. */
export default async function EditEventPage(props: PageProps<"/events/[id]/edit">) {
  const user = await requirePermission("events.manage");
  const { id } = await props.params;

  const [event, groups] = await Promise.all([getEventForEdit(user, id), groupOptions()]);
  if (!event) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Events"
        title={`Edit ${event.title}`}
        description="Changing the date, time, place or audience notifies everyone it is for."
      />
      <div className="grid max-w-3xl gap-4">
        <Panel>
          <EventForm groups={groups} stored={event} />
        </Panel>
        <Panel title="Duplicate" description="Repeat it on another day.">
          <DuplicateEventForm eventId={event.id} />
        </Panel>
        <Panel
          title="Delete"
          description={
            event.attendanceCount > 0
              ? `Attendance has been taken for ${event.attendanceCount} people; you will be asked to confirm.`
              : undefined
          }
        >
          <DeleteEventForm eventId={event.id} />
        </Panel>
      </div>
    </>
  );
}
