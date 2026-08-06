import { currentSeries } from "@/lib/church";

import { Reveal } from "./reveal";

const formatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

/** Series detail, for the sticky column beside the list. */
export function SeriesCard() {
  return (
    <div className="border-foreground/15 border-t pt-5">
      <p className="text-muted-foreground font-mono text-[0.65rem] tracking-[0.15em] uppercase">
        Current series
      </p>
      <p className="font-heading mt-3 text-xl leading-tight">{currentSeries.title}</p>
      <p className="text-muted-foreground mt-3 text-sm text-pretty">{currentSeries.blurb}</p>
      <p className="numeric text-muted-foreground mt-5 text-xs">
        {currentSeries.sermons.length} of 8 preached
      </p>
    </div>
  );
}

export function Sermons() {
  return (
    <ol className="border-foreground/15 border-t">
      {[...currentSeries.sermons].reverse().map((sermon, index) => (
        <li key={sermon.part} className="border-foreground/15 border-b">
          <Reveal delay={index * 70}>
            <article className="group grid items-baseline gap-x-6 gap-y-1 py-7 sm:grid-cols-[2.5rem_minmax(0,1fr)_5rem]">
              <span className="numeric text-muted-foreground text-xs">{sermon.part}</span>
              <div>
                <h3 className="font-heading text-xl leading-snug">{sermon.title}</h3>
                <p className="text-muted-foreground mt-1.5 text-sm">
                  {sermon.passage}
                  <span className="mx-2 opacity-40">·</span>
                  {sermon.speaker}
                </p>
              </div>
              <time
                dateTime={sermon.date}
                className="numeric text-muted-foreground text-xs sm:text-right"
              >
                {formatter.format(new Date(sermon.date))}
              </time>
            </article>
          </Reveal>
        </li>
      ))}
    </ol>
  );
}
