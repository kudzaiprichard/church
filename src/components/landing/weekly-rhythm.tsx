"use client";

import { week } from "@/lib/church";
import { cn } from "@/lib/utils";

import { useInView, usePrefersReducedMotion } from "./use-scroll";

/**
 * The week as it is actually kept — a timetable, not a chart. Seven columns
 * divided by hairlines, each carrying its gatherings with times. Sunday is
 * given the width and the colour because Sunday carries the week.
 */
export function WeeklyRhythm() {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.2 });
  const reduced = usePrefersReducedMotion();
  const settled = inView || reduced;

  return (
    <div ref={ref} className="border-foreground/20 border-t">
      <div className="grid sm:grid-cols-[1.5fr_repeat(6,1fr)]">
        {week.map((day, index) => {
          const isSunday = index === 0;
          return (
            <div
              key={day.day}
              className={cn(
                "border-foreground/12 flex flex-col border-b transition-[opacity,transform] duration-700 ease-out sm:border-b-0 sm:border-l first:sm:border-l-0",
                "motion-reduce:transition-none",
                settled ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                isSunday && "bg-primary/[0.06]",
              )}
              style={{ transitionDelay: reduced ? undefined : `${index * 70}ms` }}
            >
              <div
                className={cn(
                  "px-4 py-3",
                  isSunday ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                <p className="numeric text-[0.7rem] tracking-[0.18em] uppercase">
                  <span className="sm:hidden">{day.day}</span>
                  <span className="hidden sm:inline">{isSunday ? day.day : day.short}</span>
                </p>
              </div>

              <ul className="flex flex-1 flex-col gap-4 px-4 py-5">
                {day.items.map((item) => (
                  <li key={item.name}>
                    <p className="numeric text-sm">{item.time}</p>
                    <p
                      className={cn(
                        "mt-1 leading-snug text-pretty",
                        isSunday ? "font-heading text-base" : "text-sm",
                      )}
                    >
                      {item.name}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">{item.place}</p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
