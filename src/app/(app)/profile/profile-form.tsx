"use client";

import { useActionState } from "react";

import { Submit } from "@/app/(auth)/_components/form-parts";
import type { Gender } from "@/generated/prisma/enums";

import {
  FormSuccess,
  GENDER_OPTIONS,
  SelectField,
  TextAreaField,
  TextField,
} from "../_components/form-fields";

import { updateOwnProfile } from "./actions";
import { profileIdleState } from "./form-state";

export function ProfileForm({
  stored,
  today,
}: {
  stored: {
    phone: string | null;
    address: string | null;
    dateOfBirth: string | null;
    gender: Gender | null;
  };
  today: string;
}) {
  const [state, action] = useActionState(updateOwnProfile, profileIdleState);
  // After a failure, what was typed; otherwise the saved record (which the
  // page re-reads after a successful save).
  const shown = state.values ?? stored;

  return (
    <form key={state.attempt ?? "stored"} action={action} className="grid gap-4" noValidate>
      {state.done && <FormSuccess>Saved.</FormSuccess>}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          label="Phone"
          autoComplete="tel"
          defaultValue={shown.phone}
          error={state.fieldErrors?.phone}
        />
        <TextField
          id="dateOfBirth"
          name="dateOfBirth"
          type="date"
          label="Date of birth"
          autoComplete="bday"
          max={today}
          defaultValue={shown.dateOfBirth}
          error={state.fieldErrors?.dateOfBirth}
          hint="Fellow members see the day and month on the birthday calendar — never the year."
        />
        <SelectField
          id="gender"
          name="gender"
          label="Gender"
          placeholder="Prefer not to say"
          options={GENDER_OPTIONS}
          defaultValue={shown.gender}
          error={state.fieldErrors?.gender}
        />
      </div>
      <TextAreaField
        id="address"
        name="address"
        label="Address"
        rows={2}
        defaultValue={shown.address}
        error={state.fieldErrors?.address}
      />

      <div className="sm:max-w-xs">
        <Submit pendingLabel="Saving…">Save</Submit>
      </div>
    </form>
  );
}
