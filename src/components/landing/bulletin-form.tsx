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

      <div className="flex items-end gap-3">
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
            "min-w-0 flex-1 rounded-none border-0 border-b bg-transparent px-0 pb-2 text-sm text-white",
            "placeholder:text-white/35 transition-[border-color] duration-200 outline-none",
            "focus:border-b-2 focus:pb-1.5",
            error ? "border-red-300" : "border-white/30 focus:border-white",
          )}
        />
        <button
          type="submit"
          disabled={pending}
          className={cn(
            "shrink-0 rounded-md border border-white/25 px-4 py-2 text-sm text-white/85",
            "transition-[background-color,border-color,color] duration-200",
            "hover:border-white/50 hover:bg-white/10 hover:text-white",
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
