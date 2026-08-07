"use client";

import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

/**
 * The bits every auth form is made of.
 *
 * Underlined fields rather than boxed ones, matching the public site's forms,
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
        className="text-muted-foreground font-mono text-[0.65rem] tracking-[0.2em] uppercase"
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
          "mt-2 w-full rounded-none border-0 border-b bg-transparent px-0 pt-1 pb-2.5 text-sm",
          "transition-[border-color,background-color] duration-200 outline-none",
          "focus:border-b-2 focus:bg-[color-mix(in_oklab,var(--accent)_35%,transparent)] focus:pb-2",
          error
            ? "border-destructive focus:border-destructive"
            : "border-foreground/25 focus:border-[var(--ring)]",
        )}
      />

      {hint && !error && (
        <p id={`${id}-hint`} className="text-muted-foreground mt-2 text-xs">
          {hint}
        </p>
      )}

      {error && (
        <p id={`${id}-error`} className="text-destructive mt-2 text-xs">
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
      className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3.5 py-3 text-sm text-pretty"
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
        "bg-primary text-primary-foreground mt-1 w-full rounded-md px-6 py-3 text-sm font-medium tracking-wide",
        // Flat: the hover and press are steps in the fill, with nothing raised
        // and no shadow. Mixing towards the foreground deepens it on paper and
        // lifts it on ink, so one rule works in both themes.
        "transition-colors duration-200 ease-out",
        "hover:bg-[color-mix(in_oklab,var(--primary)_88%,var(--foreground))]",
        "active:bg-[color-mix(in_oklab,var(--primary)_78%,var(--foreground))]",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-55",
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
