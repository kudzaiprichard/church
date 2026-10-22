import type { Metadata } from "next";

import { requirePermission } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { candidateForEnrolment } from "@/lib/data/baptism";
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
 * the form, in `enrollMember`. `?candidate=` pre-fills it from a baptism
 * candidate and links the two when it is saved.
 */
export default async function EnrollPage(props: PageProps<"/members/new">) {
  const user = await requirePermission("members.enroll");
  const { candidate: candidateParam } = await props.searchParams;
  const [groups, candidate] = await Promise.all([
    groupOptions(),
    typeof candidateParam === "string" ? candidateForEnrolment(user, candidateParam) : null,
  ]);

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
          candidate={
            candidate && {
              id: candidate.id,
              firstName: candidate.firstName,
              lastName: candidate.lastName,
              email: candidate.email,
              phone: candidate.phone,
              classCompletedOn: candidate.classCompletedOn,
            }
          }
        />
      </Panel>
    </>
  );
}
