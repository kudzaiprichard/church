import { upcoming } from "@/lib/church";

import { Reveal } from "./reveal";

export function Events() {
  return (
    <ol className="grid gap-px sm:grid-cols-2">
      {upcoming.map((event, index) => (
        <li key={event.date}>
          <Reveal delay={index * 70}>
            <article className="border-border hover:bg-card flex h-full gap-5 border p-6 transition-colors">
              {/* A tear-off calendar leaf. */}
              <div className="border-border shrink-0 border-r pr-5 text-center">
                <p className="numeric text-2xl leading-none">{event.day}</p>
                <p className="text-muted-foreground mt-1 font-mono text-[0.65rem] tracking-[0.15em] uppercase">
                  {event.month}
                </p>
              </div>
              <div className="min-w-0">
                <h3 className="font-heading text-base leading-snug">{event.title}</h3>
                <p className="text-muted-foreground mt-1.5 text-sm text-pretty">{event.detail}</p>
              </div>
            </article>
          </Reveal>
        </li>
      ))}
    </ol>
  );
}
