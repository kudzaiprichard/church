"use client";

import { SearchIcon } from "lucide-react";
import { useActionState, useRef, useState } from "react";

import { FormError, Submit } from "@/app/(auth)/_components/form-parts";
import type { SheetPerson } from "@/lib/data/attendance";
import { cn } from "@/lib/utils";

import { FormSuccess } from "../../../_components/form-fields";
import { markAttendance } from "../../actions";
import { eventIdleState } from "../../form-state";

const stamp = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Harare",
});

/**
 * One Present / Absent choice per person, saved together. Search only hides
 * rows — every choice made stays in the form and is posted. People left
 * unchosen are not written.
 */
export function AttendanceSheet({ eventId, people }: { eventId: string; people: SheetPerson[] }) {
  const [state, action] = useActionState(markAttendance.bind(null, eventId), eventIdleState);
  const [query, setQuery] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const needle = query.trim().toLowerCase();

  function markAllPresent() {
    form.current
      ?.querySelectorAll<HTMLInputElement>('input[type="radio"][value="PRESENT"]')
      .forEach((input) => {
        input.checked = true;
      });
  }

  return (
    <form ref={form} action={action} className="grid gap-4">
      <FormError>{state.error}</FormError>
      <FormSuccess>{state.done}</FormSuccess>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block sm:w-72">
          <span className="sr-only">Search people</span>
          <SearchIcon
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or group"
            className="border-input bg-background h-10 w-full rounded-lg border pr-3 pl-9 text-sm outline-none focus:border-[var(--ring)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--ring)_18%,transparent)]"
          />
        </label>
        <button
          type="button"
          onClick={markAllPresent}
          className="border-border hover:bg-muted h-9 cursor-pointer rounded-lg border px-3.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
        >
          Mark all present
        </button>
      </div>

      <ul className="divide-border border-border divide-y rounded-xl border">
        {people.map((person) => {
          const hidden =
            needle.length > 0 &&
            !person.name.toLowerCase().includes(needle) &&
            !person.groups.toLowerCase().includes(needle);
          return (
            <li
              key={person.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3",
                hidden && "hidden",
              )}
            >
              <div className="min-w-0">
                <p className="text-foreground text-sm font-semibold">{person.name}</p>
                <p className="text-muted-foreground text-xs">
                  {person.groups || "No group"}
                  {person.markedBy && person.markedAt && (
                    <>
                      {" · "}marked by {person.markedBy}, {stamp.format(new Date(person.markedAt))}
                    </>
                  )}
                </p>
              </div>
              <fieldset className="flex gap-1.5">
                <legend className="sr-only">{person.name}</legend>
                {(["PRESENT", "ABSENT"] as const).map((status) => (
                  <label
                    key={status}
                    className={cn(
                      "border-input flex h-8 cursor-pointer items-center rounded-md border px-3 text-xs font-semibold transition-colors",
                      "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--ring)]",
                      status === "PRESENT"
                        ? "has-[:checked]:border-success has-[:checked]:bg-success/15 has-[:checked]:text-success"
                        : "has-[:checked]:border-destructive has-[:checked]:bg-destructive/10 has-[:checked]:text-destructive",
                    )}
                  >
                    <input
                      type="radio"
                      name={`status:${person.id}`}
                      value={status}
                      defaultChecked={person.status === status}
                      className="sr-only"
                    />
                    {status === "PRESENT" ? "Present" : "Absent"}
                  </label>
                ))}
              </fieldset>
            </li>
          );
        })}
      </ul>

      <div className="sm:max-w-xs">
        <Submit pendingLabel="Saving…">Save attendance</Submit>
      </div>
    </form>
  );
}
