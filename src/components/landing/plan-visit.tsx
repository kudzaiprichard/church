"use client";

import { useActionState, useId } from "react";

import { idleState, planVisit } from "@/app/actions";
import { services } from "@/lib/church";
import { cn } from "@/lib/utils";

import { ActionButton } from "./action";
import { NextGatheringLine } from "./next-gathering-line";
import { Reveal } from "./reveal";
import { Section, SectionHeader } from "./section";
import type { NavContact } from "./site-nav";

const serviceChoices = [
  ...services.map((service) => ({
    value: `${service.day} ${service.time}`,
    label: `${service.day} ${service.time} — ${service.name}`,
  })),
  { value: "Not sure yet", label: "Not sure yet" },
];

/**
 * Service times on the left, and on the right a card that tells the welcome
 * team someone is coming.
 *
 * The form posts to a Server Action, so it works before hydration and without
 * JavaScript at all — which matters here more than anywhere else on the page,
 * because this is the one thing a visitor might be trying to do on a bad
 * connection. Validation lives in the action and comes back per field; the
 * browser's own `required` and `type="email"` catch the same mistakes sooner
 * for everyone else.
 */
export function PlanVisit({ contact }: { contact: NavContact }) {
  const [state, formAction, pending] = useActionState(planVisit, idleState);
  const fieldId = useId();

  const errorFor = (field: "name" | "email" | "service" | "note") => state.errors?.[field];

  return (
    <Section id="visit" tone="tint">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-14">
        <div>
          <SectionHeader
            align="left"
            eyebrow="Visit us"
            title="Worship with us this week"
            className="mb-6 md:mb-6 md:grid-cols-1"
          />
          <Reveal delay={100}>
            <p className="text-muted-foreground max-w-lg leading-relaxed">
              Come as you are. If you would like a familiar face at the door, tell us which service
              you are coming to and someone from Hosting will be looking out for you.
            </p>
          </Reveal>

          <Reveal delay={160}>
            <div className="bg-card border-border mt-8 rounded-xl border px-5 py-3.5">
              <NextGatheringLine />
            </div>

            <ul className="border-border bg-card mt-3 divide-y rounded-xl border">
              {services.map((service) => (
                <li
                  key={`${service.day}-${service.time}`}
                  className="flex items-center gap-4 px-5 py-3.5"
                >
                  <span className="numeric text-primary w-12 shrink-0 text-base font-semibold">
                    {service.time}
                  </span>
                  <span className="min-w-0">
                    <span className="text-foreground block text-sm font-semibold">
                      {service.day} · {service.name}
                    </span>
                    <span className="text-muted-foreground block text-xs">{service.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>

          {contact.address && (
            <Reveal delay={200}>
              <address className="text-muted-foreground mt-5 text-sm leading-relaxed not-italic">
                {contact.address}
                {contact.mapUrl && (
                  <>
                    <span className="mx-2 opacity-40">·</span>
                    <a
                      href={contact.mapUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-primary rounded-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                    >
                      Open in Maps
                    </a>
                  </>
                )}
              </address>
            </Reveal>
          )}
        </div>

        <Reveal from="right" delay={100}>
          <div className="bg-card border-border rounded-2xl border p-6 md:p-8">
            {state.status === "sent" ? (
              <div role="status" className="py-10 text-center">
                <p className="font-heading text-navy text-2xl font-bold text-balance">
                  Thank you — we have it.
                </p>
                <p className="text-muted-foreground mx-auto mt-4 max-w-sm text-sm leading-relaxed text-pretty">
                  Someone will be at the door expecting you.
                  {contact.phone && ` If anything changes, call the office on ${contact.phone}.`}
                </p>
              </div>
            ) : (
              <form action={formAction} className="grid gap-5">
                <h3 className="text-navy text-xl font-bold">Plan your visit</h3>

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

                <div className="grid gap-5 sm:grid-cols-2">
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

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <ActionButton type="submit" disabled={pending} arrow={!pending}>
                    {pending ? "Sending…" : "Let them know"}
                  </ActionButton>
                  <p aria-live="polite" className="text-muted-foreground text-xs">
                    {pending ? "One moment." : "We will not add you to anything."}
                  </p>
                </div>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </Section>
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

/** A boxed field in the portal's style: rounded, a blue ring on focus. */
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
      "bg-background w-full rounded-xl border px-4 py-2.5 text-sm",
      "transition-[border-color,box-shadow] duration-200 outline-none",
      "focus:ring-4 focus:ring-[color-mix(in_oklab,var(--ring)_18%,transparent)]",
      error ? "border-destructive focus:border-destructive" : "border-input focus:border-[var(--ring)]",
    ),
  };

  return (
    <div>
      <label
        htmlFor={id}
        className="text-foreground flex items-baseline justify-between text-sm font-medium"
      >
        {label}
        {optional && <span className="text-muted-foreground text-xs font-normal">optional</span>}
      </label>

      <div className="mt-1.5">
        {as === "select" && (
          <select {...shared} autoComplete={autoComplete}>
            {children}
          </select>
        )}
        {as === "textarea" && <textarea {...shared} rows={3} className={cn(shared.className, "resize-y")} />}
        {as === "input" && <input {...shared} type={type} autoComplete={autoComplete} />}
      </div>

      {error && (
        <p id={errorId} className="text-destructive mt-1.5 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
