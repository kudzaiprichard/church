"use client";

import { useActionState } from "react";

import { Field, FormError, Submit } from "@/app/(auth)/_components/form-parts";
import { cn } from "@/lib/utils";

import { inviteMember } from "./actions";
import { memberIdleState } from "./form-state";

export function InviteForm() {
  const [state, action] = useActionState(inviteMember, memberIdleState);

  return (
    <div className="grid gap-6">
      <FormError>{state.error}</FormError>

      {state.done && !state.warning && (
        <p
          role="status"
          className="border-foreground/15 bg-accent/40 rounded-md border px-3.5 py-3 text-sm text-pretty"
        >
          Invitation sent. It expires in seven days, and the account cannot be signed in to until
          they have used it.
        </p>
      )}

      {state.warning && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 rounded-md border px-3.5 py-3 text-sm"
        >
          <p className="text-pretty">{state.warning}</p>

          {state.inviteUrl && (
            <code className="border-foreground/15 bg-background/60 mt-3 block rounded border px-2.5 py-2 font-mono text-[0.7rem] break-all">
              {state.inviteUrl}
            </code>
          )}
        </div>
      )}

      {/* Keyed on the last successful send, so a success remounts the form and
          the fields come back empty ready for the next invitation. */}
      <form key={state.submissionId ?? "new"} action={action} className="grid gap-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            id="firstName"
            name="firstName"
            label="First name"
            autoComplete="off"
            error={state.fieldErrors?.firstName}
          />
          <Field
            id="lastName"
            name="lastName"
            label="Last name"
            autoComplete="off"
            error={state.fieldErrors?.lastName}
          />
        </div>

        <Field
          id="invite-email"
          name="email"
          type="email"
          label="Email"
          autoComplete="off"
          error={state.fieldErrors?.email}
        />

        <div>
          <label
            htmlFor="role"
            className="text-muted-foreground font-mono text-[0.65rem] tracking-[0.2em] uppercase"
          >
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue="MEMBER"
            className={cn(
              "mt-2 w-full rounded-none border-0 border-b bg-transparent px-0 pt-1 pb-2.5 text-sm",
              "border-foreground/25 transition-[border-color] duration-200 outline-none",
              "focus:border-b-2 focus:border-[var(--ring)] focus:pb-2",
            )}
          >
            <option value="MEMBER">Member — sees only their own records</option>
            <option value="ADMIN">Administrator — sees everything</option>
          </select>
          <p className="text-muted-foreground mt-2 text-xs text-pretty">
            Administrators can see every member&apos;s giving, attendance and messages. Give it out
            sparingly.
          </p>
        </div>

        <Submit pendingLabel="Sending…">Send invitation</Submit>
      </form>
    </div>
  );
}
