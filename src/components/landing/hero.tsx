import { church } from "@/lib/church";

import { ActionLink } from "./action";
import { HeroGlass } from "./hero-glass";
import { NextGatheringLine } from "./next-gathering-line";
import { Reveal } from "./reveal";

/**
 * The name across the top, everything a visitor needs to act on beside it, and
 * the window standing underneath.
 *
 * The opening used to put the glass in a tall column down the right, which
 * left a wide empty field between the words and the picture and gave the
 * photograph a crop it could not carry. Laying the type across the full
 * measure and standing the glass along the foot fixes both: the headline gets
 * the room it deserves, and the window is finally shown at its own proportions.
 *
 * Reveals here are CSS animations rather than scroll observers — there is
 * nothing above the fold to scroll into view, and waiting on hydration would
 * mean opening on a blank page.
 *
 * The section is one screen exactly. The nav is sticky and so takes its own
 * space at the top of the flow, which is what the 5.5rem subtracts; the glass
 * then takes whatever height the words leave rather than claiming a slice of
 * the viewport of its own. `svh` rather than `vh` so a phone's collapsing
 * address bar cannot push the window off the bottom.
 */
export function Hero() {
  return (
    <section
      id="welcome"
      className="relative flex min-h-[calc(100svh-5.5rem)] flex-col justify-between"
    >
      <div className="mx-auto w-full max-w-7xl px-6 pt-10 pb-10 sm:px-8 md:pt-14 md:pb-12 lg:px-12">
        <Reveal onLoad>
          <p className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase">
            {church.address.city} · Since {church.founded}
          </p>
        </Reveal>

        <div className="mt-7 grid gap-x-16 gap-y-9 lg:grid-cols-[1.1fr_minmax(0,25rem)] lg:items-end">
          <Reveal from="mask" onLoad delay={90}>
            <h1 className="text-[2.75rem] leading-[0.98] text-balance sm:text-6xl lg:text-[4.5rem] xl:text-[5.25rem]">
              You are welcome at {church.shortName}.
            </h1>
          </Reveal>

          {/* The three things a first-time visitor might do, stacked against
              the headline rather than under it. */}
          <div className="lg:pb-2">
            <Reveal onLoad delay={220}>
              <p className="text-muted-foreground max-w-md text-lg text-pretty">
                {church.tagline} Come as you are, sit at the back if you like, and leave knowing
                someone&apos;s name.
              </p>
            </Reveal>

            <Reveal onLoad delay={300}>
              <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
                <ActionLink href="#visit" arrow>
                  Plan your visit
                </ActionLink>
                <ActionLink href="#times" tone="quiet">
                  Service times
                </ActionLink>
              </div>
            </Reveal>
          </div>
        </div>

        <Reveal onLoad delay={370}>
          <div className="border-foreground/20 mt-10 border-t pt-5">
            <NextGatheringLine />
          </div>
        </Reveal>
      </div>

      <HeroGlass className="min-h-0 flex-1" />
    </section>
  );
}
