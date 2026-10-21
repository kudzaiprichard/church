import { Play } from "lucide-react";
import Link from "next/link";

import { recentSermons } from "@/lib/church";

import { ActionLink } from "./action";
import { Reveal } from "./reveal";
import { Section, SectionHeader } from "./section";

const dayMonth = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

/**
 * The three latest messages. Each card leads with its date and passage, so a
 * reader looking for "last Sunday's sermon" finds it without reading titles.
 */
export function Sermons() {
  return (
    <Section id="sermons">
      <SectionHeader
        eyebrow="Recent sermons"
        title="Latest messages"
        description="From the current series, Kingdom Expressions 2026."
        action={
          <ActionLink href="/login" tone="quiet" arrow>
            Full archive in the portal
          </ActionLink>
        }
      />

      <ul className="grid gap-4 md:grid-cols-3">
        {recentSermons.map((sermon, index) => (
          <li key={sermon.title}>
            <Reveal delay={index * 80} className="h-full">
              <article className="group bg-card border-border hover:border-primary/30 flex h-full flex-col rounded-xl border p-6 transition-colors">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <time dateTime={sermon.date} className="numeric text-muted-foreground">
                    {dayMonth.format(new Date(sermon.date))}
                  </time>
                  <span className="bg-secondary text-primary rounded-md px-2 py-0.5 font-medium">
                    {sermon.passage}
                  </span>
                </div>

                <h3 className="text-foreground mt-4 text-lg leading-snug font-bold text-balance">
                  {sermon.title}
                </h3>
                <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-relaxed">
                  {sermon.summary}
                </p>

                <div className="border-border mt-auto flex items-center justify-between gap-3 border-t pt-4">
                  <p className="text-foreground/80 truncate text-xs font-medium">{sermon.preacher}</p>
                  <Link
                    href="/login"
                    aria-label={`Listen to ${sermon.title}`}
                    className="bg-secondary text-primary group-hover:bg-primary group-hover:text-primary-foreground grid size-9 shrink-0 place-items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                  >
                    <Play aria-hidden className="ml-0.5 size-3.5 fill-current" />
                  </Link>
                </div>
              </article>
            </Reveal>
          </li>
        ))}
      </ul>
    </Section>
  );
}
