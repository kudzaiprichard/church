import { church, currentSeries, upcoming } from "@/lib/church";

import { Reveal } from "./reveal";
import { DrawnRule, SectionRule } from "./section-rule";

const dayMonth = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

/**
 * The teaching, set as a printed programme.
 *
 * This and "plan your visit" had both settled into the page's default shape —
 * two lanes, words on the left, a list or a card on the right — and side by
 * side they read as the same section twice. So this one drops the lanes
 * entirely and becomes what it actually is: an order of service. One centred
 * measure, the series across the top, the sermons set as a table of contents
 * with dot leaders running out to the dates, and what's coming up as a strip
 * along the foot.
 *
 * The dot leader is the whole trick. It is what a printed programme does and
 * a web page almost never does, and it carries the eye from a title to a date
 * far better than a column of right-aligned text.
 */
export function Teaching() {
  return (
    <div className="w-full px-6 py-10 sm:px-8 lg:px-12">
      <div className="mx-auto w-full max-w-4xl">
        <SectionRule numeral="V" label="Teaching" />

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Reveal from="mask">
            <h2 className="text-3xl leading-tight text-balance sm:text-4xl">
              {currentSeries.title}
            </h2>
          </Reveal>
          <Reveal delay={90}>
            <p className="numeric text-muted-foreground text-xs whitespace-nowrap">
              {currentSeries.sermons.length} of 8 preached
            </p>
          </Reveal>
        </div>

        <Reveal delay={130}>
          <p className="text-muted-foreground mt-4 max-w-xl text-pretty">{currentSeries.blurb}</p>
        </Reveal>

        <ol className="mt-9">
          {[...currentSeries.sermons].reverse().map((sermon, index) => {
            // The regular preacher is not worth naming four times. A guest is.
            const guest = sermon.speaker === church.pastor ? null : sermon.speaker;

            return (
              <li key={sermon.part}>
                <DrawnRule delay={index * 70} />
                <Reveal delay={index * 70}>
                  <article className="flex flex-wrap items-baseline gap-x-3 py-3.5 sm:flex-nowrap">
                    <span className="numeric text-muted-foreground w-6 shrink-0 text-xs">
                      {sermon.part}
                    </span>
                    <h3 className="font-heading shrink-0 text-lg leading-snug">{sermon.title}</h3>

                    {/* The leader. Flexes to whatever gap is left in the row. */}
                    <span
                      aria-hidden
                      className="border-foreground/30 hidden min-w-8 flex-1 translate-y-[-0.3em] border-b border-dotted sm:block"
                    />

                    <span className="text-muted-foreground shrink-0 text-sm">
                      {sermon.passage}
                      {guest && (
                        <>
                          <span className="mx-2 opacity-40">·</span>
                          {guest}
                        </>
                      )}
                    </span>
                    <time
                      dateTime={sermon.date}
                      className="numeric text-muted-foreground w-14 shrink-0 text-xs sm:text-right"
                    >
                      {dayMonth.format(new Date(sermon.date))}
                    </time>
                  </article>
                </Reveal>
              </li>
            );
          })}
        </ol>

        {/* What's on, as a strip along the foot rather than a second column. */}
        <div className="border-foreground/20 mt-10 border-t pt-7">
          <Reveal>
            <h3 className="text-muted-foreground font-mono text-[0.7rem] tracking-[0.22em] uppercase">
              What&apos;s on
            </h3>
          </Reveal>

          <ol className="mt-5 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {upcoming.map((event, index) => (
              <li key={event.date}>
                <Reveal delay={index * 80}>
                  <p className="flex items-baseline gap-2">
                    <span className="numeric text-2xl leading-none">{event.day}</span>
                    <span className="text-muted-foreground font-mono text-[0.6rem] tracking-[0.15em] uppercase">
                      {event.month}
                    </span>
                  </p>
                  <h4 className="font-heading mt-2.5 text-sm leading-snug text-pretty">
                    {event.title}
                  </h4>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed text-pretty">
                    {event.detail}
                  </p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
