import type { Metadata } from "next";

import { requirePermission } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { groupOptions } from "@/lib/data/members";
import { harareToday } from "@/lib/dates";

import { PageHeader, Panel } from "../../_components/page-parts";

import { EnrollForm } from "./enroll-form";

export const metadata: Metadata = { title: "Enrol a member" };

/**
 * Enrolment — the only way into the portal (docs/SCOPE.md §9.3).
 *
 * Apostles and the Matron. There is no public sign-up, and only the baptized
 * may be enrolled: the baptism date is required here and again, regardless of
 * the form, in `enrollMember`.
 */
export default async function EnrollPage() {
  const user = await requirePermission("members.enroll");
  const groups = await groupOptions();

  return (
    <>
      <PageHeader
        eyebrow="People"
        title="Enrol a member"
        description="Add a baptized member to the roll. They will get an email with a link to choose their own password — no password is ever sent to them."
      />

      <Panel className="max-w-3xl">
        <EnrollForm
          groups={groups}
          today={harareToday()}
          canAppoint={can(user, "members.setRole")}
        />
      </Panel>
    </>
  );
}
