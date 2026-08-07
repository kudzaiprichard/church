import { Ambient } from "@/components/landing/ambient";
import { Closing } from "@/components/landing/closing";
import { Hero } from "@/components/landing/hero";
import { LancetClipDef } from "@/components/landing/lancet-clip";
import { Mission } from "@/components/landing/mission";
import { PlanVisit } from "@/components/landing/plan-visit";
import { SiteNav } from "@/components/landing/site-nav";
import { Teaching } from "@/components/landing/teaching";
import { Times } from "@/components/landing/times";
import { Welcome } from "@/components/landing/welcome";

/**
 * Six sections, and each one takes a different shape.
 *
 *   I    hero        type across the measure, three lights standing beneath it
 *   II   times       two lanes — the timetable, with the address sticky beside it
 *   III  expect      narrow prose held RIGHT, the ninety-minute dial beside it
 *   IV   why         centred over a photograph, the one dark moment
 *   V    teaching    two lanes divided by a hairline — sermons and dates
 *   VI   visit       two lanes — the invitation, and the form that answers it
 *
 * Each section owns its container; there is no shared column, because a shared
 * column is what made every section feel like the same slab. What holds them
 * together instead is the wash — one gradient across the whole page, so the
 * seams between sections are never edges — and the ambient light above it.
 *
 * The wrapper clips horizontally (`clip`, not `hidden`): reveals that arrive
 * from the right sit 32px outside their column while they travel, which is
 * wider than the 24px gutter on a phone and otherwise puts a scrollbar on the
 * body. `clip` trims it without creating a scroll container, so the sticky
 * panels inside still stick.
 */
/**
 * Every section is at least one screen tall and centres what it holds, so
 * arriving at one — by scrolling or by following a link in the nav — puts the
 * whole of it in view rather than half of it. The 5.5rem is the sticky nav,
 * which takes its own space at the top of the flow.
 *
 * `min-h` rather than `h`: on a short window a section grows past the screen
 * instead of clipping what is inside it.
 */
const screen = "flex min-h-[calc(100svh-5.5rem)] scroll-mt-[5.5rem] flex-col justify-center";

export default function Home() {
  return (
    <div className="page-wash relative overflow-x-clip">
      <LancetClipDef />
      <Ambient />
      <SiteNav />

      <main className="relative z-10">
        <Hero />

        <section id="times" className={screen}>
          <Times />
        </section>

        <section id="visit" className={screen}>
          <Welcome />
        </section>

        <Mission className={screen} />

        <section id="teaching" className={screen}>
          <Teaching />
        </section>

        <section id="plan" className={screen}>
          <PlanVisit />
        </section>
      </main>

      <Closing />
    </div>
  );
}
