"use client";

import Link from "next/link";
import { useActionState } from "react";

import { requestPasswordReset } from "../actions";
import { authIdleState } from "../form-state";
import { Field, FormError, Submit } from "../_components/form-parts";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, authIdleState);

  // Deliberately the same message whether or not the address is on file. The
  // action behaves the same way for the same reason.
  if (state.done) {
    return (
      <div role="status" className="grid gap-6">
        <p className="text-sm leading-relaxed text-pretty">
          If that address has an account here, a link is on its way. It expires in an hour and can
          be used once.
        </p>
        <p className="text-muted-foreground text-sm text-pretty">
          Nothing arrived? Check the spam folder, then ask the church office — an account that has
          never been activated cannot be reset this way.
        </p>
        <Link
          href="/login"
          className="focus-visible:ring-ring rounded-sm text-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-6">
      <FormError>{state.error}</FormError>

      <Field
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        autoFocus
        error={state.fieldErrors?.email}
      />

      <Submit pendingLabel="Sending…">Send the link</Submit>

      <p className="text-center">
        <Link
          href="/login"
          className="focus-visible:ring-ring text-muted-foreground hover:text-foreground rounded-sm text-xs underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
