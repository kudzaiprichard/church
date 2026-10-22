"use client";

import { useActionState, useState } from "react";

import { FormError, Submit } from "@/app/(auth)/_components/form-parts";
import { PREACHERS } from "@/lib/content/rules";
import type { SermonForEdit } from "@/lib/data/sermons";

import { FileUpload } from "../_components/file-upload";
import { TextAreaField, TextField } from "../_components/form-fields";

import { createSermon, updateSermon } from "./actions";
import { sermonIdleState } from "./form-state";

/** New sermon, or an existing one's edit. Files upload before the form is saved. */
export function SermonForm({
  stored,
  seriesSuggestions,
  uploads,
  today,
}: {
  stored?: SermonForEdit;
  seriesSuggestions: string[];
  uploads: boolean;
  today: string;
}) {
  const [state, action] = useActionState(
    stored ? updateSermon.bind(null, stored.id) : createSermon,
    sermonIdleState,
  );
  const values = state.values;
  const errors = state.fieldErrors ?? {};

  const storedPreacher = stored
    ? (PREACHERS as readonly string[]).includes(stored.preacher)
      ? stored.preacher
      : "GUEST"
    : PREACHERS[0];
  const [preacher, setPreacher] = useState(values?.preacher ?? storedPreacher);

  const text = (key: string, fallback?: string | null) => (values ? values[key] : fallback);

  return (
    <form key={state.attempt ?? "stored"} action={action} className="grid gap-5" noValidate>
      <FormError>{state.error}</FormError>

      <TextField
        id="title"
        name="title"
        label="Title"
        required
        defaultValue={text("title", stored?.title)}
        error={errors.title}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="preacher" className="text-foreground text-sm font-medium">
            Preacher<span aria-hidden className="text-destructive ml-0.5">*</span>
          </label>
          <select
            id="preacher"
            name="preacher"
            value={preacher}
            onChange={(event) => setPreacher(event.target.value)}
            className="border-input bg-background mt-1.5 h-10 w-full rounded-lg border px-3 text-sm"
          >
            {PREACHERS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value="GUEST">Guest speaker</option>
          </select>
          {errors.preacher && <p className="text-destructive mt-1.5 text-xs">{errors.preacher}</p>}
        </div>
        <TextField
          id="preachedAt"
          name="preachedAt"
          type="date"
          label="Preached on"
          required
          max={today}
          defaultValue={text("preachedAt", stored?.preachedAt)}
          error={errors.preachedAt}
        />
      </div>
      {preacher === "GUEST" && (
        <TextField
          id="guestName"
          name="guestName"
          label="Guest's name"
          required
          defaultValue={text("guestName", storedPreacher === "GUEST" ? stored?.preacher : null)}
          error={errors.guestName}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="seriesName" className="text-foreground text-sm font-medium">
            Series
          </label>
          <input
            id="seriesName"
            name="seriesName"
            list="series-suggestions"
            defaultValue={text("seriesName", stored?.seriesName) ?? ""}
            className="border-input bg-background mt-1.5 h-10 w-full rounded-lg border px-3 text-sm"
          />
          <datalist id="series-suggestions">
            {seriesSuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
        <TextField
          id="scriptureRef"
          name="scriptureRef"
          label="Scripture"
          hint="For example 2 Corinthians 5:20."
          defaultValue={text("scriptureRef", stored?.scriptureRef)}
          error={errors.scriptureRef}
        />
      </div>

      <TextAreaField
        id="summary"
        name="summary"
        label="Summary"
        required
        rows={5}
        hint="Up to two paragraphs. The first part shows on the public website."
        defaultValue={text("summary", stored?.summary)}
        error={errors.summary}
      />

      <TextField
        id="videoUrl"
        name="videoUrl"
        type="url"
        label="YouTube link"
        defaultValue={text("videoUrl", stored?.videoUrl)}
        error={errors.videoUrl}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <FileUpload
          folder="sermons/audio"
          name="audioKey"
          label="Audio (mp3 or m4a, up to 100 MB)"
          enabled={uploads}
          current={stored?.audioUrl ? { label: "Current audio", href: stored.audioUrl } : null}
          error={errors.audioKey}
          uploadedKey={values?.audioKey}
        />
        <FileUpload
          folder="sermons/notes"
          name="notesKey"
          label="Handout (PDF, up to 10 MB)"
          enabled={uploads}
          current={stored?.notesUrl ? { label: "Current handout", href: stored.notesUrl } : null}
          error={errors.notesKey}
          uploadedKey={values?.notesKey}
        />
      </div>

      <TextField
        id="tags"
        name="tags"
        label="Tags"
        hint="Separated by commas, for example faith, prayer."
        defaultValue={text("tags", stored?.tags.join(", "))}
        error={errors.tags}
      />

      <label className="flex items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          name="isPublished"
          defaultChecked={values ? values.isPublished === "on" : (stored?.isPublished ?? true)}
          className="accent-primary mt-0.5 size-4"
        />
        <span>
          <span className="text-foreground font-medium">Published</span>
          <span className="text-muted-foreground block text-xs">
            Untick to keep it as a draft that members cannot see.
          </span>
        </span>
      </label>

      <div className="sm:max-w-xs">
        <Submit pendingLabel="Saving…">{stored ? "Save changes" : "Add sermon"}</Submit>
      </div>
    </form>
  );
}

/** Ask twice before deleting: it also deletes members' notes on it and its files. */
export function DeleteSermonButton({ action }: { action: () => Promise<void> }) {
  const [armed, setArmed] = useState(false);
  return armed ? (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-sm">
        This also deletes its audio, handout and every member&apos;s notes on it.
      </span>
      <button
        type="submit"
        className="border-destructive/30 text-destructive hover:bg-destructive/10 h-9 cursor-pointer rounded-lg border px-4 text-sm font-semibold"
      >
        Delete for good
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="border-border hover:bg-muted h-9 cursor-pointer rounded-lg border px-4 text-sm"
      >
        Keep it
      </button>
    </form>
  ) : (
    <button
      type="button"
      onClick={() => setArmed(true)}
      className="border-destructive/30 text-destructive hover:bg-destructive/10 h-9 cursor-pointer rounded-lg border px-4 text-sm font-semibold"
    >
      Delete sermon
    </button>
  );
}
