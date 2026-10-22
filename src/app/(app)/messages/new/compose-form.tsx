"use client";

import { useActionState, useState } from "react";

import { FormError, Submit } from "@/app/(auth)/_components/form-parts";
import type { ComposeOptions } from "@/lib/data/messages";
import { cn } from "@/lib/utils";

import { SelectField, TextAreaField, TextField } from "../../_components/form-fields";
import { sendMessage } from "../actions";
import { messageIdleState } from "../form-state";

type Audience = "ALL" | "GROUP" | "INDIVIDUAL";

/**
 * The composer. Offers only the targets `composeOptions` returned for this
 * person — a leader sees their own groups and members — but that is a
 * convenience: `sendMessage` checks the target again on the server.
 */
export function ComposeForm({
  options,
  initial,
}: {
  options: ComposeOptions;
  initial: { audience: Audience; groupId?: string; recipientId?: string };
}) {
  const [state, action] = useActionState(sendMessage, messageIdleState);
  const values = state.values;
  const [audience, setAudience] = useState<Audience>(
    (values?.audience as Audience | undefined) ?? initial.audience,
  );
  const errors = state.fieldErrors ?? {};

  const choices = [
    ...(options.all ? [{ value: "ALL" as const, label: "All Church", detail: "Every active member" }] : []),
    ...(options.groups.length > 0
      ? [{ value: "GROUP" as const, label: "A group", detail: "Its members today" }]
      : []),
    ...(options.people.length > 0
      ? [{ value: "INDIVIDUAL" as const, label: "One person", detail: "A personal message" }]
      : []),
  ];

  return (
    <form key={state.attempt ?? "initial"} action={action} className="grid gap-5" noValidate>
      <FormError>{state.error}</FormError>

      <fieldset>
        <legend className="text-foreground text-sm font-medium">To</legend>
        <div className="mt-1.5 grid gap-1.5 sm:grid-cols-3">
          {choices.map((choice) => (
            <label
              key={choice.value}
              className={cn(
                "border-input hover:bg-muted/60 flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                "has-[:checked]:bg-secondary/60 has-[:checked]:border-[var(--ring)]",
                "has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[color-mix(in_oklab,var(--ring)_18%,transparent)]",
              )}
            >
              <input
                type="radio"
                name="audience"
                value={choice.value}
                checked={audience === choice.value}
                onChange={() => setAudience(choice.value)}
                className="accent-primary mt-0.5 size-4 shrink-0"
              />
              <span className="min-w-0">
                <span className="text-foreground block font-medium">{choice.label}</span>
                <span className="text-muted-foreground block text-xs">{choice.detail}</span>
              </span>
            </label>
          ))}
        </div>
        {errors.audience && <p className="text-destructive mt-1.5 text-xs">{errors.audience}</p>}
      </fieldset>

      {audience === "GROUP" && (
        <SelectField
          id="groupId"
          name="groupId"
          label="Group"
          required
          placeholder="Choose a group"
          options={options.groups.map((group) => ({ value: group.id, label: group.name }))}
          defaultValue={values?.groupId ?? initial.groupId}
          error={errors.groupId}
          hint="It goes to the group's active members as of now. People who join later will not receive it."
        />
      )}

      {audience === "INDIVIDUAL" && (
        <SelectField
          id="recipientId"
          name="recipientId"
          label="Person"
          required
          placeholder="Choose a person"
          options={options.people.map((person) => ({
            value: person.id,
            label: person.detail ? `${person.name} — ${person.detail}` : person.name,
          }))}
          defaultValue={values?.recipientId ?? initial.recipientId}
          error={errors.recipientId}
        />
      )}

      <TextField
        id="subject"
        name="subject"
        label="Subject"
        required
        defaultValue={values?.subject}
        error={errors.subject}
      />
      <TextAreaField
        id="body"
        name="body"
        label="Message"
        required
        rows={8}
        defaultValue={values?.body}
        error={errors.body}
        hint="Replies come back to you privately — recipients never see one another's."
      />

      {options.email && (
        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            name="email"
            defaultChecked={values?.email === "on"}
            className="accent-primary mt-0.5 size-4 shrink-0"
          />
          <span>
            <span className="text-foreground font-medium">Also email it</span>
            <span className="text-muted-foreground block text-xs">
              Each person gets the subject and a link to read it in the portal.
            </span>
          </span>
        </label>
      )}

      <div className="sm:max-w-xs">
        <Submit pendingLabel="Sending…">Send</Submit>
      </div>
    </form>
  );
}
