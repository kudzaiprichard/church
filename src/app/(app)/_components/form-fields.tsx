import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Form controls for the member area, in the same boxed style as the sign-in
 * forms (`(auth)/_components/form-parts.tsx`), but with optional fields,
 * selects, text areas and checkbox groups — the shapes record-keeping needs.
 *
 * Plain native controls on purpose: they post through `FormData` with no
 * client state to keep in sync, work without JavaScript, and give phones their
 * own date and option pickers. Every one is validated again on the server; the
 * `required` attribute here is a courtesy, never the rule.
 */

const control = (error?: string) =>
  cn(
    "bg-background mt-1.5 w-full rounded-lg border px-3 text-sm",
    "transition-[border-color,box-shadow] duration-200 outline-none",
    "focus:ring-4 focus:ring-[color-mix(in_oklab,var(--ring)_18%,transparent)]",
    error
      ? "border-destructive focus:border-destructive"
      : "border-input focus:border-[var(--ring)]",
  );

type Common = {
  id: string;
  name: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
};

function describedBy(id: string, error?: string, hint?: string) {
  return (
    [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") ||
    undefined
  );
}

function Label({ id, label, required }: { id: string; label: string; required?: boolean }) {
  return (
    <label htmlFor={id} className="text-foreground text-sm font-medium">
      {label}
      {required && (
        <span aria-hidden className="text-destructive ml-0.5">
          *
        </span>
      )}
    </label>
  );
}

function Messages({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  return (
    <>
      {hint && !error && (
        <p id={`${id}-hint`} className="text-muted-foreground mt-1.5 text-xs text-pretty">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-destructive mt-1.5 text-xs text-pretty">
          {error}
        </p>
      )}
    </>
  );
}

export function TextField({
  id,
  name,
  label,
  error,
  hint,
  required,
  className,
  type = "text",
  defaultValue,
  autoComplete = "off",
  max,
  inputMode,
}: Common & {
  type?: "text" | "email" | "tel" | "date" | "url";
  defaultValue?: string | null;
  autoComplete?: string;
  max?: string;
  inputMode?: "text" | "tel" | "email" | "url";
}) {
  return (
    <div className={className}>
      <Label id={id} label={label} required={required} />
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? undefined}
        autoComplete={autoComplete}
        max={max}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(control(error), "h-10")}
      />
      <Messages id={id} error={error} hint={hint} />
    </div>
  );
}

export function TextAreaField({
  id,
  name,
  label,
  error,
  hint,
  required,
  className,
  defaultValue,
  rows = 3,
}: Common & { defaultValue?: string | null; rows?: number }) {
  return (
    <div className={className}>
      <Label id={id} label={label} required={required} />
      <textarea
        id={id}
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue ?? undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(control(error), "py-2 leading-relaxed")}
      />
      <Messages id={id} error={error} hint={hint} />
    </div>
  );
}

export function SelectField({
  id,
  name,
  label,
  error,
  hint,
  required,
  className,
  defaultValue,
  options,
  placeholder,
}: Common & {
  defaultValue?: string | null;
  options: readonly { value: string; label: string }[];
  /** An empty first option, for an optional choice. */
  placeholder?: string;
}) {
  return (
    <div className={className}>
      <Label id={id} label={label} required={required} />
      <select
        id={id}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(control(error), "h-10")}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Messages id={id} error={error} hint={hint} />
    </div>
  );
}

/** A set of checkboxes posting every ticked value under one name. */
export function CheckboxGroupField({
  id,
  name,
  label,
  error,
  hint,
  required,
  className,
  options,
  defaultValues = [],
}: Common & {
  options: readonly { value: string; label: string; detail?: string }[];
  defaultValues?: readonly string[];
}) {
  return (
    <fieldset
      className={className}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, error, hint)}
    >
      <legend className="text-foreground text-sm font-medium">
        {label}
        {required && (
          <span aria-hidden className="text-destructive ml-0.5">
            *
          </span>
        )}
      </legend>
      <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "border-input hover:bg-muted/60 flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
              "has-[:checked]:border-[var(--ring)] has-[:checked]:bg-secondary/60",
              "has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[color-mix(in_oklab,var(--ring)_18%,transparent)]",
            )}
          >
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={defaultValues.includes(option.value)}
              className="accent-primary mt-0.5 size-4 shrink-0"
            />
            <span className="min-w-0">
              <span className="text-foreground block font-medium">{option.label}</span>
              {option.detail && (
                <span className="text-muted-foreground block text-xs">{option.detail}</span>
              )}
            </span>
          </label>
        ))}
      </div>
      <Messages id={id} error={error} hint={hint} />
    </fieldset>
  );
}

/**
 * A titled block inside a long form, so it reads as a few short ones. Its
 * heading sits one level under whatever holds the form: an h3 inside a panel,
 * an h2 when the form is the page's own content.
 */
export function FormSection({
  title,
  description,
  level = 3,
  children,
}: {
  title: string;
  description?: ReactNode;
  level?: 2 | 3;
  children: ReactNode;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <section className="border-border grid gap-4 border-t pt-5 first:border-t-0 first:pt-0">
      <div>
        <Heading className="text-foreground text-sm font-bold">{title}</Heading>
        {description && (
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed text-pretty">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

/** A quiet success line after a save. */
export function FormSuccess({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="status"
      className="bg-success/10 text-foreground rounded-lg px-3.5 py-3 text-sm text-pretty"
    >
      {children}
    </p>
  );
}

export const GENDER_OPTIONS = [
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
] as const;
