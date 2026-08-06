"use client";

import Image from "next/image";

import { usePrefersReducedMotion, useScrollProgress } from "./use-scroll";
import naveApse from "../../../public/images/nave-apse.jpg";

/**
 * A full-bleed dark band between the pale sections. The page is otherwise
 * paper; this is the one moment it goes to stone, and it carries the rule the
 * whole system is built to keep.
 */
export function QuoteBand() {
  const [ref, progress] = useScrollProgress<HTMLDivElement>();
  const reduced = usePrefersReducedMotion();

  // The image drifts slower than the page, so the band reads as depth.
  const shift = reduced ? 0 : (progress - 0.5) * 12;

  return (
    <section ref={ref} className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10 scale-110" style={{ transform: `translate3d(0, ${shift.toFixed(2)}%, 0) scale(1.12)` }}>
        <Image
          src={naveApse}
          alt=""
          aria-hidden
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>
      {/* Deep plum wash so the type holds at any crop. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{ backgroundColor: "oklch(0.19 0.035 350 / 0.74)" }}
      />

      <div className="mx-auto w-full max-w-3xl px-6 py-28 text-center sm:py-36">
        <p className="font-mono text-[0.7rem] tracking-[0.24em] text-white/55 uppercase">
          Why we gather
        </p>
        <blockquote className="font-heading mt-8 text-2xl leading-snug text-balance text-white sm:text-4xl">
          A church is not a building you visit. It is a few hundred people who know your name and
          notice when you are missing.
        </blockquote>
        <p className="mx-auto mt-8 max-w-md text-sm text-pretty text-white/65">
          That is the whole of it. Everything else here — the services, the groups, the rota — exists
          to make that possible in a city where everyone is busy.
        </p>
      </div>
    </section>
  );
}
