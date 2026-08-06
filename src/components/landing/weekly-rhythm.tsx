"use client";

import { week } from "@/lib/church";
import { cn } from "@/lib/utils";

import { useInView, usePrefersReducedMotion } from "./use-scroll";

/**
 * The week as it is actually kept. Column height is how much of the church's
 * week lands on that day — Sunday is tall because Sunday is tall.
 */
export function WeeklyRhythm() {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.25 });
  const reduced = usePrefersReducedMotion();
  const grown = inView || reduced;

  return (
    <div ref={ref} className="flex items-end gap-2 sm:gap-4">
      {week.map((entry, index) => (
        <div key={entry.day} className="min-w-0 flex-1">
          <div className="flex h-44 w-full items-end sm:h-56">
            <div
              className={cn(
                "w-full transition-[height] duration-700 ease-out motion-reduce:transition-none",
                // Sunday carries the week, so it is the one solid column.
                index === 0 ? "bg-primary" : "bg-[oklch(0.885_0.012_82)]",
              )}
              style={{
                height: grown ? `${entry.height}%` : "0%",
                transitionDelay: reduced ? undefined : `${index * 80}ms`,
              }}
            />
          </div>
          <div className="border-foreground/25 border-t pt-3">
            <p className="numeric text-muted-foreground text-[0.65rem] tracking-widest uppercase">
              {entry.day}
            </p>
            <p className="font-heading mt-1 text-sm leading-tight">{entry.title}</p>
            <p className="text-muted-foreground mt-1 hidden text-xs leading-snug text-pretty sm:block">
              {entry.detail}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
