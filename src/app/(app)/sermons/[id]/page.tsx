import { ArrowLeftIcon, FileTextIcon, PencilIcon, VideoIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSession } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { paragraphs } from "@/lib/content/rules";
import { getOwnNote } from "@/lib/data/notes";
import { getSermon } from "@/lib/data/sermons";
import { formatDateOnly } from "@/lib/dates";

import { PageHeader, Panel } from "../../_components/page-parts";

import { NoteEditor } from "./note-editor";

export const metadata: Metadata = { title: "Sermon" };

/**
 * One sermon (docs/SCOPE.md §9.11): the full summary, the audio player, the
 * video and handout links, and the reader's private note. `getSermon` returns
 * `null` for a draft unless the caller manages sermons.
 */
export default async function SermonPage(props: PageProps<"/sermons/[id]">) {
  const user = await requireSession();
  const { id } = await props.params;

  const sermon = await getSermon(user, id);
  if (!sermon) notFound();
  const note = await getOwnNote(user, sermon.id);

  return (
    <>
      <Link
        href="/sermons"
        className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1.5 rounded-sm text-sm focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden />
        Sermons
      </Link>

      <PageHeader
        eyebrow={[formatDateOnly(sermon.preachedAt), sermon.seriesName].filter(Boolean).join(" · ")}
        title={sermon.title}
        description={
          <>
            {sermon.preacher}
            {sermon.scriptureRef && (
              <span className="text-accent-foreground ml-2 font-semibold">{sermon.scriptureRef}</span>
            )}
            {!sermon.isPublished && <span className="ml-2 italic">Draft — members cannot see it</span>}
          </>
        }
        actions={
          can(user, "sermons.manage") && (
            <Link
              href={`/sermons/${sermon.id}/edit`}
              className="border-border bg-card hover:bg-muted inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            >
              <PencilIcon className="size-3.5" aria-hidden />
              Edit
            </Link>
          )
        }
      />

      <div className="grid max-w-3xl gap-4">
        <Panel>
          <div className="grid gap-3 text-sm leading-relaxed">
            {paragraphs(sermon.summary).map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="text-foreground">
                {paragraph}
              </p>
            ))}
          </div>

          {sermon.audioUrl && (
            <div id="listen" className="mt-5 scroll-mt-24">
              <audio controls preload="none" src={sermon.audioUrl} className="w-full">
                <a href={sermon.audioUrl}>Download the audio</a>
              </audio>
            </div>
          )}

          {(sermon.videoUrl || sermon.notesUrl) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {sermon.videoUrl && (
                <a href={sermon.videoUrl} target="_blank" rel="noreferrer" className={button}>
                  <VideoIcon className="size-3.5" aria-hidden />
                  Watch on YouTube
                </a>
              )}
              {sermon.notesUrl && (
                <a href={sermon.notesUrl} target="_blank" rel="noreferrer" className={button}>
                  <FileTextIcon className="size-3.5" aria-hidden />
                  Download notes
                </a>
              )}
            </div>
          )}

          {sermon.tags.length > 0 && (
            <p className="mt-4 flex flex-wrap gap-1.5 text-[0.7rem]">
              {sermon.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/sermons?tag=${encodeURIComponent(tag)}`}
                  className="border-border text-muted-foreground rounded-full border px-2 py-0.5 hover:underline"
                >
                  {tag}
                </Link>
              ))}
            </p>
          )}
        </Panel>

        <Panel description="Private to you. Nobody else — not the church office, not the Apostles — can read it.">
          <NoteEditor sermonId={sermon.id} initial={note} />
        </Panel>
      </div>
    </>
  );
}

const button =
  "border-border hover:bg-muted inline-flex h-9 items-center gap-1.5 rounded-lg border px-3.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none";
