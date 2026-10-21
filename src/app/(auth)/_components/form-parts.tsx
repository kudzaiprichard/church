"use client";

import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

/**
 * The bits every auth form is made of.
 *
 * Boxed fields with a soft blue focus ring, matching the public site's forms,
 * and one error style used for both field-level and form-level problems.
 */

export function Field({
  id,
  name,
  label,
  type = "text",
  autoComplete,
  defaultValue,
  error,
  autoFocus,
  hint,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  defaultValue?: string;
  error?: string;
  autoFocus?: boolean;
  hint?: string;
}) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <label
        htmlFor={id}
        className="text-foreground text-sm font-medium"
      >
        {label}
      </label>

      <input
        id={id}
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          "bg-background mt-1.5 h-10 w-full rounded-lg border px-3 text-sm",
          "transition-[border-color,box-shadow] duration-200 outline-none",
          "focus:ring-4 focus:ring-[color-mix(in_oklab,var(--ring)_18%,transparent)]",
          error ? "border-destructive focus:border-destructive" : "border-input focus:border-[var(--ring)]",
        )}
      />

      {hint && !error && (
        <p id={`${id}-hint`} className="text-muted-foreground mt-1.5 text-xs">
          {hint}
        </p>
      )}

      {error && (
        <p id={`${id}-error`} className="text-destructive mt-1.5 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormError({ children }: { children?: string }) {
  if (!children) return null;

  return (
    <p
      role="alert"
      className="bg-destructive/10 text-destructive rounded-lg px-3.5 py-3 text-sm text-pretty"
    >
      {children}
    </p>
  );
}

/**
 * The submit button reads the parent form's pending state, so it disables and
 * relabels itself without the page having to thread that state down.
 */
export function Submit({ children, pendingLabel }: { children: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "action-solid mt-1 h-11 w-full cursor-pointer rounded-lg px-6 text-sm font-semibold",
        // Flat: the hover and press are steps in the fill (see `action-solid`
        // in globals.css), with nothing raised and no shadow.
        "transition-colors duration-200 ease-out",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-55",
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
