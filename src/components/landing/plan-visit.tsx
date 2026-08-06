"use client";

import { useActionState, useId } from "react";

import { idleState, planVisit } from "@/app/actions";
import { church, services } from "@/lib/church";
import { cn } from "@/lib/utils";

import { ActionButton } from "./action";
import { Reveal } from "./reveal";
import { SectionRule } from "./section-rule";

const serviceChoices = [
  ...services.map((service) => ({
    value: `${service.day} ${service.time}`,
    label: `${service.day} ${service.time} — ${service.name}`,
  })),
  { value: "Not sure yet", label: "Not sure yet" },
];

/**
 * The page ends on an invitation rather than a list.
 *
 * Centred and on one narrow measure, which nothing else in the light half of
 * the page is: this used to be another two-lane section with a bordered card
 * on the right, and next to the teaching section it read as the same thing
 * twice. The card is gone too — the form sits straight on the paper, which is
 * the same decision as the flat buttons, and leaves the underlined fields as
 * the only structure it needs.
 *
 * The form posts to a Server Action, so it works before hydration and without
 * JavaScript at all — which matters more here than anywhere else on the page,
 * because this is the one thing a visitor might be trying to do on a bad
 * connection. Validation lives in the action and comes back per field; the
 * browser's own `required` and `type="email"` catch the same mistakes sooner
 * for everyone else.
 */
export function PlanVisit() {
  const [state, formAction, pending] = useActionState(planVisit, idleState);
  const fieldId = useId();

  const errorFor = (field: "name" | "email" | "service" | "note") => state.errors?.[field];

  return (
    <div className="w-full px-6 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto w-full max-w-2xl text-center">
        <SectionRule numeral="VI" label="Plan your visit" align="centre" />

        <Reveal from="mask" className="mt-6">
          <h2 className="text-3xl leading-[1.1] text-balance sm:text-4xl">
            Tell us you&apos;re coming and someone will be looking out for you.
          </h2>
        </Reveal>

        <Reveal delay={100}>
          <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-pretty">
            You do not have to. You are welcome to walk in on Sunday and tell nobody anything. But if
            you would rather see a familiar face at the door, this is how.
          </p>
        </Reveal>

        {state.status === "sent" ? (
          <div role="status" className="py-14">
            <p className="font-heading text-2xl leading-snug text-balance">
              Thank you — we have it.
            </p>
            <p className="text-muted-foreground mx-auto mt-4 max-w-sm text-sm leading-relaxed text-pretty">
              Someone will be at the welcome desk expecting you. If anything changes, call the office
              on {church.phone}.
            </p>
          </div>
        ) : (
          <Reveal delay={160}>
            <form action={formAction} className="mx-auto mt-7 grid max-w-lg gap-4 text-left">
              {/* Not display:none — some bots skip hidden fields. Off-screen
                  and out of the tab order instead. */}
              <div className="absolute -left-[9999px]" aria-hidden>
                <label htmlFor={`${fieldId}-company`}>Company</label>
                <input
                  id={`${fieldId}-company`}
                  name="company"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id={`${fieldId}-name`}
                  name="name"
                  label="Your name"
                  autoComplete="name"
                  required
                  defaultValue={state.values?.name}
                  error={errorFor("name")}
                />

                <Field
                  id={`${fieldId}-email`}
                  name="email"
                  type="email"
                  label="Email"
                  autoComplete="email"
                  required
                  defaultValue={state.values?.email}
                  error={errorFor("email")}
                />
              </div>

              <Field
                id={`${fieldId}-service`}
                name="service"
                label="Which service"
                as="select"
                required
                defaultValue={state.values?.service}
                error={errorFor("service")}
              >
                {serviceChoices.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </Field>

              <Field
                id={`${fieldId}-note`}
                name="note"
                label="Anything we should know"
                as="textarea"
                optional
                defaultValue={state.values?.note}
                error={errorFor("note")}
              />

              {state.message && (
                <p role="alert" className="text-destructive text-sm text-pretty">
                  {state.message}
                </p>
              )}

              <div className="mt-1 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                <ActionButton type="submit" disabled={pending} arrow={!pending}>
                  {pending ? "Sending…" : "Let them know"}
                </ActionButton>
                <p aria-live="polite" className="text-muted-foreground text-xs">
                  {pending ? "One moment." : "We will not add you to anything."}
                </p>
              </div>
            </form>
          </Reveal>
        )}

        {/* The other three ways in, on one line under the rule. */}
        <Reveal delay={220}>
          <div className="border-foreground/20 mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 border-t pt-5 text-sm">
            <a
              href={`tel:${church.phone.replace(/\s/g, "")}`}
              className="focus-visible:ring-ring rounded-sm decoration-[var(--brass)] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              {church.phone}
            </a>
            <a
              href={`mailto:${church.email}`}
              className="focus-visible:ring-ring rounded-sm decoration-[var(--brass)] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              {church.email}
            </a>
            <span className="text-muted-foreground">
              {church.address.line1}, {church.address.city}
            </span>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

type FieldProps = {
  id: string;
  name: string;
  label: string;
  as?: "input" | "select" | "textarea";
  type?: string;
  required?: boolean;
  optional?: boolean;
  autoComplete?: string;
  defaultValue?: string;
  error?: string;
  children?: React.ReactNode;
};

/**
 * An underlined field rather than a boxed one — the page is built from
 * hairlines, and a stack of rounded boxes would be the one place it stopped
 * looking like itself. Focus thickens the rule and tints the field, so the
 * indicator survives both a colourblind reader and a low-contrast screen.
 */
function Field({
  id,
  name,
  label,
  as = "input",
  type = "text",
  required,
  optional,
  autoComplete,
  defaultValue,
  error,
  children,
}: FieldProps) {
  const errorId = `${id}-error`;

  const shared = {
    id,
    name,
    required,
    defaultValue,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": error ? errorId : undefined,
    className: cn(
      "peer w-full rounded-none border-0 border-b bg-transparent px-0 pt-1 pb-2.5 text-sm",
      "transition-[border-color,background-color] duration-200 outline-none",
      "focus:border-b-2 focus:bg-[color-mix(in_oklab,var(--accent)_35%,transparent)] focus:pb-2",
      error
        ? "border-destructive focus:border-destructive"
        : "border-foreground/25 focus:border-[var(--ring)]",
    ),
  };

  return (
    <div>
      <label
        htmlFor={id}
        className="text-muted-foreground flex items-baseline justify-between font-mono text-[0.65rem] tracking-[0.2em] uppercase"
      >
        {label}
        {optional && <span className="tracking-normal normal-case opacity-70">optional</span>}
      </label>

      <div className="mt-2">
        {as === "select" && (
          <select {...shared} autoComplete={autoComplete}>
            {children}
          </select>
        )}
        {as === "textarea" && <textarea {...shared} rows={2} className={cn(shared.className, "resize-y")} />}
        {as === "input" && <input {...shared} type={type} autoComplete={autoComplete} />}
      </div>

      {error && (
        <p id={errorId} className="text-destructive mt-2 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
