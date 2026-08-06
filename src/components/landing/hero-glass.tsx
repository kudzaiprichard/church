"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

import { usePrefersReducedMotion, useScrollProgress } from "./use-scroll";
import stainedGlass from "../../../public/images/stained-glass-lancets.jpg";

/**
 * Three arched lights, standing across the foot of the hero.
 *
 * The photograph is a wide window of three lancets. Cropped into a tall
 * column down the side of the page it was being asked to be something it is
 * not, and it showed — you got a slice of glass and no window. So it is cut
 * the way it was built instead: one image split across three panels, each
 * clipped to the arch profile the rest of the page uses, with the mullions
 * falling in the gaps between them.
 *
 * Each panel drifts against the scroll at its own rate. Together they read as
 * one window seen through a wall; separately they never quite move as a block,
 * which is what keeps it from looking like a slideshow.
 */
const PANELS = [
  { drift: 1, alt: "" },
  { drift: 0.55, alt: "Stained glass lancet windows in the chapel, lit from behind" },
  { drift: 1.35, alt: "" },
];

export function HeroGlass({ className }: { className?: string }) {
  const [ref, progress] = useScrollProgress<HTMLDivElement>();
  const reduced = usePrefersReducedMotion();

  return (
    <div
      ref={ref}
      className={cn("mx-auto flex w-full max-w-7xl flex-col px-6 pb-6 sm:px-8 lg:px-12", className)}
    >
      {/* The lights take whatever height the words leave, rather than claiming
          a slice of the viewport of their own — that is what keeps the opening
          to exactly one screen at any window size. */}
      <div className="flex min-h-[9rem] flex-1 gap-2.5 sm:gap-3">
        {PANELS.map((panel, index) => {
          // Panels travel a few pixels each way; the image inside carries 7%
          // of headroom top and bottom so nothing ever slides off its own edge.
          const drift = reduced ? 0 : (progress - 0.5) * 26 * panel.drift;

          return (
            <div
              key={index}
              className="animate-rise relative flex-1 overflow-hidden [clip-path:url(#lancet-clip)]"
              style={{
                animationDelay: `${420 + index * 130}ms`,
                backgroundColor: "var(--ink)",
              }}
            >
              <div
                className="absolute -top-[7%] left-0 h-[114%] w-[300%]"
                style={{
                  transform: `translate3d(-${(index * 100) / 3}%, ${drift.toFixed(2)}px, 0)`,
                }}
              >
                <Image
                  src={stainedGlass}
                  alt={panel.alt}
                  fill
                  priority
                  sizes="(min-width: 1280px) 1232px, 100vw"
                  className="object-cover object-center"
                />
              </div>

              {/* Daylight crosses the centre light only. Three shafts moving at
                  once would read as an effect rather than as a time of day. */}
              {index === 1 && (
                <div
                  aria-hidden
                  className="window-light absolute -inset-y-1/3 -left-1/2 w-24 rotate-[14deg] blur-2xl"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, color-mix(in oklab, white 26%, transparent), transparent)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* A sill for the lights to stand on, brass under ink — the same two
          lines that close the window beside "what to expect". */}
      <div aria-hidden className="animate-rise" style={{ animationDelay: "760ms" }}>
        <div className="bg-foreground/25 h-px w-full" />
        <div className="mt-[3px] h-px w-full" style={{ backgroundColor: "var(--brass)" }} />
      </div>
    </div>
  );
}
