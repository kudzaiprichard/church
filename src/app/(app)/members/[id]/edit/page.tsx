import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePermission } from "@/lib/auth/dal";
import { getMemberForEdit, groupOptions } from "@/lib/data/members";
import { harareToday } from "@/lib/dates";

import { PageHeader, Panel } from "../../../_components/page-parts";

import { EditMemberForm } from "./edit-member-form";

export const metadata: Metadata = { title: "Edit member" };

/**
 * An Apostle's edit of any member (docs/SCOPE.md §9.3).
 *
 * Office changes stay on the member's page, where they also end the person's
 * sessions; this form is the record itself — details, groups and baptism.
 */
export default async function EditMemberPage(props: PageProps<"/members/[id]/edit">) {
  const user = await requirePermission("members.edit");
  const { id } = await props.params;

  const [member, groups] = await Promise.all([getMemberForEdit(user, id), groupOptions()]);
  if (!member) notFound();

  return (
    <>
      <Link
        href={`/members/${member.id}`}
        className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 rounded-sm text-sm focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden />
        {member.firstName} {member.lastName}
      </Link>

      <PageHeader
        eyebrow="People"
        title={`Edit ${member.firstName} ${member.lastName}`}
        description="Changes are recorded in the audit log by field name — the log says what was changed, not the new values."
      />

      <Panel className="max-w-3xl">
        <EditMemberForm
          memberId={member.id}
          groups={groups}
          today={harareToday()}
          stored={{
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
            phone: member.phone,
            address: member.address,
            dateOfBirth: member.dateOfBirth,
            gender: member.gender,
            groupIds: member.groupIds,
            baptism: member.baptism,
          }}
        />
      </Panel>
    </>
  );
}
