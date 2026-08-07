"use client";

import { useActionState } from "react";

import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password-rules";

import { authIdleState, type AuthFormState } from "../form-state";
import { Field, FormError, Submit } from "./form-parts";

/**
 * Choosing a password from an emailed link.
 *
 * Shared by the invitation and the reset, because from the person's side they
 * are the same task — the only difference is the wording around it and which
 * action was bound to the token.
 */
export function SetPasswordForm({
  action,
  submitLabel,
}: {
  action: (previous: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, authIdleState);

  return (
    <form action={formAction} className="grid gap-6">
      <FormError>{state.error}</FormError>

      <Field
        id="password"
        name="password"
        type="password"
        label="Password"
        autoComplete="new-password"
        autoFocus
        hint={`At least ${PASSWORD_MIN_LENGTH} characters. Length is what matters — a few ordinary words you will remember beat one short word with symbols in it.`}
        error={state.fieldErrors?.password}
      />

      <Field
        id="confirm"
        name="confirm"
        type="password"
        label="Confirm password"
        autoComplete="new-password"
        error={state.fieldErrors?.confirm}
      />

      <Submit pendingLabel="Saving…">{submitLabel}</Submit>
    </form>
  );
}
