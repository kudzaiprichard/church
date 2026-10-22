"use client";

import Link from "next/link";
import { useActionState } from "react";

import { FormError, Submit } from "@/app/(auth)/_components/form-parts";
import type { GroupRef } from "@/lib/data/members";

import { FormSuccess } from "../../_components/form-fields";
import { enrollMember } from "../actions";
import { memberIdleState, refill } from "../form-state";
import { MemberFields, type MemberDefaults } from "../member-fields";

type Candidate = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  classCompletedOn: string | null;
};

export function EnrollForm({
  groups,
  today,
  canAppoint,
  candidate,
}: {
  groups: GroupRef[];
  today: string;
  canAppoint: boolean;
  /** A baptism candidate being enrolled: pre-fills the form and is linked on save. */
  candidate?: Candidate | null;
}) {
  const [state, action] = useActionState(enrollMember, memberIdleState);
  const fromCandidate: MemberDefaults = candidate
    ? {
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email ?? undefined,
        phone: candidate.phone,
        baptism: {
          baptismDate: "",
          location: "",
          conductedBy: "",
          classCompletedOn: candidate.classCompletedOn,
          notes: null,
        },
      }
    : {};
  // The link is made once; after a successful enrolment the form is for someone new.
  const linking = candidate && !state.done;

  return (
    <div className="grid gap-5">
      <FormError>{state.error}</FormError>

      {state.done && !state.warning && (
        <FormSuccess>
          Enrolled, and their invitation is on its way. It expires in seven days, and the account
          cannot be signed in to until they have used it.{" "}
          {state.memberId && (
            <Link
              href={`/members/${state.memberId}`}
              className="text-primary font-semibold underline"
            >
              View their record
            </Link>
          )}
        </FormSuccess>
      )}

      {state.warning && (
        <div role="alert" className="bg-destructive/10 rounded-lg px-3.5 py-3 text-sm">
          <p className="text-pretty">{state.warning}</p>
          {state.inviteUrl && (
            <code className="border-border bg-background mt-3 block rounded-md border px-2.5 py-2 font-mono text-[0.7rem] break-all">
              {state.inviteUrl}
            </code>
          )}
        </div>
      )}

      {/* Keyed on the last success (empty for the next person) or the last
          failure (refilled with what was typed). */}
      <form
        key={state.submissionId ?? state.attempt ?? "new"}
        action={action}
        className="grid gap-6"
        noValidate
      >
        {linking && (
          <>
            <input type="hidden" name="candidateId" value={candidate.id} />
            <p className="bg-secondary/60 rounded-lg px-3.5 py-2.5 text-sm">
              Enrolling baptism candidate{" "}
              <span className="font-semibold">
                {candidate.firstName} {candidate.lastName}
              </span>
              . Their class record is linked when you save.
            </p>
          </>
        )}
        <MemberFields
          groups={groups}
          defaults={state.done ? {} : refill(state, fromCandidate)}
          errors={state.fieldErrors}
          today={today}
          showOffice={canAppoint}
          baptismRequired
        />
        <div className="sm:max-w-xs">
          <Submit pendingLabel="Enrolling…">Enrol and send invitation</Submit>
        </div>
      </form>
    </div>
  );
}
