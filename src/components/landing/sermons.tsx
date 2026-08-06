import { currentSeries } from "@/lib/church";

import { Reveal } from "./reveal";

const formatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function Sermons() {
  return (
    <div className="grid gap-12 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-16">
      <Reveal>
        <div className="lg:sticky lg:top-28">
          <p className="text-muted-foreground font-mono text-[0.65rem] tracking-[0.2em] uppercase">
            Current series
          </p>
          <h3 className="font-heading mt-3 text-2xl leading-tight">{currentSeries.title}</h3>
          <p className="text-muted-foreground mt-4 text-sm text-pretty">{currentSeries.blurb}</p>
          <p className="text-muted-foreground mt-6 font-mono text-xs">
            {currentSeries.sermons.length} of 8 preached
          </p>
        </div>
      </Reveal>

      <ol className="border-border border-t">
        {[...currentSeries.sermons].reverse().map((sermon, index) => (
          <li key={sermon.part} className="border-border border-b">
            <Reveal delay={index * 70}>
              <article className="group grid gap-2 py-6 sm:grid-cols-[3rem_minmax(0,1fr)_9rem] sm:items-baseline sm:gap-6">
                <span className="numeric text-muted-foreground text-xs">{sermon.part}</span>
                <div>
                  <h4 className="font-heading text-lg leading-snug">{sermon.title}</h4>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {sermon.passage} · {sermon.speaker}
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
    </div>
  );
}
