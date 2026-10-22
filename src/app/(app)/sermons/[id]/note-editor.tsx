"use client";

import { LockIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { NOTE_MAX } from "@/lib/content/rules";

import { deleteNote, saveNote } from "../actions";

const clock = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Harare",
});

/**
 * The signed-in person's private note on this sermon (docs/SCOPE.md §9.12).
 *
 * Saves itself 1.5 seconds after typing stops, and on the Save button. Only
 * the author can ever read it back — `saveNote` writes under the caller's own
 * id, and every read of notes is pinned to the caller, Apostles included.
 */
export function NoteEditor({
  sermonId,
  initial,
}: {
  sermonId: string;
  initial: { body: string; updatedAt: string } | null;
}) {
  const [body, setBody] = useState(initial?.body ?? "");
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "saving" }
    | { kind: "saved"; at: string }
    | { kind: "error"; message: string }
  >(initial ? { kind: "saved", at: initial.updatedAt } : { kind: "idle" });
  const saved = useRef(initial?.body ?? "");
  const [hasNote, setHasNote] = useState(Boolean(initial?.body));
  const timer = useRef<number | undefined>(undefined);

  async function save(text: string) {
    if (text === saved.current) return;
    setStatus({ kind: "saving" });
    const result = await saveNote(sermonId, text);
    if (result.error) {
      setStatus({ kind: "error", message: result.error });
      return;
    }
    saved.current = text;
    setHasNote(text.trim().length > 0);
    setStatus({ kind: "saved", at: result.savedAt! });
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <div className="grid gap-3">
      <label
        htmlFor="note"
        className="text-foreground flex items-center gap-1.5 text-sm font-medium"
      >
        <LockIcon className="size-3.5" aria-hidden />
        My private note
      </label>
      <textarea
        id="note"
        value={body}
        maxLength={NOTE_MAX}
        rows={8}
        onChange={(event) => {
          const text = event.target.value;
          setBody(text);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => void save(text), 1500);
        }}
        placeholder="What spoke to you? Only you will ever see this."
        className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm leading-relaxed outline-none focus:border-[var(--ring)] focus:ring-4 focus:ring-[color-mix(in_oklab,var(--ring)_18%,transparent)]"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            window.clearTimeout(timer.current);
            void save(body);
          }}
          className="action-solid h-9 cursor-pointer rounded-lg px-4 text-sm font-semibold"
        >
          Save
        </button>
        {hasNote && (
          <button
            type="button"
            onClick={async () => {
              window.clearTimeout(timer.current);
              await deleteNote(sermonId);
              saved.current = "";
              setHasNote(false);
              setBody("");
              setStatus({ kind: "idle" });
            }}
            className="text-destructive cursor-pointer text-xs font-semibold hover:underline"
          >
            Delete note
          </button>
        )}
        <span role="status" className="text-muted-foreground text-xs">
          {status.kind === "saving" && "Saving…"}
          {status.kind === "saved" && `Saved ${clock.format(new Date(status.at))}`}
          {status.kind === "error" && <span className="text-destructive">{status.message}</span>}
        </span>
      </div>
    </div>
  );
}
