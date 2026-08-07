"use client";

import Link from "next/link";
import { useActionState } from "react";

import { signIn } from "../actions";
import { authIdleState } from "../form-state";
import { Field, FormError, Submit } from "../_components/form-parts";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, authIdleState);

  return (
    <form action={action} className="grid gap-6">
      {/* Where the proxy was sending them before it asked who they were. The
          action re-validates this — a value arriving from the URL is never
          trusted to be a path on this site. */}
      {next && <input type="hidden" name="next" value={next} />}

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

      <Field
        id="password"
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        error={state.fieldErrors?.password}
      />

      <Submit pendingLabel="Signing in…">Sign in</Submit>

      <p className="text-center">
        <Link
          href="/forgot-password"
          className="focus-visible:ring-ring text-muted-foreground hover:text-foreground rounded-sm text-xs underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          I have forgotten my password
        </Link>
      </p>
    </form>
  );
}
