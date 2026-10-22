import { FileTextIcon, PlayIcon, VideoIcon } from "lucide-react";
import Link from "next/link";

import type { SermonCard as Sermon } from "@/lib/data/sermons";
import { formatDateOnly } from "@/lib/dates";

/**
 * One sermon in the archive: date, title, preacher, scripture in gold, series
 * and tags, and its media. Audio plays on the sermon's own page; the video
 * opens on YouTube; the handout downloads.
 */
export function SermonCard({ sermon, latest }: { sermon: Sermon; latest: boolean }) {
  return (
    <article className="bg-card border-border flex h-full flex-col rounded-lg border p-5">
      <p className="flex flex-wrap items-center gap-2 text-xs">
        <span className="bg-secondary text-primary numeric rounded-md px-1.5 py-0.5 font-semibold">
          {formatDateOnly(sermon.preachedAt)}
        </span>
        {latest && (
          <span className="bg-brass/25 text-accent-foreground rounded-md px-1.5 py-0.5 font-semibold">
            Latest
          </span>
        )}
        {!sermon.isPublished && (
          <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 font-semibold">
            Draft
          </span>
        )}
      </p>
      <h2 className="text-foreground mt-3 text-base leading-snug font-bold">
        <Link href={`/sermons/${sermon.id}`} className="hover:underline">
          {sermon.title}
        </Link>
      </h2>
      <p className="text-muted-foreground mt-1 text-sm">{sermon.preacher}</p>
      {sermon.scriptureRef && (
        <p className="text-accent-foreground mt-1 text-xs font-semibold tracking-wide uppercase">
          {sermon.scriptureRef}
        </p>
      )}
      <p className="text-muted-foreground mt-3 line-clamp-3 flex-1 text-sm leading-relaxed">
        {sermon.summary}
      </p>
      {(sermon.seriesName || sermon.tags.length > 0) && (
        <p className="mt-3 flex flex-wrap gap-1.5 text-[0.7rem]">
          {sermon.seriesName && (
            <Link
              href={`/sermons?series=${encodeURIComponent(sermon.seriesName)}`}
              className="bg-secondary text-primary rounded-md px-1.5 py-0.5 font-semibold hover:underline"
            >
              {sermon.seriesName}
            </Link>
          )}
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
      <div className="mt-4 flex flex-wrap gap-2">
        {sermon.audioUrl && (
          <Link href={`/sermons/${sermon.id}#listen`} className={button}>
            <PlayIcon className="size-3.5" aria-hidden />
            Play audio
          </Link>
        )}
        {sermon.videoUrl && (
          <a href={sermon.videoUrl} target="_blank" rel="noreferrer" className={button}>
            <VideoIcon className="size-3.5" aria-hidden />
            Watch video
          </a>
        )}
        {sermon.notesUrl && (
          <a href={sermon.notesUrl} target="_blank" rel="noreferrer" className={button}>
            <FileTextIcon className="size-3.5" aria-hidden />
            Download notes
          </a>
        )}
      </div>
    </article>
  );
}

const button =
  "border-border hover:bg-muted inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none";
