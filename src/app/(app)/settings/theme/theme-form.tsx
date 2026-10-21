"use client";

import { useActionState } from "react";

import { FormError, Submit } from "@/app/(auth)/_components/form-parts";

import { FormSuccess, TextAreaField, TextField } from "../../_components/form-fields";
import { saveTheme } from "../actions";
import { settingsIdleState } from "../form-state";

export type ThemeDefaults = {
  year: string;
  title: string;
  scriptureRef: string;
  verseText: string;
  description: string;
};

/**
 * One year's theme. Saving a year that exists updates it; a new year is
 * created and, being the highest, becomes the current theme.
 */
export function ThemeForm({ stored }: { stored: ThemeDefaults }) {
  const [state, action] = useActionState(saveTheme, settingsIdleState);
  const value = (key: keyof ThemeDefaults) => (state.values ? state.values[key] : stored[key]);
  const errors = state.fieldErrors ?? {};

  return (
    <form key={state.attempt ?? stored.year} action={action} className="grid gap-4" noValidate>
      <FormError>{state.error}</FormError>
      {state.done && (
        <FormSuccess>
          Saved. The home page, About page and dashboard show it from the next load.
        </FormSuccess>
      )}

      <div className="grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
        <TextField
          id="year"
          name="year"
          label="Year"
          required
          inputMode="text"
          defaultValue={value("year")}
          error={errors.year}
        />
        <TextField
          id="title"
          name="title"
          label="Title"
          required
          defaultValue={value("title")}
          error={errors.title}
        />
      </div>
      <TextField
        id="scriptureRef"
        name="scriptureRef"
        label="Scripture reference"
        required
        defaultValue={value("scriptureRef")}
        error={errors.scriptureRef}
      />
      <TextAreaField
        id="verseText"
        name="verseText"
        label="Verse"
        required
        rows={3}
        defaultValue={value("verseText")}
        error={errors.verseText}
      />
      <TextAreaField
        id="description"
        name="description"
        label="Description"
        rows={4}
        defaultValue={value("description")}
        error={errors.description}
      />

      <div className="sm:max-w-xs">
        <Submit pendingLabel="Saving…">Save theme</Submit>
      </div>
    </form>
  );
}
