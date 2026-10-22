"use client";

import { useActionState } from "react";

import { FormError, Submit } from "@/app/(auth)/_components/form-parts";
import { PRAYER_MAX } from "@/lib/prayer/rules";

import { FormSuccess, TextAreaField } from "../_components/form-fields";

import { postRequest } from "./actions";
import { prayerIdleState } from "./form-state";

export function PrayerForm({ groupId, groupName }: { groupId: string; groupName: string }) {
  const [state, action] = useActionState(postRequest, prayerIdleState);

  return (
    <form key={state.attempt ?? "empty"} action={action} className="grid gap-3" noValidate>
      <FormError>{state.error}</FormError>
      {state.done && <FormSuccess>Posted. Your group can pray with you.</FormSuccess>}
      <input type="hidden" name="groupId" value={groupId} />
      <TextAreaField
        id={`prayer-${groupId}`}
        name="body"
        label={`Ask ${groupName} to pray`}
        rows={3}
        defaultValue={state.body}
        error={state.fieldErrors?.body}
        hint={`Seen only by ${groupName}'s members and the Apostles. Up to ${PRAYER_MAX.toLocaleString("en-GB")} characters.`}
      />
      <div className="sm:max-w-[12rem]">
        <Submit pendingLabel="Posting…">Post request</Submit>
      </div>
    </form>
  );
}
