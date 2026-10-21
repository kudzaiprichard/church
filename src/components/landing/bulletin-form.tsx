"use client";

import { useActionState, useId } from "react";

import { idleState, subscribeToBulletin } from "@/app/actions";
import { cn } from "@/lib/utils";

/**
 * One field, in the footer, on the dark ground. Same Server Action pattern as
 * the visit form, so it also survives having no JavaScript.
 */
export function BulletinForm() {
  const [state, formAction, pending] = useActionState(subscribeToBulletin, idleState);
  const fieldId = useId();

  if (state.status === "sent") {
    return (
      <p role="status" className="text-sm text-white/70">
        You&apos;re on the list. The first one arrives on Friday.
      </p>
    );
  }

  const error = state.errors?.email ?? state.message;

  return (
    <form action={formAction} className="max-w-sm">
      <div className="absolute -left-[9999px]" aria-hidden>
        <label htmlFor={`${fieldId}-company`}>Company</label>
        <input id={`${fieldId}-company`} name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <label htmlFor={fieldId} className="sr-only">
        Email address for the weekly bulletin
      </label>

      <div className="flex gap-2">
        <input
          id={fieldId}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          className={cn(
            "h-10 min-w-0 flex-1 rounded-lg border bg-white/10 px-3 text-sm text-white",
            "placeholder:text-white/40 transition-[border-color,background-color] duration-200 outline-none",
            "focus:bg-white/15",
            error ? "border-red-300" : "border-white/15 focus:border-white/50",
          )}
        />
        <button
          type="submit"
          disabled={pending}
          className={cn(
            "action-gold h-10 shrink-0 rounded-lg px-4 text-sm font-semibold",
            "transition-colors duration-200",
            "focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ink)] focus-visible:outline-none",
            "disabled:pointer-events-none disabled:opacity-55",
          )}
        >
          {pending ? "…" : "Sign up"}
        </button>
      </div>

      {error && (
        <p id={`${fieldId}-error`} role="alert" className="mt-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </form>
  );
}
