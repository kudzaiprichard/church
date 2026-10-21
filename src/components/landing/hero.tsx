import { Logo } from "@/components/brand/logo";
import { church, connectGroups, services, themeOfYear } from "@/lib/church";

import { ActionLink } from "./action";
import { Reveal } from "./reveal";

const sundays = services.filter((service) => service.day === "Sunday");

const stats = [
  { value: String(connectGroups.length), label: "Connect groups" },
  { value: "Daily", label: "Devotions" },
  { value: sundays.map((service) => service.time).join(" · "), label: "Sunday services", mono: true },
];

/**
 * The opening. Royal blue lit from above, a hairline grid fading out behind
 * the crest, and the name set in Cinzel — the only place on the page the
 * inscriptional face appears at size, so it reads as the wordmark it is.
 *
 * The nav is transparent over this band, so the top padding clears it. As the
 * reader scrolls away the content lifts and dims (`.hero-recede`, a scroll
 * timeline in CSS), which hands the eye on to the next section instead of
 * cutting to it.
 *
 * Reveals here are CSS animations rather than scroll observers — there is
 * nothing above the fold to scroll into view, and waiting on hydration would
 * mean opening on a blank page.
 */
export function Hero() {
  return (
    <section id="welcome" className="bg-hero relative overflow-hidden text-white">
      <div aria-hidden className="bg-grid-light pointer-events-none absolute inset-0" />

      <div className="hero-recede relative mx-auto flex max-w-6xl flex-col items-center px-4 pt-32 pb-16 text-center sm:px-6 md:pt-40 md:pb-20 lg:px-8">
        <Reveal onLoad>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 py-1 pr-3.5 pl-1 text-xs font-medium text-white/85 backdrop-blur-sm">
            <span className="bg-brass rounded-full px-2 py-0.5 text-[0.65rem] font-bold tracking-wide text-[oklch(0.255_0.093_277.5)]">
              {themeOfYear.year}
            </span>
            {themeOfYear.title}
          </p>
        </Reveal>

        <Reveal onLoad delay={80}>
          <Logo size={76} className="mt-9" />
        </Reveal>

        <Reveal from="mask" onLoad delay={160} className="mt-7">
          <h1 className="font-display text-[2.4rem] leading-[1.05] font-bold tracking-[0.02em] sm:text-6xl lg:text-7xl">
            Kingdom Manifest
            <span className="text-brass mt-2 block text-[0.55em] tracking-[0.08em]">
              Ministries International
            </span>
          </h1>
        </Reveal>

        <Reveal onLoad delay={240}>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-pretty text-white/75 md:text-lg">
            {church.tagline}
          </p>
        </Reveal>

        <Reveal onLoad delay={320}>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <ActionLink href="/login" arrow className="w-56 sm:w-auto">
              Sign in to the portal
            </ActionLink>
            <ActionLink href="#visit" tone="light" className="w-56 sm:w-auto">
              Plan your visit
            </ActionLink>
          </div>
        </Reveal>

        <Reveal onLoad delay={400} className="w-full max-w-2xl">
          <dl className="mt-16 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-7">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse gap-1 px-2">
                <dt className="text-[0.7rem] font-medium tracking-wide text-white/55 uppercase sm:text-xs">
                  {stat.label}
                </dt>
                <dd
                  className={
                    stat.mono
                      ? "numeric text-brass text-sm font-semibold sm:text-xl"
                      : "font-heading text-brass text-xl font-bold sm:text-2xl"
                  }
                >
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
