"use client";

import { cn } from "@/lib/utils";

import { usePrefersReducedMotion, useScrollProgress } from "./use-scroll";

const doors = [
  {
    tier: "Anyone",
    stance: "No sign-in needed",
    can: [
      "Service times, directions and parking",
      "Every sermon in the archive",
      "What's on across the coming months",
      "Which ministries are running, and when",
      "How to get in touch with the office",
    ],
  },
  {
    tier: "Members",
    stance: "Once you sign in",
    can: [
      "Your own giving record and pledges",
      "Your attendance across the year",
      "Messages from the office, and replies",
      "Your connect group and its prayer requests",
      "Private notes against any sermon",
    ],
  },
] as const;

/**
 * An altarpiece diptych that opens as you scroll: the panels start closed
 * against each other and part as they rise. The motion is the argument — one
 * church, two doors, and only one of them needs a key.
 */
export function TwoTiers() {
  const [ref, progress] = useScrollProgress<HTMLDivElement>();
  const reduced = usePrefersReducedMotion();

  const opened = reduced ? 1 : Math.min(1, Math.max(0, (progress - 0.15) / 0.4));
  const part = (1 - opened) * 7;

  return (
    <div ref={ref}>
      <div className="grid gap-8 sm:grid-cols-2 sm:gap-10 [&_article]:drop-shadow-[0_1px_0_var(--border)]">
        {doors.map((panel, index) => (
          <article
            key={panel.tier}
            style={{
              clipPath: "url(#lancet-clip)",
              transform: `translate3d(${index === 0 ? part : -part}%, 0, 0)`,
              opacity: reduced ? 1 : 0.4 + opened * 0.6,
            }}
            className={cn(
              "bg-card relative px-8 pt-20 pb-10",
              // The second panel hangs lower, so the pair reads as hinged
              // rather than as two matching cards.
              index === 1 && "sm:mt-16",
            )}
          >
            <p className="text-muted-foreground text-center font-mono text-[0.7rem] tracking-[0.2em] uppercase">
              {panel.stance}
            </p>
            <h3 className="mt-3 text-center text-2xl">{panel.tier}</h3>

            <ul className="mt-8 space-y-3">
              {panel.can.map((item) => (
                <li key={item} className="flex gap-3 text-sm">
                  <span
                    aria-hidden
                    className="bg-accent-foreground/50 mt-2 h-1 w-3 shrink-0 rounded-full"
                  />
                  <span className="text-pretty">{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
