"use client";

import Image from "next/image";

import { church, mission } from "@/lib/church";
import { cn } from "@/lib/utils";

import { Reveal } from "./reveal";
import { SectionRule } from "./section-rule";
import { usePrefersReducedMotion, useScrollProgress } from "./use-scroll";
import naveApse from "../../../public/images/nave-apse.jpg";

/**
 * The one dark moment on the page.
 *
 * Everything either side of this is paper; here the page goes to stone for a
 * screen and says who we are, then hands back. The photograph drifts against
 * the scroll so the band has depth, and a plum wash sits over it heavy enough
 * that the type clears AA at any crop the image happens to land on.
 */
export function Mission({ className }: { className?: string }) {
  const [ref, progress] = useScrollProgress<HTMLDivElement>();
  const reduced = usePrefersReducedMotion();

  const drift = reduced ? 0 : (progress - 0.5) * 12;

  return (
    <section id="mission" ref={ref} className={cn("relative isolate overflow-hidden", className)}>
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{ transform: `translate3d(0, ${drift.toFixed(2)}%, 0) scale(1.14)` }}
      >
        <Image src={naveApse} alt="" fill sizes="100vw" className="object-cover object-center" />
      </div>

      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{ backgroundColor: "color-mix(in oklab, var(--ink) 78%, transparent)" }}
      />

      <div className="mx-auto w-full max-w-3xl px-6 py-20 text-center sm:py-24">
        <SectionRule numeral="IV" label="Why we gather" align="centre" tone="light" />

        <Reveal from="mask" className="mt-10">
          <blockquote className="font-heading text-2xl leading-snug text-balance text-white sm:text-4xl">
            {mission.statement}
          </blockquote>
        </Reveal>

        <Reveal delay={140}>
          <p className="mx-auto mt-8 max-w-xl text-sm leading-relaxed text-pretty text-white/70">
            {mission.body}
          </p>
        </Reveal>

        <Reveal delay={220}>
          <p className="mt-10 font-mono text-[0.65rem] tracking-[0.2em] text-white/65 uppercase">
            {church.pastor}
            <span className="mx-3 text-white/25">·</span>
            {church.denomination}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
