"use client";

import { useActionState } from "react";

import { Field, FormError, Submit } from "@/app/(auth)/_components/form-parts";
import { ROLES, ROLE_LABELS } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

import { inviteMember } from "./actions";
import { memberIdleState } from "./form-state";

/** `canAppoint` shows the office picker; the action enforces it regardless. */
export function InviteForm({ canAppoint }: { canAppoint: boolean }) {
  const [state, action] = useActionState(inviteMember, memberIdleState);

  return (
    <div className="grid gap-4">
      <FormError>{state.error}</FormError>

      {state.done && !state.warning && (
        <p
          role="status"
          className="bg-success/10 text-foreground rounded-lg px-3.5 py-3 text-sm text-pretty"
        >
          Invitation sent. It expires in seven days, and the account cannot be signed in to until
          they have used it.
        </p>
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

      {/* Keyed on the last successful send, so a success remounts the form and
          the fields come back empty ready for the next invitation. */}
      <form key={state.submissionId ?? "new"} action={action} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
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

        {canAppoint ? (
          <div>
            <label htmlFor="role" className="text-foreground text-sm font-medium">
              Office
            </label>
            <select
              id="role"
              name="role"
              defaultValue="MEMBER"
              className={cn(
                "border-input bg-background mt-1.5 h-10 w-full rounded-lg border px-3 text-sm",
                "transition-[border-color,box-shadow] duration-200 outline-none",
                "focus:border-[var(--ring)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--ring)_18%,transparent)]",
              )}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            <p className="text-muted-foreground mt-1.5 text-xs text-pretty">
              Apostles see everything; the Matron enrols and keeps baptismal records; the Elder
              oversees church finance. Most people are Members.
            </p>
            {state.fieldErrors?.role && (
              <p className="text-destructive mt-1.5 text-xs">{state.fieldErrors.role}</p>
            )}
          </div>
        ) : (
          <input type="hidden" name="role" value="MEMBER" />
        )}

        <Submit pendingLabel="Sending…">Send invitation</Submit>
      </form>
    </div>
  );
}
