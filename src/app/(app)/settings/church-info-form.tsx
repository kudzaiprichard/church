"use client";

import { useActionState } from "react";

import { FormError, Submit } from "@/app/(auth)/_components/form-parts";
import type { ChurchInfo } from "@/lib/settings";

import { FormSection, FormSuccess, TextAreaField, TextField } from "../_components/form-fields";

import { updateChurchInfo } from "./actions";
import { settingsIdleState } from "./form-state";

export function ChurchInfoForm({ stored }: { stored: ChurchInfo }) {
  const [state, action] = useActionState(updateChurchInfo, settingsIdleState);
  // After a failure, what was typed; otherwise the saved record.
  const value = (key: keyof ChurchInfo) =>
    state.values ? state.values[key] : (stored[key] as string | null);
  const errors = state.fieldErrors ?? {};

  return (
    <form key={state.attempt ?? "stored"} action={action} className="grid gap-6" noValidate>
      <FormError>{state.error}</FormError>
      {state.done && (
        <FormSuccess>Saved. The website shows it from the next page load.</FormSuccess>
      )}

      <FormSection title="Identity">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
          <TextField
            id="name"
            name="name"
            label="Church name"
            required
            defaultValue={value("name")}
            error={errors.name}
          />
          <TextField
            id="shortName"
            name="shortName"
            label="Short name"
            required
            defaultValue={value("shortName")}
            error={errors.shortName}
          />
        </div>
        <TextAreaField
          id="tagline"
          name="tagline"
          label="Tagline"
          rows={2}
          defaultValue={value("tagline")}
          error={errors.tagline}
          hint="One sentence, under the name on the home page and in the footer."
        />
      </FormSection>

      <FormSection
        title="Contact"
        description="Shown on the home page, the footer and the About page."
      >
        <TextAreaField
          id="address"
          name="address"
          label="Address"
          rows={2}
          defaultValue={value("address")}
          error={errors.address}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            label="Phone"
            defaultValue={value("phone")}
            error={errors.phone}
          />
          <TextField
            id="email"
            name="email"
            type="email"
            label="Email"
            defaultValue={value("email")}
            error={errors.email}
            hint="Plan-a-visit and bulletin requests are sent here."
          />
        </div>
      </FormSection>

      <FormSection
        title="About the church"
        description="The About page. Leave any of them empty to leave it out."
      >
        <TextAreaField
          id="mission"
          name="mission"
          label="Mission"
          rows={4}
          defaultValue={value("mission")}
          error={errors.mission}
        />
        <TextAreaField
          id="vision"
          name="vision"
          label="Vision"
          rows={4}
          defaultValue={value("vision")}
          error={errors.vision}
        />
        <TextAreaField
          id="doctrine"
          name="doctrine"
          label="What we believe"
          rows={6}
          defaultValue={value("doctrine")}
          error={errors.doctrine}
          hint="Separate paragraphs with a blank line."
        />
      </FormSection>

      <div className="sm:max-w-xs">
        <Submit pendingLabel="Saving…">Save church information</Submit>
      </div>
    </form>
  );
}
