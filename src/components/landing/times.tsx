import { church, services, week } from "@/lib/church";

import { ActionLink } from "./action";
import { CornerPlan } from "./corner-plan";
import { Reveal } from "./reveal";
import { DrawnRule, SectionRule } from "./section-rule";

const [sunday, ...weekdays] = week;
const [firstService, secondService, ...afterwards] = sunday.items;
const sundayServices = [firstService, secondService];

/** The one-line description of each service lives on `services`, keyed by time. */
const noteFor = (time: string) => services.find((service) => service.time === time)?.note;

/**
 * The section a first-time visitor came for.
 *
 * Sunday is answered before anything else and at a size you can read from
 * across a room; the rest of the week follows as a quiet list rather than the
 * seven-column grid this used to be, which asked a phone to render a spreadsheet.
 * Where the church actually is rides alongside in a panel that stays put while
 * the times scroll past it.
 */
export function Times() {
  return (
    <div className="w-full px-6 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto grid w-full max-w-7xl gap-x-16 gap-y-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <SectionRule numeral="II" label="Times & place" />

          <Reveal from="mask" className="mt-7">
            <h2 className="text-3xl leading-[1.1] text-balance sm:text-4xl">
              Sunday, twice. Then the rest of the week.
            </h2>
          </Reveal>

          <Reveal delay={90}>
            <p className="text-muted-foreground mt-4 max-w-lg text-pretty">
              Both services carry the same teaching.
            </p>
          </Reveal>

          {/* The two services stand side by side rather than one above the
              other. Stacked they were the single reason this section could not
              be read without scrolling, and side by side they also make the
              point better: there are two, and they are the same service. */}
          <ol className="mt-8 grid gap-x-10 sm:grid-cols-2">
            {sundayServices.map((service, index) => (
              <li key={service.time}>
                <DrawnRule delay={index * 90} />
                <article className="py-5">
                  <Reveal from="mask" delay={index * 90}>
                    <p className="numeric text-4xl leading-none sm:text-5xl">{service.time}</p>
                  </Reveal>
                  <Reveal delay={index * 90 + 80}>
                    <h3 className="font-heading mt-3 text-lg leading-snug">{service.name}</h3>
                    <p className="text-muted-foreground mt-1 text-sm text-pretty">
                      {noteFor(service.time)}
                    </p>
                    <p className="text-muted-foreground/80 mt-1 font-mono text-[0.65rem] tracking-[0.15em] uppercase">
                      {service.place}
                    </p>
                  </Reveal>
                </article>
              </li>
            ))}
          </ol>

          <DrawnRule />
          {afterwards.map((item) => (
            <Reveal key={item.time} delay={60}>
              <p className="text-muted-foreground py-4 text-sm">
                <span className="numeric text-foreground mr-3">{item.time}</span>
                {item.name} in the {item.place.toLowerCase()} — stay as long as you like.
              </p>
            </Reveal>
          ))}

          <div className="mt-10">
            <Reveal>
              <h3 className="text-muted-foreground font-mono text-[0.7rem] tracking-[0.22em] uppercase">
                During the week
              </h3>
            </Reveal>

            {/* One cell per day, not per item — Saturday has two things on it,
                and flattening them put the 07:00 and the 08:00 in different
                columns and different rows from each other. */}
            <ul className="mt-5 grid gap-x-12 sm:grid-cols-2">
              {weekdays.map((day, index) => (
                <li key={day.day}>
                  <DrawnRule delay={index * 50} />
                  <Reveal delay={index * 50}>
                    <div className="flex gap-4 py-4">
                      <span className="numeric text-muted-foreground w-9 shrink-0 pt-0.5 text-[0.7rem] tracking-[0.12em] uppercase">
                        {day.short}
                      </span>
                      <ul className="min-w-0 flex-1 space-y-2">
                        {day.items.map((item) => (
                          <li key={item.time} className="flex items-baseline gap-4">
                            <span className="numeric w-12 shrink-0 text-sm">{item.time}</span>
                            <span className="min-w-0 flex-1 text-sm text-pretty">
                              {item.name}
                              <span className="text-muted-foreground/40 mx-2">·</span>
                              <span className="text-muted-foreground">{item.place}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Where. Sticky on a large screen so the address is still on screen
            when the reader reaches the bottom of the timetable. */}
        <div className="lg:col-span-5 lg:sticky lg:top-28 lg:self-start">
          <Reveal from="right">
            <div className="border-foreground/15 bg-card/60 rounded-lg border p-6 backdrop-blur-[2px] sm:p-7">
              <p className="text-muted-foreground font-mono text-[0.7rem] tracking-[0.22em] uppercase">
                Where
              </p>

              <address className="font-heading mt-4 text-xl leading-snug not-italic">
                {church.address.line1}
                <br />
                {church.address.city}
              </address>

              <p className="text-muted-foreground mt-4 text-sm leading-relaxed text-pretty">
                {church.landmark}
              </p>

              <CornerPlan className="mt-5" />

              <p className="text-muted-foreground mt-5 text-sm leading-relaxed text-pretty">
                {church.parking}
              </p>

              <div className="border-foreground/15 mt-5 border-t pt-4">
                <ActionLink
                  tone="quiet"
                  arrow
                  href={church.mapUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Open in Maps
                </ActionLink>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
