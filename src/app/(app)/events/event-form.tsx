"use client";

import { useActionState } from "react";

import { FormError, Submit } from "@/app/(auth)/_components/form-parts";
import type { EventForEdit } from "@/lib/data/events";

import { FormSuccess, SelectField, TextAreaField, TextField } from "../_components/form-fields";

import { createEvent, deleteEvent, duplicateEvent, updateEvent } from "./actions";
import { eventIdleState } from "./form-state";

type Group = { id: string; name: string };

/** New or existing event. Times are Harare's; the server converts them. */
export function EventForm({ groups, stored }: { groups: Group[]; stored?: EventForEdit }) {
  const [state, action] = useActionState(
    stored ? updateEvent.bind(null, stored.id) : createEvent,
    eventIdleState,
  );
  const value = (key: keyof EventForEdit) =>
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
      <SelectField
        id="target"
        name="target"
        label="For"
        required
        options={[
          { value: "ALL", label: "All Church" },
          ...groups.map((group) => ({ value: group.id, label: group.name })),
        ]}
        defaultValue={value("target") ?? "ALL"}
        error={errors.target}
        hint="A group's event is seen only by its members and the Apostles, and they are notified."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          id="date"
          name="date"
          type="date"
          label="Date"
          required
          defaultValue={value("date")}
          error={errors.date}
        />
        <TimeField
          id="startTime"
          label="Starts"
          required
          defaultValue={value("startTime")}
          error={errors.startTime}
        />
        <TimeField
          id="endTime"
          label="Ends"
          defaultValue={value("endTime")}
          error={errors.endTime}
        />
      </div>
      <TextField
        id="location"
        name="location"
        label="Location"
        defaultValue={value("location")}
        error={errors.location}
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
        <Submit pendingLabel="Saving…">{stored ? "Save changes" : "Create event"}</Submit>
      </div>
    </form>
  );
}

/** A native time picker, in the same box as the other fields. */
function TimeField({
  id,
  label,
  required,
  defaultValue,
  error,
}: {
  id: string;
  label: string;
  required?: boolean;
  defaultValue?: string | null;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-foreground text-sm font-medium">
        {label}
        {required && (
          <span aria-hidden className="text-destructive ml-0.5">
            *
          </span>
        )}
      </label>
      <input
        id={id}
        name={id}
        type="time"
        required={required}
        defaultValue={defaultValue ?? undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`bg-background mt-1.5 h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-4 focus:ring-[color-mix(in_oklab,var(--ring)_18%,transparent)] ${
          error ? "border-destructive" : "border-input focus:border-[var(--ring)]"
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="text-destructive mt-1.5 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

export function DuplicateEventForm({ eventId }: { eventId: string }) {
  const [state, action] = useActionState(duplicateEvent.bind(null, eventId), eventIdleState);

  return (
    <form key={state.attempt ?? "empty"} action={action} className="grid gap-3" noValidate>
      <FormError>{state.error}</FormError>
      <TextField
        id="duplicate-date"
        name="date"
        type="date"
        label="New date"
        required
        defaultValue={state.values?.date}
        error={state.fieldErrors?.date}
        hint="Same times, place and audience. Its audience is notified."
      />
      <div className="sm:max-w-xs">
        <Submit pendingLabel="Copying…">Duplicate</Submit>
      </div>
    </form>
  );
}

export function DeleteEventForm({ eventId }: { eventId: string }) {
  const [state, action] = useActionState(deleteEvent.bind(null, eventId), eventIdleState);

  return (
    <form action={action} className="grid gap-3">
      <FormError>{state.error}</FormError>
      <FormSuccess>{state.done}</FormSuccess>
      {state.needsConfirm && <input type="hidden" name="confirm" value="yes" />}
      <div>
        <button
          type="submit"
          className="border-destructive/30 text-destructive hover:bg-destructive/10 h-9 cursor-pointer rounded-lg border px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
        >
          {state.needsConfirm ? "Delete it and its attendance" : "Delete event"}
        </button>
      </div>
    </form>
  );
}
