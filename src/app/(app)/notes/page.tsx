import { LockIcon, NotebookPenIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { requireSession } from "@/lib/auth/dal";
import { listOwnNotes } from "@/lib/data/notes";
import { relativeTime } from "@/lib/dates";

import { EmptyState, PageHeader, Panel } from "../_components/page-parts";

export const metadata: Metadata = { title: "My sermon notes" };

/**
 * The signed-in person's own notes (docs/SCOPE.md §9.12). `listOwnNotes` is
 * pinned to the caller for every office — there is no page anywhere that
 * lists anyone else's.
 */
export default async function NotesPage() {
  const user = await requireSession();
  const notes = await listOwnNotes(user);
  const now = new Date();

  return (
    <>
      <PageHeader
        eyebrow="You"
        title="My sermon notes"
        description={
          <span className="inline-flex items-center gap-1.5">
            <LockIcon className="size-3.5" aria-hidden />
            Private to you. Nobody else can read them, including the Apostles.
          </span>
        }
      />

      <Panel className="max-w-3xl" bodyClassName="p-0">
        {notes.length === 0 ? (
          <EmptyState icon={<NotebookPenIcon className="size-5" aria-hidden />} title="No notes yet">
            Open a sermon and write in the note box beneath it.
          </EmptyState>
        ) : (
          <ul className="divide-border divide-y">
            {notes.map((note) => (
              <li key={note.sermonId}>
                <Link
                  href={`/sermons/${note.sermonId}`}
                  className="hover:bg-muted/60 block px-5 py-4 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none focus-visible:ring-inset"
                >
                  <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="text-foreground text-sm font-semibold">{note.title}</span>
                    <span className="text-muted-foreground text-xs">
                      Edited {relativeTime(note.updatedAt, now)}
                    </span>
                  </p>
                  <p className="text-muted-foreground text-xs">{note.preacher}</p>
                  <p className="text-muted-foreground mt-1.5 line-clamp-2 text-sm whitespace-pre-line">
                    {note.excerpt}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
