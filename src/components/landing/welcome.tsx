import { church, visitFacts } from "@/lib/church";

import { Reveal } from "./reveal";
import { DrawnRule, SectionRule } from "./section-rule";
import { ServiceDial } from "./service-dial";

/**
 * Two lanes on the same centred measure the rest of the page uses: the
 * ninety-minute dial on the left, and the things a first-time visitor would
 * otherwise have to ask at the door on the right.
 *
 * The dial appears from xl up. Below that its column is too narrow to draw a
 * labelled ring in at a legible size, so the text takes the full width instead
 * of the drawing being shrunk into something unreadable.
 *
 * Each row arrives in two beats: the number first, then the words. A row that
 * fades up all at once reads as a card; a row that resolves in order reads as
 * something being set down.
 */
export function Welcome() {
  return (
    <div className="w-full px-6 py-12 sm:px-8 lg:px-12">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-x-16 gap-y-14 lg:grid-cols-12">
        <ServiceDial className="hidden xl:col-span-6 xl:block" />

        <div className="lg:col-span-12 xl:col-span-6">
          <SectionRule numeral="III" label="What to expect" />

          <Reveal from="mask" className="mt-7">
            <h2 className="text-3xl leading-[1.15] text-balance sm:text-4xl">
              Ninety minutes, a cup of tea afterwards, and nobody asking you to sign anything.
            </h2>
          </Reveal>

          <Reveal delay={110}>
            <p className="text-muted-foreground mt-4 text-pretty">
              These are the things you would otherwise have to ask someone at the door. Anything
              else, call the office on{" "}
              <a
                href={`tel:${church.phone.replace(/\s/g, "")}`}
                className="text-foreground decoration-[var(--brass)] underline-offset-4 hover:underline focus-visible:underline"
              >
                {church.phone}
              </a>
              .
            </p>
          </Reveal>

          <dl className="mt-9 grid gap-x-10 sm:grid-cols-2">
            {visitFacts.map((fact, index) => (
              <div key={fact.heading}>
                <DrawnRule delay={index * 90} />
                <div className="py-5">
                  <dt className="flex items-baseline gap-3">
                    <Reveal from="mask" delay={index * 90}>
                      <span className="numeric text-accent-foreground text-[0.7rem]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </Reveal>
                    <Reveal from="mask" delay={index * 90 + 70}>
                      <span className="font-heading text-lg">{fact.heading}</span>
                    </Reveal>
                  </dt>
                  <Reveal delay={index * 90 + 150}>
                    <dd className="text-muted-foreground mt-2 pl-8 text-sm leading-relaxed text-pretty">
                      {fact.body}
                    </dd>
                  </Reveal>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
