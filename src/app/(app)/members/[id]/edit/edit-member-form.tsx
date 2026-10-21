"use client";

import { useActionState } from "react";

import { FormError, Submit } from "@/app/(auth)/_components/form-parts";
import type { GroupRef } from "@/lib/data/members";

import { updateMember } from "../../actions";
import { memberIdleState, refill } from "../../form-state";
import { MemberFields, type MemberDefaults } from "../../member-fields";

export function EditMemberForm({
  memberId,
  groups,
  stored,
  today,
}: {
  memberId: string;
  groups: GroupRef[];
  stored: MemberDefaults;
  today: string;
}) {
  const [state, action] = useActionState(updateMember.bind(null, memberId), memberIdleState);

  return (
    <div className="grid gap-5">
      <FormError>{state.error}</FormError>

      {/* On success the action redirects to the member's page; this only
          remounts after a failure, refilled with what was typed. */}
      <form key={state.attempt ?? "stored"} action={action} className="grid gap-6" noValidate>
        <MemberFields
          groups={groups}
          defaults={refill(state, stored)}
          errors={state.fieldErrors}
          today={today}
          showOffice={false}
          baptismRequired={Boolean(stored.baptism)}
        />
        <div className="sm:max-w-xs">
          <Submit pendingLabel="Saving…">Save changes</Submit>
        </div>
      </form>
    </div>
  );
}
