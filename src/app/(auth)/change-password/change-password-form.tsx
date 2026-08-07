"use client";

import { useActionState } from "react";

import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-rules";

import { changePassword } from "../actions";
import { authIdleState } from "../form-state";
import { Field, FormError, Submit } from "../_components/form-parts";

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const [state, action] = useActionState(changePassword, authIdleState);

  return (
    <form action={action} className="grid gap-6">
      <FormError>{state.error}</FormError>

      {/* A forced change follows an admin reset, so the person does not
          meaningfully "know" the current password — asking for it would only
          be a hurdle. Everywhere else it is the check that stops a borrowed
          browser being used to take the account over. */}
      {!forced && (
        <Field
          id="current"
          name="current"
          type="password"
          label="Current password"
          autoComplete="current-password"
          autoFocus
          error={state.fieldErrors?.current}
        />
      )}

      <Field
        id="password"
        name="password"
        type="password"
        label="New password"
        autoComplete="new-password"
        autoFocus={forced}
        hint={`At least ${PASSWORD_MIN_LENGTH} characters. Length is what matters — a few ordinary words you will remember beat one short word with symbols in it.`}
        error={state.fieldErrors?.password}
      />

      <Field
        id="confirm"
        name="confirm"
        type="password"
        label="Confirm new password"
        autoComplete="new-password"
        error={state.fieldErrors?.confirm}
      />

      <Submit pendingLabel="Saving…">Save password</Submit>
    </form>
  );
}
