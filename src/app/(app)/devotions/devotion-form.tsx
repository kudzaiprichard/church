"use client";

import { useActionState, useState } from "react";

import { FormError, Submit } from "@/app/(auth)/_components/form-parts";
import type { DevotionForEdit } from "@/lib/data/devotions";

import { SelectField, TextAreaField, TextField } from "../_components/form-fields";
import { sermonIdleState } from "../sermons/form-state";

import { createDevotion, deleteDevotion, updateDevotion } from "./actions";

export function DevotionForm({
  stored,
  authors,
  defaultAuthorId,
}: {
  stored?: DevotionForEdit;
  authors: { id: string; name: string }[];
  defaultAuthorId: string;
}) {
  const [state, action] = useActionState(
    stored ? updateDevotion.bind(null, stored.id) : createDevotion,
    sermonIdleState,
  );
  const value = (key: keyof DevotionForEdit) =>
    state.values ? state.values[key] : (stored?.[key] as string | null | undefined);
  const errors = state.fieldErrors ?? {};

  return (
    <form key={state.attempt ?? "stored"} action={action} className="grid gap-4" noValidate>
      <FormError>{state.error}</FormError>
      <TextField
        id="title"
        name="title"
        label="Title"
        required
        defaultValue={value("title")}
        error={errors.title}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="authorId"
          name="authorId"
          label="Author"
          required
          options={authors.map((author) => ({ value: author.id, label: author.name }))}
          defaultValue={value("authorId") ?? defaultAuthorId}
          error={errors.authorId}
        />
        <TextField
          id="publishOn"
          name="publishOn"
          type="date"
          label="Publish on"
          defaultValue={value("publishOn")}
          error={errors.publishOn}
          hint="Leave empty for a draft. A future date stays hidden until that day in Harare."
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
        id="scriptureQuote"
        name="scriptureQuote"
        label="Scripture"
        required
        rows={3}
        defaultValue={value("scriptureQuote")}
        error={errors.scriptureQuote}
      />
      <TextAreaField
        id="body"
        name="body"
        label="Devotion"
        required
        rows={12}
        defaultValue={value("body")}
        error={errors.body}
        hint="Three paragraphs, separated by a blank line. The first is the public teaser."
      />
      <div className="sm:max-w-xs">
        <Submit pendingLabel="Saving…">{stored ? "Save changes" : "Save devotion"}</Submit>
      </div>
    </form>
  );
}

export function DeleteDevotionButton({ devotionId }: { devotionId: string }) {
  const [armed, setArmed] = useState(false);
  const button =
    "border-destructive/30 text-destructive hover:bg-destructive/10 h-9 cursor-pointer rounded-lg border px-4 text-sm font-semibold";
  return armed ? (
    <form action={deleteDevotion.bind(null, devotionId)} className="flex gap-2">
      <button type="submit" className={button}>
        Delete for good
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="border-border hover:bg-muted h-9 cursor-pointer rounded-md border px-4 text-sm"
      >
        Keep it
      </button>
    </form>
  ) : (
    <button type="button" onClick={() => setArmed(true)} className={button}>
      Delete devotion
    </button>
  );
}
